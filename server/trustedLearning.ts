import { randomInt as secureRandomInt, randomUUID } from 'node:crypto';
import express from 'express';
import { adminDb } from './firebaseAdmin';
import { requireFirebaseAuth, type AuthenticatedRequest } from './firebaseAuthMiddleware';
import { COURSES } from './privateCurriculumData';
import { markAssignmentSubmission } from '../src/utils/assignments';
import type { Course, LessonMasteryState, CertificateRecord } from '../src/types';

const router = express.Router();
const PASS_MARK = 75;
type AnswerQuestion = { id: string; options: string[] };
type PrivateCourse = Course;

function findCourse(id: string): PrivateCourse | undefined {
  return (COURSES as PrivateCourse[]).find((course) => course.id === id);
}
function safeQuestions(questions: Array<{ id: string; question: string; options: string[]; topic?: string; learningObjective?: string }>) {
  return questions.map(({ id, question, options, topic, learningObjective }) => ({
    id, question, options, ...(topic ? { topic } : {}), ...(learningObjective ? { learningObjective } : {}),
  }));
}
function validAnswers(questions: AnswerQuestion[], value: unknown): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const answers = value as Record<string, unknown>;
  return Object.keys(answers).length === questions.length &&
    questions.every((question) => Number.isInteger(answers[question.id]) &&
      Number(answers[question.id]) >= 0 && Number(answers[question.id]) < question.options.length);
}
function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}
function randomInt(max: number): number { return secureRandomInt(max); }
function scoreAnswers(questions: Array<{ id: string; correctIndex: number }>, answers: Record<string, number>) {
  const correct = questions.filter((question) => answers[question.id] === question.correctIndex).length;
  return Math.round((correct / Math.max(questions.length, 1)) * 100);
}
function cycleRef(uid: string, courseId: string, cycle: number) {
  return adminDb!.collection('users').doc(uid).collection('trustedCourses').doc(courseId)
    .collection('cycles').doc(String(cycle));
}
async function getEnrolledCourse(req: AuthenticatedRequest, res: express.Response, courseId: string) {
  if (!adminDb || !req.user?.uid) {
    res.status(503).json({ error: 'Secure learner services are unavailable.' });
    return null;
  }
  const profile = await adminDb.collection('users').doc(req.user.uid).get();
  if (!profile.exists) {
    res.status(403).json({ error: 'A learner profile is required.' });
    return null;
  }
  const enrolled = profile.data()?.enrolledCourseIds;
  if (!Array.isArray(enrolled) || !enrolled.includes(courseId)) {
    res.status(403).json({ error: 'You must be enrolled in this course.' });
    return null;
  }
  const course = findCourse(courseId);
  if (!course) {
    res.status(404).json({ error: 'Course not found.' });
    return null;
  }
  return { course, profile: profile.data() ?? {}, uid: req.user.uid };
}
async function ensureCycle(uid: string, courseId: string): Promise<number> {
  const stateRef = adminDb!.collection('users').doc(uid).collection('trustedCourses').doc(courseId);
  return adminDb!.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(stateRef);
    const cycle = Number(snapshot.data()?.activeCycle || 1);
    if (!snapshot.exists) {
      transaction.set(stateRef, { courseId, activeCycle: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      transaction.set(cycleRef(uid, courseId, 1), { cycle: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      return 1;
    }
    const activeRef = cycleRef(uid, courseId, cycle);
    const active = await transaction.get(activeRef);
    if (!active.exists) transaction.set(activeRef, { cycle, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return cycle;
  });
}

router.get('/api/assessments/courses/:courseId/lessons/:lessonId/questions', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const lesson = context.course.chapters.flatMap((chapter) => chapter.lessons).find((item) => item.id === req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    await ensureCycle(context.uid, context.course.id);
    return res.json({ questions: safeQuestions(lesson.quizQuestions) });
  } catch (error) {
    console.error('Trusted lesson question retrieval failed:', error);
    return res.status(500).json({ error: 'Unable to load assessment questions.' });
  }
});

router.post('/api/assessments/courses/:courseId/lessons/:lessonId/submit', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, uid } = context;
    const lesson = course.chapters.flatMap((chapter) => chapter.lessons).find((item) => item.id === req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    const questions = lesson.quizQuestions;
    if (!validAnswers(questions, req.body?.answers)) return res.status(400).json({ error: 'Submit one valid answer for every question.' });
    const cycle = await ensureCycle(uid, course.id);
    const answers = req.body.answers as Record<string, number>;
    const scorePercent = scoreAnswers(questions, answers);
    const results = Object.fromEntries(questions.map((question) => [question.id, {
      correct: answers[question.id] === question.correctIndex,
      correctAnswerIndex: question.correctIndex,
      feedback: answers[question.id] === question.correctIndex
        ? question.explanation
        : question.misconceptions?.[answers[question.id]] || 'Review this topic and try again.',
    }]));
    const courseRef = adminDb!.collection('users').doc(uid).collection('trustedCourses').doc(course.id);
    const progressRef = cycleRef(uid, course.id, cycle).collection('lessonProgress').doc(lesson.id);
    const attemptRef = cycleRef(uid, course.id, cycle).collection('lessonAttempts').doc(randomUUID());
    const now = new Date().toISOString();
    const result = await adminDb!.runTransaction(async (transaction) => {
      const progressSnap = await transaction.get(progressRef);
      const old = progressSnap.data();
      const attemptsCount = Number(old?.attemptsCount || 0) + 1;
      const progress: LessonMasteryState & { updatedAt: string } = {
        lessonId: lesson.id,
        isCompleted: true,
        isMastered: scorePercent >= PASS_MARK,
        scorePercent,
        attemptsCount,
        lastAttemptDate: now,
        identifiedMisconceptions: questions.filter((question) => answers[question.id] !== question.correctIndex)
          .map((question) => question.learningObjective).filter(Boolean),
        remedialActivitiesCompleted: false,
        updatedAt: now,
      };
      transaction.create(attemptRef, { id: attemptRef.id, courseId: course.id, lessonId: lesson.id, cycle, scorePercent, answers, submittedAt: now, trusted: true });
      transaction.set(progressRef, progress);
      transaction.set(courseRef, { courseId: course.id, activeCycle: cycle, updatedAt: now }, { merge: true });
      return { ...progress };
    });
    const allProgress = await cycleRef(uid, course.id, cycle).collection('lessonProgress').get();
    const completedCount = allProgress.docs.filter((document) => document.data().isCompleted === true).length;
    const masteredCount = allProgress.docs.filter((document) => document.data().isMastered === true).length;
    const courseMasteryPercent = Math.round((masteredCount / Math.max(course.chapters.reduce((n, chapter) => n + chapter.lessons.length, 0), 1)) * 100);
    const courseCompleted = completedCount === course.chapters.reduce((n, chapter) => n + chapter.lessons.length, 0);
    await cycleRef(uid, course.id, cycle).set({ courseMasteryPercent, courseCompleted, updatedAt: now }, { merge: true });
    return res.json({ scorePercent, results, progress: result, courseMasteryPercent, courseCompleted, cycle });
  } catch (error) {
    console.error('Trusted lesson grading failed:', error);
    return res.status(500).json({ error: 'Unable to grade this assessment.' });
  }
});

router.get('/api/assessments/courses/:courseId/exam/questions', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, uid } = context;
    if (!course.exam) return res.status(404).json({ error: 'No final exam is available.' });
    const cycle = await ensureCycle(uid, course.id);
    const cycleDocument = cycleRef(uid, course.id, cycle);
    const sessionCollection = cycleDocument.collection('examSessions');
    const existingAttempt = await cycleDocument.collection('examAttempts').limit(1).get();
    if (!existingAttempt.empty) return res.status(409).json({ error: 'This enrolment cycle already has a final-exam attempt. Complete a full course retake to unlock another attempt.' });
    let session = await sessionCollection.doc('active').get();
    if (!session.exists) {
      const questionIds = shuffle(course.exam.questions.map((question) => question.id));
      const now = new Date().toISOString();
      await adminDb!.runTransaction(async (transaction) => {
        const current = await transaction.get(sessionCollection.doc('active'));
        const attempt = await transaction.get(cycleDocument.collection('examAttempts').limit(1));
        if (!current.exists && attempt.empty) transaction.create(sessionCollection.doc('active'), { cycle, questionIds, createdAt: now });
      });
      session = await sessionCollection.doc('active').get();
    }
    const questionIds = session.data()?.questionIds;
    if (!Array.isArray(questionIds)) return res.status(503).json({ error: 'Unable to prepare a secure exam session.' });
    const byId = new Map(course.exam.questions.map((question) => [question.id, question]));
    const questions = questionIds.map((id) => byId.get(id)).filter((question): question is NonNullable<typeof question> => Boolean(question));
    if (questions.length !== course.exam.questions.length) return res.status(500).json({ error: 'The exam question set is incomplete.' });
    return res.json({ questions: safeQuestions(questions.map((question) => ({ ...question, topic: question.topic }))), cycle });
  } catch (error) {
    console.error('Trusted exam session creation failed:', error);
    return res.status(500).json({ error: 'Unable to prepare the final exam.' });
  }
});

