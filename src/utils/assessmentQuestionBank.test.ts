import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course } from '../types';
import { withCompleteAssessmentBanks } from './assessmentQuestionBank';
import { COURSES as CLIENT_COURSES } from '../data/curriculumData';
import { COURSES as SERVER_COURSES } from '../../server/privateCurriculumData';
import { INTERNATIONAL_STARTER_COURSES } from '../data/internationalStarterCourses';
import { withInteractivePractice } from './interactiveActivities';

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

test('assessment banks keep only distinct authored questions and cap their size', () => {
  const result = withCompleteAssessmentBanks([courseFixture()]);
  const course = result[0];
  const mastery = course.chapters[0].lessons[0].quizQuestions;
  const exam = course.exam?.questions || [];
  assert.equal(mastery.length, 1);
  assert.equal(exam.length, 1);
  assert.ok(mastery.length <= 10);
  assert.ok(exam.length <= 30);
  assert.equal(new Set(mastery.map((question) => question.question.trim().toLowerCase())).size, mastery.length);
  assert.equal(new Set(exam.map((question) => question.question.trim().toLowerCase())).size, exam.length);
  assert.equal(course.exam?.durationMinutes, 60);
  assert.equal(course.chapters[0].lessons[0].moduleExamQuestions?.length, 0);
  assert.ok(exam.every((question) => question.options.length >= 2 && question.correctIndex >= 0));
});

