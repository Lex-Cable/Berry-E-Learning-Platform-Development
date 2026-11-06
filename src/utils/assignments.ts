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
  const words = trimmed.match(/[\p{L}\p{N}']+/gu) || [];
  const wordCount = words.length;
  const normalized = trimmed.toLocaleLowerCase();
  const sentences = trimmed.split(/[.!?]+/).map((sentence) => sentence.trim()).filter(Boolean);
  const hasExplanation = /\b(because|therefore|this means|as a result|for example|for instance|such as|so that|which shows|this demonstrates)\b/i.test(trimmed);
  const hasReflection = /\b(i learned|i understand|i found|i struggled|i improved|i would|next time|i still|my question|i need to)\b/i.test(trimmed);

  const criterionScores: RubricAward[] = assignment.rubric.map((criterion) => {
    const concepts = Array.from(new Set(criterion.keywords
      .map((keyword) => keyword.trim().toLocaleLowerCase())
      .filter((keyword) => keyword.length >= 3)));
    const matched = concepts.filter((keyword) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\keyword.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')');
      return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, 'u').test(normalized);
    });
    const targetConcepts = Math.min(6, Math.max(3, Math.ceil(concepts.length * 0.2)));
    const conceptCoverage = concepts.length ? Math.min(1, matched.length / targetConcepts) : 0;
    const criterionText = `${criterion.id} ${criterion.description}`.toLowerCase();
    let evidenceMultiplier = 1;
    if (/application|example/.test(criterionText)) evidenceMultiplier = hasExplanation && sentences.length >= 2 ? 1 : 0.65;
    if (/reflection|reason/.test(criterionText)) evidenceMultiplier = hasReflection && sentences.length >= 2 ? 1 : 0.65;
    const earned = Math.round(criterion.marks * conceptCoverage * evidenceMultiplier);
    return { criterionId: criterion.id, awarded: Math.min(criterion.marks, earned), outOf: criterion.marks };
  });

  const lengthMultiplier = wordCount < 40 ? 0.25 : wordCount < 100 ? 0.6 : wordCount < 150 ? 0.8 : 1;
  const structureMultiplier = sentences.length < 2 ? 0.65 : 1;
  const adjusted = criterionScores.map((score) => ({
    ...score,
    awarded: Math.max(0, Math.min(score.outOf, Math.round(score.awarded * lengthMultiplier * structureMultiplier))),
  }));
  const marksAwarded = adjusted.reduce((sum, score) => sum + score.awarded, 0);
  const scorePercent = assignment.totalMarks > 0 ? Math.round((marksAwarded / assignment.totalMarks) * 100) : 0;
  const status: AssignmentSubmissionStatus = scorePercent >= 50 ? 'graded' : 'returned_for_revision';
  const feedbackParts = adjusted.map((score) => {
    const criterion = assignment.rubric.find((entry) => entry.id === score.criterionId);
    const label = criterion?.description ?? score.criterionId;
    if (score.awarded >= score.outOf) return `✓ ${label} — fully demonstrated (${score.awarded}/${score.outOf}).`;
    if (score.awarded > 0) return `• ${label} — partly demonstrated (${score.awarded}/${score.outOf}). Add relevant concepts and explain your reasoning.`;
    return `• ${label} — not yet demonstrated (0/${score.outOf}). Revisit the lesson objectives and address this criterion directly.`;
  });
  if (wordCount < 150) feedbackParts.push(`Your response contains ${wordCount} words. The assignment asks for at least 150 words; add detail and examples.`);
  if (sentences.length < 2) feedbackParts.push('Use complete sentences to explain your ideas rather than listing isolated terms.');
  feedbackParts.push(status === 'graded'
    ? 'Automated first-pass marking: passed. A teacher may review this feedback.'
    : 'Returned for revision: address the criterion feedback and submit an improved response.');
  return { status, marksAwarded, totalMarks: assignment.totalMarks, scorePercent, criterionScores: adjusted, markerFeedback: feedbackParts.join('\\n') };
}

export function nextAttemptNumber(previousAttempt: number): number {
  return Math.min(20, Math.max(1, previousAttempt + 1));
}

/**
 * Keeps a learner's first persisted assignment deadline stable across catalogue
 * rebuilds. A new assignment receives its generated initial deadline.
 */
export function resolveAssignmentDueDate(generatedDueDate: string, savedDueDate?: string): string {
  if (typeof savedDueDate === 'string' && savedDueDate.trim() && Number.isFinite(Date.parse(savedDueDate))) {
    return savedDueDate;
  }
  return generatedDueDate;
}