router.post('/api/assessments/courses/:courseId/exam/submit', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, uid } = context;
    if (!course.exam) return res.status(404).json({ error: 'No final exam is available.' });
    const cycle = await ensureCycle(uid, course.id);
    const cycleDocument = cycleRef(uid, course.id, cycle);
    const session = await cycleDocument.collection('examSessions').doc('active').get();
    const questionIds = session.data()?.questionIds;
    if (!session.exists || !Array.isArray(questionIds)) return res.status(409).json({ error: 'Start the final exam before submitting answers.' });
    const questionById = new Map(course.exam.questions.map((question) => [question.id, question]));
    const questions = questionIds.map((id) => questionById.get(id)).filter((question): question is NonNullable<typeof question> => Boolean(question));
    if (!validAnswers(questions, req.body?.answers)) return res.status(400).json({ error: 'Submit one valid answer for every exam question in your active session.' });
    const answers = req.body.answers as Record<string, number>;
    const scorePercent = scoreAnswers(questions, answers);
    const passingScorePercent = Math.max(PASS_MARK, course.exam.passingScorePercent || PASS_MARK);
    const passed = scorePercent >= passingScorePercent;
    const results = Object.fromEntries(questions.map((question) => [question.id, {
      correct: answers[question.id] === question.correctIndex,
      correctAnswerIndex: question.correctIndex,
      explanation: question.explanation,
    }]));
    const attemptRef = cycleDocument.collection('examAttempts').doc('final');
    const now = new Date().toISOString();
    const attempt = await adminDb!.runTransaction(async (transaction) => {
      const previous = await transaction.get(attemptRef);
      if (previous.exists) return previous.data();
      const sessionSnapshot = await transaction.get(cycleDocument.collection('examSessions').doc('active'));
      if (!sessionSnapshot.exists) throw new Error('EXAM_SESSION_MISSING');
      const data = { id: attemptRef.id, courseId: course.id, examId: course.exam!.id, cycle, scorePercent, passed, passingScorePercent, answers, submittedAt: now, trusted: true };
      transaction.create(attemptRef, data);
      transaction.set(cycleDocument, { cycle, examAttempted: true, examPassed: passed, examScorePercent: scorePercent, updatedAt: now }, { merge: true });
      return data;
    });
    if (!attempt) return res.status(500).json({ error: 'Unable to save exam attempt.' });
    const savedAnswers = (attempt.answers ?? answers) as Record<string, number>;
    const savedResults = Object.fromEntries(questions.map((question) => [question.id, {
      correct: savedAnswers[question.id] === question.correctIndex,
      correctAnswerIndex: question.correctIndex,
      explanation: question.explanation,
    }]));
    return res.json({ scorePercent: attempt.scorePercent, passed: attempt.passed, passingScorePercent, results: savedResults, attempt, cycle, alreadySubmitted: attempt.submittedAt !== now });
  } catch (error) {
    if (error instanceof Error && error.message === 'EXAM_SESSION_MISSING') return res.status(409).json({ error: 'The exam session expired. Please start the exam again.' });
    console.error('Trusted exam submission failed:', error);
    return res.status(500).json({ error: 'Unable to submit the final exam.' });
  }
});

