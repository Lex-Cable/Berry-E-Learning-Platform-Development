import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { calculateWeightedCertificateScore, certificateUnmetRequirements, summarizeCourseProgress } from './trustedLearningLogic';

type IssueTrustedCertificateInput = {
  db: Firestore;
  cycleRef: DocumentReference;
  certificateRef: DocumentReference;
  learnerCertificateRef: DocumentReference;
  certificate: object;
  totalLessons: number;
  approvedAssignmentCount: number;
  approvedInteractiveLessonCount: number;
  cycle: number;
};

export type TrustedCertificateIssuanceResult =
  | {
      eligible: false;
      unmet: string[];
      cycle: number;
      courseMasteryPercent: number;
    }
  | {
      eligible: true;
      certificate: object;
    };

export async function issueTrustedCertificateTransaction(
  input: IssueTrustedCertificateInput,
): Promise<TrustedCertificateIssuanceResult> {
  return input.db.runTransaction(async (transaction) => {
    const [cycleSnapshot, progress, assignments, existingCertificate] =
      await Promise.all([
        transaction.get(input.cycleRef),
        transaction.get(input.cycleRef.collection('lessonProgress')),
        transaction.get(input.cycleRef.collection('assignments')),
        transaction.get(input.learnerCertificateRef),
      ]);

    const progressRecords = progress.docs.map((document) => document.data());
    const assignmentRecords = assignments.docs.map((document) => document.data());

    const courseMasteryPercent = summarizeCourseProgress(
      progressRecords,
      input.totalLessons,
    ).courseMasteryPercent;

    const interactiveRecords = progressRecords.filter((record) => Number.isFinite(Number(record.interactiveScorePercent)));
    const interactiveScorePercent = input.approvedInteractiveLessonCount > 0 &&
      interactiveRecords.length === input.approvedInteractiveLessonCount
      ? Math.round(interactiveRecords.reduce((total, record) => total + Number(record.interactiveScorePercent), 0) / interactiveRecords.length)
      : 0;
    const unmet = certificateUnmetRequirements({
      totalLessons: input.totalLessons,
      progress: progressRecords,
      examPassed: cycleSnapshot.data()?.examPassed === true,
      assignments: assignmentRecords,
      approvedAssignmentCount: input.approvedAssignmentCount,
      certificateAlreadyIssued: existingCertificate.exists,
      interactiveScorePercent,
      approvedInteractiveLessonCount: input.approvedInteractiveLessonCount,
    });

    if (unmet.length) {
      return {
        eligible: false,
        unmet,
        cycle: input.cycle,
        courseMasteryPercent,
      };
    }

    const examScorePercent = Number(cycleSnapshot.data()?.examScorePercent || 0);
    const scorePercent = calculateWeightedCertificateScore({
      assignmentScores: assignmentRecords.map((record) => Number(record.scorePercent) || 0),
      examScorePercent,
      masteryScores: progressRecords.map((record) => Number(record.scorePercent) || 0),
      interactiveScores: interactiveRecords.map((record) => Number(record.interactiveScorePercent) || 0),
    });
    const certificate = { ...input.certificate, scorePercent };

    transaction.create(input.certificateRef, { ...certificate } as Record<string, unknown>);
    transaction.create(input.learnerCertificateRef, { ...certificate } as Record<string, unknown>);

    return {
      eligible: true,
      certificate,
    };
  });
}

