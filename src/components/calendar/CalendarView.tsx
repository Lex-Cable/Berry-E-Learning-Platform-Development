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
  Pencil,
  Trash2,
} from 'lucide-react';
import { TaskItem, LearnerProfile } from '../../types';

interface CalendarViewProps {
  tasks: TaskItem[];
  learner: LearnerProfile;
  onAddTask: (task: Omit<TaskItem, 'id'>) => void;
  onUpdateTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTaskComplete: (taskId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  learner,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onToggleTaskComplete,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState(`${learner.gradeLevel} Study Session`);
  const [newDueDate, setNewDueDate] = useState(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    date.setHours(18, 0, 0, 0);
    return date.toISOString().slice(0, 16);
  });
  const [newUrgency, setNewUrgency] = useState<'urgent' | 'medium' | 'normal'>('medium');
  const [newType, setNewType] = useState<TaskItem['type']>('revision');
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  const localDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const monthLabel = visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    return day;
  });
  const selectedDayTasks = tasks.filter((task) => localDateKey(new Date(task.dueDate)) === selectedDate);

  const resetTaskForm = () => {
    setEditingTask(null);
    setNewTitle('');
    setNewSubject(`${learner.gradeLevel} Study Session`);
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    date.setHours(18, 0, 0, 0);
    setNewDueDate(date.toISOString().slice(0, 16));
    setNewUrgency('medium');
    setNewType('revision');
  };

  const openEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setNewTitle(task.title);
    setNewSubject(task.subject);
    const date = new Date(task.dueDate);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    setNewDueDate(date.toISOString().slice(0, 16));
    setNewUrgency(task.urgency);
    setNewType(task.type);
    setShowAddModal(true);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueDate) return;
    const taskFields = {
      title: newTitle.trim(),
      subject: newSubject.trim() || `${learner.gradeLevel} Study Session`,
      courseId: editingTask?.courseId || '',
      stage: editingTask?.stage || learner.stage,
      dueDate: new Date(newDueDate).toISOString(),
      urgency: newUrgency,
      status: editingTask?.status || 'pending' as const,
      type: newType,
    };
    if (editingTask) onUpdateTask({ ...editingTask, ...taskFields });
    else onAddTask(taskFields);
    resetTaskForm();
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

      {/* Calendar is derived from real saved task dates, not sample events. */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base">{monthLabel}</h3>
            <p className="text-xs text-slate-500 mt-1">Select a date to see your scheduled learning tasks.</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Previous month" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => { const today = new Date(); setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(localDateKey(today)); }} className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold">Today</button>
            <button type="button" aria-label="Next month" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="font-bold text-slate-400 py-1">{day}</div>
          ))}
          {calendarDays.map((day) => {
            const key = localDateKey(day);
            const dayTasks = tasks.filter((task) => localDateKey(new Date(task.dueDate)) === key);
            const isCurrentMonth = day.getMonth() === visibleMonth.getMonth();
            const isToday = key === localDateKey(new Date());
            const isSelected = key === selectedDate;
            return (
              <button key={key} type="button" onClick={() => setSelectedDate(key)} aria-pressed={isSelected} className={`p-2 rounded-xl border min-h-[58px] flex flex-col items-center justify-center gap-1 transition-all ${isSelected ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100' : isToday ? 'border-purple-300 bg-white' : 'border-slate-100'} ${isCurrentMonth ? 'text-slate-800' : 'text-slate-300'}`}>
                <span className={`font-bold ${isToday ? 'text-purple-700' : ''}`}>{day.getDate()}</span>
                {dayTasks.length > 0 && <span className="text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 px-1.5">{dayTasks.length} task{dayTasks.length === 1 ? '' : 's'}</span>}
              </button>
            );
          })}
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <h4 className="text-xs font-bold text-slate-700">{new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h4>
          {selectedDayTasks.length === 0 ? <p className="text-xs text-slate-500 mt-1">No tasks scheduled for this date.</p> : (
            <ul className="mt-2 space-y-1">{selectedDayTasks.map((task) => <li key={task.id} className="text-xs text-slate-600">{task.title} · {task.status.replace('_', ' ')}</li>)}</ul>
          )}
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
                <button type="button" onClick={() => openEditTask(task)} aria-label={`Edit ${task.title}`} className="p-2 rounded-lg bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700" title="Edit task">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => { if (window.confirm(`Delete “${task.title}” from your planner?`)) onDeleteTask(task.id); }} aria-label={`Delete ${task.title}`} className="p-2 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700" title="Delete task">
                  <Trash2 size={14} />
                </button>
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
            <h3 className="font-bold text-slate-900 text-base">{editingTask ? 'Edit Study Task' : 'Schedule Study Session'}</h3>
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
                    <option value="exam">Examination</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetTaskForm(); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow"
                >
                  {editingTask ? 'Save Changes' : 'Save Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
