import type { Course, ExamQuestion, Lesson, QuizQuestion } from '../types';

const MASTERY_COUNT = 10;
const EXAM_COUNT = 30;

type QuestionSeed = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
};

function lessonSeeds(lesson: Lesson): QuestionSeed[] {
  const quiz: QuestionSeed[] = lesson.quizQuestions.map((question) => ({
    id: question.id,
    question: question.question,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation || `This checks the lesson objective: ${question.learningObjective || lesson.title}.`,
    topic: question.learningObjective || lesson.title,
  }));
  const activitySeeds: QuestionSeed[] = (lesson.activities || [])
    .filter((activity) => activity.type === 'interactive-choice' && (activity.data.choices || []).filter((choice) => choice.isCorrect).length === 1)
    .map((activity) => {
      const choices = activity.data.choices || [];
      return {
        id: activity.id,
        question: activity.instructions,
        options: choices.map((choice) => choice.label),
        correctIndex: choices.findIndex((choice) => choice.isCorrect),
        explanation: choices.find((choice) => choice.isCorrect)?.feedback || `Review the lesson: ${lesson.title}.`,
        topic: lesson.title,
      };
    });
  return [...quiz, ...activitySeeds].filter((seed) =>
    seed.options.length >= 2 &&
    seed.correctIndex >= 0 &&
    seed.correctIndex < seed.options.length &&
    seed.options.every((option) => Boolean(option?.trim()))
  );
}

function contextualQuestion(seed: QuestionSeed, lesson: Lesson, index: number): QuizQuestion {
  const objective = lesson.objectives[index % Math.max(lesson.objectives.length, 1)] || lesson.title;
  const prefixes = [
    '',
    `Knowledge check for ${lesson.title}: `,
    `Apply what you learned about ${objective}: `,
    `A learner is reviewing ${lesson.title}. `,
    `Choose the accurate response in this ${lesson.title} checkpoint: `,
    `Think carefully about ${objective}. `,
    `Use the lesson notes on ${lesson.title} to answer: `,
    `Which option demonstrates understanding of ${objective}? `,
    `Topic practice — ${lesson.title}: `,
    `Final review of ${objective}: `,
  ];
  return {
    id: `bank-${lesson.id}-${index + 1}`,
    question: `${prefixes[index % prefixes.length]}${seed.question}`,
    options: [...seed.options],
    correctIndex: seed.correctIndex,
    explanation: seed.explanation,
    misconceptions: Object.fromEntries(seed.options.map((_, optionIndex) => [
      optionIndex,
      optionIndex === seed.correctIndex ? seed.explanation : `Review ${lesson.title} and reconsider this option.`,
    ]).filter(([optionIndex]) => optionIndex !== seed.correctIndex)) as Record<number, string>,
    learningObjective: objective,
  };
}

/**
 * Produces ten lesson-specific mastery items and a thirty-item course exam.
 * Items are derived only from authored lesson questions and keyed interactive
 * choices. When the source bank is small, contextual variations preserve the
 * approved answer key rather than inventing new facts or answers.
 */
export function withCompleteAssessmentBanks(courses: Course[]): Course[] {
  return courses.map((course) => {
    const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
    const updatedChapters = course.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => {
        const seeds = lessonSeeds(lesson);
        if (seeds.length === 0) return lesson;
        const questions = Array.from({ length: MASTERY_COUNT }, (_, index) =>
          contextualQuestion(seeds[index % seeds.length], lesson, index)
        );
        return { ...lesson, quizQuestions: questions };
      }),
    }));

    const examSeeds: QuestionSeed[] = (course.exam?.questions || []).map((question) => ({
      id: question.id,
      question: question.question,
      options: question.options,
      correctIndex: question.correctIndex,
      explanation: question.explanation || `This question assesses ${question.topic || course.title}.`,
      topic: question.topic || course.title,
    }));
    for (const lesson of lessons) examSeeds.push(...lessonSeeds(lesson));
    const usableExamSeeds = examSeeds.filter((seed) =>
      seed.options.length >= 2 && seed.correctIndex >= 0 && seed.correctIndex < seed.options.length
    );
    const examQuestions: ExamQuestion[] = usableExamSeeds.length
      ? Array.from({ length: EXAM_COUNT }, (_, index) => {
          const seed = usableExamSeeds[index % usableExamSeeds.length];
          const sourceLesson = lessons.find((lesson) =>
            lesson.quizQuestions.some((question) => question.id === seed.id)
          );
          const topic = seed.topic || sourceLesson?.title || course.subject;
          const prefix = index < usableExamSeeds.length ? '' : `Course review ${index + 1} — `;
          return {
            id: `bank-${course.id}-exam-${index + 1}`,
            question: `${prefix}${seed.question}`,
            options: [...seed.options],
            correctIndex: seed.correctIndex,
            explanation: seed.explanation,
            topic,
          };
        })
      : [];

    return {
      ...course,
      chapters: updatedChapters,
      ...(course.exam ? {
        exam: { ...course.exam, durationMinutes: 60, questions: examQuestions },
      } : {
        exam: {
          id: `exam-${course.id}`,
          courseId: course.id,
          title: `${course.title} Final Examination`,
          passingScorePercent: 75,
          durationMinutes: 60,
          questions: examQuestions,
        },
      }),
    };
  });
}
