import React, { useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Smile,
  BookOpen,
  GraduationCap,
  Briefcase,
  X,
} from 'lucide-react';
import { LearnerProfile, LearnerStage } from '../../types';

interface LoginPageProps {
  onLogin: (chosenProfile?: Partial<LearnerProfile>) => void;
  onGoToSignUp: () => void;
  onNavigateBack: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onGoToSignUp,
  onNavigateBack,
}) => {
  const [emailOrUsername, setEmailOrUsername] = useState('zawadi.mutua@berry.edu');
  const [password, setPassword] = useState('berry123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  // Pre-configured Quick Demo Profiles for instant testing
  const demoAccounts = [
    {
      stage: 'early' as LearnerStage,
      name: 'Amani Wanjiru',
      stageLabel: 'Kindergarten (PP2)',
      curriculumLabel: 'CBC Pre-Primary 2',
      school: 'Little Acorns Academy, Nairobi',
      icon: Smile,
      color: 'bg-amber-50 text-amber-900 border-amber-200 hover:border-amber-400',
    },
    {
      stage: 'junior' as LearnerStage,
      name: 'Zawadi Mutua',
      stageLabel: 'Junior (Grade 7)',
      curriculumLabel: 'CBC Junior Secondary',
      school: 'Nairobi Central Academy',
      icon: BookOpen,
      color: 'bg-blue-50 text-blue-900 border-blue-200 hover:border-blue-400',
    },
    {
      stage: 'senior' as LearnerStage,
      name: 'Kevin Mwangi',
      stageLabel: 'Senior (Grade 11)',
      curriculumLabel: 'CBC STEM Pathway',
      school: 'Alliance High School',
      icon: GraduationCap,
      color: 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:border-indigo-400',
    },
    {
      stage: 'advance' as LearnerStage,
      name: 'Dr. Faith Kiprop',
      stageLabel: 'University & Professional',
      curriculumLabel: 'Degree & Cloud AI Track',
      school: 'University of Nairobi',
      icon: Briefcase,
      color: 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:border-emerald-400',
    },
  ];

  const handleStandardLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!emailOrUsername.trim()) {
      setErrorMessage('Please enter your email or username.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    // Authenticate and log in
    onLogin({
      name: emailOrUsername.includes('@')
        ? emailOrUsername.split('@')[0].replace('.', ' ')
        : emailOrUsername,
    });
  };

  const handleSelectDemo = (demo: typeof demoAccounts[0]) => {
    onLogin({
      name: demo.name,
      stage: demo.stage,
      gradeLevel:
        demo.stage === 'early'
          ? 'PP2'
          : demo.stage === 'junior'
          ? 'Grade 7'
          : demo.stage === 'senior'
          ? 'Grade 11'
          : 'Bachelor Year 2',
      seniorPathway: demo.stage === 'senior' ? 'stem' : undefined,
      advanceTrack: demo.stage === 'advance' ? 'university' : undefined,
      institutionOrCompany: demo.school,
    });
  };

  const handleSendPasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header with Back Arrow */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-purple-700" />
            <span>Back</span>
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-200 font-black text-sm">
              🍇
            </div>
            <span className="font-black text-lg tracking-tight bg-linear-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">
              BERRY
            </span>
          </div>

          <div className="text-xs text-slate-500">
            Need an account?{' '}
            <button
              onClick={onGoToSignUp}
              className="font-bold text-purple-700 hover:text-purple-800 hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-10 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Welcome Back to Berry!
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sign in to continue your competency journey and access your learning dashboard.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleStandardLogin} className="space-y-4">
            {/* Email or Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="name@example.com"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotSubmitted(false);
                    setForgotEmail(emailOrUsername);
                    setShowForgotModal(true);
                  }}
                  className="text-xs text-purple-700 hover:text-purple-800 hover:underline font-semibold cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Log In Button */}
            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-extrabold text-sm shadow-lg shadow-purple-300 hover:shadow-xl hover:scale-[1.005] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Log In</span>
              <Sparkles className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Accounts for Instant Review */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2.5">
              Or Instant Sign In as Demo Learner:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((d) => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.stage}
                    type="button"
                    onClick={() => handleSelectDemo(d)}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${d.color}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-bold text-xs truncate">{d.name}</span>
                    </div>
                    <span className="text-[10px] block opacity-80 font-medium truncate">{d.stageLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom link: Don't have an account yet? Sign Up */}
          <div className="text-center pt-5 mt-5 border-t border-slate-100 text-xs text-slate-600">
            Don&apos;t have an account yet?{' '}
            <button
              type="button"
              onClick={onGoToSignUp}
              className="font-extrabold text-purple-700 hover:text-purple-800 hover:underline cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-black text-base text-slate-900">Reset Your Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotSubmitted ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Password Reset Sent!</h4>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed">
                  We have dispatched a secure recovery link to{' '}
                  <strong className="text-slate-900 font-bold">{forgotEmail}</strong>. Please check your inbox or spam folder.
                </p>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 cursor-pointer"
                >
                  Return to Log In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendPasswordReset} className="space-y-4">
                <p className="text-xs text-slate-600">
                  Enter your registered email address or learner ID. We will generate an instant verification link to reset your credentials.
                </p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="learner@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-md shadow-purple-200 cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <footer className="text-center py-4 text-xs text-slate-400">
        Berry Learning Ecosystem • Empowering Kindergarten to Career
      </footer>
    </div>
  );
};