router.post('/api/learning/courses/:courseId/retake', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, uid } = context;
    const totalLessons = course.chapters.reduce((count, chapter) => count + chapter.lessons.length, 0);
    if (totalLessons === 0) return res.status(409).json({ error: 'This course has no lessons to retake.' });
    const stateRef = adminDb!.collection('users').doc(uid).collection('trustedCourses').doc(course.id);
    const nextCycle = await adminDb!.runTransaction(async (transaction) => {
      const state = await transaction.get(stateRef);
      const currentCycle = Number(state.data()?.activeCycle || 1);
      const currentRef = cycleRef(uid, course.id, currentCycle);
      const progress = await transaction.get(currentRef.collection('lessonProgress'));
      const completed = progress.docs.filter((document) => document.data().isCompleted === true).length;
      if (completed !== totalLessons) throw new Error('COURSE_NOT_COMPLETED');
      const next = currentCycle + 1;
      transaction.set(stateRef, { courseId: course.id, activeCycle: next, updatedAt: new Date().toISOString() }, { merge: true });
      transaction.create(cycleRef(uid, course.id, next), { cycle: next, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      return next;
    });
    return res.json({ courseId: course.id, cycle: nextCycle, message: 'A new full-course retake cycle is ready. Your previous results have been preserved.' });
  } catch (error) {
    if (error instanceof Error && error.message === 'COURSE_NOT_COMPLETED') return res.status(409).json({ error: 'Complete every lesson in the current course cycle before starting a full retake.' });
    console.error('Course retake failed:', error);
    return res.status(500).json({ error: 'Unable to start a new course retake.' });
  }
});