test('course-specific banks retain their own question content and answer keys', () => {
  const course = courseFixture();
  const result = withCompleteAssessmentBanks([course]);
  const questions = result[0].chapters[0].lessons[0].quizQuestions;
  assert.deepEqual(questions.map((question) => question.question), ['What do plants need to grow?']);
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

test('all shipped Berry course catalogues contain no repeated assessment prompts', () => {
  const catalogues = [
    [...CLIENT_COURSES, ...INTERNATIONAL_STARTER_COURSES],
    [...SERVER_COURSES, ...INTERNATIONAL_STARTER_COURSES],
  ];
  for (const catalogue of catalogues) {
    const complete = withInteractivePractice(withCompleteAssessmentBanks(catalogue as Course[]));
    for (const course of complete) {
      assert.ok((course.exam?.questions.length || 0) <= 30, `${course.id} final exam cap`);
      assert.equal(course.exam?.durationMinutes, 60, `${course.id} exam duration`);
      const examPrompts = (course.exam?.questions || []).map((question) => question.question.trim().toLowerCase());
      const allLessonPrompts = course.chapters.flatMap((chapter) => chapter.lessons.flatMap((lesson) => [
        ...lesson.quizQuestions.map((question) => question.question.trim().toLowerCase()),
        ...(lesson.chapterAssessmentQuestions || []).map((question) => question.question.trim().toLowerCase()),
        ...(lesson.moduleExamQuestions || []).map((question) => question.question.trim().toLowerCase()),
        ...lesson.activities.map((activity) => activity.instructions.trim().toLowerCase()),
      ]));
      assert.equal(new Set(allLessonPrompts).size, allLessonPrompts.length, `${course.id} repeated lesson/module/activity prompts`);
      const chapterPrompts = course.chapters.flatMap((chapter) => chapter.lessons.flatMap((lesson) => (lesson.chapterAssessmentQuestions || []).map((question) => question.question.trim().toLowerCase())));
      const modulePrompts = course.chapters.flatMap((chapter) => chapter.lessons.flatMap((lesson) => (lesson.moduleExamQuestions || []).map((question) => question.question.trim().toLowerCase())));
      assert.equal(new Set(chapterPrompts).size, chapterPrompts.length, `${course.id} repeated chapter assessment prompts`);
      assert.equal(new Set(modulePrompts).size, modulePrompts.length, `${course.id} repeated module prompts`);
      assert.ok(chapterPrompts.every((prompt) => !modulePrompts.includes(prompt)), `${course.id} chapter/module prompt overlap`);
      assert.ok(chapterPrompts.every((prompt) => !examPrompts.includes(prompt)), `${course.id} chapter/final prompt overlap`);
      assert.ok(modulePrompts.every((prompt) => !examPrompts.includes(prompt)), `${course.id} module/final prompt overlap`);
      assert.ok(modulePrompts.every((prompt) => !course.chapters.some((chapter) => chapter.lessons.some((lesson) => lesson.activities.some((activity) => activity.instructions.trim().toLowerCase() === prompt)))), `${course.id} interactive/module prompt overlap`);
      assert.ok([...chapterPrompts, ...modulePrompts].every((prompt) => !course.chapters.some((chapter) => chapter.lessons.some((lesson) => lesson.quizQuestions.some((question) => question.question.trim().toLowerCase() === prompt)))), `${course.id} mastery/module prompt overlap`);

      assert.equal(new Set(examPrompts).size, examPrompts.length, `${course.id} repeated exam prompt`);
      for (const chapter of course.chapters) {
        for (const lesson of chapter.lessons) {
          assert.ok(lesson.quizQuestions.length <= 10, `${course.id}/${lesson.id} mastery cap`);
          const prompts = lesson.quizQuestions.map((question) => question.question.trim().toLowerCase());
          assert.equal(new Set(prompts).size, prompts.length, `${course.id}/${lesson.id} repeated mastery prompt`);
          const activityPrompts = lesson.activities.map((activity) => activity.instructions.trim().toLowerCase());
          assert.equal(new Set(activityPrompts).size, activityPrompts.length, `${course.id}/${lesson.id} repeated activity prompt`);
        }
      }
    }
  }
});

test('lesson source questions are partitioned into distinct mastery and module-exam banks', () => {
  const course = courseFixture();
  const lesson = course.chapters[0].lessons[0];
  lesson.quizQuestions = Array.from({ length: 4 }, (_, index) => ({
    id: `q${index+1}`, question: `Distinct plant question ${index+1}?`, options: ['Water', 'Metal'], correctIndex: 0,
    explanation: 'Water supports plant growth.', misconceptions: { 1: 'Metal is not needed.' }, learningObjective: 'Plant growth',
  }));
  const result = withCompleteAssessmentBanks([course])[0].chapters[0].lessons[0];
  assert.equal(result.quizQuestions.length, 1);
  assert.equal(result.chapterAssessmentQuestions?.length, 1);
  assert.equal(result.moduleExamQuestions?.length, 2);
  assert.equal(new Set([...result.quizQuestions, ...(result.chapterAssessmentQuestions || []), ...(result.moduleExamQuestions || [])].map((question) => question.question)).size, 4);
});

test('Grade 8 Pre-Technical Workshop has approved chapter and module assessment coverage', () => {
  const rawCourse = SERVER_COURSES.find((course) => course.id === 'cbc-g8-pretech');
  assert.ok(rawCourse, 'Grade 8 Pre-Technical course must exist in the trusted catalogue');
  const course = withCompleteAssessmentBanks([rawCourse as Course])[0];
  const lesson = course.chapters.find((chapter) => chapter.id === 'g8-pt-c1')?.lessons.find((item) => item.id === 'g8-pt-l1');
  assert.ok(lesson, 'Workshop measuring-tools lesson must exist');
  assert.equal(lesson.chapterAssessmentQuestions?.length, 4);
  assert.equal(lesson.moduleExamQuestions?.length, 4);
  for (const question of [...(lesson.chapterAssessmentQuestions || []), ...(lesson.moduleExamQuestions || [])]) {
    assert.ok(question.question.trim().length > 0);
    assert.ok(question.options.length >= 2);
    assert.ok(question.correctIndex >= 0 && question.correctIndex < question.options.length);
    assert.ok(question.explanation.trim().length > 0);
  }
});
