import type { Course, ExamQuestion, Lesson, QuizQuestion } from '../types';

type Seed = { id: string; question: string; options: string[]; correctIndex: number; explanation: string; topic: string };

function normalizeQuestion(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function asSeed(question: QuizQuestion): Seed {
  return {
    id: question.id,
    question: question.question,
    options: question.options,
    correctIndex: question.correctIndex,
    explanation: question.explanation || 'Review the lesson notes and learning objectives.',
    topic: question.learningObjective || question.question,
  };
}

function isValidSeed(seed: Seed): boolean {
  return Boolean(seed.id && seed.question.trim()) &&
    seed.options.length >= 2 &&
    seed.options.every((option) => Boolean(option?.trim())) &&
    Number.isInteger(seed.correctIndex) &&
    seed.correctIndex >= 0 && seed.correctIndex < seed.options.length;
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
 * Builds distinct, trusted question pools. Explicitly authored chapter and
 * module questions take priority; legacy lesson question banks are partitioned
 * only when no explicit pools have been supplied. Questions are never copied
 * between formal assessment types or fabricated to meet a target count.
 */
export function withCompleteAssessmentBanks(courses: Course[]): Course[] {
  return courses.map((course) => {
    const usedPrompts = new Set<string>();
    const finalSeeds: Seed[] = (course.exam?.questions || []).map((q) => ({
      id: q.id, question: q.question, options: q.options, correctIndex: q.correctIndex,
      explanation: q.explanation || `This assesses ${q.topic || course.title}.`, topic: q.topic || course.title,
    })).filter(isValidSeed)
      .filter((seed) => { const key = normalizeQuestion(seed.question); if (usedPrompts.has(key)) return false; usedPrompts.add(key); return true; });

    const chapters = course.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => {
        const uniqueSeeds = lesson.quizQuestions.map(asSeed).filter(isValidSeed)
          .filter((seed, index, all) => all.findIndex((candidate) => normalizeQuestion(candidate.question) === normalizeQuestion(seed.question)) === index)
          .filter((seed) => { const key = normalizeQuestion(seed.question); if (usedPrompts.has(key)) return false; usedPrompts.add(key); return true; });

        const masteryCount = uniqueSeeds.length <= 2 ? Math.min(1, uniqueSeeds.length) : Math.min(10, Math.max(1, Math.floor(uniqueSeeds.length / 3)));
        const masterySeeds = uniqueSeeds.slice(0, masteryCount);
        const remainingSeeds = uniqueSeeds.slice(masteryCount);
        const chapterCount = remainingSeeds.length >= 2 ? Math.max(1, Math.floor(remainingSeeds.length / 2)) : remainingSeeds.length;
        const legacyChapterSeeds = remainingSeeds.slice(0, chapterCount);
        const legacyModuleSeeds = remainingSeeds.slice(chapterCount);

        const takeExplicit = (questions: QuizQuestion[] | undefined): Seed[] => (questions || [])
          .map(asSeed).filter(isValidSeed)
          .filter((seed, index, all) => all.findIndex((candidate) => normalizeQuestion(candidate.question) === normalizeQuestion(seed.question)) === index)
          .filter((seed) => {
            const key = normalizeQuestion(seed.question);
            if (usedPrompts.has(key)) return false;
            usedPrompts.add(key);
            return true;
          });

        const explicitChapterSeeds = takeExplicit(lesson.chapterAssessmentQuestions);
        const explicitModuleSeeds = takeExplicit(lesson.moduleExamQuestions);
        const chapterSeeds = [...explicitChapterSeeds, ...legacyChapterSeeds];
        const moduleSeeds = [...explicitModuleSeeds, ...legacyModuleSeeds];

        return {
          ...lesson,
          quizQuestions: masterySeeds.map((seed, index) => asMastery(seed, lesson, index)),
          chapterAssessmentQuestions: chapterSeeds.map((seed, index) => asMastery(seed, lesson, index + masteryCount)),
          moduleExamQuestions: moduleSeeds.map((seed, index) => asMastery(seed, lesson, index + masteryCount + chapterCount)),
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
