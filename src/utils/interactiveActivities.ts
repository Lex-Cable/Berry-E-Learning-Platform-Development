import type { Course } from '../types';

function normalizePrompt(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Keep authored hands-on activities, remove repeated prompts and avoid
 * cloning mastery questions into a second tab under a different label.
 */
export function withInteractivePractice(courses: Course[], targetCount = 5): Course[] {
  return courses.map((course) => {
    const usedPrompts = new Set<string>([
      ...(course.exam?.questions || []).map((question) => normalizePrompt(question.question)),
      ...course.chapters.flatMap((chapter) => chapter.lessons.flatMap((lesson) => [
        ...(lesson.quizQuestions || []).map((question) => normalizePrompt(question.question)),
        ...(lesson.moduleExamQuestions || []).map((question) => normalizePrompt(question.question)),
      ])),
    ]);
    return {
      ...course,
      chapters: course.chapters.map((chapter) => ({
        ...chapter,
        lessons: chapter.lessons.map((lesson) => {
          const activities = (lesson.activities || []).filter((activity) => {
            const prompt = normalizePrompt(activity.instructions || activity.title || '');
            if (!prompt || usedPrompts.has(prompt)) return false;
            usedPrompts.add(prompt);
            return true;
          }).slice(0, targetCount);
          return { ...lesson, activities };
        }),
      })),
    };
  });
}
