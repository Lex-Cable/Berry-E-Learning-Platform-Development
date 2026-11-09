import test from 'node:test';
import assert from 'node:assert/strict';
import type { Course } from '../types';
import { getCourseModules, getModuleChapters, getLessonModule } from './courseModules';

const course = {
  id: 'course-a', chapters: [
    { id: 'chapter-a', courseId: 'course-a', title: 'A', order: 1, description: '', lessons: [{ id: 'lesson-a', chapterId: 'chapter-a', title: 'A1', order: 1, durationMinutes: 5, objectives: [], prerequisites: [], notesMarkdown: '', activities: [], quizQuestions: [], masteryThresholdPercent: 80 }] },
    { id: 'chapter-b', courseId: 'course-a', title: 'B', order: 2, description: '', lessons: [] },
  ],
} as unknown as Course;

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

test('long legacy courses are grouped into ordered multi-chapter modules without renaming chapters', () => {
  const longCourse = { ...course, chapters: Array.from({ length: 7 }, (_, index) => ({ ...course.chapters[0], id: `chapter-${index+1}`, title: `Chapter ${index+1}`, order: index+1, lessons: [] })) } as unknown as Course;
  const modules = getCourseModules(longCourse);
  assert.deepEqual(modules.map((module) => module.chapterIds.length), [3, 3, 1]);
  assert.equal(getModuleChapters(longCourse, modules[1])[0].id, 'chapter-4');
  assert.equal(modules[0].title.includes('Chapter 1'), true);
});
