import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course } from '../types';
import { getCourseModules, getModuleChapters, getLessonModule } from './courseModules';

const course = {
  id: 'course-a', chapters: [
    { id: 'chapter-a', courseId: 'course-a', title: 'A', order: 1, description: '', lessons: [{ id: 'lesson-a', chapterId: 'chapter-a', title: 'A1', order: 1, durationMinutes: 5, objectives: [], prerequisites: [], notesMarkdown: '', activities: [], quizQuestions: [], masteryThresholdPercent: 80 }] },
    { id: 'chapter-b', courseId: 'course-a', title: 'B', order: 2, description: '', lessons: [] },
  ],
} as Course;

test('legacy courses map into one stable module without changing chapter or lesson IDs', () => {
  const first = getCourseModules(course);
  const second = getCourseModules(course);
  assert.equal(first[0].id, second[0].id);
  assert.deepEqual(first[0].chapterIds, ['chapter-a', 'chapter-b']);
  assert.equal(getModuleChapters(course, first[0])[0].id, 'chapter-a');
  assert.equal(getLessonModule(course, 'lesson-a')?.id, first[0].id);
});

test('explicit modules retain chapter relationships and discard unknown chapter references', () => {
  const explicit = { ...course, modules: [{ id: 'm1', courseId: course.id, title: 'Foundations', order: 1, description: '', chapterIds: ['chapter-b', 'missing'] }] };
  assert.deepEqual(getCourseModules(explicit)[0].chapterIds, ['chapter-b']);
  assert.equal(getCourseModules(explicit)[0].examination?.passingScorePercent, 60);
});
