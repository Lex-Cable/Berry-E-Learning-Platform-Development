import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWeightedCertificateScore, selectRequiredQuestionSet, canStartFullRetake, certificateUnmetRequirements, isPassingExamScore, summarizeCourseProgress, classifyAcademicGrade, calculateWeightedAcademicGrade } from './trustedLearningLogic';

test('final examination uses the approved 50 percent pass mark and respects course overrides', () => {
  assert.equal(isPassingExamScore(49), false);
  assert.equal(isPassingExamScore(50), true);
  assert.equal(isPassingExamScore(75), true);
  assert.equal(isPassingExamScore(80, 85), false);
  assert.equal(isPassingExamScore(85, 85), true);
});

test('academic grading follows Berry percentage classifications exactly', () => {
  assert.deepEqual(classifyAcademicGrade(80), { percentage: 80, grade: 'A', classification: 'Distinction', passed: true });
  assert.equal(classifyAcademicGrade(79).grade, 'B');
  assert.equal(classifyAcademicGrade(60).classification, 'Credit');
  assert.equal(classifyAcademicGrade(50).classification, 'Pass');
  assert.equal(classifyAcademicGrade(49.99).grade, 'F');
});

test('default weighted academic grade uses 10/30/25/35 and rejects invalid weights', () => {
  assert.equal(calculateWeightedAcademicGrade({ chapterAssessmentPercent: 80, assignmentPercent: 90, moduleExaminationPercent: 70, finalExaminationPercent: 60 }), 73.5);
  assert.equal(calculateWeightedAcademicGrade({ chapterAssessmentPercent: 80, assignmentPercent: 90, moduleExaminationPercent: 70, finalExaminationPercent: 60, weights: { chapterAssessments: 10, assignments: 30, moduleExaminations: 20, finalExamination: 35 } }), null);
});

test('course mastery uses mastered lessons across the whole course', () => {
  const summary = summarizeCourseProgress([
    { isCompleted: true, isMastered: true },
    { isCompleted: true, isMastered: true },
    { isCompleted: true, isMastered: false },
    { isCompleted: false, isMastered: false },
  ], 4);
  assert.deepEqual(summary, { completedCount: 3, masteredCount: 2, courseMasteryPercent: 50, courseCompleted: false });
  assert.equal(summarizeCourseProgress([], 0).courseMasteryPercent, 0);
});

test('full retake is unavailable until every course lesson is completed', () => {
  assert.equal(canStartFullRetake([{ isCompleted: true }, { isCompleted: false }], 2), false);
  assert.equal(canStartFullRetake([{ isCompleted: true }, { isCompleted: true }], 2), true);
  assert.equal(canStartFullRetake([], 0), false);
});

test('certificate eligibility rejects missing requirements and accepts a fully eligible course', () => {
  const base = { totalLessons: 2, progress: [{ isCompleted: true, isMastered: true, scorePercent: 80, interactiveScorePercent: 90 }, { isCompleted: true, isMastered: true, scorePercent: 80, interactiveScorePercent: 90 }], examPassed: true, assignments: [{ status: 'graded', scorePercent: 75 }], approvedAssignmentCount: 1, moduleExaminations: [{ moduleId: 'm1', scorePercent: 70, passed: true }], approvedModuleCount: 1, approvedInteractiveLessonCount: 2, interactiveScorePercent: 90, certificateAlreadyIssued: false };
  assert.deepEqual(certificateUnmetRequirements(base), []);
  assert.ok(certificateUnmetRequirements({ ...base, approvedAssignmentCount: 0, assignments: [] }).some((item) => item.includes('rubric')));
  assert.ok(certificateUnmetRequirements({ ...base, approvedAssignmentCount: 2, assignments: [{ status: 'graded', scorePercent: 90 }] }).some((item) => item.includes('topic assignments completed')));
  assert.ok(certificateUnmetRequirements({ ...base, examPassed: false }).some((item) => item.includes('exam')));
  assert.ok(certificateUnmetRequirements({ ...base, certificateAlreadyIssued: true }).some((item) => item.includes('already issued')));
  assert.ok(certificateUnmetRequirements({ ...base, progress: [{ isCompleted: true, isMastered: true }, { isCompleted: true, isMastered: false }] }).some((item) => item.includes('chapter assessments')));
  assert.ok(certificateUnmetRequirements({ ...base, assignments: [{ status: 'graded', scorePercent: 49 }] }).some((item) => item.includes('assignment')));
});

test('official certificate score uses approved 10/30/25/35 academic weights', () => {
  assert.equal(calculateWeightedCertificateScore({ chapterAssessmentScores: [80], assignmentScores: [90], moduleExaminationScores: [70], finalExamScorePercent: 60 }), 73.5);
  assert.equal(calculateWeightedCertificateScore({ chapterAssessmentScores: [], assignmentScores: [90], moduleExaminationScores: [70], finalExamScorePercent: 60 }), null);
});

test('required assessment question sets have the exact requested length and never fabricate missing items', () => {
  const pool = Array.from({ length: 35 }, (_, index) => ({ id: `q-${index + 1}` }));
  assert.equal(selectRequiredQuestionSet(pool, 10)?.length, 10);
  assert.equal(selectRequiredQuestionSet(pool, 30)?.length, 30);
  assert.equal(selectRequiredQuestionSet(pool.slice(0, 8), 10), null);
});
