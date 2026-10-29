import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCurriculumCoverage, findFallbackLesson } from './curriculumCoverage';
import type { Course, Lesson } from '../types';

function lesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: 'lesson-a',
    chapterId: 'chap-1',
    title: 'Lesson A',
    order: 1,
    durationMinutes: 10,
    objectives: [],
    prerequisites: [],
    notesMarkdown: 'Notes for lesson a.',
    activities: [{ id: 'act-1', type: 'matching', title: 'Match', instructions: 'Match', data: {} }],
    quizQuestions: [],
    masteryThresholdPercent: 80,
    ...overrides,
  } as Lesson;
}

function course(chapters: Lesson[][], overrides: Partial<Course> = {}): Course {
  return {
    id: 'course-1',
    title: 'Course One',
    code: 'C1',
    stage: 'junior',
    curriculum: 'kenya_cbc',
    gradeLevel: 'Grade 1',
    subject: 'Mathematics',
    description: '',
    bannerColor: '',
    badgeText: '',
    estimatedHours: 1,
    objectives: [],
    prerequisites: [],
    chapters: chapters.map((lessons, index) => ({
      id: `chap-${index + 1}`,
      courseId: 'course-1',
      title: `Chapter ${index + 1}`,
      order: index + 1,
      description: '',
      lessons,
    })),
    ...overrides,
  } as Course;
}

test('auditCurriculumCoverage passes a healthy curriculum', () => {
  const report = auditCurriculumCoverage([course([[lesson()]])]);
  assert.equal(report.totalCourses, 1);
  assert.equal(report.totalLessons, 1);
  assert.equal(report.issues.length, 0);
  assert.equal(report.coursesWithIssues.length, 0);
});

test('auditCurriculumCoverage detects empty chapters and missing prerequisites', () => {
  const broken = course([
    [lesson({ prerequisites: ['lesson-ghost'] })],
    [],
  ]);
  const report = auditCurriculumCoverage([broken]);
  const kinds = report.issues.map((issue) => issue.kind);
  assert.ok(kinds.includes('missing_lesson_reference'));
  assert.ok(kinds.includes('empty_chapter'));
  assert.deepEqual(report.coursesWithIssues, ['course-1']);
});

test('auditCurriculumCoverage detects duplicates and content-free lessons', () => {
  const broken = course([
    [lesson(), lesson({ id: 'lesson-a', notesMarkdown: '' })],
  ]);
  const report = auditCurriculumCoverage([broken]);
  const kinds = report.issues.map((issue) => issue.kind);
  assert.ok(kinds.includes('duplicate_lesson_id'));
  assert.ok(kinds.includes('lesson_missing_content'));
});

test('auditCurriculumCoverage flags exams with no questions', () => {
  const report = auditCurriculumCoverage([
    course([[lesson()]], {
      exam: {
        id: 'exam-1',
        courseId: 'course-1',
        title: 'Final Exam',
        passingScorePercent: 75,
        durationMinutes: 30,
        questions: [],
      },
    }),
  ]);
  assert.ok(report.issues.some((issue) => issue.kind === 'no_exam_content'));
});

test('findFallbackLesson returns the first unlocked lesson', () => {
  const first = lesson({ id: 'lesson-a' });
  const second = lesson({ id: 'lesson-b', order: 2, prerequisites: ['lesson-a'] });
  assert.equal(findFallbackLesson(course([[first, second]]))?.id, 'lesson-a');
});

test('findFallbackLesson skips lessons with unresolvable prerequisites', () => {
  const blocked = lesson({ id: 'lesson-a', prerequisites: ['lesson-ghost'] });
  const open = lesson({ id: 'lesson-b', order: 2, notesMarkdown: 'Open notes.' });
  assert.equal(findFallbackLesson(course([[blocked, open]]))?.id, 'lesson-b');
});

test('findFallbackLesson returns null for empty courses and respects mastery gating', () => {
  assert.equal(findFallbackLesson(course([[]])), null);
  const first = lesson({ id: 'lesson-a' });
  const second = lesson({ id: 'lesson-b', order: 2, prerequisites: ['lesson-a'] });
  // Without mastery of lesson-a, only lesson-a (unlocked trivially by resolvable prereqs? no) —
  // gating with mastery list excludes lesson-b; lesson-a still has no prereqs so it wins.
  assert.equal(findFallbackLesson(course([[first, second]]), [])?.id, 'lesson-a');
  assert.equal(findFallbackLesson(course([[first, second]]), ['lesson-a'])?.id, 'lesson-a');
});
