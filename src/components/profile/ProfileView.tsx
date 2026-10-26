import React, { useState } from 'react';
import {
  User,
  Settings,
  Eye,
  Sliders,
  ShieldCheck,
  Globe,
  Award,
  CheckCircle2,
  Save,
  Type,
  Sun,
  Contrast,
  LogOut,
} from 'lucide-react';
import { LearnerProfile, LearnerStage, Curriculum } from '../../types';

interface ProfileViewProps {
  learner: LearnerProfile;
  onUpdateProfile: (updated: Partial<LearnerProfile>) => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  learner,
  onUpdateProfile,
  onLogout,
}) => {
  const [name, setName] = useState(learner.name);
  const [stage, setStage] = useState<LearnerStage>(learner.stage);
  const [country, setCountry] = useState(learner.country);
  const [curriculum, setCurriculum] = useState<Curriculum>(learner.curriculum);
  const [gradeLevel, setGradeLevel] = useState(learner.gradeLevel);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(learner.dailyGoalMinutes);

  // Accessibility state
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>(
    learner.accessibility.fontSize
  );
  const [highContrast, setHighContrast] = useState(learner.accessibility.highContrast);
  const [reduceMotion, setReduceMotion] = useState(learner.accessibility.reduceMotion);
  const [dyslexiaFont, setDyslexiaFont] = useState(learner.accessibility.dyslexiaFont);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name,
      stage,
      country,
      curriculum,
      gradeLevel,
      dailyGoalMinutes,
      accessibility: {
        fontSize,
        highContrast,
        reduceMotion,
        dyslexiaFont,
      },
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <User size={14} className="text-purple-600" />
            <span>Learner Identity & Inclusive Settings</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Profile & Accessibility Settings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Personalize your academic standing, learning pathway, and inclusive viewing accommodations.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Settings Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Academic Profile Settings */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Globe size={18} className="text-purple-600" />
            <span>Academic Standing & Curriculum Enrolment</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Learner Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Country of Study
              </label>
              <input
                type="text"
                required
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Education Stage
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as LearnerStage)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="early">Berry Early (PP1 & PP2 • Playful Safari)</option>
                <option value="junior">Berry Junior (Grades 1 to 9 • Kenyan CBC)</option>
                <option value="senior">Berry Senior (Grades 10 to 12 • STEM & Pathways)</option>
                <option value="advance">Berry Advance (University & Working Professionals)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Curriculum System
              </label>
              <select
                value={curriculum}
                onChange={(e) => setCurriculum(e.target.value as Curriculum)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
              >
                <option value="kenya_cbc">Kenya CBC (KICD Official)</option>
                <option value="cambridge">Cambridge International</option>
                <option value="uk_national">UK National Curriculum</option>
                <option value="us_common_core">US State Standards</option>
                <option value="ib">International Baccalaureate (IB)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Grade Level or Year
              </label>
              <input
                type="text"
                required
                value={gradeLevel}
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Daily Study Goal (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={dailyGoalMinutes}
                onChange={(e) => setDailyGoalMinutes(parseInt(e.target.value, 10) || 30)}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>
        </div>

        {/* Accessibility & Inclusive Learning Accommodations */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Eye size={18} className="text-purple-600" />
            <span>Inclusive Learning Accommodations (Accessibility)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Font Size */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Text Scale & Readability
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Default' },
                  { id: 'large', label: 'Large (+20%)' },
                  { id: 'xlarge', label: 'Extra Large' },
                ].map((fs) => (
                  <button
                    key={fs.id}
                    type="button"
                    onClick={() => setFontSize(fs.id as any)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                      fontSize === fs.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dyslexia Friendly Toggle */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Dyslexia-Friendly Spacing</span>
                <span className="text-[11px] text-slate-500">Enhanced letter-spacing and word rhythm</span>
              </div>
              <input
                type="checkbox"
                checked={dyslexiaFont}
                onChange={(e) => setDyslexiaFont(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
            </div>

            {/* High Contrast */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">High Contrast Mode</span>
                <span className="text-[11px] text-slate-500">Sharper borders and deep foreground text</span>
              </div>
              <input
                type="checkbox"
                checked={highContrast}
                onChange={(e) => setHighContrast(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
            </div>

            {/* Reduced Motion */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Reduced Motion</span>
                <span className="text-[11px] text-slate-500">Minimize animations and UI transitions</span>
              </div>
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => setReduceMotion(e.target.checked)}
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Save button and Logout */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {onLogout ? (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors w-full sm:w-auto justify-center"
            >
              <LogOut size={16} />
              <span>Log Out of Berry</span>
            </button>
          ) : <div />}

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm shadow transition-all active:scale-95 w-full sm:w-auto justify-center"
          >
            <Save size={16} />
            <span>Save Preferences & Academic Standing</span>
          </button>
        </div>
      </form>
    </div>
  );
};
