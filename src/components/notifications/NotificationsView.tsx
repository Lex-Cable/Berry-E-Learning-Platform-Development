import React, { useState } from 'react';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Award,
  Filter,
} from 'lucide-react';
import { AppNotification, LearnerProfile } from '../../types';

interface NotificationsViewProps {
  notifications: AppNotification[];
  learner: LearnerProfile;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (view: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  learner,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}) => {
  const [filterType, setFilterType] = useState<string>('all');

  const filtered = notifications.filter((n) => {
    if (filterType !== 'all' && n.type !== filterType) return false;
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return <Clock size={16} className="text-rose-500" />;
      case 'mastery':
        return <Award size={16} className="text-emerald-500" />;
      case 'feedback':
        return <Sparkles size={16} className="text-purple-500" />;
      default:
        return <Bell size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <Bell size={14} className="text-purple-600" />
            <span>Platform Activity & Deadlines</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Notifications Centre
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time curriculum updates, graded feedback alerts, and approaching assignment deadlines.
          </p>
        </div>

        <button
          onClick={onMarkAllRead}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all shadow-sm"
        >
          <CheckCheck size={16} />
          <span>Mark All as Read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        {['all', 'deadline', 'mastery', 'feedback', 'system'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterType(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === cat
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {cat === 'all'
              ? 'All Notifications'
              : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification Items */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
              item.unread
                ? 'bg-purple-50/40 border-purple-200 shadow-sm'
                : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs mt-0.5">
                {getIcon(item.type)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-900 text-sm">{item.title}</h4>
                  {item.unread && (
                    <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                <span className="text-[11px] text-slate-400 block pt-1">{item.date}</span>
              </div>
            </div>

            {item.unread && (
              <button
                onClick={() => onMarkRead(item.id)}
                className="text-xs font-semibold text-purple-600 hover:text-purple-800 p-1 flex-shrink-0"
                title="Mark as read"
              >
                <Check size={16} />
              </button>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
            <Bell size={40} className="mx-auto text-slate-300 mb-2" />
            <h3 className="text-sm font-bold text-slate-600">No notifications in this category</h3>
          </div>
        )}
      </div>
    </div>
  );
};
