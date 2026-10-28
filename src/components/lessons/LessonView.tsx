import React, { useEffect, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  BookOpen,
  Award,
  Video,
  FileText,
  Activity,
  Sparkles,
  Bookmark,
  Share2,
  Lock,
} from 'lucide-react';
import { Course, Lesson, QuizQuestion, LessonMasteryState } from '../../types';
import { calculateScore, evaluateMastery, getMisconceptionExplanation } from '../../utils/mastery';
import { loadLessonNotes, saveLessonNotes } from '../../services/learningProgress';
import { firebaseAuth } from '../../lib/firebase';

interface LessonViewProps {
  course: Course;
  lessonId: string;
  onNavigateLesson: (nextLessonId: string) => void;
  onBackToCourse: () => void;
  masteryRecord?: LessonMasteryState;
  onSaveMastery: (record: LessonMasteryState) => void;
  userId?: string;
}

export const LessonView: React.FC<LessonViewProps> = ({
  course,
  lessonId,
  onNavigateLesson,
  onBackToCourse,
  masteryRecord,
  onSaveMastery,
  userId,
}) => {
  // Find current lesson and chapter
  let currentLesson: Lesson | undefined;
  let currentChapterIndex = 0;
  let currentLessonIndex = 0;

  course.chapters.forEach((chap, cIdx) => {
    chap.lessons.forEach((les, lIdx) => {
      if (les.id === lessonId) {
        currentLesson = les;
        currentChapterIndex = cIdx;
        currentLessonIndex = lIdx;
      }
    });
  });

  if (!currentLesson) {
    currentLesson = course.chapters[0]?.lessons[0];
  }

  // Active sub-tab in lesson flow: 'video' | 'notes' | 'activities' | 'quiz' | 'mastery'
  const [activeTab, setActiveTab] = useState<'video' | 'notes' | 'activities' | 'quiz'>('video');

  // Video player simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showCaptions, setShowCaptions] = useState(true);

  // Personal notes are cached locally and synced to the signed-in learner's private cloud record.
  const [personalNotes, setPersonalNotes] = useState('');
  const [notesSavedNotice, setNotesSavedNotice] = useState(false);
  const [notesSaveError, setNotesSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const localKey = `berry_lesson_notes_${userId || 'guest'}_${lessonId}`;
    try {
      setPersonalNotes(localStorage.getItem(localKey) || '');
    } catch {
      setPersonalNotes('');
    }
    const uid = firebaseAuth?.currentUser?.uid;
    if (uid) {
      void loadLessonNotes(uid, lessonId).then((notes) => {
        if (cancelled) return;
        if (notes) {
          setPersonalNotes(notes);
          try { localStorage.setItem(localKey, notes); } catch { /* local cache is optional */ }
        }
      }).catch((error) => {
        console.warn('Could not load cloud study notes; keeping the local copy:', error);
      });
    }
    return () => { cancelled = true; };
  }, [lessonId, userId]);

  // Matching activity state
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Record<string, string>>({});
  const [matchingFeedback, setMatchingFeedback] = useState<string | null>(null);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState<number>(masteryRecord?.scorePercent || 0);

  // Find next lesson if available
  const allLessons: Lesson[] = course.chapters.flatMap((c) => c.lessons);
  const currentOverallIndex = allLessons.findIndex((l) => l.id === lessonId);
  const nextLesson = allLessons[currentOverallIndex + 1];

  const handleSaveNotes = async () => {
    setNotesSaveError(null);
    const localKey = `berry_lesson_notes_${userId || 'guest'}_${lessonId}`;
    try {
      localStorage.setItem(localKey, personalNotes);
    } catch {
      setNotesSaveError('This browser could not save a local copy. Please check available storage.');
      return;
    }
    const uid = firebaseAuth?.currentUser?.uid || userId;
    if (uid) {
      try {
        await saveLessonNotes(uid, lessonId, personalNotes);
      } catch (error) {
        console.warn('Cloud notes sync failed; the local copy is retained:', error);
        setNotesSaveError('Saved on this device, but cloud sync failed. Check your connection and try saving again.');
        return;
      }
    }
    setNotesSavedNotice(true);
    window.setTimeout(() => setNotesSavedNotice(false), 2500);
  };

  // Matching pair handler
  const handleLeftClick = (pairId: string) => {
    setSelectedLeft(pairId);
  };

  const handleRightClick = (rightText: string) => {
    if (!selectedLeft) return;
    const activity = currentLesson?.activities.find((a) => a.type === 'matching');
    const pair = activity?.data.matchingPairs?.find((p) => p.id === selectedLeft);

    if (pair && pair.right === rightText) {
      setMatchedPairs((prev) => ({ ...prev, [selectedLeft]: rightText }));
      setMatchingFeedback('Correct match! Demonstrated competency.');
    } else {
      setMatchingFeedback('Not quite. Try identifying the relationship carefully.');
    }
    setSelectedLeft(null);
  };

  // Submit Quiz & Evaluate Mastery
  const handleSubmitQuiz = () => {
    if (!currentLesson) return;
    let correctCount = 0;
    const identifiedMisconceptions: string[] = [];

    currentLesson.quizQuestions.forEach((q) => {
      const selected = selectedAnswers[q.id];
      if (selected === q.correctIndex) {
        correctCount += 1;
      } else if (selected !== undefined) {
        const feedbackObj = getMisconceptionExplanation(q, selected);
        identifiedMisconceptions.push(feedbackObj.feedback);
      }
    });

    const score = calculateScore(correctCount, currentLesson.quizQuestions.length);
    setQuizScore(score);
    setSubmittedQuiz(true);

    const evaluation = evaluateMastery(score, currentLesson.masteryThresholdPercent);

    onSaveMastery({
      lessonId: currentLesson.id,
      isCompleted: true,
      isMastered: evaluation.isMastered,
      scorePercent: score,
      attemptsCount: (masteryRecord?.attemptsCount || 0) + 1,
      lastAttemptDate: new Date().toISOString(),
      identifiedMisconceptions,
      remedialActivitiesCompleted: false,
    });
  };

  const currentEval = evaluateMastery(quizScore, currentLesson?.masteryThresholdPercent || 80);

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToCourse}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-sm"
        >
          <ArrowLeft size={14} />
          <span>Back to Course Overview</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            Chapter {currentChapterIndex + 1} • Lesson {currentLessonIndex + 1}
          </span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            {course.badgeText}
          </span>
        </div>
      </div>

      {/* Lesson Header Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
              {course.subject} • {course.gradeLevel}
            </span>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              {currentLesson?.title}
            </h1>
            <p className="text-xs text-slate-500">
              Estimated Duration: {currentLesson?.durationMinutes} mins • Demonstrated Mastery Threshold: {currentLesson?.masteryThresholdPercent}%
            </p>
          </div>

          {/* Mastery Status Pill */}
          <div className="flex items-center gap-2">
            {masteryRecord?.isMastered ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>Demonstrated Mastery ({masteryRecord.scorePercent}%)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                <AlertCircle size={16} className="text-amber-600" />
                <span>Mastery In Progress</span>
              </div>
            )}
          </div>
        </div>

        {/* Learning Objectives Checklist */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-purple-600" />
            <span>Target Learning Outcomes:</span>
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
            {currentLesson?.objectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Structured Lesson Flow Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 rounded-2xl shadow-sm">
        {[
          { id: 'video', label: '1. Video Demonstration', icon: Video },
          { id: 'notes', label: '2. Explanatory Notes', icon: FileText },
          { id: 'activities', label: '3. Interactive Activity', icon: Activity },
          { id: 'quiz', label: '4. Mastery Assessment', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition-all ${
                isActive
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Video Lesson Player */}
      {activeTab === 'video' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
          {currentLesson?.videoUrl ? (
            <div className="space-y-3">
              {/\.(mp4|webm|ogg)(\?.*)?$/i.test(currentLesson.videoUrl) ? (
                <video
                  key={currentLesson.videoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full aspect-video rounded-2xl bg-slate-950"
                  title={currentLesson.videoTitle || currentLesson.title}
                >
                  <source src={currentLesson.videoUrl} />
                  Your browser does not support embedded video. <a href={currentLesson.videoUrl} target="_blank" rel="noreferrer">Open video</a>.
                </video>
              ) : (
                <div className="aspect-video rounded-2xl overflow-hidden bg-slate-950">
                  <iframe
                    title={currentLesson.videoTitle || currentLesson.title}
                    src={(() => {
                      const raw = currentLesson?.videoUrl || '';
                      try {
                        const url = new URL(raw);
                        if (url.hostname.includes('youtu.be')) return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1).split('/')[0]}`;
                        if (url.hostname.includes('youtube.com')) {
                          const id = url.searchParams.get('v') || url.pathname.match(/\/embed\/([^/?]+)/)?.[1] || url.pathname.match(/\/shorts\/([^/?]+)/)?.[1];
                          if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
                        }
                        if (url.hostname.includes('vimeo.com')) {
                          const id = url.pathname.split('/').filter(Boolean).pop();
                          if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
                        }
                        return raw;
                      } catch { return ''; }
                    })()}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              )}
              <p className="text-xs text-slate-500">Video supplied for this lesson. If the provider blocks embedding, open it directly in a new tab.</p>
              <a href={currentLesson.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-purple-700 hover:bg-purple-50">
                Open video in a new tab <ArrowRight size={14} />
              </a>
            </div>
          ) : (
            <div className="aspect-video rounded-2xl bg-slate-950 flex flex-col items-center justify-center text-center text-white p-8 gap-3">
              <Video size={36} className="text-purple-300" />
              <h3 className="font-bold text-lg">No video has been linked to this lesson yet</h3>
              <p className="text-sm text-slate-300 max-w-lg">Use the lesson notes, interactive activities and mastery assessment below. A real video will appear here when a verified video URL is added to this lesson.</p>
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={() => setActiveTab('notes')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow hover:bg-purple-700 transition-all">
              <span>Next: Read Lesson Notes</span><ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Lesson Notes & Personal Notebook */}
      {activeTab === 'notes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="prose prose-slate max-w-none text-slate-800 text-sm leading-relaxed space-y-4">
              <div className="whitespace-pre-line font-normal">
                {currentLesson?.notesMarkdown}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => setActiveTab('video')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                <span>Previous: Video</span>
              </button>
              <button
                onClick={() => setActiveTab('activities')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow hover:bg-purple-700 transition-all"
              >
                <span>Next: Try Interactive Activity</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Personal Notebook Sidebar */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-2">
                <Bookmark size={16} className="text-purple-600" />
                <span>My Personal Study Notes</span>
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Save key reflections and questions to review during revision sessions.
              </p>
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="Write your study notes here..."
                rows={8}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={handleSaveNotes}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-purple-600 text-white text-xs font-bold transition-all shadow"
              >
                Save Notes
              </button>
              {notesSaveError && <span role="status" className="text-xs text-amber-700">{notesSaveError}</span>}
              {notesSavedNotice && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={14} />
                  <span>Saved!</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Learning Activities */}
      {activeTab === 'activities' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-900">
              Interactive Hands-On Practice
            </h3>
            <p className="text-xs text-slate-500">
              Demonstrate your comprehension with practical matching, ordering, and concept verification.
            </p>
          </div>

          {currentLesson?.activities.map((act) => (
            <div key={act.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{act.title}</h4>
                <p className="text-xs text-slate-600 mt-0.5">{act.instructions}</p>
              </div>

              {/* Matching pairs interaction */}
              {act.type === 'matching' && act.data.matchingPairs && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Concepts:</p>
                      {act.data.matchingPairs.map((pair) => {
                        const isMatched = matchedPairs[pair.id];
                        const isSelected = selectedLeft === pair.id;
                        return (
                          <button
                            key={pair.id}
                            onClick={() => handleLeftClick(pair.id)}
                            disabled={!!isMatched}
                            className={`w-full text-left p-3 rounded-xl border text-xs font-semibold transition-all ${
                              isMatched
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 line-through opacity-70'
                                : isSelected
                                ? 'bg-purple-100 border-purple-500 text-purple-900 ring-2 ring-purple-300'
                                : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300'
                            }`}
                          >
                            {pair.left} {isMatched && '✓'}
                          </button>
                        );
                      })}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Match to Definition / Quantity:</p>
                      {act.data.matchingPairs.map((pair) => (
                        <button
                          key={pair.id}
                          onClick={() => handleRightClick(pair.right)}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-purple-300 text-xs font-medium text-slate-800 transition-all"
                        >
                          {pair.right}
                        </button>
                      ))}
                    </div>
                  </div>

                  {matchingFeedback && (
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs font-semibold text-purple-800 flex items-center gap-2">
                      <Sparkles size={16} className="text-purple-600 flex-shrink-0" />
                      <span>{matchingFeedback}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Multiple Choice interactive activity */}
              {act.type === 'interactive-choice' && act.data.choices && (
                <div className="space-y-2">
                  {act.data.choices.map((choice) => (
                    <button
                      key={choice.id}
                      onClick={() => alert(choice.feedback)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-300 text-xs font-semibold text-slate-800 transition-colors"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setActiveTab('notes')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              ← Previous: Notes
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow hover:bg-purple-700 transition-all"
            >
              <span>Next: Take Mastery Assessment</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Tab 4: Adaptive Mastery Assessment & Misconception Remediation */}
      {activeTab === 'quiz' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award size={20} className="text-purple-600" />
                <span>Demonstrated Understanding Assessment</span>
              </h3>
              <p className="text-xs text-slate-500">
                Berry measures understanding through rigorous application, not just completion.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-100 text-purple-700">
              Passing Benchmark: {currentLesson?.masteryThresholdPercent}%
            </span>
          </div>

          {/* Quiz Questions */}
          <div className="space-y-6">
            {currentLesson?.quizQuestions.map((q, qIndex) => {
              const selected = selectedAnswers[q.id];
              const isSubmitted = submittedQuiz;
              const isCorrect = selected === q.correctIndex;
              const misconceptionInfo = selected !== undefined ? getMisconceptionExplanation(q, selected) : null;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isSubmitted
                      ? isCorrect
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-rose-50/40 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      Question {qIndex + 1}: {q.question}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 flex-shrink-0">
                      {q.learningObjective}
                    </span>
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    {q.options.map((opt, optIndex) => {
                      const isChosen = selected === optIndex;
                      return (
                        <button
                          key={optIndex}
                          disabled={isSubmitted}
                          onClick={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [q.id]: optIndex }))
                          }
                          className={`w-full text-left p-3 rounded-xl border text-xs font-medium transition-all ${
                            isChosen
                              ? 'bg-purple-100 border-purple-500 text-purple-900 font-bold ring-2 ring-purple-300'
                              : 'bg-white border-slate-200 text-slate-800 hover:border-purple-300'
                          } ${
                            isSubmitted && optIndex === q.correctIndex
                              ? '!bg-emerald-100 !border-emerald-500 !text-emerald-900 font-bold'
                              : ''
                          }`}
                        >
                          <span className="mr-2 font-bold text-slate-400">
                            {String.fromCharCode(65 + optIndex)}.
                          </span>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Targeted Misconception Remediation Feedback */}
                  {isSubmitted && misconceptionInfo && (
                    <div
                      className={`mt-4 p-4 rounded-xl text-xs leading-relaxed border ${
                        isCorrect
                          ? 'bg-emerald-100/70 border-emerald-300 text-emerald-900'
                          : 'bg-rose-100/70 border-rose-300 text-rose-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold mb-1">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 size={16} className="text-emerald-700" />
                            <span>Demonstrated Understanding:</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={16} className="text-rose-700" />
                            <span>Diagnostic Misconception Detected:</span>
                          </>
                        )}
                      </div>
                      <p>{misconceptionInfo.feedback}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Assessment Action / Score Display */}
          {!submittedQuiz ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(selectedAnswers).length < (currentLesson?.quizQuestions.length || 1)}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-sm shadow transition-all active:scale-95"
            >
              Submit Assessment for Mastery Evaluation
            </button>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-400">Demonstrated Score:</span>
                  <div className="text-3xl font-black text-white">{quizScore}%</div>
                </div>

                <div className="space-y-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                      currentEval.isMastered
                        ? 'bg-emerald-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {currentEval.statusBadge}
                  </span>
                  <p className="text-xs text-slate-300">{currentEval.feedbackText}</p>
                </div>
              </div>

              {/* Remedial Retry or Advance button */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <button
                  onClick={() => {
                    setSubmittedQuiz(false);
                    setSelectedAnswers({});
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-colors"
                >
                  <RotateCcw size={14} />
                  <span>Re-take Assessment</span>
                </button>

                {currentEval.isMastered && nextLesson ? (
                  <button
                    onClick={() => onNavigateLesson(nextLesson.id)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs shadow transition-all"
                  >
                    <span>Proceed to Next Lesson</span>
                    <ArrowRight size={14} />
                  </button>
                ) : !currentEval.isMastered ? (
                  <div className="flex items-center gap-2 text-xs text-amber-300">
                    <Lock size={14} />
                    <span>Next lesson unlocked upon achieving {currentLesson?.masteryThresholdPercent}% mastery.</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
