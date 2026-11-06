import type { Course } from '../types';

function normalizePrompt(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Keep authored hands-on activities, remove repeated prompts and avoid
 * cloning mastery questions into a second tab under a different label.
 */
export function withInteractivePractice(courses: Course[], targetCount = 5): Course[] {
  return courses.map((course) => ({
    ...course,
    chapters: course.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => {
        const masteryPrompts = new Set((lesson.quizQuestions || []).map((question) => normalizePrompt(question.question)));
        const seen = new Set<string>();
        const activities = (lesson.activities || []).filter((activity) => {
          const prompt = normalizePrompt(activity.instructions || activity.title || '');
          if (!prompt || masteryPrompts.has(prompt) || seen.has(prompt)) return false;
          seen.add(prompt);
          return true;
        }).slice(0, targetCount);
        return { ...lesson, activities };
      }),
    })),
  }));
}
