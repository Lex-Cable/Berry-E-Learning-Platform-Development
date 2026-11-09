import { hasActiveTrustedEnrollment } from './trustedEnrollment';
import { issueTrustedCertificateTransaction } from './trustedCertificateIssuance';

import { randomInt as secureRandomInt, randomUUID } from 'node:crypto';
import express from 'express';
import { adminDb } from './firebaseAdmin';
import { requireFirebaseAuth, type AuthenticatedRequest } from './firebaseAuthMiddleware';
import { COURSES } from './privateCurriculumData';
import { INTERNATIONAL_STARTER_COURSES } from '../src/data/internationalStarterCourses';
import { buildCourseAssignments, markAssignmentSubmission } from '../src/utils/assignments';
import { withInteractivePractice } from '../src/utils/interactiveActivities';
import { withCompleteAssessmentBanks } from '../src/utils/assessmentQuestionBank';
import { canStartFullRetake, certificateUnmetRequirements, isPassingExamScore, selectRequiredQuestionSet, summarizeCourseProgress } from './trustedLearningLogic';
import type { Assignment, Course, LessonMasteryState, CertificateRecord } from '../src/types';
import { getCourseModules, getModuleChapters } from '../src/utils/courseModules';

const router = express.Router();
const PASS_MARK = 50;
type AnswerQuestion = { id: string; options: string[] };
type PrivateCourse = Course;

// Server-side trusted catalogue: private production courses plus the
// Berry-authored international starter courses. Never accept course content
// or answer keys supplied by the browser.
const TRUSTED_COURSES: PrivateCourse[] = withInteractivePractice(withCompleteAssessmentBanks([
  ...(COURSES as PrivateCourse[]),
  ...INTERNATIONAL_STARTER_COURSES,
]));
// Same Berry-authored, course-specific rubric catalogue as the learner UI.
const TRUSTED_ASSIGNMENTS = buildCourseAssignments(TRUSTED_COURSES);

function findCourse(id: string): PrivateCourse | undefined {
  return TRUSTED_COURSES.find((course) => course.id === id);
}
function safeQuestions(questions: Array<{ id: string; question: string; options: string[]; topic?: string; learningObjective?: string }>) {
  return questions.map(({ id, question, options, topic, learningObjective }) => ({
    id, question, options, ...(topic ? { topic } : {}), ...(learningObjective ? { learningObjective } : {}),
  }));
}
function validAnswers(questions: AnswerQuestion[], value: unknown, allowPartial = false): value is Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const answers = value as Record<string, unknown>;
  const answerIds = Object.keys(answers);
  return (allowPartial ? answerIds.length <= questions.length : answerIds.length === questions.length) &&
    answerIds.every((id) => questions.some((question) => question.id === id)) &&
    questions.every((question) => answers[question.id] === undefined ||
      (Number.isInteger(answers[question.id]) && Number(answers[question.id]) >= 0 && Number(answers[question.id]) < question.options.length));
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
function rotateQuestionSet<T>(questions: T[], attemptNumber: number, maximumCount: number): T[] {
  if (!questions.length) return [];
  const count = Math.min(maximumCount, questions.length);
  const offset = (Math.max(0, attemptNumber) * count) % questions.length;
  const rotated = [...questions.slice(offset), ...questions.slice(0, offset)];
  return rotated.slice(0, count);
}
function scoreAnswers(questions: Array<{ id: string; correctIndex: number }>, answers: Record<string, number>) {
  const correct = questions.filter((question) => answers[question.id] === question.correctIndex).length;
  return Math.round((correct / Math.max(questions.length, 1)) * 100);
}
function cycleRef(uid: string, courseId: string, cycle: number) {
  return adminDb!.collection('users').doc(uid).collection('trustedCourses').doc(courseId)
    .collection('cycles').doc(String(cycle));
}
async function previousTopicRequirementsMet(uid: string, course: PrivateCourse, lessonId: string, cycle: number): Promise<boolean> {
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return false;
  if (index === 0) return true;
  const previous = lessons[index - 1];
  const cycleDocument = cycleRef(uid, course.id, cycle);
  const [progress, assignment] = await Promise.all([
    cycleDocument.collection('lessonProgress').doc(previous.id).get(),
    cycleDocument.collection('assignments').doc(`assignment-${course.id}-${previous.id}`).get(),
  ]);
  const progressData = progress.data();
  const assignmentData = assignment.data();
  return progressData?.isMastered === true &&
    progressData?.isCompleted === true &&
    assignmentData?.status === 'graded' &&
    Number(assignmentData?.scorePercent) >= 50;
}

