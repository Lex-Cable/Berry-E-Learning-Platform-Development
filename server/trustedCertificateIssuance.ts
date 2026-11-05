import type { DocumentReference, Firestore } from 'firebase-admin/firestore';
import { certificateUnmetRequirements, summarizeCourseProgress } from './trustedLearningLogic';

type IssueTrustedCertificateInput = {
  db: Firestore;
  cycleRef: DocumentReference;
  certificateRef: DocumentReference;
  learnerCertificateRef: DocumentReference;
  certificate: object;
  totalLessons: number;
  approvedAssignmentCount: number;
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

    const unmet = certificateUnmetRequirements({
      totalLessons: input.totalLessons,
      progress: progressRecords,
      examPassed: cycleSnapshot.data()?.examPassed === true,
      assignments: assignmentRecords,
      approvedAssignmentCount: input.approvedAssignmentCount,
      certificateAlreadyIssued: existingCertificate.exists,
    });

    if (unmet.length) {
      return {
        eligible: false,
        unmet,
        cycle: input.cycle,
        courseMasteryPercent,
      };
    }

    const certificate = { ...input.certificate, scorePercent: Number(cycleSnapshot.data()?.examScorePercent || 0) };

    transaction.create(input.certificateRef, { ...certificate } as Record<string, unknown>);
    transaction.create(input.learnerCertificateRef, { ...certificate } as Record<string, unknown>);

    return {
      eligible: true,
      certificate,
    };
  });
}