router.post('/api/assignments/courses/:courseId/:assignmentId/submit', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, uid } = context;
    const authoredAssignments = (course as Course & { assignments?: Array<{ id: string; rubric: Array<{ id: string; description: string; marks: number; keywords: string[] }> }> }).assignments || [];
    const assignment = authoredAssignments.find((item) => item.id === req.params.assignmentId);
    if (!assignment || !Array.isArray(assignment.rubric) || assignment.rubric.length === 0) return res.status(409).json({ error: 'This course has no approved assignment rubric yet. Your draft is not graded or stored as a trusted result.' });
    if (typeof req.body?.content !== 'string' || req.body.content.trim().length < 1 || req.body.content.length > 20000) {
      return res.status(400).json({ error: 'Provide assignment content between 1 and 20,000 characters.' });
    }
    const cycle = await ensureCycle(uid, course.id);
    const submissionRef = cycleRef(uid, course.id, cycle).collection('assignments').doc(assignment.id);
    const historyRef = submissionRef.collection('attempts').doc(randomUUID());
    const now = new Date().toISOString();
    const result = markAssignmentSubmission(assignment, req.body.content);
    const attempt = await adminDb!.runTransaction(async (transaction) => {
      const previous = await transaction.get(submissionRef);
      const attemptNumber = Number(previous.data()?.attemptNumber || 0) + 1;
      const data = { assignmentId: assignment.id, courseId: course.id, cycle, content: req.body.content, submittedAt: now, attemptNumber, ...result, trusted: true };
      transaction.create(historyRef, data);
      transaction.set(submissionRef, data);
      return data;
    });
    return res.json({ submission: attempt, marking: result });
  } catch (error) {
    console.error('Trusted assignment submission failed:', error);
    return res.status(500).json({ error: 'Unable to submit and mark this assignment.' });
  }
});

router.get('/api/learning/courses/:courseId/status', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, uid } = context;
    const cycle = await ensureCycle(uid, course.id);
    const ref = cycleRef(uid, course.id, cycle);
    const [cycleSnapshot, progress, attempts, assignments] = await Promise.all([
      ref.get(), ref.collection('lessonProgress').get(), ref.collection('examAttempts').get(), ref.collection('assignments').get(),
    ]);
    const totalLessons = course.chapters.reduce((count, chapter) => count + chapter.lessons.length, 0);
    const progressRecords = progress.docs.map((doc) => doc.data());
    const completedCount = progressRecords.filter((record) => record.isCompleted === true).length;
    const masteredCount = progressRecords.filter((record) => record.isMastered === true).length;
    const courseMasteryPercent = Math.round(masteredCount / Math.max(totalLessons, 1) * 100);
    const courseCompleted = completedCount === totalLessons;
    return res.json({
      cycle,
      courseCompleted,
      courseMasteryPercent,
      lessonProgress: Object.fromEntries(progressRecords.map((record) => [record.lessonId, record])),
      examAttempts: attempts.docs.map((doc) => doc.data()),
      assignments: Object.fromEntries(assignments.docs.map((doc) => [doc.id, doc.data()])),
      examAttempted: cycleSnapshot.data()?.examAttempted === true,
      examPassed: cycleSnapshot.data()?.examPassed === true,
    });
  } catch (error) {
    console.error('Trusted course status retrieval failed:', error);
    return res.status(500).json({ error: 'Unable to load trusted course progress.' });
  }
});