function moduleExamQuestions(course: PrivateCourse, moduleId: string) {
  const module = getCourseModules(course).find((item) => item.id === moduleId);
  if (!module) return null;
  const chapters = getModuleChapters(course, module);
  const seen = new Set<string>();
  return chapters.flatMap((chapter) => chapter.lessons.flatMap((lesson) => lesson.quizQuestions))
    .filter((question) => { if (seen.has(question.id)) return false; seen.add(question.id); return true; })
    .map((question) => ({ id: question.id, question: question.question, options: question.options, correctIndex: question.correctIndex, explanation: question.explanation, topic: question.learningObjective }));
}

async function moduleRequirementsMet(uid: string, course: PrivateCourse, moduleId: string, cycle: number): Promise<{ met: boolean; unmet: string[] }> {
  const modules = getCourseModules(course);
  const index = modules.findIndex((item) => item.id === moduleId);
  if (index < 0) return { met: false, unmet: ['module not found'] };
  const module = modules[index];
  const chapters = getModuleChapters(course, module);
  const ref = cycleRef(uid, course.id, cycle);
  const previousModule = index > 0 ? modules[index - 1] : undefined;
  if (previousModule) {
    const previousExam = await ref.collection('moduleExamAttempts').where('moduleId', '==', previousModule.id).get();
    if (!previousExam.docs.some((doc) => doc.data().passed === true && Number(doc.data().scorePercent) >= 60)) {
      return { met: false, unmet: [`Pass ${previousModule.title} before starting this module.`] };
    }
  }
  const [progress, assignments] = await Promise.all([ref.collection('lessonProgress').get(), ref.collection('assignments').get()]);
  const progressById = new Map(progress.docs.map((doc) => [doc.id, doc.data()]));
  const assignmentById = new Map(assignments.docs.map((doc) => [doc.id, doc.data()]));
  const unmet: string[] = [];
  for (const chapter of chapters) for (const lesson of chapter.lessons) {
    if (progressById.get(lesson.id)?.isMastered !== true) unmet.push(`Complete the mastery assessment for ${lesson.title}.`);
    const assignment = assignmentById.get(`assignment-${course.id}-${lesson.id}`);
    if (!assignment || assignment.status !== 'graded' || Number(assignment.scorePercent) < 50) unmet.push(`Pass the assignment for ${lesson.title}.`);
  }
  return { met: unmet.length === 0, unmet };
}

