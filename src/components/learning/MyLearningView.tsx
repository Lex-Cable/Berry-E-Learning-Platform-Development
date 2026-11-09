import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Award,
  Clock,
  Sparkles,
  Play,
  RotateCcw,
  Check,
  ChevronRight,
  GraduationCap,
  FileCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  Course,
  LearnerProfile,
  LessonMasteryState,
  CertificateRecord,
} from '../../types';
import type { CurriculumRepository } from '../../curriculum/repository';
import { LessonView } from '../lessons/LessonView';
import { isLessonUnlocked } from '../../utils/mastery';
import { loadLastOpenedLesson, saveLastOpenedLesson } from '../../services/learningProgress';
import { findFallbackLesson } from '../../utils/curriculumCoverage';
import { firebaseAuth } from '../../lib/firebase';
import { getCourseExam, getCourseStatus, submitCourseExam, startCourseRetake } from '../../services/assessments';
import { clearExamDraft, readExamDraft, writeExamDraft } from '../../utils/examDraft';
import { getCourseModules, getModuleChapters } from '../../utils/courseModules';
import { ModuleExamPanel } from './ModuleExamPanel';
import type { ModuleExamAttempt } from '../../services/assessments';

interface MyLearningViewProps {
  learner: LearnerProfile;
  courses: Course[];
  curriculumRepository: CurriculumRepository;
  masteryRecords: Record<string, LessonMasteryState>;
  onSaveMastery: (record: LessonMasteryState) => void;
  onNavigateToCertificates?: () => void;
  onClaimCertificate?: (course: Course, scorePercent: number) => void;
  onExamAttemptSubmitted?: (course: Course, attempt: {
    courseId: string; examId: string; scorePercent: number; passed: boolean;
    passingScorePercent: number; answers: Record<string, number>; submittedAt: string;
  }) => void;
  examAttempts?: {
    id: string; courseId: string; examId: string; scorePercent: number; passed: boolean;
    passingScorePercent: number; answers: Record<string, number>; submittedAt: string; trusted?: boolean; cycle?: number;
  }[];
  initialCourseId?: string | null;
  onClearInitialCourse?: () => void;
  onNavigateToCourses?: () => void;
}

