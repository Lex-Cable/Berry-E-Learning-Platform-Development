import test from 'node:test';
import assert from 'node:assert/strict';
import {
  certificateEligibilityForCourse,
  isExamPassed,
  selectBestExamAttempt,
} from './certificates';
import type { CertificateRecord, Course, ExamAttemptRecord, LessonMasteryState } from '../types';

function course(overrides: Partial<Course> = {}): Course {
  return {
    id: 'course-1',
    title: 'Course One',
    code: 'C1',
    stage: 'junior',
    curriculum: 'kenya_cbc',
    gradeLevel: 'Grade 1',
    subject: 'Mathematics',
    description: '',
    bannerColor: '',
    badgeText: '',
    estimatedHours: 1,
    objectives: [],
    prerequisites: [],
    chapters: [
      {
        id: 'chap-1', courseId: 'course-1', title: 'Ch', order: 1, description: '',
        lessons: [
          { id: 'lesson-a', chapterId: 'chap-1', title: 'A', order: 1, durationMinutes: 5, objectives: [], prerequisites: [], notesMarkdown: 'n', activities: [], quizQuestions: [], masteryThresholdPercent: 80 },
        ],
      },
    ],
    exam: {
      id: 'exam-1', courseId: 'course-1', title: 'Final', passingScorePercent: 75, durationMinutes: 30, questions: [],
    },
    ...overrides,
  } as Course;
}

function attempt(overrides: Partial<ExamAttemptRecord> = {}): ExamAttemptRecord {
  return {
    id: 'attempt-1',
    courseId: 'course-1',
    examId: 'exam-1',
    scorePercent: 80,
    passed: true,
    passingScorePercent: 75,
    answers: {},
    submittedAt: '2026-10-28T10:00:00.000Z',
    ...overrides,
  };
}

test('selectBestExamAttempt prefers highest score among passed attempts', () => {
  const attempts = [
    attempt({ id: 'a1', scorePercent: 76, passed: true }),
    attempt({ id: 'a2', scorePercent: 92, passed: true, submittedAt: '2026-10-27T10:00:00.000Z' }),
    attempt({ id: 'a3', scorePercent: 40, passed: false }),
  ];
  const best = selectBestExamAttempt(attempts);
  assert.equal(best?.id, 'a2');
  assert.equal(selectBestExamAttempt([]), null);
  assert.equal(selectBestExamAttemptsForCourse([attempt({ courseId: 'other' })], 'course-1').length, 0);
});

function selectBestExamAttemptsForCourse(attempts: ExamAttemptRecord[], courseId: string): ExamAttemptRecord[] {
  return attempts.filter((entry) => entry.courseId === courseId);
}

test('isExamPassed reflects the persisted passing flag and score', () => {
  assert.equal(isExamPassed(attempt()), true);
  assert.equal(isExamPassed(attempt({ passed: false, scorePercent: 50 })), false);
  // A tampered record claiming pass with a below-threshold score is not trusted.
  assert.equal(isExamPassed(attempt({ passed: true, scorePercent: 10, passingScorePercent: 75 })), false);
});

test('certificateEligibilityForCourse requires exam pass plus lesson mastery', () => {
  const target = course();
  const mastery: Record<string, LessonMasteryState> = {
    'lesson-a': {
      lessonId: 'lesson-a', isCompleted: true, isMastered: true, scorePercent: 90,
      attemptsCount: 1, identifiedMisconceptions: [], remedialActivitiesCompleted: true,
    },
  };
  const eligible = certificateEligibilityForCourse(target, mastery, [attempt()], []);
  assert.equal(eligible.eligible, true);
  assert.deepEqual(eligible.unmet, []);

  const noMastery = certificateEligibilityForCourse(target, {}, [attempt()], []);
  assert.equal(noMastery.eligible, false);
  assert.ok(noMastery.unmet.some((reason) => reason.startsWith('course mastery')));

  const failedExam = certificateEligibilityForCourse(
    target, mastery, [attempt({ passed: false, scorePercent: 40 })], [],
  );
  assert.equal(failedExam.eligible, false);
  assert.ok(failedExam.unmet.includes('final exam'));

  const alreadyAwarded = certificateEligibilityForCourse(
    target, mastery, [attempt()],
    [{ id: 'cert-1', courseId: 'course-1' } as CertificateRecord],
  );
  assert.equal(alreadyAwarded.eligible, false);
  assert.ok(alreadyAwarded.unmet.includes('certificate already issued'));
});
