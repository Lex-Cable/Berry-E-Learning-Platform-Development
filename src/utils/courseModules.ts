import type { Course, CourseModule, Chapter } from '../types';

/**
 * Resolve explicit module relationships while keeping old Course records valid.
 * Legacy courses receive one stable module containing their existing chapters;
 * chapters are not renamed or duplicated and their IDs remain unchanged.
 */
export function getCourseModules(course: Course): CourseModule[] {
  if (Array.isArray(course.modules) && course.modules.length > 0) {
    const chapterIds = new Set(course.chapters.map((chapter) => chapter.id));
    return [...course.modules]
      .map((module) => ({ ...module, chapterIds: module.chapterIds.filter((id) => chapterIds.has(id)) }))
      .filter((module) => module.chapterIds.length > 0)
      .sort((a, b) => a.order - b.order);
  }
  if (course.chapters.length === 0) return [];
  return [{
    id: `module-${course.id}-1`,
    courseId: course.id,
    title: 'Course Module 1',
    order: 1,
    description: 'Legacy curriculum module containing the course chapters already in the catalogue.',
    chapterIds: course.chapters.map((chapter) => chapter.id),
    examination: {
      id: `module-exam-${course.id}-1`,
      title: 'Module 1 Examination',
      passingScorePercent: 60,
      durationMinutes: 60,
      questionCount: 20,
      maximumAttempts: 2,
    },
  }];
}

export function getModuleChapters(course: Course, module: CourseModule): Chapter[] {
  const byId = new Map(course.chapters.map((chapter) => [chapter.id, chapter]));
  return module.chapterIds.map((id) => byId.get(id)).filter((chapter): chapter is Chapter => Boolean(chapter));
}

export function getLessonModule(course: Course, lessonId: string): CourseModule | undefined {
  return getCourseModules(course).find((module) => getModuleChapters(course, module)
    .some((chapter) => chapter.lessons.some((lesson) => lesson.id === lessonId)));
}
