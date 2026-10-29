import type { CertificateRecord, Course, ExamAttemptRecord, LessonMasteryState } from '../types';

/**
 * Picks the strongest passing attempt for a course exam: highest score, and among
 * equal scores, the most recent submission.
 */
export function selectBestExamAttempt(attempts: ExamAttemptRecord[]): ExamAttemptRecord | null {
  const passing = attempts.filter((attempt) => isExamPassed(attempt));
  if (passing.length === 0) return null;
  return passing.reduce((best, current) => {
    if (current.scorePercent !== best.scorePercent) {
      return current.scorePercent > best.scorePercent ? current : best;
    }
    return current.submittedAt > best.submittedAt ? current : best;
  });
}

/**
 * A persisted attempt is only treated as passed when both the stored flag and the
 * actual score against the stored passing threshold agree. Guards against records
 * that were written with an inconsistent passing flag.
 */
export function isExamPassed(attempt: ExamAttemptRecord): boolean {
  return attempt.passed === true
    && attempt.scorePercent >= attempt.passingScorePercent;
}

export interface CertificateEligibility {
  eligible: boolean;
  bestAttempt: ExamAttemptRecord | null;
  unmet: string[];
}

/**
 * Full eligibility check before a Berry learning record (certificate) is issued:
 * a genuine passing exam attempt must exist, the learner must have mastered the
 * course lessons, and no certificate for this course may exist yet.
 */
export function certificateEligibilityForCourse(
  course: Course,
  masteryRecords: Record<string, LessonMasteryState>,
  examAttempts: ExamAttemptRecord[],
  existingCertificates: CertificateRecord[],
): CertificateEligibility {
  const unmet: string[] = [];
  const courseAttempts = examAttempts.filter((attempt) => attempt.courseId === course.id);
  const bestAttempt = selectBestExamAttempt(courseAttempts);

  if (!bestAttempt) {
    unmet.push('final exam');
  }

  const allLessons = course.chapters.flatMap((chapter) => chapter.lessons);
  if (allLessons.length > 0) {
    const masteredCount = allLessons.filter((lesson) => masteryRecords[lesson.id]?.isMastered).length;
    if (masteredCount < allLessons.length) {
      unmet.push(`course mastery (${masteredCount}/${allLessons.length} lessons mastered)`);
    }
  }

  if (existingCertificates.some((certificate) => certificate.courseId === course.id)) {
    unmet.push('certificate already issued');
  }

  return { eligible: unmet.length === 0, bestAttempt, unmet };
}
