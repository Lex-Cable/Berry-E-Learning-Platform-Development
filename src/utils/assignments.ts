import type { Assignment, AssignmentRubricCriterion, AssignmentSubmissionStatus, Course } from '../types';

const REFLECTION_PROMPTS = [
  'Explain the main idea from this lesson in your own words.',
  'Which learning objective was most important, and why?',
  'Describe the steps or process you learned.',
  'Give a practical example of how this knowledge is used.',
  'How would you explain this concept to someone younger than you?',
  'What evidence or reasoning supports your answer?',
  'Describe one mistake a learner might make and how to correct it.',
  'Connect this lesson to something you learned previously.',
  'What part of the lesson was most challenging, and how did you work through it?',
  'Create a short real-life situation where this lesson would be useful.',
  'What question do you still have about this topic?',
  'What would you like to practise further, and what is your plan?',
];

/** Creates one lesson-specific reflective assignment for every real lesson. */
export function buildCourseAssignments(courses: Course[]): Assignment[] {
  const seenCourseIds = new Set<string>();
  const assignments: Assignment[] = [];
  for (const course of courses) {
    if (seenCourseIds.has(course.id)) continue;
    seenCourseIds.add(course.id);
    for (const chapter of course.chapters) {
      for (const lesson of chapter.lessons) {
        const lessonWords = new Set<string>();
        const addWords = (value: string) => value.toLowerCase().split(/[^a-z0-9']+/).forEach((word) => {
          if (word.length >= 4) lessonWords.add(word);
        });
        addWords(course.subject);
        addWords(chapter.title);
        addWords(lesson.title);
        lesson.objectives.forEach(addWords);
        const keywords = Array.from(lessonWords).slice(0, 80);
        assignments.push({
          id: `assignment-${course.id}-${lesson.id}`,
          courseId: course.id,
          courseTitle: course.title,
          title: `${lesson.title}: Learning Reflection`,
          instructions:
            `Topic: ${chapter.title} — ${lesson.title}\n\nAnswer each of the following reflection questions in your own words. Use examples and explain your reasoning. Aim for a thoughtful response of at least 150 words overall.\n\n` +
            REFLECTION_PROMPTS.slice(0, 10).map((prompt, index) => `${index + 1}. ${prompt}`).join('\n'),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          totalMarks: 20,
          rubric: [
            { id: 'understanding', description: 'Explains the key ideas and lesson objectives accurately', marks: 8, keywords },
            { id: 'application', description: 'Uses a relevant example and applies the learning', marks: 6, keywords: ['example', 'for instance', 'such as', 'application', 'because', 'therefore', 'practice', 'real life'] },
            { id: 'reflection', description: 'Reflects on learning, challenges and next steps', marks: 6, keywords: ['question', 'still', 'not sure', 'wonder', 'improve', 'challenge', 'learned', 'understand', 'practice', 'next'] },
          ] satisfies AssignmentRubricCriterion[],
        } satisfies Assignment);
      }
    }
  }
  return assignments;
}

export interface RubricAward { criterionId: string; awarded: number; outOf: number }
export interface AssignmentMarkingResult {
  status: AssignmentSubmissionStatus;
  marksAwarded: number;
  totalMarks: number;
  scorePercent: number;
  criterionScores: RubricAward[];
  markerFeedback: string;
}

/** Automated formative first-pass marker; not an official qualification grade. */
export function markAssignmentSubmission(assignment: Assignment, content: string): AssignmentMarkingResult {
  const trimmed = content.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const lower = trimmed.toLowerCase();
  const criterionScores: RubricAward[] = assignment.rubric.map((criterion) => {
    if (criterion.keywords.length === 0) return { criterionId: criterion.id, awarded: 0, outOf: criterion.marks };
    const matched = criterion.keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
    const coverage = matched / Math.min(3, criterion.keywords.length);
    return { criterionId: criterion.id, awarded: Math.min(criterion.marks, Math.round(criterion.marks * coverage)), outOf: criterion.marks };
  });
  const lengthPenalty = wordCount < 40 ? 0.4 : wordCount < 100 ? 0.75 : 1;
  const adjusted = criterionScores.map((score) => ({ ...score, awarded: Math.max(0, Math.round(score.awarded * lengthPenalty)) }));
  const marksAwarded = adjusted.reduce((sum, score) => sum + score.awarded, 0);
  const scorePercent = assignment.totalMarks > 0 ? Math.round((marksAwarded / assignment.totalMarks) * 100) : 0;
  const status: AssignmentSubmissionStatus = scorePercent >= 50 ? 'graded' : 'returned_for_revision';
  const feedbackParts = adjusted.map((score) => {
    const criterion = assignment.rubric.find((entry) => entry.id === score.criterionId);
    const label = criterion?.description ?? score.criterionId;
    if (score.awarded >= score.outOf) return `✓ ${label} — full marks (${score.awarded}/${score.outOf}).`;
    if (score.awarded > 0) return `• ${label} — partial (${score.awarded}/${score.outOf}). Add more specific detail or correct terminology.`;
    return `• ${label} — not yet demonstrated (0/${score.outOf}). Revisit the lesson notes and try again.`;
  });
  if (wordCount < 100) feedbackParts.push(`Your submission is ${wordCount} words. Aim for at least 150 words so the marker can assess your understanding fully.`);
  feedbackParts.push(status === 'graded'
    ? 'Automated first-pass marking: passed. Your trainer may review and adjust this mark.'
    : 'Automated first-pass marking: returned for revision. Address the feedback and resubmit.');
  return { status, marksAwarded, totalMarks: assignment.totalMarks, scorePercent, criterionScores: adjusted, markerFeedback: feedbackParts.join('\n') };
}

export function nextAttemptNumber(previousAttempt: number): number {
  return Math.min(20, Math.max(1, previousAttempt + 1));
}
