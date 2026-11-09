import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { calculateWeightedCertificateScore, certificateUnmetRequirements, summarizeCourseProgress, classifyAcademicGrade } from './trustedLearningLogic';

type IssueTrustedCertificateInput = {
  db: Firestore; cycleRef: DocumentReference; certificateRef: DocumentReference; learnerCertificateRef: DocumentReference;
  certificate: object; totalLessons: number; approvedAssignmentCount: number; approvedModuleCount: number; cycle: number;
};
export type TrustedCertificateIssuanceResult =
  | { eligible: false; unmet: string[]; cycle: number; courseMasteryPercent: number }
  | { eligible: true; certificate: object };

export async function issueTrustedCertificateTransaction(input: IssueTrustedCertificateInput): Promise<TrustedCertificateIssuanceResult> {
  return input.db.runTransaction(async (transaction) => {
    const [cycleSnapshot, progress, assignments, existingCertificate, moduleAttempts] = await Promise.all([
      transaction.get(input.cycleRef), transaction.get(input.cycleRef.collection('lessonProgress')),
      transaction.get(input.cycleRef.collection('assignments')), transaction.get(input.learnerCertificateRef),
      transaction.get(input.cycleRef.collection('moduleExamAttempts')),
    ]);
    const progressRecords = progress.docs.map((document) => document.data());
    const assignmentRecords = assignments.docs.map((document) => document.data());
    const moduleRecords = moduleAttempts.docs.map((document) => document.data());
    const courseMasteryPercent = summarizeCourseProgress(progressRecords, input.totalLessons).courseMasteryPercent;
    const passedModules = new Map<string, number>();
    for (const attempt of moduleRecords) {
      if (attempt.passed !== true || Number(attempt.scorePercent) < 60) continue;
      const moduleId = String(attempt.moduleId);
      passedModules.set(moduleId, Math.max(passedModules.get(moduleId) ?? 0, Number(attempt.scorePercent)));
    }
    const unmet = certificateUnmetRequirements({
      totalLessons: input.totalLessons, progress: progressRecords,
      examPassed: cycleSnapshot.data()?.examPassed === true, assignments: assignmentRecords,
      approvedAssignmentCount: input.approvedAssignmentCount,
      moduleExaminations: Array.from(passedModules, ([moduleId, scorePercent]) => ({ moduleId, scorePercent, passed: true })),
      approvedModuleCount: input.approvedModuleCount, certificateAlreadyIssued: existingCertificate.exists,
    });
    if (unmet.length) return { eligible: false, unmet, cycle: input.cycle, courseMasteryPercent };
    const scorePercent = calculateWeightedCertificateScore({
      chapterAssessmentScores: progressRecords.map((record) => Number(record.scorePercent)),
      assignmentScores: assignmentRecords.map((record) => Number(record.scorePercent)),
      moduleExaminationScores: Array.from(passedModules.values()),
      finalExamScorePercent: Number(cycleSnapshot.data()?.examScorePercent || 0),
    });
    const grade = scorePercent === null ? null : classifyAcademicGrade(scorePercent);
    if (scorePercent === null || scorePercent < 60 || !grade?.passed) return { eligible: false, unmet: ['overall weighted course grade must be at least 60%'], cycle: input.cycle, courseMasteryPercent };
    const certificate = { ...input.certificate, scorePercent, grade: grade.grade, classification: grade.classification };
    transaction.create(input.certificateRef, { ...certificate } as Record<string, unknown>);
    transaction.create(input.learnerCertificateRef, { ...certificate } as Record<string, unknown>);
    return { eligible: true, certificate };
  });
}
