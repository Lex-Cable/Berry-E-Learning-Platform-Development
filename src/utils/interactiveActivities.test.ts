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

test('does not copy mastery questions into interactive tasks', () => {
  const source = courseFixture();
  const result = withInteractivePractice([source]);
  const lesson = result[0].chapters[0].lessons[0];
  assert.equal(lesson.activities.length, 0);
  assert.equal(source.chapters[0].lessons[0].activities.length, 0);
});

test('does not invent activities when approved mastery questions are unavailable', () => {
  const source = courseFixture();
  source.chapters[0].lessons[0].quizQuestions = [];
  const result = withInteractivePractice([source]);
  assert.equal(result[0].chapters[0].lessons[0].activities.length, 0);
});

test('keeps at most five distinct authored interactive activities', () => {
  const source = courseFixture();
  source.chapters[0].lessons[0].activities = Array.from({ length: 7 }, (_, index) => ({
    id: `existing-${index}`, type: 'interactive-choice', title: `Task ${index}`,
    instructions: `Approved task ${index}`, data: { choices: [] },
  })) as Course['chapters'][0]['lessons'][0]['activities'];
  const result = withInteractivePractice([source]);
  const activities = result[0].chapters[0].lessons[0].activities;
  assert.equal(activities.length, 5);
  assert.equal(new Set(activities.map((activity) => activity.instructions)).size, 5);
});