async function getEnrolledCourse(req: AuthenticatedRequest, res: express.Response, courseId: string) {
  if (!adminDb || !req.user?.uid) {
    res.status(503).json({ error: 'Secure learner services are unavailable.' });
    return null;
  }

  const uid = req.user.uid;
const profile = await adminDb.collection('users').doc(req.user.uid).get();
  if (!profile.exists) {
    res.status(403).json({ error: 'A learner profile is required.' });
    return null;
  }
  const enrollment = await adminDb
    .collection('users').doc(uid)
    .collection('enrollments').doc(courseId).get();

  if (!hasActiveTrustedEnrollment({ exists: enrollment.exists, status: enrollment.data()?.status })) {
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

router.post('/api/learning/courses/:courseId/enroll', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!adminDb || !req.user?.uid) {
      return res.status(503).json({ error: 'Secure learner services are unavailable.' });
    }

    const uid = req.user.uid;
    const courseId = String(req.params.courseId);
    const course = findCourse(courseId);

    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const enrollmentRef = adminDb
      .collection('users').doc(uid)
      .collection('enrollments').doc(courseId);

    const existing = await enrollmentRef.get();

    if (!existing.exists || existing.data()?.status !== 'active') {
      await enrollmentRef.set({
        uid,
        courseId,
        status: 'active',
        source: 'self_enrollment',
        enrolledAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
    }

    return res.json({ enrolled: true, courseId });
  } catch (error) {
    console.error('Course enrollment failed:', error);
    return res.status(500).json({ error: 'Could not complete course enrollment.' });
  }
});

router.get('/api/assessments/courses/:courseId/lessons/:lessonId/questions', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const lesson = context.course.chapters.flatMap((chapter) => chapter.lessons).find((item) => item.id === req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    const cycle = await ensureCycle(context.uid, context.course.id);
    const activityRecords = await cycleRef(context.uid, context.course.id, cycle)
      .collection('lessonProgress').doc(lesson.id).collection('activities').get();
    const activityScores = new Map(activityRecords.docs.map((document) => [document.id, Number(document.data().scorePercent) || 0]));
    const interactivePassed = lesson.activities.length === 0 || (
      lesson.activities.every((activity) => activityScores.has(activity.id)) &&
      lesson.activities.reduce((total, activity) => total + (activityScores.get(activity.id) || 0), 0) / lesson.activities.length >= 80
    );
    if (!interactivePassed) return res.status(409).json({ error: 'Complete the interactive activity and achieve at least 80% before starting the mastery assessment.' });
    if (!(await previousTopicRequirementsMet(context.uid, context.course, lesson.id, cycle))) {
      return res.status(409).json({ error: "Complete the previous topic's mastery assessment and interactive activities before opening this lesson." });
    }
    const masteryCount = Math.min(10, lesson.quizQuestions.length);
    if (!masteryCount) return res.status(422).json({ error: 'This topic has no unique approved mastery questions yet. The course content needs to be completed before assessment.' });
    const progressSnapshot = await cycleRef(context.uid, context.course.id, cycle)
      .collection('lessonProgress').doc(lesson.id).get();
    const attemptsCount = Number(progressSnapshot.data()?.attemptsCount || 0);
    const masteryQuestions = rotateQuestionSet(lesson.quizQuestions, attemptsCount, masteryCount);
    return res.json({ questions: safeQuestions(masteryQuestions) });
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
    const currentCycle = await ensureCycle(uid, course.id);
    const activityRecords = await cycleRef(uid, course.id, currentCycle)
      .collection('lessonProgress').doc(lesson.id).collection('activities').get();
    const activityScores = new Map(activityRecords.docs.map((document) => [document.id, Number(document.data().scorePercent) || 0]));
    const interactivePassed = lesson.activities.length === 0 || (
      lesson.activities.every((activity) => activityScores.has(activity.id)) &&
      lesson.activities.reduce((total, activity) => total + (activityScores.get(activity.id) || 0), 0) / lesson.activities.length >= 80
    );
    if (!interactivePassed) return res.status(409).json({ error: 'Complete the interactive activity and achieve at least 80% before submitting the mastery assessment.' });
    if (!(await previousTopicRequirementsMet(uid, course, lesson.id, currentCycle))) {
      return res.status(409).json({ error: "Complete the previous topic's mastery assessment and interactive activities before attempting this lesson." });
    }
    const masteryCount = Math.min(10, lesson.quizQuestions.length);
    if (!masteryCount) return res.status(422).json({ error: 'This topic has no unique approved mastery questions yet. The course content needs to be completed before assessment.' });
    const cycle = currentCycle;
    const progressRef = cycleRef(uid, course.id, cycle).collection('lessonProgress').doc(lesson.id);
    const progressBeforeAttempt = await progressRef.get();
    const attemptsBefore = Number(progressBeforeAttempt.data()?.attemptsCount || 0);
    const questions = rotateQuestionSet(lesson.quizQuestions, attemptsBefore, masteryCount);
    if (!validAnswers(questions, req.body?.answers)) return res.status(400).json({ error: 'Submit one valid answer for every question.' });
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
    const attemptRef = cycleRef(uid, course.id, cycle).collection('lessonAttempts').doc(randomUUID());
    const now = new Date().toISOString();
    const result = await adminDb!.runTransaction(async (transaction) => {
      const progressSnap = await transaction.get(progressRef);
      const old = progressSnap.data();
      const attemptsCount = Number(old?.attemptsCount || 0) + 1;
      const masteryThreshold = Math.max(80, lesson.masteryThresholdPercent || 80);
      const [activitySnapshot, assignmentSnapshot] = await Promise.all([
        transaction.get(progressRef.collection('activities')),
        transaction.get(cycleRef(uid, course.id, cycle).collection('assignments').doc(`assignment-${course.id}-${lesson.id}`)),
      ]);
      const submittedActivityIds = new Set(activitySnapshot.docs.map((document) => document.id));
      const allActivitiesSubmitted = lesson.activities.every((activity) => submittedActivityIds.has(activity.id));
      const interactiveScorePercent = lesson.activities.length
        ? Math.round(lesson.activities.reduce((total, activity) => {
            const saved = activitySnapshot.docs.find((document) => document.id === activity.id)?.data();
            return total + (Number(saved?.scorePercent) || 0);
          }, 0) / lesson.activities.length)
        : 100;
      const lessonPassed = scorePercent >= masteryThreshold &&
        allActivitiesSubmitted && interactiveScorePercent >= 80;
      const progress: LessonMasteryState & { updatedAt: string; interactiveScorePercent: number; interactiveActivitiesCompleted: number } = {
        lessonId: lesson.id,
        isCompleted: lessonPassed && assignmentSnapshot.data()?.status === 'graded' && Number(assignmentSnapshot.data()?.scorePercent) >= 50,
        isMastered: lessonPassed,
        scorePercent,
        interactiveScorePercent,
        interactiveActivitiesCompleted: submittedActivityIds.size,
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
    const summary = summarizeCourseProgress(allProgress.docs.map((document) => document.data()), course.chapters.reduce((n, chapter) => n + chapter.lessons.length, 0));
    const { courseMasteryPercent, courseCompleted } = summary;
    await cycleRef(uid, course.id, cycle).set({ courseMasteryPercent, courseCompleted, updatedAt: now }, { merge: true });
    return res.json({ scorePercent, results, progress: result, courseMasteryPercent, courseCompleted, cycle });
  } catch (error) {
    console.error('Trusted lesson grading failed:', error);
    return res.status(500).json({ error: 'Unable to grade this assessment.' });
  }
});

router.post('/api/assessments/courses/:courseId/lessons/:lessonId/activities/:activityId/submit', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, uid } = context;
    const lesson = course.chapters.flatMap((chapter) => chapter.lessons).find((item) => item.id === req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found.' });
    const cycle = await ensureCycle(uid, course.id);
    if (!(await previousTopicRequirementsMet(uid, course, lesson.id, cycle))) {
      return res.status(409).json({ error: "Complete the previous topic's mastery assessment and interactive activities before attempting this activity." });
    }
    const activity = lesson.activities.find((item) => item.id === req.params.activityId);
    if (!activity) return res.status(404).json({ error: 'Interactive activity not found.' });

    const answer = req.body?.answer;
    let correct = false;
    if (activity.type === 'matching') {
      const pairs = answer?.pairs;
      const expected = activity.data.matchingPairs || [];
      correct = !!pairs && typeof pairs === 'object' && !Array.isArray(pairs) &&
        expected.length > 0 && expected.every((pair) => typeof pairs[pair.id] === 'string' &&
          pair.right?.trim().toLowerCase() === pairs[pair.id].trim().toLowerCase());
    } else if (activity.type === 'ordering') {
      const order = answer?.order;
      const expected = [...(activity.data.orderingItems || [])]
        .sort((left, right) => left.correctOrder - right.correctOrder).map((item) => item.id);
      correct = Array.isArray(order) && order.length === expected.length &&
        order.every((id: unknown, index: number) => id === expected[index]);
    } else if (activity.type === 'fill-blank') {
      const response = typeof answer?.response === 'string' ? answer.response.trim().toLowerCase() : '';
      correct = response.length > 0 && (activity.data.blankSolutions || [])
        .some((solution) => solution.trim().toLowerCase() === response);
    } else if (activity.type === 'interactive-choice') {
      const choice = (activity.data.choices || []).find((item) => item.id === answer?.choiceId);
      correct = choice?.isCorrect === true;
    }

    const now = new Date().toISOString();
    const submission = {
      activityId: activity.id,
      lessonId: lesson.id,
      courseId: course.id,
      cycle,
      scorePercent: correct ? 100 : 0,
      passed: correct,
      answer: activity.type === 'matching'
        ? { pairs: answer?.pairs }
        : activity.type === 'ordering'
          ? { order: answer?.order }
          : activity.type === 'fill-blank'
            ? { response: typeof answer?.response === 'string' ? answer.response.slice(0, 2000) : '' }
            : { choiceId: typeof answer?.choiceId === 'string' ? answer.choiceId.slice(0, 200) : '' },
      feedback: correct ? 'Correct. Your answer has been checked and saved.' : 'Not quite. Review the lesson and try again.',
      submittedAt: now,
      trusted: true,
    };
    const lessonActivitiesRef = cycleRef(uid, course.id, cycle)
      .collection('lessonProgress').doc(lesson.id).collection('activities');
    await lessonActivitiesRef.doc(activity.id).set(submission, { merge: true });

    const savedActivities = await lessonActivitiesRef.get();
    const scoresById = new Map(savedActivities.docs.map((document) => [document.id, Number(document.data().scorePercent) || 0]));
    const interactiveScorePercent = lesson.activities.length
      ? Math.round(lesson.activities.reduce((total, item) => total + (scoresById.get(item.id) || 0), 0) / lesson.activities.length)
      : 100;
    const progressRef = cycleRef(uid, course.id, cycle).collection('lessonProgress').doc(lesson.id);
    const progressSnapshot = await progressRef.get();
    const progress = progressSnapshot.data();
    const masteryThreshold = Math.max(80, lesson.masteryThresholdPercent || 80);
    const masteryPassed = Number(progress?.scorePercent || 0) >= masteryThreshold;
    const allActivitiesSubmitted = lesson.activities.every((item) => scoresById.has(item.id));
    const lessonPassed = masteryPassed && allActivitiesSubmitted && interactiveScorePercent >= 80;
    await progressRef.set({
      interactiveScorePercent,
      interactiveActivitiesCompleted: savedActivities.size,
      isCompleted: false,
      isMastered: lessonPassed,
      updatedAt: now,
    }, { merge: true });
    const finalProgress = (await progressRef.get()).data();

    return res.json({ submission, interactiveScorePercent, interactiveActivitiesCompleted: savedActivities.size, lessonCompleted: lessonPassed, progress: finalProgress });
  } catch (error) {
    console.error('Trusted interactive activity submission failed:', error);
    return res.status(500).json({ error: 'Unable to check and save this activity.' });
  }
});

router.get('/api/assessments/courses/:courseId/modules/:moduleId/exam/questions', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const module = getCourseModules(context.course).find((item) => item.id === req.params.moduleId);
    if (!module?.examination) return res.status(404).json({ error: 'Module examination is not configured.' });
    const cycle = await ensureCycle(context.uid, context.course.id);
    const requirements = await moduleRequirementsMet(context.uid, context.course, module.id, cycle);
    if (!requirements.met) return res.status(409).json({ error: 'Module examination is locked.', unmet: requirements.unmet });
    const bank = moduleExamQuestions(context.course, module.id) || [];
    const count = Math.min(module.examination.questionCount, bank.length);
    if (count < 1) return res.status(422).json({ error: 'No approved module examination questions are available.' });
    const ref = cycleRef(context.uid, context.course.id, cycle);
    const attempts = await ref.collection('moduleExamAttempts').where('moduleId', '==', module.id).get();
    if (attempts.docs.some((doc) => doc.data().passed === true && Number(doc.data().scorePercent) >= module.examination.passingScorePercent)) return res.status(409).json({ error: 'This module examination has already been passed.' });
    if (attempts.size >= module.examination.maximumAttempts) return res.status(409).json({ error: 'The maximum number of module examination attempts has been reached.' });
    const selected = rotateQuestionSet(bank, attempts.size, count);
    const questionIds = shuffle(selected.map((question) => question.id));
    const sessionRef = ref.collection('moduleExamSessions').doc(module.id);
    const expiresAt = new Date(Date.now() + module.examination.durationMinutes * 60_000).toISOString();
    await sessionRef.set({ moduleId: module.id, questionIds, expiresAt, createdAt: new Date().toISOString() });
    const byId = new Map(bank.map((question) => [question.id, question]));
    return res.json({ moduleId: module.id, questions: safeQuestions(questionIds.map((id) => byId.get(id)!).filter(Boolean)), cycle, expiresAt, attemptNumber: attempts.size + 1, passingScorePercent: module.examination.passingScorePercent });
  } catch (error) {
    console.error('Module examination session failed:', error);
    return res.status(500).json({ error: 'Unable to prepare module examination.' });
  }
});

