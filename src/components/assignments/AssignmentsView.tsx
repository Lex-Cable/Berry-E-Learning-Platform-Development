import React, { useMemo, useState } from 'react';
import { ClipboardList, CheckCircle2, RotateCcw, FileText, Award } from 'lucide-react';
import type { Assignment, AssignmentSubmissionStatus, Course } from '../../types';
import type { AssignmentMarkingResult } from '../../utils/assignments';
import { nextAttemptNumber } from '../../utils/assignments';

interface AssignmentsViewProps {
  learnerName: string;
  assignments: Assignment[];
  courses: Course[];
  submissionState: Record<string, {
    content: string;
    attemptNumber: number;
    status: AssignmentSubmissionStatus;
    scorePercent: number;
    marksAwarded: number;
    totalMarks: number;
    markerFeedback: string;
    submittedAt: string;
    criterionScores: { criterionId: string; awarded: number; outOf: number }[];
  }>;
  onSubmit: (assignment: Assignment, content: string) => AssignmentMarkingResult;
}

/**
 * Assignment submission and marking workflow. Learners write a submission against a
 * real course assignment, it is marked against the assignment rubric, and it can be
 * revised and resubmitted. Marks come from actual rubric assessment, not invented grades.
 */
export const AssignmentsView: React.FC<AssignmentsViewProps> = ({
  assignments,
  submissionState,
  onSubmit,
}) => {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(assignments[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [lastResult, setLastResult] = useState<AssignmentMarkingResult | null>(null);

  const selectedAssignment = useMemo(
    () => assignments.find((assignment) => assignment.id === selectedAssignmentId) ?? null,
    [assignments, selectedAssignmentId],
  );
  const record = selectedAssignment ? submissionState[selectedAssignment.id] : undefined;

  const handleSubmit = () => {
    if (!selectedAssignment || draft.trim().length === 0) return;
    const result = onSubmit(selectedAssignment, draft);
    setLastResult(result);
  };

  const startRevision = () => {
    setDraft(record?.content ?? '');
    setLastResult(null);
  };

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 text-center">
        <ClipboardList size={32} className="mx-auto text-slate-300 mb-3" />
        <h3 className="text-base font-black text-slate-900">No assignments yet</h3>
        <p className="text-sm text-slate-500 mt-1">Enrol in a course to receive assignments for its lessons.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
          <ClipboardList size={14} />
          <span>Assignment Submission & Marking</span>
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Your Assignments</h2>
        <p className="text-xs text-slate-500 mt-1">
          Submit written work for your enrolled courses. Submissions are marked against the rubric and can be revised.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {assignments.map((assignment) => {
          const state = submissionState[assignment.id];
          const active = assignment.id === selectedAssignmentId;
          return (
            <button
              key={assignment.id}
              onClick={() => { setSelectedAssignmentId(assignment.id); setLastResult(null); setDraft(''); }}
              className={`text-left p-4 rounded-2xl border transition-all ${active ? 'bg-purple-50 border-purple-400' : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
            >
              <span className="block text-xs font-bold text-slate-900">{assignment.courseTitle.split(':')[0]}</span>
              <span className="block text-[11px] text-slate-500 mt-1">{assignment.title}</span>
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {state ? (state.status === 'graded' ? `Marked ${state.scorePercent}%` : 'Returned for revision') : 'Not submitted'}
              </span>
            </button>
          );
        })}
      </div>

      {selectedAssignment && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">{selectedAssignment.title}</h3>
            <p className="text-xs text-slate-500 mt-1">{selectedAssignment.instructions}</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Due {new Date(selectedAssignment.dueDate).toLocaleDateString()} • {selectedAssignment.totalMarks} marks • Attempt {record?.attemptNumber ?? 0}
            </p>
          </div>

          <div className="space-y-1.5">
            {selectedAssignment.rubric.map((criterion) => (
              <div key={criterion.id} className="flex items-center justify-between text-[11px] bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="text-slate-600">{criterion.description}</span>
                <span className="font-bold text-slate-700">{criterion.marks} marks</span>
              </div>
            ))}
          </div>

          {record?.status === 'graded' && !lastResult && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
              <div className="flex items-center gap-2 font-black"><Award size={14} /> Marked: {record.marksAwarded}/{record.totalMarks} ({record.scorePercent}%)</div>
              <p className="whitespace-pre-line">{record.markerFeedback}</p>
              <button onClick={startRevision} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 font-bold text-emerald-800">
                <RotateCcw size={12} /> Revise & resubmit
              </button>
            </div>
          )}

          {record?.status === 'returned_for_revision' && !lastResult && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
              <div className="font-black">Returned for revision — {record.marksAwarded}/{record.totalMarks}</div>
              <p className="whitespace-pre-line">{record.markerFeedback}</p>
              <button onClick={startRevision} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 font-bold text-amber-800">
                <RotateCcw size={12} /> Address feedback & resubmit
              </button>
            </div>
          )}

          {(!record || record.status !== 'graded' || lastResult) && (
            <div className="space-y-3">
              <textarea
                value={draft || (record && record.status === 'submitted' ? record.content : '')}
                onChange={(event) => setDraft(event.target.value)}
                rows={8}
                placeholder="Write your submission here (150–800 words)…"
                className="w-full p-4 rounded-2xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 flex items-center gap-1"><FileText size={12} /> Saved to your Berry account when submitted.</span>
                <button
                  onClick={handleSubmit}
                  disabled={draft.trim().length === 0 && record?.status !== 'submitted'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs shadow-md"
                >
                  <CheckCircle2 size={14} />
                  {record ? `Submit attempt ${nextAttemptNumber(record.attemptNumber - 1)}` : 'Submit for marking'}
                </button>
              </div>
            </div>
          )}

          {lastResult && (
            <div className={`p-4 rounded-2xl text-xs border space-y-2 ${lastResult.status === 'graded'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
              <div className="font-black">
                {lastResult.status === 'graded' ? 'Submission marked — passed' : 'Submission returned for revision'} • {lastResult.marksAwarded}/{lastResult.totalMarks} ({lastResult.scorePercent}%)
              </div>
              <div className="space-y-1">
                {lastResult.criterionScores.map((score: { criterionId: string; awarded: number; outOf: number }) => {
                  const criterion = selectedAssignment.rubric.find((entry) => entry.id === score.criterionId);
                  return (
                    <div key={score.criterionId} className="flex justify-between">
                      <span>{criterion?.description}</span>
                      <span className="font-bold">{score.awarded}/{score.outOf}</span>
                    </div>
                  );
                })}
              </div>
              <p className="whitespace-pre-line">{lastResult.markerFeedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
