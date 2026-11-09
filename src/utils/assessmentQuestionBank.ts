import type { Course, ExamQuestion, Lesson, QuizQuestion } from '../types';

type Seed = { id: string; question: string; options: string[]; correctIndex: number; explanation: string; topic: string };


function normalizeQuestion(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function asMastery(seed: Seed, lesson: Lesson, index: number): QuizQuestion {
  const objectives = lesson.objectives.length ? lesson.objectives : [lesson.title];
  const objective = objectives[index % objectives.length];
  return {
    id: `bank-${lesson.id}-${seed.id}`,
    question: seed.question.trim(),
    options: [...seed.options],
    correctIndex: seed.correctIndex,
    explanation: seed.explanation,
    misconceptions: Object.fromEntries(seed.options.map((_, optionIndex) => [
      optionIndex, `Review ${lesson.title} and reconsider this option.`,
    ]).filter(([optionIndex]) => optionIndex !== seed.correctIndex)) as Record<number, string>,
    learningObjective: objective,
  };
}

/**
 * Builds the fixed assessment sizes from authored course material and answer
 * keys. The same approved question bank is used by the browser and trusted API.
 * Mastery questions remain distinct authored prompts. The builder never pads
 * a short bank by repeating the same question with a different prefix.
 */
export function withCompleteAssessmentBanks(courses: Course[]): Course[] {
  return courses.map((course) => {
    const usedPrompts = new Set<string>();
    const finalSeeds: Seed[] = (course.exam?.questions || []).map((q) => ({
      id: q.id, question: q.question, options: q.options, correctIndex: q.correctIndex,
      explanation: q.explanation || `This assesses ${q.topic || course.title}.`, topic: q.topic || course.title,
    })).filter((seed) => seed.options.length >= 2 && seed.correctIndex >= 0 && seed.correctIndex < seed.options.length)
      .filter((seed) => { const key = normalizeQuestion(seed.question); if (usedPrompts.has(key)) return false; usedPrompts.add(key); return true; });
    const chapters = course.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => {
        const sourceSeeds: Seed[] = lesson.quizQuestions.map((q) => ({ id: q.id, question: q.question, options: q.options, correctIndex: q.correctIndex, explanation: q.explanation, topic: q.learningObjective || lesson.title }));
        const uniqueSeeds = sourceSeeds.filter((seed) => seed.options.length >= 2 && seed.correctIndex >= 0 && seed.correctIndex < seed.options.length && seed.options.every((option) => Boolean(option?.trim())))
          .filter((seed, index, all) => all.findIndex((candidate) => normalizeQuestion(candidate.question) === normalizeQuestion(seed.question)) === index)
          .filter((seed) => { const key = normalizeQuestion(seed.question); if (usedPrompts.has(key)) return false; usedPrompts.add(key); return true; });
        const masteryCount = uniqueSeeds.length <= 1 ? uniqueSeeds.length : Math.min(10, Math.ceil(uniqueSeeds.length / 2));
        const masterySeeds = uniqueSeeds.slice(0, masteryCount);
        const moduleSeeds = uniqueSeeds.slice(masteryCount);
        return {
          ...lesson,
          quizQuestions: masterySeeds.map((seed, index) => asMastery(seed, lesson, index)),
          moduleExamQuestions: moduleSeeds.map((seed, index) => asMastery(seed, lesson, index + masteryCount)),
        };
      }),
    }));
    const questions: ExamQuestion[] = finalSeeds.slice(0, 30).map((seed, index) => ({
      id: `bank-${course.id}-final-${index + 1}`, question: seed.question.trim(), options: [...seed.options],
      correctIndex: seed.correctIndex, explanation: seed.explanation, topic: seed.topic,
    }));
    return {
      ...course, chapters,
      exam: {
        id: course.exam?.id || `exam-${course.id}`, courseId: course.id,
        title: course.exam?.title || `${course.title} Final Examination`,
        passingScorePercent: course.exam?.passingScorePercent || 50,
        durationMinutes: 60, questions,
      },
    };
  });
}
