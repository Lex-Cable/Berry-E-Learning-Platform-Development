import React, { useState } from 'react';
import {
  Search,
  Bell,
  Sparkles,
  ChevronDown,
  Menu,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { LearnerProfile, LearnerStage } from '../../types';

interface TopNavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onNavigateBack: () => void;
  canGoBack?: boolean;
  onLogout: () => void;
  learner: LearnerProfile;
  onUpdateStage: (stage: LearnerStage) => void;
  unreadCount: number;
  sidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  currentView,
  onNavigate,
  onNavigateBack,
  canGoBack = true,
  onLogout,
  learner,
  onUpdateStage,
  unreadCount,
  sidebarCollapsed,
  onMobileMenuToggle,
}) => {
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const stageDisplayNames: Record<
    string,
    { name: string; desc: string; color: string; dotColor: string }
  > = {
    early: {
      name: 'Berry Early',
      desc: 'PP1 & PP2 • Playful Early Childhood',
      color: 'bg-amber-100 text-amber-900 border-amber-300',
      dotColor: 'bg-amber-400',
    },
    junior: {
      name: 'Berry Junior',
      desc: 'Grades 1 to 9 • Kenyan CBC Primary & Junior',
      color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      dotColor: 'bg-emerald-500',
    },
    senior: {
      name: 'Berry Senior',
      desc: 'Grades 10 to 12 • Senior School & STEM',
      color: 'bg-blue-100 text-blue-900 border-blue-300',
      dotColor: 'bg-blue-600',
    },
    advance: {
      name: 'Berry Advance',
      desc: 'University & Working Professionals',
      color: 'bg-purple-100 text-purple-900 border-purple-300',
      dotColor: 'bg-purple-600',
    },
    // Aliases
    university: {
      name: 'Berry Advance (Uni)',
      desc: 'Undergrad & Research Modules',
      color: 'bg-purple-100 text-purple-900 border-purple-300',
      dotColor: 'bg-purple-600',
    },
    professionals: {
      name: 'Berry Advance (Pro)',
      desc: 'Enterprise Skills & ML',
      color: 'bg-slate-100 text-slate-900 border-slate-300',
      dotColor: 'bg-slate-800',
    },
  };

  const currentStageConfig = stageDisplayNames[learner.stage] || stageDisplayNames.junior;

  const pageTitles: Record<string, string> = {
    landing: 'Home & Welcome',
    dashboard: 'Dashboard',
    courses: 'Explore All Courses',
    'my-learning': 'My Learning (Subject Grid & Syllabus)',
    certifications: 'Verifiable Certifications & Badges',
    library: 'Berry Digital Library',
    community: 'Berry Community Blog',
    'ai-tutor': 'Berry AI Socratic Tutor',
    transcription: 'Live Speech-to-Text Transcription',
    calendar: 'Study Planner & Deadlines',
    assignments: 'Assignment Submission & Marking',
    notifications: 'Notifications Centre',
    progress: 'Mastery & Progress Analytics',
    profile: 'Profile & Stage Settings',
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 flex items-center justify-between gap-3">
      {/* Left: Always-visible Back Arrow & Page Title */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Always-Visible Back Arrow */}
        <button
          onClick={onNavigateBack}
          aria-label="Go back to previous page"
          title="Go back to previous page"
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1.5 font-bold text-xs shadow-xs transition-all flex-shrink-0 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Back</span>
        </button>

        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          aria-label="Open mobile menu"
        >
          <Menu size={20} />
        </button>

        <div>
          <h1 className="text-base md:text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{pageTitles[currentView] || 'Berry Learning'}</span>
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">
            {learner.country} • {learner.curriculum === 'kenya_cbc' ? 'Kenyan CBC' : 'Global Standards'} • {learner.gradeLevel}
          </p>
        </div>
      </div>

      {/* Middle: Global Search */}
      <div className="hidden lg:flex items-center flex-1 max-w-sm mx-4">
        <div className="relative w-full">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search subjects, lessons, or blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onNavigate('courses');
            }}
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-full bg-slate-100 border border-transparent focus:border-purple-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 transition-all text-slate-800"
          />
        </div>
      </div>

      {/* Right: Stage Switcher, Notifications, Log Out */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Stage Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowStageMenu(!showStageMenu)}
            aria-expanded={showStageMenu}
            aria-label="Switch Learning Stage"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 cursor-pointer"
          >
            <span className={`w-2.5 h-2.5 rounded-full ${currentStageConfig.dotColor}`} />
            <span className="font-bold">{currentStageConfig.name}</span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {showStageMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Select Educational Stage
                </span>
                <span className="text-xs text-slate-600">
                  Switch age-appropriate curriculum & UI
                </span>
              </div>

              {[
                { id: 'early' as LearnerStage, label: 'Berry Early', desc: 'PP1 & PP2 • Playful Safari Kids' },
                { id: 'junior' as LearnerStage, label: 'Berry Junior', desc: 'Grades 1 to 9 • Kenyan CBC Core' },
                { id: 'senior' as LearnerStage, label: 'Berry Senior', desc: 'Grades 10 to 12 • STEM & Pathways' },
                { id: 'advance' as LearnerStage, label: 'Berry Advance', desc: 'University & Working Professionals' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onUpdateStage(s.id);
                    setShowStageMenu(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between text-xs ${
                    learner.stage === s.id
                      ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <span className="font-bold block">{s.label}</span>
                    <span className="text-[11px] text-slate-400 font-normal">{s.desc}</span>
                  </div>
                  {learner.stage === s.id && (
                    <span className="text-purple-600 font-bold text-xs">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Icon Button */}
        <button
          onClick={() => onNavigate('notifications')}
          aria-label="View notifications"
          className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Functional Log Out Button */}
        <button
          onClick={onLogout}
          aria-label="Log Out of Berry"
          title="Log Out of Berry"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs border border-rose-200 transition-all cursor-pointer active:scale-95"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Log Out</span>
        </button>
      </div>
    </header>
  );
};