router.post('/api/certificates/courses/:courseId/issue', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, profile, uid } = context;
    const cycle = await ensureCycle(uid, course.id);
    const ref = cycleRef(uid, course.id, cycle);
    const [cycleSnapshot, progress, assignments, previousCertificates] = await Promise.all([
      ref.get(), ref.collection('lessonProgress').get(), ref.collection('assignments').get(),
      adminDb!.collection('users').doc(uid).collection('trustedCertificates').where('courseId', '==', course.id).get(),
    ]);
    const totalLessons = course.chapters.reduce((count, chapter) => count + chapter.lessons.length, 0);
    const completed = progress.docs.filter((document) => document.data().isCompleted === true).length;
    const mastered = progress.docs.filter((document) => document.data().isMastered === true).length;
    const courseMasteryPercent = Math.round(mastered / Math.max(totalLessons, 1) * 100);
    const requiredAssignments = (course as Course & { assignments?: Array<{ id: string; rubric?: unknown[] }> }).assignments || [];
    if (requiredAssignments.length === 0) unmet.push('approved assignment and marking rubric not configured for this course');
    const assignmentRecords = new Map(assignments.docs.map((document) => [document.id, document.data()]));
    const unmet: string[] = [];
    if (completed !== totalLessons) unmet.push(`course completion (${completed}/${totalLessons} lessons)`);
    if (courseMasteryPercent < PASS_MARK) unmet.push(`course mastery (${courseMasteryPercent}% / ${PASS_MARK}%)`);
    if (cycleSnapshot.data()?.examPassed !== true) unmet.push('final exam pass (75% or higher)');
    for (const assignment of requiredAssignments) {
      const record = assignmentRecords.get(assignment.id);
      if (!record || record.status !== 'graded' || Number(record.scorePercent) < 50) unmet.push(`assignment: ${assignment.title}`);
    }
    if (!previousCertificates.empty) unmet.push('certificate already issued for this course');
    if (unmet.length) return res.status(409).json({ eligible: false, unmet, cycle, courseMasteryPercent });
    const credentialId = `BERRY-${randomUUID().replace(/-/g, '').toUpperCase()}`;
    const certificate: CertificateRecord & { uid: string; trusted: true; cycle: number } = {
      id: credentialId, credentialId, courseId: course.id, courseTitle: course.title,
      recipientName: typeof profile.name === 'string' ? profile.name : 'Berry Learner',
      stage: profile.stage, gradeLevel: course.gradeLevel, curriculum: course.curriculum,
      issuedDate: new Date().toISOString(), scorePercent: Number(cycleSnapshot.data()?.examScorePercent || 0),
      authority: 'Berry Learning Platform', verified: true, uid, trusted: true, cycle,
    };
    const certificateRef = adminDb!.collection('trustedCertificates').doc(credentialId);
    await adminDb!.runTransaction(async (transaction) => {
      const existing = await transaction.get(certificateRef);
      const duplicate = await transaction.get(adminDb!.collection('users').doc(uid).collection('trustedCertificates').doc(course.id));
      if (existing.exists || duplicate.exists) throw new Error('CERTIFICATE_ALREADY_EXISTS');
      transaction.create(certificateRef, certificate);
      transaction.create(duplicate.ref, certificate);
    });
    return res.status(201).json({ eligible: true, certificate });
  } catch (error) {
    if (error instanceof Error && error.message === 'CERTIFICATE_ALREADY_EXISTS') return res.status(409).json({ eligible: false, error: 'A certificate has already been issued for this course.' });
    console.error('Trusted certificate issuance failed:', error);
    return res.status(500).json({ error: 'Unable to issue the certificate.' });
  }
});


router.get('/api/certificates/mine', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!adminDb || !req.user?.uid) return res.status(503).json({ error: 'Certificate records are temporarily unavailable.' });
    const snapshot = await adminDb.collection('users').doc(req.user.uid).collection('trustedCertificates').get();
    return res.json({ certificates: snapshot.docs.map((document) => document.data()) });
  } catch (error) {
    console.error('Trusted certificate history retrieval failed:', error);
    return res.status(500).json({ error: 'Unable to load verified certificates.' });
  }
});

router.get('/api/certificates/verify/:credentialId', async (req, res) => {
  try {
    if (!adminDb) return res.status(503).json({ error: 'Certificate verification is temporarily unavailable.' });
    const snapshot = await adminDb.collection('trustedCertificates').doc(req.params.credentialId).get();
    if (!snapshot.exists || snapshot.data()?.trusted !== true) return res.status(404).json({ valid: false, error: 'Certificate not found or not verified.' });
    const certificate = snapshot.data()!;
    return res.json({ valid: true, credentialId: certificate.credentialId, recipientName: certificate.recipientName, courseTitle: certificate.courseTitle, issuedDate: certificate.issuedDate, authority: certificate.authority });
  } catch (error) {
    console.error('Certificate verification failed:', error);
    return res.status(500).json({ error: 'Unable to verify this certificate.' });
  }
});

export default router;
