export interface TrustedProgressSnapshot { isCompleted?: boolean; isMastered?: boolean }
export interface TrustedAssignmentSnapshot { status?: string; scorePercent?: number }
export interface CertificateRequirements {
  totalLessons: number;
  progress: TrustedProgressSnapshot[];
  examPassed: boolean;
  assignments: TrustedAssignmentSnapshot[];
  approvedAssignmentCount: number;
  chapterAssessments: Array<{ chapterId: string; scorePercent: number; passed: boolean }>;
  approvedChapterCount: number;
  moduleExaminations: Array<{ moduleId: string; scorePercent: number; passed: boolean }>;
  approvedModuleCount: number;
  certificateAlreadyIssued: boolean;
  interactiveScorePercent?: number;
  approvedInteractiveLessonCount?: number;
}
export interface CourseProgressSummary {
  completedCount: number;
  masteredCount: number;
  courseMasteryPercent: number;
  courseCompleted: boolean;
}
export function summarizeCourseProgress(progress: TrustedProgressSnapshot[], totalLessons: number): CourseProgressSummary {
  const safeTotal = Math.max(0, Math.floor(totalLessons));
  const completedCount = progress.filter((item) => item.isCompleted === true).length;
  const masteredCount = progress.filter((item) => item.isMastered === true).length;
  return {
    completedCount,
    masteredCount,
    courseMasteryPercent: safeTotal === 0 ? 0 : Math.round((masteredCount / safeTotal) * 100),
    courseCompleted: safeTotal > 0 && completedCount >= safeTotal,
  };
}
export type AcademicGrade = 'A' | 'B' | 'C' | 'D' | 'F';
export type AcademicClassification = 'Distinction' | 'Merit' | 'Credit' | 'Pass' | 'Not passed';
export interface AcademicGradeResult { percentage: number; grade: AcademicGrade; classification: AcademicClassification; passed: boolean }
export const DEFAULT_ASSESSMENT_WEIGHTS = { chapterAssessments: 10, assignments: 30, moduleExaminations: 25, finalExamination: 35 } as const;
export const ASSESSMENT_PASS_MARKS = { chapterAssessment: 70, assignment: 50, moduleExamination: 60, finalExamination: 50, overall: 60 } as const;
export function classifyAcademicGrade(scorePercent: number): AcademicGradeResult {
  const percentage = Number.isFinite(scorePercent) ? Math.max(0, Math.min(100, scorePercent)) : 0;
  if (percentage >= 80) return { percentage, grade: 'A', classification: 'Distinction', passed: true };
  if (percentage >= 70) return { percentage, grade: 'B', classification: 'Merit', passed: true };
  if (percentage >= 60) return { percentage, grade: 'C', classification: 'Credit', passed: true };
  if (percentage >= 50) return { percentage, grade: 'D', classification: 'Pass', passed: true };
  return { percentage, grade: 'F', classification: 'Not passed', passed: false };
}
export function isPassingExamScore(scorePercent: number, configuredThreshold: number = ASSESSMENT_PASS_MARKS.finalExamination): boolean {
  return Number.isFinite(scorePercent) && Number.isFinite(configuredThreshold) && scorePercent >= configuredThreshold;
}
export function calculateWeightedAcademicGrade(input: {
  chapterAssessmentPercent: number; assignmentPercent: number; moduleExaminationPercent: number; finalExaminationPercent: number;
  weights?: { chapterAssessments: number; assignments: number; moduleExaminations: number; finalExamination: number };
}): number | null {
  const weights = input.weights ?? DEFAULT_ASSESSMENT_WEIGHTS;
  const totalWeight = weights.chapterAssessments + weights.assignments + weights.moduleExaminations + weights.finalExamination;
  const scores = [input.chapterAssessmentPercent, input.assignmentPercent, input.moduleExaminationPercent, input.finalExaminationPercent];
  if (totalWeight !== 100 || scores.some((score) => !Number.isFinite(score) || score < 0 || score > 100)) return null;
  return Math.round((input.chapterAssessmentPercent * weights.chapterAssessments + input.assignmentPercent * weights.assignments + input.moduleExaminationPercent * weights.moduleExaminations + input.finalExaminationPercent * weights.finalExamination)) / 100;
}
export function canStartFullRetake(progress: TrustedProgressSnapshot[], totalLessons: number): boolean {
  return totalLessons > 0 && progress.filter((item) => item.isCompleted === true).length >= totalLessons;
}
/** Select an exact assessment length without fabricating missing curriculum questions. */
export function selectRequiredQuestionSet<T>(questions: T[], requiredCount: number): T[] | null {
  if (!Number.isInteger(requiredCount) || requiredCount < 1 || questions.length < requiredCount) return null;
  return questions.slice(0, requiredCount);
}

export function calculateWeightedCertificateScore(input: {
  chapterAssessmentScores: number[]; assignmentScores: number[]; moduleExaminationScores: number[]; finalExamScorePercent: number;
  weights?: { chapterAssessments: number; assignments: number; moduleExaminations: number; finalExamination: number };
}): number | null {
  const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  const chapterAssessmentPercent = average(input.chapterAssessmentScores);
  const assignmentPercent = average(input.assignmentScores);
  const moduleExaminationPercent = average(input.moduleExaminationScores);
  if (chapterAssessmentPercent === null || assignmentPercent === null || moduleExaminationPercent === null) return null;
  return calculateWeightedAcademicGrade({ chapterAssessmentPercent, assignmentPercent, moduleExaminationPercent, finalExaminationPercent: input.finalExamScorePercent, weights: input.weights });
}

export function certificateUnmetRequirements(input: CertificateRequirements): string[] {
  const summary = summarizeCourseProgress(input.progress, input.totalLessons);
  const unmet: string[] = [];
  if (!summary.courseCompleted) unmet.push(`course completion (${summary.completedCount}/${input.totalLessons} lessons)`);
  if (input.progress.some((record) => record.isMastered !== true || Number((record as { scorePercent?: number }).scorePercent) < 70)) unmet.push('all chapter assessments must be passed at 70% or higher');
  if (input.moduleExaminations.length < input.approvedModuleCount) unmet.push(`module examinations completed (${input.moduleExaminations.length}/${input.approvedModuleCount})`);
  input.moduleExaminations.forEach((exam) => { if (!exam.passed || exam.scorePercent < 60) unmet.push(`module examination ${exam.moduleId} is not passed at 60% or higher`); });
  if (!input.examPassed) unmet.push('final exam pass (50% or higher)');
  if (input.approvedAssignmentCount === 0) unmet.push('approved assignment and marking rubric not configured for this course');
  if (input.assignments.length < input.approvedAssignmentCount) unmet.push(`topic assignments completed (${input.assignments.length}/${input.approvedAssignmentCount})`);
  input.assignments.forEach((assignment, index) => {
    if (assignment.status !== 'graded' || !Number.isFinite(assignment.scorePercent) || (assignment.scorePercent ?? 0) < 50) {
      unmet.push(`required assignment ${index + 1} is incomplete or below the passing mark`);
    }
  });
  if (input.certificateAlreadyIssued) unmet.push('certificate already issued for this course');
  return unmet;
}
