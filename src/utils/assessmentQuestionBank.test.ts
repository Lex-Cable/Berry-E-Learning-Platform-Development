import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course } from '../types';
import { withCompleteAssessmentBanks } from './assessmentQuestionBank';

function courseFixture(): Course {
  return {
    id: 'bank-course', title: 'Bank Course', code: 'BC1', stage: 'junior',
    curriculum: 'kenya_cbc', gradeLevel: 'Grade 4', subject: 'Science',
    description: 'Fixture', bannerColor: '', badgeText: '', estimatedHours: 1,
    objectives: ['Explain plant growth'], prerequisites: [],
    chapters: [{
      id: 'chapter-1', courseId: 'bank-course', title: 'Plants', order: 1,
      description: '', lessons: [{
        id: 'lesson-1', chapterId: 'chapter-1', title: 'Plant growth', order: 1,
        durationMinutes: 10, objectives: ['Explain how plants grow'], prerequisites: [],
        notesMarkdown: 'Plants need water and sunlight to grow.', activities: [],
        quizQuestions: [{
          id: 'q1', question: 'What do plants need to grow?', options: ['Water', 'Plastic', 'Metal'],
          correctIndex: 0, explanation: 'Plants need water.', misconceptions: { 1: 'Plastic is not food for plants.', 2: 'Metal is not food for plants.' },
          learningObjective: 'Identify plant needs',
        }], masteryThresholdPercent: 80,
      }],
    }],
    exam: {
      id: 'exam-1', courseId: 'bank-course', title: 'Plants Exam',
      passingScorePercent: 75, durationMinutes: 10,
      questions: [{
        id: 'e1', question: 'Which is needed for plant growth?', options: ['Sunlight', 'Plastic'],
        correctIndex: 0, explanation: 'Sunlight supports growth.', topic: 'Plant needs',
      }],
    },
  } as Course;
}

test('every lesson receives ten mastery items and every course receives a 30-question, 60-minute exam', () => {
  const result = withCompleteAssessmentBanks([courseFixture()]);
  const course = result[0];
  assert.equal(course.chapters[0].lessons[0].quizQuestions.length, 10);
  assert.equal(course.exam?.questions.length, 30);
  assert.equal(course.exam?.durationMinutes, 60);
  assert.ok(course.exam?.questions.every((question) => question.options.length >= 2 && question.correctIndex >= 0));
});

test('course-specific banks retain their own question content and answer keys', () => {
  const course = courseFixture();
  const result = withCompleteAssessmentBanks([course]);
  const questions = result[0].chapters[0].lessons[0].quizQuestions;
  assert.ok(questions.every((question) => question.question.includes('plants') || question.question.includes('Plant')));
  assert.ok(questions.every((question) => question.correctIndex === 0));
  assert.equal(course.chapters[0].lessons[0].quizQuestions.length, 1);
});

test('lessons with no approved source questions are not filled with fabricated answers', () => {
  const course = courseFixture();
  course.chapters[0].lessons[0].quizQuestions = [];
  course.chapters[0].lessons[0].activities = [];
  const result = withCompleteAssessmentBanks([course]);
  assert.equal(result[0].chapters[0].lessons[0].quizQuestions.length, 0);
});
