import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { initializeApp, deleteApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { issueTrustedCertificateTransaction } from './trustedCertificateIssuance';

const projectId = 'demo-berry';
const databaseId = 'ai-studio-ddb6caff-168f-4ec5-bd05-da5d7d64fc04';

let app: App;
let db: Firestore;

before(() => {
  app = initializeApp(
    { projectId },
    `berry-certificate-test-${randomUUID()}`,
  );
  db = getFirestore(app, databaseId);
});

after(async () => {
  if (app) await deleteApp(app);
});

test('certificate issuance creates one trusted certificate under concurrent requests', async () => {
  const uid = `certificate-test-${randomUUID()}`;
  const courseId = 'integration-course';
  const cycle = 1;

  const cycleRef = db.collection('users').doc(uid)
    .collection('trustedCourses').doc(courseId)
    .collection('cycles').doc(String(cycle));

  const learnerCertificateRef = db.collection('users').doc(uid)
    .collection('trustedCertificates').doc(courseId);

  const credentialIds = [
    `BERRY-${randomUUID().replace(/-/g, '').toUpperCase()}`,
    `BERRY-${randomUUID().replace(/-/g, '').toUpperCase()}`,
  ];

  const certificateRefs = credentialIds.map((id) =>
    db.collection('trustedCertificates').doc(id),
  );

  try {
    await cycleRef.set({
      cycle,
      examPassed: true,
      examScorePercent: 90,
    });

    await cycleRef.collection('lessonProgress').doc('lesson-1').set({
      lessonId: 'lesson-1',
      isCompleted: true,
      isMastered: true,
      scorePercent: 90,
      interactiveScorePercent: 90,
    });

    await cycleRef.collection('moduleExamAttempts').doc('module-attempt-1').set({ moduleId: 'module-1', scorePercent: 90, passed: true, trusted: true });
    await cycleRef.collection('chapterAssessmentAttempts').doc('chapter-attempt-1').set({ chapterId: 'chapter-1', scorePercent: 90, passed: true, trusted: true });

    await cycleRef.collection('assignments').doc('assignment-1').set({
      assignmentId: 'assignment-1',
      status: 'graded',
      scorePercent: 80,
      trusted: true,
    });

    const issue = (index: number) => {
      const credentialId = credentialIds[index];
      const certificate = {
        id: credentialId,
        credentialId,
        uid,
        courseId,
        courseTitle: 'Integration Test Course',
        recipientName: 'Berry Test Learner',
        issuedDate: new Date().toISOString(),
        scorePercent: 90,
        authority: 'Berry Learning Platform',
        verified: true,
        trusted: true,
        cycle,
      };

      return issueTrustedCertificateTransaction({
        db,
        cycleRef,
        certificateRef: certificateRefs[index],
        learnerCertificateRef,
        certificate,
        totalLessons: 1,
        approvedAssignmentCount: 1,
        approvedChapterCount: 1,
        approvedModuleCount: 1,
        cycle,
      });
    };

    const results = await Promise.all([issue(0), issue(1)]);

    assert.equal(
      results.filter((result) => result.eligible).length,
      1,
      'exactly one concurrent request should issue a certificate',
    );

    assert.equal(
      results.filter((result) => !result.eligible).length,
      1,
      'the competing request should be rejected as a duplicate',
    );

    const [rootA, rootB, learnerCertificate] = await Promise.all([
      certificateRefs[0].get(),
      certificateRefs[1].get(),
      learnerCertificateRef.get(),
    ]);

    assert.equal(Number(rootA.exists) + Number(rootB.exists), 1);
    assert.equal(learnerCertificate.exists, true);

    const issuedRecords = await db.collection('trustedCertificates')
      .where('uid', '==', uid)
      .where('courseId', '==', courseId)
      .get();

    assert.equal(issuedRecords.size, 1);
  } finally {
    await Promise.all([
      db.recursiveDelete(db.collection('users').doc(uid)),
      ...certificateRefs.map((ref) => ref.delete()),
    ]);
  }
});


test('certificate is withheld when a required assignment is missing', async () => {
  const uid = `certificate-incomplete-${randomUUID()}`;
  const courseId = 'incomplete-course';
  const cycle = 1;
  const cycleRef = db.collection('users').doc(uid).collection('trustedCourses').doc(courseId).collection('cycles').doc(String(cycle));
  const learnerCertificateRef = db.collection('users').doc(uid).collection('trustedCertificates').doc(courseId);
  const credentialId = `BERRY-${randomUUID().replace(/-/g, '').toUpperCase()}`;
  const certificateRef = db.collection('trustedCertificates').doc(credentialId);
  try {
    await cycleRef.set({ cycle, examPassed: true, examScorePercent: 90 });
    await cycleRef.collection('lessonProgress').doc('lesson-1').set({ lessonId: 'lesson-1', isCompleted: true, isMastered: true, scorePercent: 90, interactiveScorePercent: 90 });
    await cycleRef.collection('chapterAssessmentAttempts').doc('chapter-1').set({ chapterId: 'chapter-1', scorePercent: 90, passed: true, trusted: true });
    await cycleRef.collection('moduleExamAttempts').doc('module-1').set({ moduleId: 'module-1', scorePercent: 90, passed: true, trusted: true });
    const result = await issueTrustedCertificateTransaction({
      db, cycleRef, certificateRef, learnerCertificateRef,
      certificate: { id: credentialId, credentialId, uid, courseId, recipientName: 'Test Learner', trusted: true },
      totalLessons: 1, approvedAssignmentCount: 1, approvedChapterCount: 1, approvedModuleCount: 1, cycle,
    });
    assert.equal(result.eligible, false);
    if (!result.eligible) assert.ok(result.unmet.some((item) => item.includes('topic assignments completed')));
    assert.equal((await certificateRef.get()).exists, false);
    assert.equal((await learnerCertificateRef.get()).exists, false);
  } finally {
    await db.recursiveDelete(db.collection('users').doc(uid));
    await certificateRef.delete();
  }
});

test('certificate is withheld when every component passes individually but weighted course grade is below 60%', async () => {
  const uid = `certificate-low-grade-${randomUUID()}`;
  const courseId = 'low-grade-course';
  const cycle = 1;
  const cycleRef = db.collection('users').doc(uid).collection('trustedCourses').doc(courseId).collection('cycles').doc(String(cycle));
  const learnerCertificateRef = db.collection('users').doc(uid).collection('trustedCertificates').doc(courseId);
  const credentialId = `BERRY-${randomUUID().replace(/-/g, '').toUpperCase()}`;
  const certificateRef = db.collection('trustedCertificates').doc(credentialId);
  try {
    await cycleRef.set({ cycle, examPassed: true, examScorePercent: 50 });
    await cycleRef.collection('lessonProgress').doc('lesson-1').set({ lessonId: 'lesson-1', isCompleted: true, isMastered: true, scorePercent: 80, interactiveScorePercent: 80 });
    await cycleRef.collection('chapterAssessmentAttempts').doc('chapter-1').set({ chapterId: 'chapter-1', scorePercent: 70, passed: true, trusted: true });
    await cycleRef.collection('moduleExamAttempts').doc('module-1').set({ moduleId: 'module-1', scorePercent: 60, passed: true, trusted: true });
    await cycleRef.collection('assignments').doc('assignment-1').set({ assignmentId: 'assignment-1', status: 'graded', scorePercent: 50, trusted: true });
    const result = await issueTrustedCertificateTransaction({
      db, cycleRef, certificateRef, learnerCertificateRef,
      certificate: { id: credentialId, credentialId, uid, courseId, recipientName: 'Test Learner', trusted: true },
      totalLessons: 1, approvedAssignmentCount: 1, approvedChapterCount: 1, approvedModuleCount: 1, cycle,
    });
    assert.equal(result.eligible, false);
    if (!result.eligible) assert.ok(result.unmet.some((item) => item.includes('overall weighted course grade')));
    assert.equal((await certificateRef.get()).exists, false);
    assert.equal((await learnerCertificateRef.get()).exists, false);
  } finally {
    await db.recursiveDelete(db.collection('users').doc(uid));
    await certificateRef.delete();
  }
});
