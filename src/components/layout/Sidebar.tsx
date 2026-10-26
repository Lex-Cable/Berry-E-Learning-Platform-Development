import React from 'react';
import {
  GraduationCap,
  BookOpen,
  LayoutDashboard,
  Compass,
  FileText,
  MessageSquare,
  Sparkles,
  Mic,
  Calendar,
  Bell,
  BarChart3,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  Award,
} from 'lucide-react';
import { LearnerStage } from '../../types';
import { isLiveTranscriptionAllowed } from '../../utils/mastery';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  stage: LearnerStage;
  unreadNotificationsCount: number;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  collapsed,
  onToggleCollapse,
  stage,
  unreadNotificationsCount,
  onLogout,
}) => {
  const allowLiveTranscription = isLiveTranscriptionAllowed(stage);

  // Stage-specific branding theme
  const stageThemeMap: Record<
    string,
    { badge: string; badgeClass: string; activeClass: string; accentColor: string }
  > = {
    early: {
      badge: 'Berry Early 🎈',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      activeClass: 'bg-amber-50 text-amber-900 border-r-4 border-amber-400 font-bold',
      accentColor: 'text-amber-500',
    },
    junior: {
      badge: 'Berry Junior 📚',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      activeClass: 'bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 font-semibold',
      accentColor: 'text-emerald-600',
    },
    senior: {
      badge: 'Berry Senior 🔬',
      badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
      activeClass: 'bg-blue-50 text-blue-800 border-r-4 border-blue-600 font-semibold',
      accentColor: 'text-blue-600',
    },
    advance: {
      badge: 'Berry Advance 🎓',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      activeClass: 'bg-purple-50 text-purple-800 border-r-4 border-purple-600 font-semibold',
      accentColor: 'text-purple-600',
    },
    // Backward compatibility aliases
    university: {
      badge: 'Berry Advance (Uni)',
      badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
      activeClass: 'bg-purple-50 text-purple-800 border-r-4 border-purple-600 font-semibold',
      accentColor: 'text-purple-600',
    },
    professionals: {
      badge: 'Berry Advance (Pro)',
      badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
      activeClass: 'bg-slate-50 text-slate-800 border-r-4 border-slate-700 font-semibold',
      accentColor: 'text-slate-700',
    },
  };

  const currentTheme = stageThemeMap[stage] || stageThemeMap.junior;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'my-learning', label: 'My Learning', icon: BookOpen },
    { id: 'courses', label: 'Explore Courses', icon: Compass },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'ai-tutor', label: 'Berry AI Tutor', icon: Sparkles },
    { id: 'community', label: 'Berry Community', icon: MessageSquare },
    { id: 'library', label: 'Berry Library', icon: FileText },
    // Strict requirement: Only show Live Transcription for Berry Advance!
    ...(allowLiveTranscription
      ? [{ id: 'transcription', label: 'Live Transcription', icon: Mic }]
      : []),
    { id: 'calendar', label: 'Planner & Tasks', icon: Calendar },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { id: 'progress', label: 'Mastery & Progress', icon: BarChart3 },
    { id: 'profile', label: 'Profile & Settings', icon: User },
  ];

  return (
    <aside
      aria-label="Main Navigation"
      className={`fixed top-0 bottom-0 left-0 z-30 hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer overflow-hidden"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate('dashboard')}
          aria-label="Go to Berry Dashboard"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-400 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <span className="font-extrabold text-xl tracking-tighter">B</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-black text-xl tracking-tight text-slate-900 leading-none">
                BERRY
              </span>
              <span
                className={`text-[10px] font-bold tracking-wide mt-1 px-1.5 py-0.5 rounded border inline-block w-fit ${currentTheme.badgeClass}`}
              >
                {currentTheme.badge}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 focus:outline-none transition-colors cursor-pointer"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 overflow-y-auto px-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-colors text-left relative group cursor-pointer ${
                isActive
                  ? currentTheme.activeClass
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                size={18}
                className={`flex-shrink-0 ${
                  isActive ? currentTheme.accentColor : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              {!collapsed && (
                <span className="truncate flex-1 font-semibold">{item.label}</span>
              )}
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    collapsed
                      ? 'absolute top-1.5 right-1.5 bg-rose-500 text-white w-4 h-4 flex items-center justify-center'
                      : 'bg-rose-500 text-white ml-auto'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout Action */}
      {onLogout && (
        <div className="px-2 pt-1 border-t border-slate-100">
          <button
            onClick={onLogout}
            title={collapsed ? 'Log Out' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer group"
          >
            <LogOut size={16} className="text-rose-500 flex-shrink-0" />
            {!collapsed && <span>Log Out</span>}
          </button>
        </div>
      )}

      {/* Footer Info & CBC Accreditation */}
      {!collapsed ? (
        <div className="p-3 m-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-1">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>KICD CBC Aligned</span>
          </div>
          <p className="text-[11px] leading-snug text-slate-500">
            Demonstrated mastery gating with verified certifications.
          </p>
        </div>
      ) : (
        <div className="p-3 text-center text-slate-400" title="KICD CBC Aligned">
          <CheckCircle2 size={18} className="mx-auto text-emerald-500" />
        </div>
      )}
    </aside>
  );
};