router.post('/api/assessments/courses/:courseId/modules/:moduleId/exam/submit', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const module = getCourseModules(context.course).find((item) => item.id === req.params.moduleId);
    if (!module?.examination) return res.status(404).json({ error: 'Module examination is not configured.' });
    const cycle = await ensureCycle(context.uid, context.course.id);
    const requirements = await moduleRequirementsMet(context.uid, context.course, module.id, cycle);
    if (!requirements.met) return res.status(409).json({ error: 'Module examination requirements are not satisfied.', unmet: requirements.unmet });
    const ref = cycleRef(context.uid, context.course.id, cycle);
    const sessionRef = ref.collection('moduleExamSessions').doc(module.id);
    const session = await sessionRef.get();
    const sessionData = session.data();
    if (!session.exists || !Array.isArray(sessionData?.questionIds)) return res.status(409).json({ error: 'Start the module examination before submitting.' });
    if (!Number.isFinite(Date.parse(String(sessionData.expiresAt || ''))) || Date.now() > Date.parse(String(sessionData.expiresAt)) + 30_000) return res.status(409).json({ error: 'The module examination time has expired.' });
    const bank = moduleExamQuestions(context.course, module.id) || [];
    const byId = new Map(bank.map((question) => [question.id, question]));
    const questions = (sessionData.questionIds as string[]).map((id) => byId.get(id)).filter((question): question is NonNullable<typeof question> => Boolean(question));
    if (!validAnswers(questions, req.body?.answers)) return res.status(400).json({ error: 'Submit one valid answer for every module examination question.' });
    const answers = req.body.answers as Record<string, number>;
    const scorePercent = scoreAnswers(questions, answers);
    const passingScorePercent = Math.max(60, module.examination.passingScorePercent);
    const passed = scorePercent >= passingScorePercent;
    const previousAttempts = await ref.collection('moduleExamAttempts').where('moduleId', '==', module.id).get();
    if (previousAttempts.size >= module.examination.maximumAttempts) return res.status(409).json({ error: 'The maximum number of module examination attempts has been reached.' });
    const attemptRef = ref.collection('moduleExamAttempts').doc(randomUUID());
    const submittedAt = new Date().toISOString();
    const attempt = { id: attemptRef.id, moduleId: module.id, courseId: context.course.id, cycle, attemptNumber: previousAttempts.size + 1, answers, scorePercent, passingScorePercent, passed, submittedAt, trusted: true, results: Object.fromEntries(questions.map((question) => [question.id, { correct: answers[question.id] === question.correctIndex, correctAnswerIndex: question.correctIndex, explanation: question.explanation }])) };
    await adminDb!.runTransaction(async (transaction) => {
      transaction.create(attemptRef, attempt);
      transaction.set(sessionRef, { submittedAt, submitted: true }, { merge: true });
    });
    return res.json({ attempt, passed, scorePercent, passingScorePercent });
  } catch (error) {
    console.error('Module examination submission failed:', error);
    return res.status(500).json({ error: 'Unable to mark module examination.' });
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
      const requiredExamQuestions = selectRequiredQuestionSet(course.exam.questions, Math.min(30, course.exam.questions.length));
      if (!requiredExamQuestions?.length) return res.status(422).json({ error: 'This course has no unique approved final-exam questions yet. The course content needs to be completed before assessment.' });
      const questionIds = shuffle(requiredExamQuestions.map((question) => question.id));
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      await adminDb!.runTransaction(async (transaction) => {
        const current = await transaction.get(sessionCollection.doc('active'));
        const attempt = await transaction.get(cycleDocument.collection('examAttempts').limit(1));
        if (!current.exists && attempt.empty) transaction.create(sessionCollection.doc('active'), {
          cycle, questionIds, createdAt: now.toISOString(), expiresAt,
        });
      });
      session = await sessionCollection.doc('active').get();
    }
    const questionIds = session.data()?.questionIds;
    if (!Array.isArray(questionIds)) return res.status(503).json({ error: 'Unable to prepare a secure exam session.' });
    const approvedExamQuestions = selectRequiredQuestionSet(course.exam.questions, Math.min(30, course.exam.questions.length));
    if (!approvedExamQuestions?.length) return res.status(422).json({ error: 'This course has no unique approved final-exam questions yet.' });
    const byId = new Map(approvedExamQuestions.map((question) => [question.id, question]));
    const questions = questionIds.map((id) => byId.get(id)).filter((question): question is NonNullable<typeof question> => Boolean(question));
    if (questions.length !== Math.min(30, course.exam.questions.length)) return res.status(500).json({ error: 'The exam question set is incomplete.' });
    const sessionData = session.data() ?? {};
    let expiresAt = typeof sessionData.expiresAt === 'string' ? sessionData.expiresAt : '';
    if (!expiresAt) {
      expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await session.ref.set({ expiresAt }, { merge: true });
    }
    // Return the same expired session as well: the client restores its locally
    // saved selections and immediately submits them. Never create a fresh timer
    // merely because the learner refreshed after the deadline.
    return res.json({ questions: safeQuestions(questions.map((question) => ({ ...question, topic: question.topic }))), cycle, expiresAt });
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
    const expiresAt = Date.parse(String(session.data()?.expiresAt || ''));
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt + 30_000) {
      return res.status(409).json({ error: 'The 60-minute exam time has expired. Please contact your instructor if a connection issue prevented submission.' });
    }
    const approvedExamQuestions = selectRequiredQuestionSet(course.exam.questions, Math.min(30, course.exam.questions.length));
    if (!approvedExamQuestions?.length) return res.status(422).json({ error: 'This course has no unique approved final-exam questions yet.' });
    const questionById = new Map(approvedExamQuestions.map((question) => [question.id, question]));
    const questions = questionIds.map((id) => questionById.get(id)).filter((question): question is NonNullable<typeof question> => Boolean(question));
    const attemptRef = cycleDocument.collection('examAttempts').doc('final');
    // Make submission idempotent: if the server saved an attempt but the browser
    // lost the response, a retry must return that trusted result even after expiry.
    const previousAttempt = await attemptRef.get();
    if (previousAttempt.exists) {
      const savedAttempt = previousAttempt.data()!;
      const savedAnswers = (savedAttempt.answers ?? {}) as Record<string, number>;
      const savedResults = Object.fromEntries(questions.map((question) => [question.id, {
        correct: savedAnswers[question.id] === question.correctIndex,
        correctAnswerIndex: question.correctIndex,
        explanation: question.explanation,
      }]));
      return res.json({
        scorePercent: savedAttempt.scorePercent,
        passed: savedAttempt.passed,
        passingScorePercent: savedAttempt.passingScorePercent,
        results: savedResults,
        attempt: savedAttempt,
        cycle,
        alreadySubmitted: true,
      });
    }
    if (!validAnswers(questions, req.body?.answers, true)) return res.status(400).json({ error: 'Submit valid answers for the questions you attempted.' });
    const answers = req.body.answers as Record<string, number>;
    const scorePercent = scoreAnswers(questions, answers);
    const passingScorePercent = Math.max(PASS_MARK, course.exam.passingScorePercent || PASS_MARK);
    const passed = isPassingExamScore(scorePercent, passingScorePercent);
    const results = Object.fromEntries(questions.map((question) => [question.id, {
      correct: answers[question.id] === question.correctIndex,
      correctAnswerIndex: question.correctIndex,
      explanation: question.explanation,
    }]));
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
      const progressRecords = progress.docs.map((document) => document.data());
      if (!canStartFullRetake(progressRecords, totalLessons)) throw new Error('COURSE_NOT_COMPLETED');
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


