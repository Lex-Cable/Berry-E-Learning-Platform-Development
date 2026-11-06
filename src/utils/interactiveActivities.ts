import type { Course } from '../types';

/**
 * Keep hands-on activities authored for the lesson. Do not clone mastery
 * assessment questions into interactive activities: that made learners see
 * the same prompt twice under different tabs.
 */
export function withInteractivePractice(courses: Course[], targetCount = 5): Course[] {
  return courses.map((course) => ({
    ...course,
    chapters: course.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => ({
        ...lesson,
        activities: (lesson.activities || []).slice(0, targetCount),
      })),
    })),
  }));
}
