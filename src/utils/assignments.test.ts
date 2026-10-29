import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCourseAssignments,
  markAssignmentSubmission,
  nextAttemptNumber,
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
  assert.equal(assignments.length, 1);
  assert.equal(assignments[0].courseId, 'course-test');
  assert.equal(assignments[0].totalMarks, 20);
  assert.equal(assignments[0].rubric.length, 3);
  // Empty courses (no lessons) must not produce assignments
  const empty = buildCourseAssignments([makeCourse({ chapters: [] })]);
  assert.equal(empty.length, 0);
});

test('markAssignmentSubmission grades a strong submission as passed', () => {
  const assignment = buildCourseAssignments([makeCourse()])[0];
  const content =
    'In this lesson I learned counting. ' +
    'Counting objects up to ten is an example of number sense; for instance, counting ten crayons in real life practice. ' +
    'My question is whether I can improve at counting backwards, I am still not sure about the challenge. ' +
    'The lesson objectives mention counting forwards and backwards to one hundred and count objects up to ten.';
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
