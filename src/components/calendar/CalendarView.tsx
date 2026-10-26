import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Sparkles,
} from 'lucide-react';
import { TaskItem, LearnerProfile } from '../../types';

interface CalendarViewProps {
  tasks: TaskItem[];
  learner: LearnerProfile;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  onToggleTaskComplete: (taskId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  learner,
  onAddTask,
  onToggleTaskComplete,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('Grade 1 Mathematics');
  const [newDueDate, setNewDueDate] = useState('2026-10-28T18:00');
  const [newUrgency, setNewUrgency] = useState<'urgent' | 'medium' | 'normal'>('medium');
  const [newType, setNewType] = useState<'quiz' | 'assignment' | 'reading' | 'revision'>('revision');

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    onAddTask({
      title: newTitle,
      subject: newSubject,
      courseId: 'cbc-g1-math',
      stage: learner.stage,
      dueDate: new Date(newDueDate).toISOString(),
      urgency: newUrgency,
      status: 'pending',
      type: newType,
    });

    setNewTitle('');
    setShowAddModal(false);
  };

  // Group tasks by upcoming vs completed
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <CalendarIcon size={14} className="text-purple-600" />
            <span>Academic Schedule & Study Milestones</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Study Planner & Deadlines
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Organize personal study blocks, upcoming curriculum assessments, and project submission deadlines.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-all active:scale-95"
        >
          <Plus size={16} />
          <span>Plan Personal Study Session</span>
        </button>
      </div>

      {/* Monthly Interactive Calendar Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-bold text-slate-900 text-base">October 2026</h3>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
              <ChevronLeft size={16} />
            </button>
            <button className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="font-bold text-slate-400 py-1">
              {day}
            </div>
          ))}

          {/* Days 19-31 representation */}
          {[19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31].map((dateNum) => {
            const isToday = dateNum === 24;
            const hasDeadline = dateNum === 26 || dateNum === 28 || dateNum === 29;

            return (
              <div
                key={dateNum}
                className={`p-3 rounded-2xl border text-left min-h-[70px] flex flex-col justify-between transition-all ${
                  isToday
                    ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-200'
                    : 'border-slate-100 bg-slate-50/50 hover:bg-white'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span
                    className={`font-bold text-xs ${
                      isToday ? 'text-purple-700' : 'text-slate-700'
                    }`}
                  >
                    {dateNum}
                  </span>
                  {isToday && (
                    <span className="text-[9px] font-bold bg-purple-600 text-white px-1.5 py-0.2 rounded-full">
                      Today
                    </span>
                  )}
                </div>

                {hasDeadline && (
                  <div className="w-full text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 truncate">
                    • Assessment Due
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task List: Pending and Scheduled Tasks */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Outstanding Study Tasks & Deadlines</h3>

        <div className="space-y-3">
          {pendingTasks.map((task) => (
            <div
              key={task.id}
              className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-purple-200 transition-all"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => onToggleTaskComplete(task.id)}
                  aria-label="Mark task complete"
                  className="mt-0.5 w-5 h-5 rounded-lg border-2 border-slate-300 hover:border-purple-600 flex items-center justify-center transition-colors"
                >
                  {task.status === 'completed' && <CheckCircle2 size={16} className="text-purple-600" />}
                </button>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                      {task.subject}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        task.urgency === 'urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {task.urgency.toUpperCase()}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{task.title}</h4>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 self-end sm:self-center">
                <span className="flex items-center gap-1">
                  <Clock size={13} />
                  <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>
                </span>
                <button
                  onClick={() => onToggleTaskComplete(task.id)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-semibold text-xs transition-colors"
                >
                  Mark Complete
                </button>
              </div>
            </div>
          ))}

          {completedTasks.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Completed Tasks:
              </span>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center justify-between line-through"
                >
                  <span>{task.title}</span>
                  <span className="text-[10px] text-emerald-600 font-bold">✓ Completed</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Study Session Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Schedule Study Session</h3>
            <form onSubmit={handleCreateSession} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Task / Session Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Revise Grade 1 Number Quantities 1-5"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Learning Area / Subject
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Priority / Urgency
                  </label>
                  <select
                    value={newUrgency}
                    onChange={(e) => setNewUrgency(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="normal">Normal</option>
                    <option value="medium">Medium</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Task Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <option value="revision">Revision</option>
                    <option value="quiz">Quiz Prep</option>
                    <option value="assignment">Assignment</option>
                    <option value="reading">Library Reading</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
