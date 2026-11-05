import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const projectId = 'demo-berry';
const emulator = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const [host, portText] = emulator.split(':');
const port = Number(portText || 8080);

let testEnv: Awaited<ReturnType<typeof initializeTestEnvironment>>;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      host,
      port,
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});


test('owners can submit valid formative practice work', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  const ref = doc(db, 'users/learner-1/practiceAssignmentSubmissions/assignment-1');

  await setDoc(ref, {
    assignmentId: 'assignment-1',
    content: 'My formative practice response.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 1,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  });

  const saved = await getDoc(ref);
  assert.equal(saved.exists(), true);
  assert.equal(saved.data()?.content, 'My formative practice response.');
});

test('another learner cannot read or modify formative practice work', async () => {
  const ownerDb = testEnv.authenticatedContext('learner-1').firestore();
  const otherDb = testEnv.authenticatedContext('learner-2').firestore();

  const ownerRef = doc(ownerDb, 'users/learner-1/practiceAssignmentSubmissions/assignment-1');
  const otherRef = doc(otherDb, 'users/learner-1/practiceAssignmentSubmissions/assignment-1');

  await setDoc(ownerRef, {
    assignmentId: 'assignment-1',
    content: 'Private practice response.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 1,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  });

  await assertFails(getDoc(otherRef));
  await assertFails(setDoc(otherRef, {
    assignmentId: 'assignment-1',
    content: 'Attempted modification.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 1,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  }));
});

test('formative submissions reject forged grading fields', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  const ref = doc(db, 'users/learner-1/practiceAssignmentSubmissions/assignment-2');

  await assertFails(setDoc(ref, {
    assignmentId: 'assignment-2',
    content: 'Attempt to forge a grade.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 1,
    status: 'submitted',
    updatedAt: serverTimestamp(),
    score: 100,
    passed: true,
    grade: 'A',
  }));
});

test('owners can delete their own formative practice submissions', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  const ref = doc(db, 'users/learner-1/practiceAssignmentSubmissions/assignment-3');

  await setDoc(ref, {
    assignmentId: 'assignment-3',
    content: 'Practice response to delete.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 1,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  });

  await deleteDoc(ref);
  assert.equal((await getDoc(ref)).exists(), false);
});


test('owners can update valid formative practice submissions', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  const ref = doc(db, 'users/learner-1/practiceAssignmentSubmissions/assignment-4');

  await setDoc(ref, {
    assignmentId: 'assignment-4',
    content: 'First response.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 1,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  });

  await setDoc(ref, {
    assignmentId: 'assignment-4',
    content: 'Revised response.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 2,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  });

  const saved = await getDoc(ref);
  assert.equal(saved.data()?.content, 'Revised response.');
  assert.equal(saved.data()?.attemptNumber, 2);
});

test('formative updates reject altered assignment identity and invalid attempt counts', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  const ref = doc(db, 'users/learner-1/practiceAssignmentSubmissions/assignment-5');

  await setDoc(ref, {
    assignmentId: 'assignment-5',
    content: 'Initial response.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 1,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  });

  await assertFails(setDoc(ref, {
    assignmentId: 'different-assignment',
    content: 'Changed identity.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 2,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  }));

  await assertFails(setDoc(ref, {
    assignmentId: 'assignment-5',
    content: 'Invalid attempt count.',
    submittedAt: new Date().toISOString(),
    attemptNumber: 21,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  }));
});

test('formative submissions reject oversized response content', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  const ref = doc(db, 'users/learner-1/practiceAssignmentSubmissions/assignment-6');

  await assertFails(setDoc(ref, {
    assignmentId: 'assignment-6',
    content: 'x'.repeat(20001),
    submittedAt: new Date().toISOString(),
    attemptNumber: 1,
    status: 'submitted',
    updatedAt: serverTimestamp(),
  }));
});


test('learners can read but cannot write nested trusted learning progress', async () => {
  const path = 'users/learner-1/learningProgress/lesson-1';
  await testEnv.withSecurityRulesDisabled( async (context) => {
    await setDoc(doc(context.firestore(), path), { lessonId: 'lesson-1', mastered: true, score: 90 });
  });
  const ref = doc(testEnv.authenticatedContext('learner-1').firestore(), path);
  await assertSucceeds(getDoc(ref));
  await assertFails(setDoc(ref, { lessonId: 'lesson-1', mastered: true, score: 100 }));
});

test('learners can read but cannot write nested trusted certificates', async () => {
  const path = 'users/learner-1/learningCertificates/certificate-1';
  await testEnv.withSecurityRulesDisabled( async (context) => {
    await setDoc(doc(context.firestore(), path), { courseId: 'course-1', issued: true });
  });
  const ref = doc(testEnv.authenticatedContext('learner-1').firestore(), path);
  await assertSucceeds(getDoc(ref));
  await assertFails(setDoc(ref, { courseId: 'course-1', issued: true, forged: true }));
});

test('learners can read but cannot write nested official exam attempts', async () => {
  const path = 'users/learner-1/examAttempts/attempt-1';
  await testEnv.withSecurityRulesDisabled( async (context) => {
    await setDoc(doc(context.firestore(), path), { courseId: 'course-1', score: 80, passed: true });
  });
  const ref = doc(testEnv.authenticatedContext('learner-1').firestore(), path);
  await assertSucceeds(getDoc(ref));
  await assertFails(setDoc(ref, { courseId: 'course-1', score: 100, passed: true }));
});

test('learners can read but cannot write nested official assignment submissions', async () => {
  const path = 'users/learner-1/assignmentSubmissions/submission-1';
  await testEnv.withSecurityRulesDisabled( async (context) => {
    await setDoc(doc(context.firestore(), path), { assignmentId: 'assignment-1', score: 90, passed: true });
  });
  const ref = doc(testEnv.authenticatedContext('learner-1').firestore(), path);
  await assertSucceeds(getDoc(ref));
  await assertFails(setDoc(ref, { assignmentId: 'assignment-1', score: 100, passed: true }));
});

test('clients cannot read or write trusted enrollment records', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  const ref = doc(db, 'users/learner-1/enrollments/course-1');

  await assertFails(getDoc(ref));
  await assertFails(setDoc(ref, {
    uid: 'learner-1',
    courseId: 'course-1',
    status: 'active',
  }));
});

test('clients cannot create or alter trusted learning progress', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  await assertFails(setDoc(doc(db, 'learningProgress/lesson-1'), {
    userId: 'learner-1',
    mastered: true,
    score: 100,
  }));
});

test('clients cannot create or alter certificates', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  await assertFails(setDoc(doc(db, 'learningCertificates/certificate-1'), {
    userId: 'learner-1',
    courseId: 'course-1',
    issued: true,
  }));
});

test('clients cannot create or alter official exam attempts', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  await assertFails(setDoc(doc(db, 'examAttempts/attempt-1'), {
    userId: 'learner-1',
    score: 100,
    passed: true,
  }));
});

test('clients cannot create or alter official assignment submissions', async () => {
  const db = testEnv.authenticatedContext('learner-1').firestore();
  await assertFails(setDoc(doc(db, 'assignmentSubmissions/submission-1'), {
    userId: 'learner-1',
    score: 100,
    passed: true,
  }));
});
