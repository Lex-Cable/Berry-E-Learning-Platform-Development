import type { Course, InteractiveActivity } from '../types';

/**
 * Fill missing hands-on practice slots from the course's own approved mastery
 * questions. This reuses existing course content and never invents questions.
 */
export function withInteractivePractice(courses: Course[], targetCount = 5): Course[] {
  return courses.map((course) => ({
    ...course,
    chapters: course.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => {
        const existing = (lesson.activities || []).slice(0, targetCount);
        const needed = targetCount - existing.length;
        const usedQuestionIds = new Set(existing.map((activity) => activity.id));
        const derived: InteractiveActivity[] = lesson.quizQuestions
          .filter((question) => !usedQuestionIds.has(`practice-${lesson.id}-${question.id}`))
          .slice(0, needed)
          .map((question) => ({
            id: `practice-${lesson.id}-${question.id}`,
            type: 'interactive-choice',
            title: `Apply the concept: ${question.learningObjective || lesson.title}`,
            instructions: question.question,
            data: {
              choices: question.options.map((label, index) => ({
                id: `option-${index}`,
                label,
                isCorrect: index === question.correctIndex,
                feedback: index === question.correctIndex
                  ? question.explanation
                  : question.misconceptions?.[index] || 'Review the lesson explanation and try again.',
              })),
            },
          }));
        return { ...lesson, activities: [...existing, ...derived] };
      }),
    })),
  }));
}
