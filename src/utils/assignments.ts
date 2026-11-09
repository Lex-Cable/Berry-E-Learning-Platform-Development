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

function createSubjectAssignmentBrief(course: Course, chapter: Course['chapters'][number], lesson: Course['chapters'][number]['lessons'][number]): { title: string; instructions: string; rubric: AssignmentRubricCriterion[] } {
  const subject = `${course.subject} ${course.title}`.toLowerCase();
  const objectives = lesson.objectives.length ? lesson.objectives : [lesson.title];
  const objectiveText = objectives.map((objective, index) => `${index + 1}. ${objective}`).join('\\n');
  const context = `Course: ${course.title}\\nChapter: ${chapter.title}\\nLesson: ${lesson.title}\\nLearning objectives:\\n${objectiveText}`;
  if (/computer|software|programming|coding|computer science|web development|data science|algorithm/.test(subject)) return {
    title: `${course.subject} Practical Task: ${lesson.title}`,
    instructions: `${context}\\n\\nPRACTICAL TASK\\nBuild a small program, algorithm, or working technical example that demonstrates the objectives above. Include the source code or pseudocode, explain the important steps, provide at least two test cases with expected and actual outputs, and identify one error or edge case you checked.\\n\\nDELIVERABLES\\n1. Source code or pseudocode.\\n2. Test cases and outputs.\\n3. A short explanation of your design decisions and how the work meets each objective.\\n4. Any relevant screenshots or project link.\\n\\nSubmit your own work and identify any tools or references used.`,
    rubric: [
      { id: 'technical-accuracy', description: 'Technical solution is correct and addresses the learning objectives', marks: 8, keywords: [...objectives, 'algorithm', 'code', 'function', 'output', 'logic'] },
      { id: 'testing-debugging', description: 'Provides meaningful test cases, expected outputs and debugging evidence', marks: 6, keywords: ['test', 'input', 'output', 'debug', 'error', 'edge case', 'expected'] },
      { id: 'explanation', description: 'Explains implementation choices and how the solution works', marks: 6, keywords: ['because', 'therefore', 'function', 'variable', 'loop', 'condition', 'explain'] },
    ],
  };
  if (/account|finance|bookkeep|business|management|econom|entrepreneur|marketing/.test(subject)) return {
    title: `${course.subject} Applied Case Assignment: ${lesson.title}`,
    instructions: `${context}\\n\\nCASE STUDY TASK\\nPrepare a short professional case response applying the lesson objectives to a realistic organisation or business situation. Show all relevant calculations, schedules or statement extracts where applicable. Explain your assumptions, interpret the results, and make a justified recommendation.\\n\\nDELIVERABLES\\n1. A clearly labelled case analysis.\\n2. Calculations, tables or statement extracts with workings.\\n3. Interpretation of the results and the relevant business or financial implications.\\n4. A practical recommendation supported by evidence.\\n\\nState any assumptions and cite any external sources used.`,
    rubric: [
      { id: 'concept-accuracy', description: 'Applies the business, accounting or financial concepts accurately', marks: 8, keywords: [...objectives, 'account', 'revenue', 'expense', 'profit', 'cost', 'business', 'management'] },
      { id: 'analysis-calculations', description: 'Shows correct calculations, schedules and interpretation', marks: 6, keywords: ['calculation', 'total', 'balance', 'statement', 'analysis', 'result', 'ratio', 'variance'] },
      { id: 'recommendation', description: 'Makes a practical recommendation supported by reasons', marks: 6, keywords: ['recommend', 'because', 'therefore', 'evidence', 'risk', 'decision', 'improve'] },
    ],
  };
  if (/math|numeracy|algebra|geometry|statistics/.test(subject)) return {
    title: `${course.subject} Problem-Solving Assignment: ${lesson.title}`,
    instructions: `${context}\\n\\nPROBLEM-SOLVING TASK\\nCreate and solve three worked examples that demonstrate the objectives above. Show every important step, explain the method used, check each answer using a second method where possible, and describe one common error to avoid.\\n\\nDELIVERABLES\\n1. Three clearly stated problems.\\n2. Complete working and final answers with units where relevant.\\n3. A check or verification for each answer.\\n4. A short explanation of the method and one common misconception.`,
    rubric: [
      { id: 'method', description: 'Chooses and applies an appropriate mathematical method', marks: 8, keywords: [...objectives, 'formula', 'method', 'equation', 'calculate', 'solve'] },
      { id: 'working', description: 'Shows accurate step-by-step calculations and answers', marks: 6, keywords: ['step', 'therefore', 'equals', 'substitute', 'calculate', 'answer', 'working'] },
      { id: 'verification', description: 'Checks results and explains errors or alternative methods', marks: 6, keywords: ['check', 'verify', 'estimate', 'alternative', 'error', 'because', 'reason'] },
    ],
  };
  if (/science|biology|chemistry|physics|agriculture|environment/.test(subject)) return {
    title: `${course.subject} Investigation Assignment: ${lesson.title}`,
    instructions: `${context}\\n\\nINVESTIGATION TASK\\nDesign a short investigation or evidence-based explanation that demonstrates the objectives above. State the question, identify variables or factors, list materials, describe a safe method, present sample observations or a labelled model, and draw a conclusion supported by evidence. Do not claim to have conducted an experiment you did not perform.\\n\\nDELIVERABLES\\n1. Investigation question and prediction.\\n2. Variables, materials and safe method.\\n3. Observations, data table or labelled model.\\n4. Evidence-based conclusion and limitations.`,
    rubric: [
      { id: 'scientific-understanding', description: 'Explains the scientific concepts and objectives accurately', marks: 8, keywords: [...objectives, 'process', 'organism', 'reaction', 'force', 'energy', 'system'] },
      { id: 'method-evidence', description: 'Uses an appropriate method and presents relevant evidence or data', marks: 6, keywords: ['method', 'variable', 'materials', 'observation', 'data', 'measure', 'evidence'] },
      { id: 'conclusion-safety', description: 'Draws a justified conclusion and considers safety or limitations', marks: 6, keywords: ['conclusion', 'because', 'therefore', 'safety', 'limitation', 'result', 'evidence'] },
    ],
  };
  return {
    title: `${course.subject} Applied Learning Assignment: ${lesson.title}`,
    instructions: `${context}\\n\\nAPPLICATION TASK\\nPrepare a structured response showing how the lesson objectives apply to a real situation, text, community issue or practical example relevant to this subject. Explain the key concepts, provide specific evidence, compare an alternative where appropriate, and finish with a reasoned conclusion.\\n\\nDELIVERABLES\\n1. A clear introduction and explanation of the relevant concepts.\\n2. A specific example, case or application.\\n3. Evidence and reasoning that support your analysis.\\n4. A conclusion and one area for further learning.\\n\\nUse your own words and cite any sources you rely on.`,
    rubric: [
      { id: 'understanding', description: 'Explains the key subject concepts and objectives accurately', marks: 8, keywords: [...objectives, 'concept', 'principle', 'explain', 'meaning'] },
      { id: 'application', description: 'Applies the learning to a relevant example with supporting evidence', marks: 6, keywords: ['example', 'for instance', 'such as', 'application', 'because', 'evidence', 'therefore'] },
      { id: 'reasoning', description: 'Presents a coherent analysis and justified conclusion', marks: 6, keywords: ['analysis', 'conclusion', 'reason', 'evidence', 'compare', 'improve', 'therefore'] },
    ],
  };
}

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
        const brief = createSubjectAssignmentBrief(course, chapter, lesson);
        assignments.push({
          id: `assignment-${course.id}-${lesson.id}`,
          courseId: course.id,
          courseTitle: course.title,
          title: brief.title,
          instructions: brief.instructions,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          totalMarks: 20,
          rubric: brief.rubric,
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

  const normalizedForMatching = ` ${normalized.replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  const criterionScores: RubricAward[] = assignment.rubric.map((criterion) => {
    const concepts = Array.from(new Set(criterion.keywords
      .map((keyword) => keyword.trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim())
      .filter((keyword) => keyword.length >= 3)));
    const matched = concepts.filter((keyword) => normalizedForMatching.includes(` ${keyword} `));
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
    : 'returned for revision: address the criterion feedback and submit an improved response.');
  return { status, marksAwarded, totalMarks: assignment.totalMarks, scorePercent, criterionScores: adjusted, markerFeedback: feedbackParts.join('\n') };
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
