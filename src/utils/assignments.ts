import type { Assignment, AssignmentRubricCriterion, AssignmentSubmissionStatus, Course } from '../types';

/**
 * Builds assignment definitions from courses that have an exam, plus any explicitly
 * authored assignment banks. Assignments must reference real courses and lessons;
 * Berry never fabricates curriculum content.
 */
export function buildCourseAssignments(courses: Course[]): Assignment[] {
  return courses
    .filter((course) => course.chapters.some((chapter) => chapter.lessons.length > 0))
    .map((course) => {
      const firstLessonTitle = course.chapters[0]?.lessons[0]?.title ?? course.subject;
      const lessonIds = course.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
      return {
        id: `assignment-${course.id}`,
        courseId: course.id,
        courseTitle: course.title,
        title: `${course.subject} Reflection: ${firstLessonTitle}`,
        instructions:
          `Write a short reflection (150–800 words) on what you learned in "${firstLessonTitle}" in ${course.title}. ` +
          'Explain the key idea in your own words, give one example, and state one question you still have.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        totalMarks: 20,
        rubric: [
          {
            id: 'understanding',
            description: 'Explains the key concept of the lesson accurately in own words',
            marks: 8,
            keywords: keywordSetForCourse(course, lessonIds),
          },
          {
            id: 'example',
            description: 'Gives a concrete, relevant example or application',
            marks: 6,
            keywords: ['example', 'for instance', 'such as', 'e.g.', 'application', 'real life', 'practice'],
          },
          {
            id: 'reflection',
            description: 'Identifies a remaining question or area to improve',
            marks: 6,
            keywords: ['question', 'still', 'not sure', 'wonder', 'confused', 'improve', 'next', 'challenge', "don't understand", 'do not understand'],
          },
        ] satisfies AssignmentRubricCriterion[],
      } satisfies Assignment;
    });
}

function keywordSetForCourse(course: Course, lessonIds: string[]): string[] {
  const words = new Set<string>();
  // Subject and objective keywords give a domain-specific vocabulary for the marker.
  const addFrom = (text: string) => {
    text.toLowerCase().split(/[^a-z0-9']+/).forEach((word) => {
      if (word.length >= 5) words.add(word);
    });
  };
  addFrom(course.subject);
  course.objectives.forEach(addFrom);
  course.chapters.forEach((chapter) => {
    addFrom(chapter.title);
    chapter.lessons.forEach((lesson) => {
      addFrom(lesson.title);
      lesson.objectives.forEach(addFrom);
    });
  });
  // Always accept references to lesson identifiers so learners can cite their work.
  lessonIds.forEach((id) => words.add(id.toLowerCase()));
  return Array.from(words).slice(0, 120);
}

export interface RubricAward {
  criterionId: string;
  awarded: number;
  outOf: number;
}

export interface AssignmentMarkingResult {
  status: AssignmentSubmissionStatus;
  marksAwarded: number;
  totalMarks: number;
  scorePercent: number;
  criterionScores: RubricAward[];
  markerFeedback: string;
}

/**
 * Automated first-pass marker. Scores each rubric criterion by keyword coverage and
 * reflection length, then decides whether the work passes or is returned for revision.
 * This is a formative automated marker, not an official qualification grade.
 */
export function markAssignmentSubmission(
  assignment: Assignment,
  content: string,
): AssignmentMarkingResult {
  const trimmed = content.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const lower = trimmed.toLowerCase();

  const criterionScores: RubricAward[] = assignment.rubric.map((criterion) => {
    if (criterion.keywords.length === 0) return { criterionId: criterion.id, awarded: 0, outOf: criterion.marks };
    const matched = criterion.keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
    const coverage = matched / Math.min(3, criterion.keywords.length);
    const awarded = Math.round(criterion.marks * coverage);
    return { criterionId: criterion.id, awarded: Math.min(criterion.marks, awarded), outOf: criterion.marks };
  });

  // Very short submissions cannot demonstrate the required understanding.
  const lengthPenalty = wordCount < 40 ? 0.4 : wordCount < 100 ? 0.75 : 1;
  const adjusted = criterionScores.map((score) => ({
    ...score,
    awarded: Math.max(0, Math.round(score.awarded * lengthPenalty)),
  }));

  const marksAwarded = adjusted.reduce((sum, score) => sum + score.awarded, 0);
  const scorePercent = assignment.totalMarks > 0
    ? Math.round((marksAwarded / assignment.totalMarks) * 100)
    : 0;
  const passMark = 50;
  const status: AssignmentSubmissionStatus = scorePercent >= passMark ? 'graded' : 'returned_for_revision';

  const feedbackParts = adjusted.map((score) => {
    const criterion = assignment.rubric.find((entry) => entry.id === score.criterionId);
    const label = criterion?.description ?? score.criterionId;
    if (score.awarded >= score.outOf) return `✔ ${label} — full marks (${score.awarded}/${score.outOf}).`;
    if (score.awarded > 0) return `~/ ${label} — partial (${score.awarded}/${score.outOf}). Add more specific detail or correct terminology.`;
    return `✘ ${label} — not yet demonstrated (0/${score.outOf}). Revisit the lesson notes and try again.`;
  });
  if (wordCount < 100) {
    feedbackParts.push(`Your submission is ${wordCount} words. Aim for at least 150 words so the marker can assess your understanding fully.`);
  }
  feedbackParts.push(
    status === 'graded'
      ? 'Automated first-pass marking: passed. Your trainer may review and adjust this mark.'
      : 'Automated first-pass marking: returned for revision. Address the feedback and resubmit.',
  );

  return {
    status,
    marksAwarded,
    totalMarks: assignment.totalMarks,
    scorePercent,
    criterionScores: adjusted,
    markerFeedback: feedbackParts.join('\n'),
  };
}

export function nextAttemptNumber(previousAttempt: number): number {
  return Math.min(20, Math.max(1, previousAttempt + 1));
}
