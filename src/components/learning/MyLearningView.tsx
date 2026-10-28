import React, { useEffect, useState } from 'react';
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
import { LessonView } from '../lessons/LessonView';
import { isLessonUnlocked } from '../../utils/mastery';

interface MyLearningViewProps {
  learner: LearnerProfile;
  courses: Course[];
  masteryRecords: Record<string, LessonMasteryState>;
  onSaveMastery: (record: LessonMasteryState) => void;
  onNavigateToCertificates?: () => void;
  onClaimCertificate?: (course: Course, scorePercent: number) => void;
  initialCourseId?: string | null;
  onClearInitialCourse?: () => void;
  onNavigateToCourses?: () => void;
}

export const MyLearningView: React.FC<MyLearningViewProps> = ({
  learner,
  courses,
  masteryRecords,
  onSaveMastery,
  onNavigateToCertificates,
  onClaimCertificate,
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

  useEffect(() => {
    if (!initialCourseId) return;
    const targetCourse = courses.find((course) => course.id === initialCourseId);
    if (!targetCourse || !learner.enrolledCourseIds.includes(targetCourse.id)) return;
    setActiveCourse(targetCourse);
    setActiveLessonId(null);
    setTakingExam(false);
    setExamSubmitted(false);
    setExamAnswers({});
    onClearInitialCourse?.();
  }, [initialCourseId, courses, learner.enrolledCourseIds]);

  // Grade filter (defaults to learner's current grade level, e.g. Grade 1, Grade 7, Grade 10, PP1, Bachelor Year 2)
  const [gradeFilter, setGradeFilter] = useState<string>(learner.gradeLevel);

  // Exam state
  const [examAnswers, setExamAnswers] = useState<Record<string, number>>({});
  const [examSubmitted, setExamSubmitted] = useState<boolean>(false);
  const [examScore, setExamScore] = useState<number>(0);
  const [examPassed, setExamPassed] = useState<boolean>(false);

  // Available grade options based on learner stage
  // My Learning must show only courses this learner has actually enrolled in.
  const enrolledCourses = courses.filter((course) => learner.enrolledCourseIds.includes(course.id));
  const availableGrades = Array.from(new Set(enrolledCourses.map((course) => course.gradeLevel)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  // Grade filters apply to the learner's enrolled courses, not the global catalogue.
  const gradeCourses = enrolledCourses.filter((course) =>
    gradeFilter === 'all' || course.gradeLevel === gradeFilter
  );

  // Calculate course mastery stats
  const getCourseProgress = (course: Course) => {
    let totalLessons = 0;
    let masteredCount = 0;
    course.chapters.forEach((chap) => {
      chap.lessons.forEach((les) => {
        totalLessons++;
        if (masteryRecords[les.id]?.isMastered) {
          masteredCount++;
        }
      });
    });
    const percent = totalLessons > 0 ? Math.round((masteredCount / totalLessons) * 100) : 0;
    return { totalLessons, masteredCount, percent };
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
    setExamAnswers({});
  };

  const handleSubmitExam = () => {
    if (!activeCourse || !activeCourse.exam) return;
    const questions = activeCourse.exam.questions;
    let correct = 0;
    questions.forEach((q) => {
      if (examAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    const calculatedScore = Math.round((correct / questions.length) * 100);
    const passed = calculatedScore >= (activeCourse.exam.passingScorePercent || 75);

    setExamScore(calculatedScore);
    setExamPassed(passed);
    setExamSubmitted(true);

    if (passed && onClaimCertificate) {
      onClaimCertificate(activeCourse, calculatedScore);
    }
  };

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
          masteryRecord={masteryRecords[activeLessonId]}
          onSaveMastery={onSaveMastery}
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
            <span>Official Kenyan CBC Final Assessment</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{exam.title}</h2>
          <p className="text-xs text-slate-500">
            Passing threshold: <strong>{exam.passingScorePercent}%</strong>. Passing this exam awards
            a Berry course assessment record. Berry records are not government-issued or externally accredited qualifications.
          </p>
        </div>

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
                      : `You scored ${examScore}%. You need ${exam.passingScorePercent}% to earn the verified certificate.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  setExamSubmitted(false);
                  setExamAnswers({});
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 hover:bg-slate-50 shadow-xs"
              >
                <RotateCcw size={14} />
                <span>Retake Exam</span>
              </button>

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

        {/* Exam Questions */}
        <div className="space-y-4">
          {exam.questions.map((q, idx) => {
            const selectedOpt = examAnswers[q.id];
            const isCorrect = selectedOpt === q.correctIndex;

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
                          examSubmitted && optIdx === q.correctIndex
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
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Bar */}
        {!examSubmitted && (
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Answered: {Object.keys(examAnswers).length} of {exam.questions.length} questions
            </span>
            <button
              onClick={handleSubmitExam}
              disabled={Object.keys(examAnswers).length < exam.questions.length}
              className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              Submit & Grade Exam
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
    const completedLessonIds = Object.keys(masteryRecords).filter(
      (id) => masteryRecords[id]?.isCompleted
    );
    const masteredLessonIds = Object.keys(masteryRecords).filter(
      (id) => masteryRecords[id]?.isMastered
    );

    return (
      <div className="space-y-6 pb-12 max-w-5xl mx-auto">
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
            {activeCourse.chapters.map((chapter) => (
              <div
                key={chapter.id}
                className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4"
              >
                <div>
                  <h4 className="font-bold text-base text-slate-900">{chapter.title}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{chapter.description}</p>
                </div>

                <div className="space-y-2">
                  {chapter.lessons.map((lesson) => {
                    const isUnlocked = isLessonUnlocked(
                      lesson,
                      completedLessonIds,
                      masteredLessonIds
                    );
                    const mastery = masteryRecords[lesson.id];
                    const isMastered = mastery?.isMastered;

                    return (
                      <div
                        key={lesson.id}
                        onClick={() => {
                          if (isUnlocked) setActiveLessonId(lesson.id);
                        }}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                          isUnlocked
                            ? 'bg-slate-50/70 border-slate-200 hover:border-purple-300 hover:bg-white cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200/60 opacity-60 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                              isMastered
                                ? 'bg-emerald-100 text-emerald-700'
                                : isUnlocked
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {isMastered ? (
                              <CheckCircle2 size={18} />
                            ) : isUnlocked ? (
                              <Play size={15} />
                            ) : (
                              <Lock size={15} />
                            )}
                          </div>

                          <div>
                            <span className="font-bold text-xs text-slate-900 block">
                              {lesson.title}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                              <span>{lesson.durationMinutes} mins</span>
                              <span>•</span>
                              <span>{lesson.quizQuestions.length} Practice Questions</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {isMastered ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                              Mastered (100%)
                            </span>
                          ) : isUnlocked ? (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800">
                              Start Lesson
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-200 text-slate-600">
                              Prerequisite Locked
                            </span>
                          )}
                          {isUnlocked && <ChevronRight size={16} className="text-slate-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
