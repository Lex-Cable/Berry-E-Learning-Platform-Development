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
      .map((module) => ({ ...module, chapterIds: module.chapterIds.filter((id) => chapterIds.has(id)), examination: module.examination ?? { id: `module-exam-${module.id}`, title: `${module.title} Examination`, passingScorePercent: 60, durationMinutes: 60, questionCount: 20, maximumAttempts: 2 } }))
      .filter((module) => module.chapterIds.length > 0)
      .sort((a, b) => a.order - b.order);
  }
  if (course.chapters.length === 0) return [];
  const orderedChapters = [...course.chapters].sort((left, right) => left.order - right.order);
  const chaptersPerLegacyModule = 3;
  return Array.from({ length: Math.ceil(orderedChapters.length / chaptersPerLegacyModule) }, (_, index) => {
    const grouped = orderedChapters.slice(index * chaptersPerLegacyModule, (index + 1) * chaptersPerLegacyModule);
    const first = grouped[0];
    const last = grouped[grouped.length - 1];
    const rangeTitle = first.id === last.id ? first.title : `${first.title} – ${last.title}`;
    const moduleId = `module-${course.id}-${first.id}`;
    return {
      id: moduleId, courseId: course.id, title: `Module ${index + 1}: ${rangeTitle}`, order: index + 1,
      description: `Backward-compatible module grouping for chapters ${grouped.map((chapter) => chapter.order).join(', ')}. Existing chapter and lesson records remain unchanged.`,
      chapterIds: grouped.map((chapter) => chapter.id),
      examination: { id: `module-exam-${moduleId}`, title: `Module ${index + 1} Examination`, passingScorePercent: 60, durationMinutes: 60, questionCount: 20, maximumAttempts: 2 },
    };
  });
}

export function getModuleChapters(course: Course, module: CourseModule): Chapter[] {
  const byId = new Map(course.chapters.map((chapter) => [chapter.id, chapter]));
  return module.chapterIds.map((id) => byId.get(id)).filter((chapter): chapter is Chapter => Boolean(chapter));
}

export function getLessonModule(course: Course, lessonId: string): CourseModule | undefined {
  return getCourseModules(course).find((module) => getModuleChapters(course, module)
    .some((chapter) => chapter.lessons.some((lesson) => lesson.id === lessonId)));
}
