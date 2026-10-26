import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateScore,
  evaluateMastery,
  isLessonUnlocked,
  getMisconceptionExplanation,
  isLiveTranscriptionAllowed,
  isGradeJuniorCBC,
  canNavigateBack,
  popNavigationHistory,
  getDistinctSubjectsForGrade,
} from './mastery';
import { Lesson, QuizQuestion, Course } from '../types';

test('calculateScore computes percentages correctly', () => {
  assert.equal(calculateScore(4, 5), 80);
  assert.equal(calculateScore(0, 10), 0);
  assert.equal(calculateScore(10, 10), 100);
  assert.equal(calculateScore(2, 3), 67);
  assert.equal(calculateScore(0, 0), 0);
});

test('evaluateMastery enforces mastery thresholds without false advancement', () => {
  const result80 = evaluateMastery(80, 80);
  assert.equal(result80.isMastered, true);
  assert.equal(result80.statusBadge, 'Mastered');

  const result75 = evaluateMastery(75, 80);
  assert.equal(result75.isMastered, false);
  assert.equal(result75.needsRevision, false);
  assert.equal(result75.statusBadge, 'Near Mastery');

  const result50 = evaluateMastery(50, 80);
  assert.equal(result50.isMastered, false);
  assert.equal(result50.needsRevision, true);
  assert.equal(result50.statusBadge, 'Needs Revision');
});

test('isLessonUnlocked enforces prerequisite mastery gate', () => {
  const dummyLesson: Lesson = {
    id: 'lesson-addition-2',
    chapterId: 'chap-1',
    title: 'Multi-digit Addition',
    order: 2,
    durationMinutes: 15,
    objectives: ['Master multi-digit addition'],
    prerequisites: ['lesson-number-recognition-1'],
    notesMarkdown: '',
    activities: [],
    quizQuestions: [],
    masteryThresholdPercent: 80,
  };

  // When prerequisite is not completed/mastered
  assert.equal(isLessonUnlocked(dummyLesson, [], []), false);

  // When prerequisite is mastered
  assert.equal(isLessonUnlocked(dummyLesson, [], ['lesson-number-recognition-1']), true);

  // When lesson has no prerequisites, it should be unlocked
  const freeLesson: Lesson = {
    ...dummyLesson,
    id: 'lesson-welcome',
    prerequisites: [],
  };
  assert.equal(isLessonUnlocked(freeLesson, [], []), true);
});

test('getMisconceptionExplanation provides targeted diagnostic feedback', () => {
  const question: QuizQuestion = {
    id: 'q1',
    question: 'What is 1/2 + 1/4?',
    options: ['2/6', '3/4', '2/4', '1/6'],
    correctIndex: 1,
    explanation: 'Find a common denominator of 4: 2/4 + 1/4 = 3/4.',
    misconceptions: {
      0: 'Common misconception: You added numerators and denominators straight across (1+1)/(2+4). Denominators must be common before adding.',
      2: 'You changed 1/2 to 2/4 but forgot to add the 1/4.',
    },
    learningObjective: 'Fractions with unlike denominators',
  };

  const correctFeedback = getMisconceptionExplanation(question, 1);
  assert.equal(correctFeedback.isCorrect, true);

  const misconceptionFeedback = getMisconceptionExplanation(question, 0);
  assert.equal(misconceptionFeedback.isCorrect, false);
  assert.match(misconceptionFeedback.feedback, /Common misconception/);
});

test('isLiveTranscriptionAllowed strictly blocks school stages', () => {
  // Early, Junior, and Senior learners must never have access to live transcription
  assert.equal(isLiveTranscriptionAllowed('early'), false);
  assert.equal(isLiveTranscriptionAllowed('junior'), false);
  assert.equal(isLiveTranscriptionAllowed('senior'), false);

  // Berry Advance (and legacy university / professionals) have access
  assert.equal(isLiveTranscriptionAllowed('advance'), true);
  assert.equal(isLiveTranscriptionAllowed('university'), true);
  assert.equal(isLiveTranscriptionAllowed('professionals'), true);
});

test('Kenyan CBC stage validator correctly identifies Junior CBC grades', () => {
  assert.equal(isGradeJuniorCBC('PP1'), true);
  assert.equal(isGradeJuniorCBC('PP2'), true);
  assert.equal(isGradeJuniorCBC('Grade 1'), true);
  assert.equal(isGradeJuniorCBC('Grade 7'), true);
  assert.equal(isGradeJuniorCBC('Grade 9'), true);
  assert.equal(isGradeJuniorCBC('Grade 10'), false);
  assert.equal(isGradeJuniorCBC('Grade 12'), false);
});

test('canNavigateBack returns true whenever user is not on landing or has history', () => {
  assert.equal(canNavigateBack([], 'landing'), false);
  assert.equal(canNavigateBack(['landing'], 'dashboard'), true);
  assert.equal(canNavigateBack([], 'courses'), true);
  assert.equal(canNavigateBack([], 'login'), true);
  assert.equal(canNavigateBack([], 'signup'), true);
  assert.equal(canNavigateBack(['landing'], 'signup'), true);
  assert.equal(canNavigateBack(['landing'], 'login'), true);

  const popped = popNavigationHistory(['landing', 'dashboard', 'courses']);
  assert.equal(popped.targetView, 'courses');
  assert.deepEqual(popped.nextHistory, ['landing', 'dashboard']);

  const authPopped = popNavigationHistory(['landing'], 'signup');
  assert.equal(authPopped.targetView, 'landing');
  assert.deepEqual(authPopped.nextHistory, []);

  const emptyPop = popNavigationHistory([], 'landing');
  assert.equal(emptyPop.targetView, 'landing');
  assert.deepEqual(emptyPop.nextHistory, []);
});

test('getDistinctSubjectsForGrade extracts unique subjects for a grade level', () => {
  const dummyCourses: Partial<Course>[] = [
    { gradeLevel: 'Grade 1', subject: 'Mathematics' },
    { gradeLevel: 'Grade 1', subject: 'English Language' },
    { gradeLevel: 'Grade 1', subject: 'Mathematics' }, // duplicate subject
    { gradeLevel: 'Grade 7', subject: 'Integrated Science' },
  ];
  const subjects = getDistinctSubjectsForGrade(dummyCourses as Course[], 'Grade 1');
  assert.deepEqual(subjects, ['Mathematics', 'English Language']);
});
