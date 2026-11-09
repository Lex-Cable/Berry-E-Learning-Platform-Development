import assert from 'node:assert/strict';
import test from 'node:test';
import { INTERNATIONAL_STARTER_COURSES } from './internationalStarterCourses';
import { auditCurriculumCoverage } from '../utils/curriculumCoverage';

test('international starter catalogue includes Cambridge and US Common Core without CBC relabelling', () => {
  assert.equal(INTERNATIONAL_STARTER_COURSES.length, 2);
  assert.ok(INTERNATIONAL_STARTER_COURSES.some((course) =>
    course.curriculum === 'cambridge' && course.gradeLevel === 'Stage 1',
  ));
  assert.ok(INTERNATIONAL_STARTER_COURSES.some((course) =>
    course.curriculum === 'us_common_core' && course.gradeLevel === 'Grade 1',
  ));
  assert.ok(INTERNATIONAL_STARTER_COURSES.every((course) => course.stage === 'junior'));
});

test('international starter courses have unique lesson and question IDs', () => {
  const lessonIds = INTERNATIONAL_STARTER_COURSES.flatMap((course) =>
    course.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id)),
  );
  assert.equal(new Set(lessonIds).size, lessonIds.length);

  const questionIds = INTERNATIONAL_STARTER_COURSES.flatMap((course) => [
    ...course.chapters.flatMap((chapter) => chapter.lessons.flatMap((lesson) =>
      lesson.quizQuestions.map((question) => question.id),
    )),
    ...(course.exam?.questions.map((question) => question.id) ?? []),
  ]);
  assert.equal(new Set(questionIds).size, questionIds.length);
});

test('international starter courses pass Berry structural curriculum coverage audit', () => {
  const report = auditCurriculumCoverage(INTERNATIONAL_STARTER_COURSES);
  assert.equal(report.coursesAudited, 2);
  assert.equal(report.totalLessons, 4);
  assert.deepEqual(report.issues, []);
});