router.post('/api/practice/assignments/:assignmentId/submit', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    if (!adminDb || !req.user?.uid) return res.status(503).json({ error: 'Practice assignment storage is unavailable.' });
    const uid = req.user.uid;
    const assignmentId = String(req.params.assignmentId || '');
    const courseId = typeof req.body?.courseId === 'string' ? req.body.courseId : '';
    const assignment = TRUSTED_ASSIGNMENTS.find((item) => item.id === assignmentId && item.courseId === courseId);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found in the Berry course catalogue.' });
    if (typeof req.body?.content !== 'string' || req.body.content.trim().length < 1 || req.body.content.length > 20000) {
      return res.status(400).json({ error: 'Provide assignment content between 1 and 20,000 characters.' });
    }
    const attemptNumber = Number(req.body?.attemptNumber);
    if (!Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > 20) {
      return res.status(400).json({ error: 'The assignment attempt number is invalid.' });
    }
    const submittedAt = typeof req.body?.submittedAt === 'string' ? req.body.submittedAt : new Date().toISOString();
    if (submittedAt.length > 60) return res.status(400).json({ error: 'The submission date is invalid.' });
    const record = {
      assignmentId,
      content: req.body.content.slice(0, 20000),
      submittedAt,
      attemptNumber,
      status: 'submitted',
      updatedAt: new Date().toISOString(),
    };
    await adminDb.collection('users').doc(uid).collection('practiceAssignmentSubmissions').doc(assignmentId).set(record);
    return res.json({ saved: true, submission: record });
  } catch (error) {
    console.error('Practice assignment persistence failed:', error);
    return res.status(500).json({ error: 'Unable to save this practice assignment.' });
  }
});