export const MyLearningView: React.FC<MyLearningViewProps> = ({
  learner,
  courses,
  curriculumRepository,
  masteryRecords,
  onSaveMastery,
  onNavigateToCertificates,
  onClaimCertificate,
  onExamAttemptSubmitted,
  examAttempts = [],
  initialCourseId = null,
  onClearInitialCourse,
  onNavigateToCourses,
}) => {
  // Navigation inside My Learning:
  // 1. Subject Grid (activeCourse === null)
  // 2. Course Syllabus / Table of Contents (activeCourse !== null && activeLessonId === null && !takingExam)
  // 3. Lesson View (activeCourse !== null && activeLessonId !== null)
  // 4. Final Exam View (activeCourse !== null && takingExam === true)

  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [takingExam, setTakingExam] = useState<boolean>(false);
  const [trustedAssignments, setTrustedAssignments] = useState<Record<string, { status?: string; scorePercent?: number }>>({});
  const [trustedAssignmentsLoading, setTrustedAssignmentsLoading] = useState(false);
  const [trustedLessonProgress, setTrustedLessonProgress] = useState<Record<string, LessonMasteryState>>({});
  const [trustedActivities, setTrustedActivities] = useState<Record<string, Record<string, { scorePercent: number; passed: boolean; feedback: string; answer?: { pairs?: Record<string, string>; order?: string[]; response?: string; choiceId?: string } }>>>({});
  const [trustedLessonAttempts, setTrustedLessonAttempts] = useState<Record<string, { answers: Record<string, number>; scorePercent: number; submittedAt: string; results: Record<string, { correct: boolean; correctAnswerIndex?: number; feedback?: string }> }>>({});
  const [moduleExamAttempts, setModuleExamAttempts] = useState<ModuleExamAttempt[]>([]);

  useEffect(() => {
    if (!initialCourseId) return;
    const targetCourse = courses.find((course) => course.id === initialCourseId);
    if (!targetCourse || !learner.enrolledCourseIds.includes(targetCourse.id)) return;
    let cancelled = false;
    setActiveCourse(targetCourse);
    setActiveLessonId(null);
    setTakingExam(false);
    setExamSubmitted(false);
    setExamAnswers({});
    const resume = async () => {
      const localKey = `berry_last_lesson_${learner.id}_${targetCourse.id}`;
      let savedLessonId: string | null = null;
      try { savedLessonId = localStorage.getItem(localKey); } catch { /* local resume is optional */ }
      const uid = firebaseAuth?.currentUser?.uid;
      if (uid) {
        try {
          const cloudLessonId = await loadLastOpenedLesson(uid, targetCourse.id);
          if (cloudLessonId) savedLessonId = cloudLessonId;
        } catch (error) {
          console.warn('Could not load cloud resume state; using the local copy:', error);
        }
      }
      const lessonExists = targetCourse.chapters.some((chapter) =>
        chapter.lessons.some((lesson) => lesson.id === savedLessonId)
      );
      if (!cancelled && lessonExists && savedLessonId) {
        setActiveLessonId(savedLessonId);
      } else if (!cancelled) {
        // Missing-lesson fallback: a stale or absent resume pointer must never strand
        // the learner; fall back to the first genuinely accessible lesson.
        const masteredIds = Object.entries(currentMasteryRecords)
          .filter(([, state]) => state.isMastered)
          .map(([lessonId]) => lessonId);
        const fallback = findFallbackLesson(targetCourse, masteredIds);
        if (fallback) setActiveLessonId(fallback.id);
      }
      if (!cancelled) onClearInitialCourse?.();
    };
    void resume();
    return () => { cancelled = true; };
  }, [initialCourseId, courses, learner.id, learner.enrolledCourseIds]);

  useEffect(() => {
    if (!activeCourse || !activeLessonId) return;
    const localKey = `berry_last_lesson_${learner.id}_${activeCourse.id}`;
    try { localStorage.setItem(localKey, activeLessonId); } catch { /* local resume is optional */ }
    const uid = firebaseAuth?.currentUser?.uid || learner.id;
    if (uid) {
      void saveLastOpenedLesson(uid, activeCourse.id, activeLessonId).catch((error) => {
        console.warn('Could not sync resume state; the local copy is retained:', error);
      });
    }
  }, [activeCourse, activeLessonId, learner.id]);

  useEffect(() => {
    if (!activeCourse || !learner.enrolledCourseIds.includes(activeCourse.id)) {
      setTrustedAssignments({});
      return;
    }
    let cancelled = false;
    setTrustedAssignmentsLoading(true);
    setTrustedActivities({});
    getCourseStatus(activeCourse.id)
      .then((status) => {
        if (!cancelled) {
          setTrustedAssignments(status.assignments as Record<string, { status?: string; scorePercent?: number }>);
          setTrustedLessonProgress(status.lessonProgress || {});
          setTrustedActivities(status.lessonActivities || {});
          setTrustedLessonAttempts(status.lessonAttempts || {});
        }
      })
      .catch((error) => {
        if (!cancelled) console.warn('Could not refresh trusted topic assignments:', error);
      })
      .finally(() => { if (!cancelled) setTrustedAssignmentsLoading(false); });
    return () => { cancelled = true; };
  }, [activeCourse?.id, activeLessonId, learner.id, learner.enrolledCourseIds.join('|')]);

  // Grade filter (defaults to learner's current grade level, e.g. Grade 1, Grade 7, Grade 10, PP1, Bachelor Year 2)
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  // Exam state
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examQuestions, setExamQuestions] = useState<import('../../types').ExamQuestion[]>([]);
  const [examResults, setExamResults] = useState<Record<string, { correct: boolean; correctAnswerIndex?: number; explanation?: string }>>({});
  const [examLoading, setExamLoading] = useState(false);
  const [examExpiresAt, setExamExpiresAt] = useState<string | null>(null);
  const [examTimeRemaining, setExamTimeRemaining] = useState(60 * 60);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examError, setExamError] = useState<string | null>(null);
  const [retakeLoading, setRetakeLoading] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [examScore, setExamScore] = useState<number>(0);
  const [examPassed, setExamPassed] = useState<boolean>(false);
  const autoSubmitAttemptedRef = useRef(false);

  const currentMasteryRecords: Record<string, LessonMasteryState> = { ...masteryRecords, ...trustedLessonProgress };
  const examDraftKey = activeCourse ? `berry_exam_draft_${learner.id}_${activeCourse.id}` : '';

  // Available grade options based on learner stage
  // My Learning must show only courses this learner has actually enrolled in.
  const enrolledCourses = curriculumRepository.entries
    .filter(({ course }) => learner.enrolledCourseIds.includes(course.id))
    .map(({ course }) => course);
  const availableGrades = Array.from(new Set(enrolledCourses.map((course) => course.gradeLevel)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Grade filters apply to the learner's enrolled courses, not the global catalogue.
  const gradeCourses = enrolledCourses.filter((course) =>
    gradeFilter === 'all' || course.gradeLevel === gradeFilter
  );

  // Calculate course mastery stats
  const getCourseProgress = (course: Course) => {
    let totalLessons = 0;
    let completedCount = 0;
    course.chapters.forEach((chap) => {
      chap.lessons.forEach((les) => {
        totalLessons++;
        if (currentMasteryRecords[les.id]?.isCompleted === true) completedCount++;
      });
    });
    const percent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    return { totalLessons, masteredCount: completedCount, percent };
  };

  const handleOpenSubject = (course: Course) => {
    setActiveCourse(course);
    setActiveLessonId(null);
    setTakingExam(false);
    setExamSubmitted(false);
    setExamAnswers({});
  };

  const handleStartExam = () => {
    setTakingExam(true);
    setActiveLessonId(null);
    setExamSubmitted(false);
  };
  useEffect(() => {
    if (!takingExam || !activeCourse?.exam) return;
    let cancelled = false;
    setExamLoading(true); setExamError(null); setExamQuestions([]);
    getCourseStatus(activeCourse.id).then(async (status) => {
      if (cancelled) return;
      const attempts = status.examAttempts || [];
      const existing = attempts[attempts.length - 1];
      if (existing && (existing.passed || attempts.length >= 2)) {
        try { clearExamDraft(localStorage, `berry_exam_draft_${learner.id}_${activeCourse.id}`); } catch { /* draft cleanup is optional */ }
        setExamScore(existing.scorePercent); setExamPassed(existing.passed); setExamSubmitted(true);
        setExamError(existing.passed ? 'The final examination has been passed.' : 'Both final-examination attempts have been used. Start a full course retake when eligible.');
        return;
      }
      const exam = await getCourseExam(activeCourse.id);
      if (!cancelled) {
        setExamQuestions(exam.questions);
        setExamExpiresAt(exam.expiresAt);
        setExamAnswers(readExamDraft(localStorage, `berry_exam_draft_${learner.id}_${activeCourse.id}`, exam.expiresAt));
        setExamTimeRemaining(Math.max(0, Math.ceil((Date.parse(exam.expiresAt) - Date.now()) / 1000)));
      }
    }).catch((error) => { if (!cancelled) setExamError(error instanceof Error ? error.message : 'Unable to load exam.'); })
      .finally(() => { if (!cancelled) setExamLoading(false); });
    return () => { cancelled = true; };
  }, [takingExam, activeCourse?.id, learner.id]);

  // Preserve in-progress answers across refreshes, but only for the exact active
  // server-issued exam session. Expired sessions and retakes cannot reuse a draft.
  useEffect(() => {
    if (!takingExam || examSubmitted || !examExpiresAt || !examDraftKey) return;
    try {
      writeExamDraft(localStorage, examDraftKey, examAnswers, examExpiresAt);
    } catch (error) {
      console.warn('Could not save the local exam draft:', error);
    }
  }, [takingExam, examSubmitted, examExpiresAt, examDraftKey, examAnswers]);

  const handleSubmitExam = async () => {
    if (!activeCourse?.exam || examSubmitting || examLoading || !examQuestions.length) return;
    setExamSubmitting(true); setExamError(null);
    try {
      const result = await submitCourseExam(activeCourse.id, examAnswers);
      setExamScore(result.scorePercent); setExamPassed(result.passed); setExamResults(result.results); setExamSubmitted(true);
      try { clearExamDraft(localStorage, examDraftKey); } catch { /* submitted result is authoritative */ }
      onExamAttemptSubmitted?.(activeCourse, result.attempt);
    } catch (error) {
      setExamError(error instanceof Error ? error.message : 'Exam submission failed.');
    } finally { setExamSubmitting(false); }
  };

  useEffect(() => {
    autoSubmitAttemptedRef.current = false;
  }, [examExpiresAt]);

  useEffect(() => {
    if (!takingExam || examSubmitted || !examExpiresAt) return;
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((Date.parse(examExpiresAt) - Date.now()) / 1000));
      setExamTimeRemaining(remaining);
      if (remaining === 0) {
        setExamError('The 60-minute exam time has expired. Submit the answers you have selected.');
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [takingExam, examSubmitted, examExpiresAt]);

  useEffect(() => {
    if (!takingExam || examSubmitted || examTimeRemaining !== 0 || examSubmitting || !examQuestions.length || autoSubmitAttemptedRef.current) return;
    autoSubmitAttemptedRef.current = true;
    void handleSubmitExam();
  }, [takingExam, examSubmitted, examTimeRemaining, examSubmitting, examQuestions.length]);

  const handleStartFullRetake = async () => {
    if (!activeCourse || retakeLoading) return;
    setRetakeLoading(true); setExamError(null);
    try {
      await startCourseRetake(activeCourse.id);
      try { clearExamDraft(localStorage, examDraftKey); } catch { /* draft cleanup is optional */ }
      setExamSubmitted(false); setExamAnswers({}); setExamResults({}); setExamScore(0); setExamPassed(false);
      setTakingExam(false);
    } catch (error) {
      setExamError(error instanceof Error ? error.message : 'Unable to start the full course retake.');
    } finally { setRetakeLoading(false); }
  };

  const courseExamAttempts = examAttempts.filter(
    (attempt) => activeCourse && attempt.courseId === activeCourse.id,
  );
  const bestPreviousAttempt = courseExamAttempts.reduce<number | null>((best, attempt) => {
    if (!attempt.passed) return best;
    return best === null || attempt.scorePercent > best ? attempt.scorePercent : best;
  }, null);

  // ==========================================
  // LEVEL 3: ACTIVE LESSON VIEW
  // ==========================================
  if (activeCourse && activeLessonId) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setActiveLessonId(null)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Course Syllabus ({activeCourse.subject})</span>
        </button>

        <LessonView
          course={activeCourse}
          lessonId={activeLessonId}
          onNavigateLesson={(nextId) => setActiveLessonId(nextId)}
          onBackToCourse={() => setActiveLessonId(null)}
          masteryRecord={currentMasteryRecords[activeLessonId]}
          savedActivityResults={trustedActivities[activeLessonId] || {}}
          savedMasteryAnswers={trustedLessonAttempts[activeLessonId]?.answers || {}}
          savedMasteryResults={trustedLessonAttempts[activeLessonId]?.results || {}}
          savedMasterySubmitted={Boolean(trustedLessonAttempts[activeLessonId]?.submittedAt)}
          onSaveMastery={(record) => {
            setTrustedLessonProgress((current) => ({ ...current, [record.lessonId]: record }));
            onSaveMastery(record);
          }}
          canAdvanceToNextLesson={currentMasteryRecords[activeLessonId]?.isMastered === true && currentMasteryRecords[activeLessonId]?.isCompleted === true}
          userId={learner.id}
        />
      </div>
    );
  }

  // ==========================================
  // LEVEL 4: GRADE FINAL EXAM VIEW
  // ==========================================
  if (activeCourse && takingExam && activeCourse.exam) {
    const exam = activeCourse.exam;

    return (
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        {/* Exam Navigation Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setTakingExam(false)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Syllabus</span>
          </button>

          <span className="text-xs font-semibold text-slate-500">
            {activeCourse.gradeLevel} • {activeCourse.subject}
          </span>
        </div>

        {/* Exam Header Banner */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
            <Award size={14} className="text-blue-600" />
            <span>Berry Course Final Assessment</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{exam.title}</h2>
          <p className="text-xs text-slate-500">
            Passing threshold: <strong>50%</strong>. Two attempts are available. Passing this exam records
            a Berry course assessment record. Berry records are not government-issued or externally accredited qualifications.
          </p>
        </div>

        {/* Attempt history from persisted records */}
        {courseExamAttempts.length > 0 && (
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs text-xs space-y-2">
            <span className="font-bold text-slate-800">Previous attempts ({courseExamAttempts.length})</span>
            <div className="flex flex-wrap gap-2">
              {courseExamAttempts.map((attempt) => (
                <span
                  key={attempt.id}
                  className={`px-2.5 py-1 rounded-full font-bold ${
                    attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {attempt.scorePercent}% • {new Date(attempt.submittedAt).toLocaleDateString()} • {attempt.trusted ? 'Verified' : 'Legacy / unverified'} {attempt.passed ? 'passed' : 'not passed'}
                </span>
              ))}
            </div>
            {bestPreviousAttempt !== null && (
              <p className="text-[11px] text-slate-500">Best passing score so far: {bestPreviousAttempt}%.</p>
            )}
          </div>
        )}

        {/* Results Card if submitted */}
        {examSubmitted && (
          <div
            className={`p-6 md:p-8 rounded-3xl border shadow-sm space-y-4 ${
              examPassed
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50/70 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                    examPassed ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {examScore}%
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">
                    {examPassed
                      ? 'Congratulations! You Demonstrated Full Mastery! 🎉'
                      : 'Exam Completed — Review Recommended'}
                  </h3>
                  <p className="text-xs opacity-90">
                    {examPassed
                      ? 'You passed this course assessment. Any Berry learning record is not an official Kenyan CBC qualification.'
                      : `You scored ${examScore}%. You need 50% to pass the final examination. The overall course grade and all required components must also be passed for a certificate.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!examPassed && courseExamAttempts.length < 2 && <button type="button" onClick={async () => { setExamLoading(true); setExamError(null); setExamSubmitted(false); setExamAnswers({}); setExamResults({}); try { const next = await getCourseExam(activeCourse.id); setExamQuestions(next.questions); setExamExpiresAt(next.expiresAt); setExamTimeRemaining(Math.max(0, Math.ceil((Date.parse(next.expiresAt)-Date.now())/1000))); } catch (error) { setExamError(error instanceof Error ? error.message : 'Unable to start the next attempt.'); } finally { setExamLoading(false); } }} disabled={examLoading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-xs"><RotateCcw size={14}/><span>{examLoading?'Preparing next attempt…':'Try final examination again'}</span></button>}
              {(examPassed || courseExamAttempts.length >= 2) && <button onClick={handleStartFullRetake} disabled={retakeLoading} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-xs"><RotateCcw size={14}/><span>{retakeLoading?'Preparing full retake…':'Start Full Course Retake'}</span></button>}

              {examPassed && onNavigateToCertificates && (
                <button
                  onClick={onNavigateToCertificates}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  <Award size={16} />
                  <span>View Berry Learning Record</span>
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-xs font-bold text-amber-900">Final exam time remaining</p>
            <p className="text-[11px] text-amber-800">One-hour timed assessment</p>
          </div>
          <span role="timer" aria-live="off" className="font-mono text-xl font-black tabular-nums text-amber-950">
            {String(Math.floor(examTimeRemaining / 3600)).padStart(2, '0')}:{String(Math.floor((examTimeRemaining % 3600) / 60)).padStart(2, '0')}:{String(examTimeRemaining % 60).padStart(2, '0')}
          </span>
        </div>

        {/* Exam Questions */}
        <div className="space-y-4">
          {examLoading ? <p>Loading secure exam questions…</p> : examError && !examQuestions.length ? <p role="alert">{examError}</p> : examQuestions.map((q, idx) => {
            const selectedOpt = examAnswers[q.id];
            const result = examResults[q.id];
            const isCorrect = result?.correct === true;

            return (
              <div
                key={q.id}
                className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-100 font-bold text-slate-700 text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      {q.topic}
                    </span>
                  </div>

                  {examSubmitted && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isCorrect ? 'Correct (+1)' : 'Incorrect'}
                    </span>
                  )}
                </div>

                <p className="font-bold text-sm text-slate-900">{q.question}</p>

                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    return (
                      <button
                        key={optIdx}
                        disabled={examSubmitted}
                        onClick={() =>
                          setExamAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                        }
                        className={`w-full text-left p-3 rounded-2xl text-xs font-medium border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'bg-purple-50 border-purple-400 text-purple-950 font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        } ${
                          examSubmitted && result?.correctAnswerIndex === optIdx
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                            : ''
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check size={14} className="text-purple-600" />}
                      </button>
                    );
                  })}
                </div>

                {examSubmitted && (
                  <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-600 border border-slate-200/80">
                    <span className="font-bold text-slate-800">Explanation: </span>
                    {result?.explanation || 'Review the related lesson notes.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {examError && <p role="alert">{examError}</p>}
        {/* Submit Bar */}
        {!examSubmitted && (
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Answered: {Object.keys(examAnswers).length} of {examQuestions.length} questions
            </span>
            <button
              onClick={handleSubmitExam}
              disabled={examSubmitting || examLoading || (Object.keys(examAnswers).length < examQuestions.length && examTimeRemaining > 0) || !examQuestions.length}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              {examSubmitting ? 'Submitting securely…' : examTimeRemaining === 0 ? 'Submit Saved Answers' : 'Submit & Grade Exam'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // LEVEL 2: COURSE SYLLABUS & TABLE OF CONTENTS
  // ==========================================
  if (activeCourse && !activeLessonId && !takingExam) {
    const progress = getCourseProgress(activeCourse);
    const completedLessonIds = Object.keys(currentMasteryRecords).filter(
      (id) => currentMasteryRecords[id]?.isCompleted === true
    );
    const masteredLessonIds = Object.keys(currentMasteryRecords).filter(
      (id) => currentMasteryRecords[id]?.isMastered
    );

    return (
      <div className="space-y-6 pb-12 max-w-7xl mx-auto">
        {/* Navigation Breadcrumb */}
        <button
          onClick={() => setActiveCourse(null)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to All Enrolled Subjects</span>
        </button>

        {/* Course Banner */}
        <div
          className={`p-6 md:p-8 rounded-3xl bg-gradient-to-tr ${activeCourse.bannerColor} text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6`}
        >
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold border border-white/20">
                {activeCourse.badgeText}
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/20 text-xs font-medium">
                {activeCourse.gradeLevel}
              </span>
            </div>

            <h2 className="text-2xl md:text-3xl font-black leading-tight">
              {activeCourse.title}
            </h2>

            <p className="text-xs md:text-sm text-white/90 leading-relaxed">
              {activeCourse.description}
            </p>
          </div>

          <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center flex-shrink-0 min-w-[160px]">
            <span className="text-3xl font-black">{progress.percent}%</span>
            <span className="text-[11px] block text-white/80 font-medium">Subject Mastery</span>
            <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Course introduction, objectives and assessment policy */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3"><BookOpen size={17} className="text-purple-600" /><h3 className="font-extrabold text-slate-900">Course introduction</h3></div>
            <p className="text-sm leading-6 text-slate-600">{activeCourse.description}</p>
            <div className="mt-5"><h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-2">Learning objectives</h4>
              {activeCourse.objectives.length ? <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">{activeCourse.objectives.map((objective, index) => <li key={index} className="flex gap-2 text-xs leading-5 text-slate-700"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" />{objective}</li>)}</ul> : <p className="text-xs text-slate-500">Learning objectives will be added for this course.</p>}
            </div>
            {activeCourse.prerequisites.length > 0 && <div className="mt-4"><h4 className="text-xs font-extrabold uppercase tracking-wide text-slate-500 mb-1">Prerequisites</h4><p className="text-xs text-slate-600">{activeCourse.prerequisites.join(' • ')}</p></div>}
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-3"><FileCheck size={17} className="text-purple-600" /><h3 className="font-extrabold text-slate-900">Assessment policy</h3></div>
            <p className="text-[11px] text-slate-500 mb-3">Current Berry grading thresholds</p>
            <div className="space-y-2 text-xs">{[['Chapter assessment','70%'],['Chapter assignment','50%'],['Module examination','60%'],['Final examination','50%'],['Overall course grade','60%']].map(([label, value]) => <div key={label} className="flex justify-between gap-2 border-b border-slate-100 pb-2"><span className="text-slate-600">{label}</span><strong className="text-slate-900">{value}</strong></div>)}</div>
            <p className="text-[10px] text-slate-400 mt-3">Practice is formative; 80% is the recommended mastery target.</p>
          </section>
        </div>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-3 mb-3"><h3 className="font-extrabold text-sm text-slate-900">Proposed assessment weighting</h3><span className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-2.5 py-1">Default policy</span></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[['Chapter assessments','10%'],['Assignments & projects','30%'],['Module examinations','25%'],['Final examination','35%']].map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-3"><strong className="block text-xl text-purple-700">{value}</strong><span className="text-[11px] text-slate-600">{label}</span></div>)}</div>
          <p className="text-[10px] text-slate-400 mt-3">These are the proposed default weights. Course-specific configuration and the complete module examination system are still required before these can determine official grades.</p>
        </section>

        {/* Final Exam Callout Banner */}
        {activeCourse.exam && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Official CBC Competency Exam
                </span>
              </div>
              <h3 className="font-extrabold text-lg text-white">
                {activeCourse.exam.title}
              </h3>
              <p className="text-xs text-purple-200">
                Score {activeCourse.exam.passingScorePercent}% or higher to unlock the verified credential.
              </p>
            </div>

            <button
              onClick={handleStartExam}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-all active:scale-95 flex-shrink-0"
            >
              <span>Take Final Exam</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* Course Syllabus / Table of Contents */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-slate-900">Course Syllabus & Chapters</h3>
            <span className="text-xs text-slate-500">
              {activeCourse.chapters.length} Chapters • {progress.totalLessons} Lessons
            </span>
          </div>

          <div className="space-y-4">

            {getCourseModules(activeCourse).map((module) => (
              <section key={module.id} className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs space-y-4">
                <div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-600">Module {module.order}</span><h4 className="font-extrabold text-base text-slate-900">{module.title}</h4><p className="text-xs text-slate-500 mt-1">{module.description}</p></div><span className="text-[10px] font-bold rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{getModuleChapters(activeCourse,module).length} chapters</span></div>
                <div className="space-y-4">
                  {getModuleChapters(activeCourse,module).map((chapter) => (
                    <div key={chapter.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
                      <div><h5 className="font-bold text-sm text-slate-900">{chapter.title}</h5><p className="text-xs text-slate-500 mt-0.5">{chapter.description}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold"><span className="rounded-full bg-white px-2.5 py-1 text-slate-600">{chapter.lessons.filter((lesson) => currentMasteryRecords[lesson.id]?.isMastered).length}/{chapter.lessons.length} lessons mastered</span>{chapter.lessons.length > 0 && chapter.lessons.every((lesson) => currentMasteryRecords[lesson.id]?.isCompleted === true) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800"><CheckCircle2 size={12}/> Chapter completed</span>}</div></div>
                      <div className="space-y-2">{chapter.lessons.map((lesson) => {
                        const isPrerequisiteUnlocked = isLessonUnlocked(lesson, completedLessonIds, masteredLessonIds);
                        const orderedLessons = activeCourse.chapters.flatMap((item) => item.lessons);
                        const lessonIndex = orderedLessons.findIndex((item) => item.id === lesson.id);
                        const previousLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1] : undefined;
                        const previousAssignment = previousLesson ? trustedAssignments[`assignment-${activeCourse.id}-${previousLesson.id}`] : undefined;
                        const previousTopicComplete = !previousLesson || (currentMasteryRecords[previousLesson.id]?.isMastered === true && currentMasteryRecords[previousLesson.id]?.isCompleted === true && previousAssignment?.status === 'graded' && Number(previousAssignment.scorePercent) >= 50);
                        const isUnlocked = isPrerequisiteUnlocked && previousTopicComplete && !trustedAssignmentsLoading;
                        const mastery = currentMasteryRecords[lesson.id];
                        return <div key={lesson.id} onClick={() => { if (isUnlocked) setActiveLessonId(lesson.id); }} className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${isUnlocked?'bg-white border-slate-200 hover:border-purple-300 cursor-pointer':'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed'}`}><div className="flex items-center gap-3"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mastery?.isMastered?'bg-emerald-100 text-emerald-700':isUnlocked?'bg-purple-100 text-purple-700':'bg-slate-200 text-slate-500'}`}>{mastery?.isMastered?<CheckCircle2 size={16}/>:isUnlocked?<Play size={14}/>:<Lock size={14}/>}</div><div><span className="font-bold text-xs text-slate-900 block">{lesson.title}</span><span className="text-[10px] text-slate-400">{lesson.durationMinutes} mins · {lesson.quizQuestions.length} practice questions</span></div></div><span className="text-[10px] font-bold text-slate-600">{mastery?.isCompleted?'Completed':mastery?.isMastered?'Assignment pending':isUnlocked?'Start lesson':trustedAssignmentsLoading?'Checking':'Locked'}</span></div>;
                      })}</div>
                    </div>
                  ))}
                </div>
                {module.examination && <ModuleExamPanel courseId={activeCourse.id} module={module} attempts={moduleExamAttempts} onAttemptSaved={(attempt) => setModuleExamAttempts((current) => [...current, attempt])}/>}
              </section>
            ))}

          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // LEVEL 1: ENROLLED SUBJECTS GRID (DEFAULT)
  // ==========================================
  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <BookOpen size={14} className="text-purple-600" />
            <span>Enrolled Subjects & CBC Courses</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            My Learning Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Choose a subject to explore its chapters, interactive lessons, hands-on activities, and national CBC final assessment.
          </p>
        </div>

        {/* Grade Filter Pill */}
        {enrolledCourses.length > 0 && <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
          <span className="text-slate-400 px-2">Grade:</span>
          {availableGrades.map((g) => (
            <button
              key={g}
              onClick={() => setGradeFilter(g)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                gradeFilter === g
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              {g}
            </button>
          ))}
          <button
            onClick={() => setGradeFilter('all')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              gradeFilter === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            All
          </button>
        </div>}

        {enrolledCourses.length === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-8 md:p-12 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4"><BookOpen size={26} /></div>
            <h3 className="text-lg font-black text-slate-900">Your learning journey starts here</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">You have not enrolled in a course yet. Explore the course catalogue and enrol to see your courses here.</p>
            {onNavigateToCourses && <button type="button" onClick={onNavigateToCourses} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm px-5 py-3"><BookOpen size={16} /> Explore courses <ChevronRight size={16} /></button>}
          </div>
        )}
      </div>

      {/* =========================================
          SUBJECT GRID
          ========================================= */}
      {gradeCourses.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gradeCourses.map((course) => {
          const progress = getCourseProgress(course);

          return (
            <div
              key={course.id}
              onClick={() => handleOpenSubject(course)}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col group"
            >
              {/* Subject Banner Header */}
              <div
                className={`h-32 bg-gradient-to-tr ${course.bannerColor} p-4 flex flex-col justify-between text-white relative`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-wide uppercase border border-white/20">
                    {course.gradeLevel}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-black/20 text-[10px] font-medium">
                    {course.estimatedHours} hrs
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-white/80 block uppercase tracking-wider">
                    {course.subject}
                  </span>
                  <h3 className="font-black text-lg text-white leading-tight line-clamp-1">
                    {course.title.split(':')[0]}
                  </h3>
                </div>
              </div>

              {/* Subject Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {course.description}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-600">
                      {course.chapters.length} Chapters
                    </span>
                    <span>•</span>
                    <span>{progress.totalLessons} Lessons</span>
                    {course.exam && (
                      <>
                        <span>•</span>
                        <span className="text-purple-600 font-bold">1 Final Exam</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Open CTA */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Mastery Progress</span>
                      <span className="font-bold text-slate-700">{progress.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-purple-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold text-purple-600 group-hover:text-purple-800">
                    <span>Open Subject Course</span>
                    <ArrowRight
                      size={15}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>}
      {enrolledCourses.length > 0 && gradeCourses.length === 0 && (
        <div className="text-center rounded-3xl border border-dashed border-slate-300 bg-white p-8">
          <p className="text-sm text-slate-600">You have no enrolled courses for this grade.</p>
          <button type="button" onClick={() => setGradeFilter('all')} className="mt-3 text-sm font-bold text-purple-700 hover:text-purple-900">Show all my courses</button>
        </div>
      )}
    </div>
  );
};
