import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCourseAssignments,
  markAssignmentSubmission,
  nextAttemptNumber,
  resolveAssignmentDueDate,
} from './assignments';
import type { Course } from '../types';

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: 'course-test',
    title: 'Test Course: Numbers',
    code: 'TC101',
    stage: 'junior',
    curriculum: 'kenya_cbc',
    gradeLevel: 'Grade 1',
    subject: 'Mathematics',
    description: 'A test course.',
    bannerColor: 'from-a to-b',
    badgeText: 'Test',
    estimatedHours: 2,
    objectives: ['Count forwards and backwards to one hundred'],
    prerequisites: [],
    chapters: [
      {
        id: 'chap-1',
        courseId: 'course-test',
        title: 'Chapter One',
        order: 1,
        description: 'Basics',
        lessons: [
          {
            id: 'lesson-counting-1',
            chapterId: 'chap-1',
            title: 'Counting to Ten',
            order: 1,
            durationMinutes: 10,
            objectives: ['Count objects up to ten'],
            prerequisites: [],
            notesMarkdown: 'Counting notes.',
            activities: [],
            quizQuestions: [],
            masteryThresholdPercent: 80,
          },
        ],
      },
    ],
    ...overrides,
  } as Course;
}

test('buildCourseAssignments creates assignments bound to real courses', () => {
  const assignments = buildCourseAssignments([makeCourse()]);
  assert.equal(assignments.length, 1); // one lesson in this fixture produces one topic assignment
  assert.equal(assignments[0].courseId, 'course-test');
  assert.equal(assignments[0].totalMarks, 20);
  assert.equal(assignments[0].rubric.length, 3);
  // Empty courses (no lessons) must not produce assignments
  const empty = buildCourseAssignments([makeCourse({ chapters: [] })]);
  assert.equal(empty.length, 0);
});

test('buildCourseAssignments creates one assignment per lesson and ignores duplicate course IDs', () => {
  const course = makeCourse();
  const assignments = buildCourseAssignments([course, { ...course, title: 'Duplicate course record' }]);
  assert.equal(assignments.length, 1);
  assert.equal(assignments[0].courseId, course.id);
  assert.match(assignments[0].instructions, /PROBLEM-SOLVING TASK/);
  assert.match(assignments[0].title, /Counting to Ten/);
});

test('markAssignmentSubmission grades a strong submission as passed', () => {
  const assignment = buildCourseAssignments([makeCourse()])[0];
  const content =
    'My method is to count objects up to ten and use the counting sequence to calculate each answer. ' +
    'For example, I count ten crayons one by one and record the result clearly. ' +
    'I check and verify each answer by using an alternative count, because this helps me find an error. ' +
    'My analysis compares counting forwards and backwards to one hundred. ' +
    'The conclusion is that careful counting improves accuracy; therefore I can explain the evidence and improve my working next time. ' +
    'I show the method, the answer and the reason for each step.';
  const result = markAssignmentSubmission(assignment, content);
  assert.equal(result.status, 'graded');
  assert.ok(result.scorePercent >= 50);
  assert.equal(result.totalMarks, 20);
  assert.equal(result.criterionScores.length, 3);
  assert.match(result.markerFeedback, /Automated first-pass marking: passed/);
});

test('markAssignmentSubmission returns very weak work for revision', () => {
  const assignment = buildCourseAssignments([makeCourse()])[0];
  const result = markAssignmentSubmission(assignment, 'Nice');
  assert.equal(result.status, 'returned_for_revision');
  assert.ok(result.scorePercent < 50);
  assert.match(result.markerFeedback, /returned for revision/);
});

test('markAssignmentSubmission penalises short answers even with keyword hits', () => {
  const assignment = buildCourseAssignments([makeCourse()])[0];
  const keywordOnly = assignment.rubric[0].keywords.slice(0, 3).join(' ');
  const result = markAssignmentSubmission(assignment, keywordOnly);
  assert.ok(result.marksAwarded < assignment.totalMarks);
});

test('nextAttemptNumber increments and caps attempts', () => {
  assert.equal(nextAttemptNumber(0), 1);
  assert.equal(nextAttemptNumber(3), 4);
  assert.equal(nextAttemptNumber(20), 20);
});

test('resolveAssignmentDueDate preserves a saved learner deadline across refreshes', () => {
  const original = '2026-11-13T10:00:00.000Z';
  const regenerated = '2026-11-20T10:00:00.000Z';
  assert.equal(resolveAssignmentDueDate(regenerated, original), original);
});

test('resolveAssignmentDueDate uses the generated deadline for a new or invalid saved date', () => {
  const generated = '2026-11-13T10:00:00.000Z';
  assert.equal(resolveAssignmentDueDate(generated), generated);
  assert.equal(resolveAssignmentDueDate(generated, 'not-a-date'), generated);
});

test('buildCourseAssignments creates subject-specific computing and business deliverables', () => {
  const computing = makeCourse({ subject: 'Computer Science', title: 'Introductory Programming' });
  const codingBrief = buildCourseAssignments([computing])[0];
  assert.match(codingBrief.instructions, /source code or pseudocode/i);
  assert.match(codingBrief.instructions, /test cases/i);
  const business = makeCourse({ subject: 'Business Management', title: 'Business Operations' });
  const businessBrief = buildCourseAssignments([business])[0];
  assert.match(businessBrief.instructions, /CASE STUDY TASK/);
  assert.match(businessBrief.instructions, /recommendation/);
});
