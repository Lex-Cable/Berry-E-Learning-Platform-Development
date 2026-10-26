import React from 'react';
import {
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Flame,
  HelpCircle,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { LearnerProfile, Course, TaskItem, AppNotification, LessonMasteryState } from '../../types';

interface DashboardViewProps {
  learner: LearnerProfile;
  courses: Course[];
  tasks: TaskItem[];
  notifications: AppNotification[];
  masteryRecords: Record<string, LessonMasteryState>;
  onSelectCourse: (course: Course) => void;
  onOpenLesson: (course: Course, lessonId: string) => void;
  onNavigate: (view: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  learner,
  courses,
  tasks,
  notifications,
  masteryRecords,
  onSelectCourse,
  onOpenLesson,
  onNavigate,
}) => {
  // Find current enrolled courses
  const enrolled = courses.filter((c) => learner.enrolledCourseIds.includes(c.id));
  const activeCourse = enrolled[0] || courses[0];

  // Stage theme variations
  const stageBannerStylesMap: Record<
    string,
    { gradient: string; greeting: string; sub: string; mascot: string }
  > = {
    early: {
      gradient: 'from-amber-300 via-yellow-400 to-orange-400 text-slate-900',
      greeting: `Jambo, ${learner.name}! 🎈 Welcome to Berry Early!`,
      sub: `Playing with numbers, animal sounds, and happy stars in ${learner.gradeLevel}!`,
      mascot: '🦁',
    },
    junior: {
      gradient: 'from-emerald-500 via-teal-600 to-cyan-700 text-white',
      greeting: `Jambo, ${learner.name}! 🌟 Ready for today's learning adventure?`,
      sub: `Exploring Kenyan CBC ${learner.gradeLevel} with foundational subjects and demonstrated mastery.`,
      mascot: '📚',
    },
    senior: {
      gradient: 'from-blue-600 via-indigo-600 to-purple-700 text-white',
      greeting: `Welcome back, ${learner.name}`,
      sub: `Kenyan Senior Secondary (CBC ${learner.gradeLevel}) • ${learner.seniorPathway?.toUpperCase() || 'STEM'} Pathway`,
      mascot: '🔬',
    },
    advance: {
      gradient: 'from-purple-800 via-indigo-900 to-slate-900 text-white',
      greeting: `Higher Education & Professional Workspace — ${learner.name}`,
      sub: `${
        learner.advanceTrack === 'professional'
          ? 'Executive & Technical Competencies • Enterprise ML & Cloud'
          : 'Undergraduate Modules • Algorithms, Math & Live Lecture Transcription'
      }`,
      mascot: '🎓',
    },
    university: {
      gradient: 'from-purple-800 via-indigo-900 to-slate-900 text-white',
      greeting: `Academic Portal — ${learner.name}`,
      sub: `Undergraduate Studies • Semester 1 Modules & Independent Research`,
      mascot: '🎓',
    },
    professionals: {
      gradient: 'from-slate-800 via-cyan-950 to-slate-900 text-white',
      greeting: `Professional Workspace — ${learner.name}`,
      sub: `Workplace Competencies & Industry-Verified Learning Pathways`,
      mascot: '💼',
    },
  };

  const stageBannerStyles = stageBannerStylesMap[learner.stage] || stageBannerStylesMap.junior;

  // Outstanding tasks
  const pendingTasks = tasks.filter((t) => t.status !== 'completed').slice(0, 3);

  // Calculate demonstrated mastery stats
  const totalMasteredLessons = Object.values(masteryRecords).filter((m) => m.isMastered).length;
  const lessonsNeedingRevision = Object.values(masteryRecords).filter((m) => !m.isMastered && m.attemptsCount > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Personalized Stage Hero Banner */}
      <div
        className={`relative overflow-hidden rounded-3xl p-6 md:p-8 text-white shadow-lg bg-gradient-to-r ${stageBannerStyles.gradient}`}
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3 border border-white/20">
            <span className="text-base">{stageBannerStyles.mascot}</span>
            <span>{learner.country} • {learner.curriculum === 'kenya_cbc' ? 'KICD CBC Aligned' : 'International'}</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            {stageBannerStyles.greeting}
          </h2>
          <p className="mt-2 text-white/90 text-sm md:text-base font-medium">
            {stageBannerStyles.sub}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                if (activeCourse && activeCourse.chapters[0]?.lessons[0]) {
                  onOpenLesson(activeCourse, activeCourse.chapters[0].lessons[0].id);
                }
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-sm shadow hover:bg-slate-50 transition-all active:scale-95"
            >
              <Play size={16} className="fill-slate-900" />
              <span>Continue Learning</span>
            </button>

            <button
              onClick={() => onNavigate('courses')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-sm backdrop-blur-sm transition-all border border-white/20"
            >
              <Compass size={16} />
              <span>Explore Course Catalogue</span>
            </button>
          </div>
        </div>

        {/* Motivational Streak Widget */}
        <div className="hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex-col items-center justify-center min-w-[140px] text-center">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 text-amber-300 flex items-center justify-center mb-1">
            <Flame size={28} className="fill-amber-400" />
          </div>
          <span className="text-2xl font-black">{learner.learningStreakDays} Days</span>
          <span className="text-xs text-white/80 font-medium">Learning Streak</span>
        </div>
      </div>

      {/* 2. Core Seven Educational Questions Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): What am I learning? & What should I do next? */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question 1: What am I learning? & What should I do next? */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <BookOpen size={18} className="text-purple-600" />
                  <span>What am I learning right now?</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Current enrolled curriculum subjects and active chapters
                </p>
              </div>
              <button
                onClick={() => onNavigate('my-learning')}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="space-y-4">
              {enrolled.map((course) => {
                const firstLesson = course.chapters[0]?.lessons[0];
                const lessonMastery = firstLesson ? masteryRecords[firstLesson.id] : null;

                return (
                  <div
                    key={course.id}
                    className="p-4 rounded-xl border border-slate-200/80 hover:border-purple-300 bg-slate-50/50 hover:bg-white transition-all group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 max-w-md">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                          {course.badgeText}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{course.subject}</span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                        {course.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        Chapter 1: {course.chapters[0]?.title}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      {lessonMastery?.isMastered ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          <CheckCircle2 size={14} />
                          <span>Mastered (80%+)</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1">
                          <Clock size={13} />
                          <span>~{firstLesson?.durationMinutes || 15} mins</span>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (firstLesson) {
                            onOpenLesson(course, firstLesson.id);
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold text-xs shadow hover:bg-purple-700 active:scale-95 transition-all"
                      >
                        {lessonMastery?.isMastered ? 'Review Lesson' : 'Start Lesson'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Question 5 & 6: Demonstrated Mastery vs Revisit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* What have I mastered? */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm mb-2">
                <Award size={18} className="text-emerald-600" />
                <span>What have I mastered?</span>
              </div>
              <p className="text-xs text-emerald-700 mb-3">
                Mastery requires demonstrated comprehension (≥80% on assessment criteria).
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-900">{totalMasteredLessons}</span>
                <span className="text-xs font-semibold text-emerald-700">learning objectives certified</span>
              </div>
            </div>

            {/* What should I revisit? (Knowledge Gaps & Misconceptions) */}
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm mb-2">
                <RefreshCw size={18} className="text-amber-600" />
                <span>What should I revisit?</span>
              </div>
              <p className="text-xs text-amber-800 mb-2">
                {lessonsNeedingRevision.length > 0
                  ? 'Berry identified targeted misconceptions requiring a quick refresher.'
                  : 'No critical knowledge gaps detected! Keep advancing through your chapters.'}
              </p>
              <button
                onClick={() => onNavigate('ai-tutor')}
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline inline-flex items-center gap-1 mt-1"
              >
                <Sparkles size={13} />
                <span>Ask Berry AI for remedial review</span>
              </button>
            </div>
          </div>

          {/* Berry AI Pedagogical Assistant Recommendation Card */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-sm flex-shrink-0">
              <Sparkles size={20} />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">
                  Berry AI Learning Recommendation
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Adaptive Tutor
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Based on your current stage ({learner.stage.toUpperCase()}) in the Kenyan Competency-Based Curriculum, we recommend focusing on{' '}
                <strong>{activeCourse.title}</strong> before moving on to multi-step assessments.
              </p>
              <button
                onClick={() => onNavigate('ai-tutor')}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 pt-1"
              >
                <span>Open Socratic tutor session</span>
                <ArrowRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: What is due soon? & Academic Calendar Preview */}
        <div className="space-y-6">
          {/* Question 3: What is due soon? (Pending Tasks Widget) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock size={18} className="text-rose-500" />
                <span>What is due soon?</span>
              </h3>
              <button
                onClick={() => onNavigate('calendar')}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800"
              >
                View all
              </button>
            </div>

            {pendingTasks.length > 0 ? (
              <div className="space-y-3">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-purple-50/50 hover:border-purple-200 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-700">{task.subject}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          task.urgency === 'urgent'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {task.urgency.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-900 mb-2">{task.title}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                      <button
                        onClick={() => {
                          const matchedCourse = courses.find((c) => c.id === task.courseId) || activeCourse;
                          if (matchedCourse.chapters[0]?.lessons[0]) {
                            onOpenLesson(matchedCourse, matchedCourse.chapters[0].lessons[0].id);
                          }
                        }}
                        className="text-purple-600 font-semibold hover:underline"
                      >
                        Open Task →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                <span>All assignments and quizzes completed!</span>
              </div>
            )}
          </div>

          {/* Daily Goal & Learning Minutes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-blue-600" />
              <span>Daily Learning Goal</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{learner.completedMinutesToday} mins completed</span>
                <span className="font-semibold">{learner.dailyGoalMinutes} mins target</span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((learner.completedMinutesToday / learner.dailyGoalMinutes) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {learner.dailyGoalMinutes - learner.completedMinutesToday > 0
                  ? `${learner.dailyGoalMinutes - learner.completedMinutesToday} minutes remaining to hit today's milestone.`
                  : 'Target achieved for today! Great dedication.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