router.post('/api/assignments/courses/:courseId/:assignmentId/submit', requireFirebaseAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const context = await getEnrolledCourse(req, res, req.params.courseId);
    if (!context) return;
    const { course, uid } = context;
    const assignment = TRUSTED_ASSIGNMENTS.find((item) => item.courseId === course.id && item.id === req.params.assignmentId);
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
    const lessonId = assignment.id.slice(`assignment-${course.id}-`.length);
    const progressRef = cycleRef(uid, course.id, cycle).collection('lessonProgress').doc(lessonId);
    const progressSnapshot = await progressRef.get();
    const masteryAndActivitiesPassed = progressSnapshot.data()?.isMastered === true;
    const assignmentPassed = attempt.status === 'graded' && Number(attempt.scorePercent) >= 50;
    await progressRef.set({
      isCompleted: masteryAndActivitiesPassed && assignmentPassed,
      updatedAt: now,
    }, { merge: true });
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
    const lessonList = course.chapters.flatMap((chapter) => chapter.lessons);
    const [cycleSnapshot, progress, attempts, assignments, allCycles, activitySnapshots, lessonAttemptsSnapshot] = await Promise.all([
      ref.get(), ref.collection('lessonProgress').get(), ref.collection('examAttempts').get(), ref.collection('assignments').get(),
      adminDb!.collection('users').doc(uid).collection('trustedCourses').doc(course.id).collection('cycles').get(),
      Promise.all(lessonList.map((lesson) => ref.collection('lessonProgress').doc(lesson.id).collection('activities').get())),
      ref.collection('lessonAttempts').get(),
    ]);
    const historySnapshots = await Promise.all(allCycles.docs.map((cycleDocument) => cycleDocument.ref.collection('examAttempts').get()));
    const examHistory = historySnapshots.flatMap((snapshot) => snapshot.docs.map((document) => document.data()))
      .sort((left, right) => String(left.submittedAt || '').localeCompare(String(right.submittedAt || '')));
    const totalLessons = course.chapters.reduce((count, chapter) => count + chapter.lessons.length, 0);
    const progressRecords = progress.docs.map((doc) => doc.data());
    const summary = summarizeCourseProgress(progressRecords, totalLessons);
    const { courseMasteryPercent, courseCompleted } = summary;
    return res.json({
      cycle,
      courseCompleted,
      courseMasteryPercent,
      lessonProgress: Object.fromEntries(progressRecords.map((record) => [record.lessonId, record])),
      lessonAttempts: Object.fromEntries(lessonList.map((lesson) => {
        const latest = lessonAttemptsSnapshot.docs
          .map((document) => document.data())
          .filter((attempt) => attempt.lessonId === lesson.id)
          .sort((left, right) => String(right.submittedAt || '').localeCompare(String(left.submittedAt || '')))[0];
        if (!latest) return [lesson.id, null];
        const answers = latest.answers && typeof latest.answers === 'object'
          ? latest.answers as Record<string, number> : {};
        const results = Object.fromEntries(lesson.quizQuestions.map((question) => [question.id, {
          correct: answers[question.id] === question.correctIndex,
          correctAnswerIndex: question.correctIndex,
          feedback: answers[question.id] === question.correctIndex
            ? question.explanation
            : question.misconceptions?.[answers[question.id]] || 'Review this topic and try again.',
        }]));
        return [lesson.id, {
          answers,
          scorePercent: Number(latest.scorePercent) || 0,
          submittedAt: typeof latest.submittedAt === 'string' ? latest.submittedAt : '',
          results,
        }];
      }).filter((entry) => entry[1] !== null)),
      lessonActivities: Object.fromEntries(lessonList.map((lesson, index) => [
        lesson.id,
        Object.fromEntries(activitySnapshots[index].docs.map((document) => {
          const data = document.data();
          return [document.id, {
            scorePercent: Number(data.scorePercent) || 0,
            passed: data.passed === true,
            feedback: typeof data.feedback === 'string' ? data.feedback : '',
            answer: data.answer && typeof data.answer === 'object' ? data.answer : undefined,
          }];
        })),
      ])),
      examAttempts: attempts.docs.map((doc) => doc.data()),
      examHistory,
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
    const recipientName = typeof profile.name === 'string' ? profile.name.trim() : '';
    if (!recipientName) {
      return res.status(409).json({ error: 'Please complete your learner profile name before requesting a certificate.' });
    }
    const cycle = await ensureCycle(uid, course.id);
    const ref = cycleRef(uid, course.id, cycle);
    const totalLessons = course.chapters.reduce((count, chapter) => count + chapter.lessons.length, 0);
    const requiredAssignments = TRUSTED_ASSIGNMENTS.filter((assignment) => assignment.courseId === course.id && Array.isArray(assignment.rubric) && assignment.rubric.length > 0);
    const approvedInteractiveLessonCount = course.chapters.flatMap((chapter) => chapter.lessons)
      .filter((lesson) => lesson.activities.length > 0).length;

    const credentialId = `BERRY-${randomUUID().replace(/-/g, '').toUpperCase()}`;
    const certificateRef = adminDb!.collection('trustedCertificates').doc(credentialId);
    const learnerCertificateRef = adminDb!
      .collection('users').doc(uid)
      .collection('trustedCertificates').doc(course.id);

    const certificate: CertificateRecord & { uid: string; trusted: true; cycle: number } = {
      id: credentialId,
      credentialId,
      courseId: course.id,
      courseTitle: course.title,
      recipientName,
      stage: profile.stage,
      gradeLevel: course.gradeLevel,
      curriculum: course.curriculum,
      issuedDate: new Date().toISOString(),
      scorePercent: Number((await ref.get()).data()?.examScorePercent || 0),
      authority: 'Berry Learning Platform',
      verified: true,
      uid,
      trusted: true,
      cycle,
    };

    const issuance = await issueTrustedCertificateTransaction({
      db: adminDb!,
      cycleRef: ref,
      certificateRef,
      learnerCertificateRef,
      certificate,
      totalLessons,
      approvedAssignmentCount: requiredAssignments.length,
      approvedInteractiveLessonCount,
      cycle,
    });

    if (!issuance.eligible) {
      return res.status(409).json({
        eligible: false,
        unmet: issuance.unmet,
        cycle: issuance.cycle,
        courseMasteryPercent: issuance.courseMasteryPercent,
      });
    }

    return res.status(201).json({ eligible: true, certificate: issuance.certificate });
  } catch (error) {
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



