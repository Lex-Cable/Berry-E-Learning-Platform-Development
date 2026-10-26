import { Lesson, QuizQuestion, LearnerStage, Curriculum, Course } from '../types';

/**
 * Calculates score percentage from raw correct counts.
 */
export function calculateScore(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((Math.max(0, correct) / total) * 100);
}

/**
 * Evaluates whether a score meets mastery threshold (default: 80%).
 * Berry core principle: understanding is demonstrated by mastery, not passive clicks.
 */
export function evaluateMastery(scorePercent: number, thresholdPercent: number = 80): {
  isMastered: boolean;
  needsRevision: boolean;
  statusBadge: string;
  feedbackText: string;
} {
  const isMastered = scorePercent >= thresholdPercent;
  const needsRevision = scorePercent < 70;

  if (isMastered) {
    return {
      isMastered: true,
      needsRevision: false,
      statusBadge: 'Mastered',
      feedbackText: 'Outstanding! You have demonstrated genuine understanding of this concept.',
    };
  } else if (scorePercent >= 70) {
    return {
      isMastered: false,
      needsRevision: false,
      statusBadge: 'Near Mastery',
      feedbackText: 'Almost there! You have a solid grasp. Review the key notes to secure full mastery.',
    };
  } else {
    return {
      isMastered: false,
      needsRevision: true,
      statusBadge: 'Needs Revision',
      feedbackText: 'Knowledge gaps detected. Review the targeted explanation before reassessing.',
    };
  }
}

/**
 * Determines whether a lesson is unlocked based on prerequisite mastery.
 * Prevents advancing before mastering foundational concepts.
 */
export function isLessonUnlocked(
  lesson: Lesson,
  completedLessonIds: string[],
  masteredLessonIds: string[]
): boolean {
  if (!lesson.prerequisites || lesson.prerequisites.length === 0) {
    return true;
  }
  // All prerequisites must be mastered or completed
  return lesson.prerequisites.every((prereqId) =>
    masteredLessonIds.includes(prereqId) || completedLessonIds.includes(prereqId)
  );
}

/**
 * Returns targeted diagnostic misconception feedback for an incorrect answer choice.
 */
export function getMisconceptionExplanation(
  question: QuizQuestion,
  selectedIndex: number
): { isCorrect: boolean; feedback: string } {
  if (selectedIndex === question.correctIndex) {
    return {
      isCorrect: true,
      feedback: question.explanation,
    };
  }

  const specificMisconception = question.misconceptions?.[selectedIndex];
  if (specificMisconception) {
    return {
      isCorrect: false,
      feedback: specificMisconception,
    };
  }

  return {
    isCorrect: false,
    feedback: `Option "${question.options[selectedIndex] || 'selected'}" is incorrect. ${question.explanation}`,
  };
}

/**
 * Strict requirement: Live transcription is ONLY allowed in Berry Advance (and legacy University / Professionals).
 * Must NEVER be accessible or exposed to Berry Early, Junior, or Senior learners.
 */
export function isLiveTranscriptionAllowed(stage: LearnerStage): boolean {
  return stage === 'advance' || stage === 'university' || stage === 'professionals';
}

/**
 * Kenya Competency Based Curriculum (CBC) structural stages
 */
export const KENYA_CBC_LEVELS = [
  { group: 'Pre-primary (Berry Early)', levels: ['PP1', 'PP2'], description: 'Foundational literacy, psychomotor, numbers & creative activities' },
  { group: 'Lower Primary (Berry Junior)', levels: ['Grade 1', 'Grade 2', 'Grade 3'], description: 'Literacy, English, Kiswahili, Mathematics, Environmental Activities' },
  { group: 'Upper Primary (Berry Junior)', levels: ['Grade 4', 'Grade 5', 'Grade 6'], description: 'Science & Technology, Agriculture, Social Studies, Creative Arts' },
  { group: 'Junior School (Berry Junior)', levels: ['Grade 7', 'Grade 8', 'Grade 9'], description: 'Integrated Science, Pre-Technical, Social Studies, Business, Agriculture' },
  { group: 'Senior School (Berry Senior)', levels: ['Grade 10', 'Grade 11', 'Grade 12'], description: 'Specialized Pathways: STEM, Social Sciences, Arts & Sports' },
] as const;

/**
 * Validates whether a grade level belongs to Kenyan CBC Junior or Early stage
 */
export function isGradeJuniorCBC(grade: string): boolean {
  const juniorGrades = ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9'];
  return juniorGrades.includes(grade);
}

/**
 * Filters courses based on active stage, curriculum and optional grade level
 */
export function filterCoursesByStage(
  courses: Course[],
  stage: LearnerStage,
  curriculum?: Curriculum,
  gradeLevel?: string
): Course[] {
  return courses.filter((course) => {
    // Stage matching with Advance umbrella support
    if (stage === 'advance') {
      if (course.stage !== 'advance' && course.stage !== 'university' && course.stage !== 'professionals') {
        return false;
      }
    } else if (course.stage !== stage) {
      return false;
    }

    if (curriculum && course.curriculum !== curriculum) return false;
    if (gradeLevel && gradeLevel !== 'all' && course.gradeLevel !== gradeLevel) return false;
    return true;
  });
}

/**
 * Returns distinct subjects for a specific grade level from courses list.
 */
export function getDistinctSubjectsForGrade(courses: Course[], gradeLevel: string): string[] {
  const matching = courses.filter((c) => c.gradeLevel === gradeLevel);
  return Array.from(new Set(matching.map((c) => c.subject)));
}

/**
 * Validates whether the user can navigate back to a previous page.
 * Returns true whenever history has items or when the user is not on the landing page.
 */
export function canNavigateBack(history: string[], currentView: string): boolean {
  return history.length > 0 || currentView !== 'landing';
}

/**
 * Pops the last view from history stack and returns next history state and destination.
 */
export function popNavigationHistory(history: string[], fallbackView = 'landing'): {
  targetView: string;
  nextHistory: string[];
} {
  if (history.length === 0) {
    return { targetView: fallbackView, nextHistory: [] };
  }
  const nextHistory = [...history];
  const targetView = nextHistory.pop() || fallbackView;
  return { targetView, nextHistory };
}
