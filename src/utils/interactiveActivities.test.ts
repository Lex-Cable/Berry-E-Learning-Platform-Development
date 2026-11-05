import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course } from '../types';
import { withInteractivePractice } from './interactiveActivities';

function courseFixture(): Course {
  return {
    id: 'practice-course', title: 'Practice Course', code: 'PC1', stage: 'junior',
    curriculum: 'kenya_cbc', gradeLevel: 'Grade 5', subject: 'Science',
    description: 'Fixture', bannerColor: '', badgeText: '', estimatedHours: 1,
    objectives: [], prerequisites: [],
    chapters: [{
      id: 'chapter-1', courseId: 'practice-course', title: 'Chapter 1', order: 1,
      description: '', lessons: [{
        id: 'lesson-1', chapterId: 'chapter-1', title: 'Plants', order: 1,
        durationMinutes: 10, objectives: ['Identify plant parts'], prerequisites: [],
        notesMarkdown: '', activities: [], masteryThresholdPercent: 80,
        quizQuestions: Array.from({ length: 5 }, (_, index) => ({
          id: `q-${index + 1}`, question: `Question ${index + 1}?`,
          options: ['A', 'B', 'C'], correctIndex: 1, explanation: 'Correct explanation.',
          misconceptions: { 0: 'Review A.', 2: 'Review C.' }, learningObjective: `Objective ${index + 1}`,
        })),
      }],
    }],
  } as Course;
}

test('fills five interactive tasks from existing lesson-specific mastery questions', () => {
  const source = courseFixture();
  const result = withInteractivePractice([source]);
  const lesson = result[0].chapters[0].lessons[0];
  assert.equal(lesson.activities.length, 5);
  assert.equal(lesson.activities[0].type, 'interactive-choice');
  assert.equal(lesson.activities[0].instructions, 'Question 1?');
  assert.equal(lesson.activities[0].data.choices?.[1].isCorrect, true);
  assert.equal(source.chapters[0].lessons[0].activities.length, 0);
});

test('does not invent activities when approved mastery questions are unavailable', () => {
  const source = courseFixture();
  source.chapters[0].lessons[0].quizQuestions = [];
  const result = withInteractivePractice([source]);
  assert.equal(result[0].chapters[0].lessons[0].activities.length, 0);
});
