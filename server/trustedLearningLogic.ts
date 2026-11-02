export interface TrustedProgressSnapshot { isCompleted?: boolean; isMastered?: boolean }
export interface TrustedAssignmentSnapshot { status?: string; scorePercent?: number }
export interface CertificateRequirements {
  totalLessons: number;
  progress: TrustedProgressSnapshot[];
  examPassed: boolean;
  assignments: TrustedAssignmentSnapshot[];
  approvedAssignmentCount: number;
  certificateAlreadyIssued: boolean;
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
export function isPassingExamScore(scorePercent: number, configuredThreshold = 75): boolean {
  return Number.isFinite(scorePercent) && scorePercent >= Math.max(75, configuredThreshold);
}
export function canStartFullRetake(progress: TrustedProgressSnapshot[], totalLessons: number): boolean {
  return totalLessons > 0 && progress.filter((item) => item.isCompleted === true).length >= totalLessons;
}
export function certificateUnmetRequirements(input: CertificateRequirements): string[] {
  const summary = summarizeCourseProgress(input.progress, input.totalLessons);
  const unmet: string[] = [];
  if (!summary.courseCompleted) unmet.push(`course completion (${summary.completedCount}/${input.totalLessons} lessons)`);
  if (summary.courseMasteryPercent < 75) unmet.push(`course mastery (${summary.courseMasteryPercent}% / 75%)`);
  if (!input.examPassed) unmet.push('final exam pass (75% or higher)');
  if (input.approvedAssignmentCount === 0) unmet.push('approved assignment and marking rubric not configured for this course');
  input.assignments.forEach((assignment, index) => {
    if (assignment.status !== 'graded' || !Number.isFinite(assignment.scorePercent) || (assignment.scorePercent ?? 0) < 50) {
      unmet.push(`required assignment ${index + 1} is incomplete or below the passing mark`);
    }
  });
  if (input.certificateAlreadyIssued) unmet.push('certificate already issued for this course');
  return unmet;
}
