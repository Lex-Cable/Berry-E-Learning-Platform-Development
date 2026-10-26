import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Briefcase,
  Smile,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Mic,
  Award,
  ArrowLeft,
  LogIn,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Globe2,
  Zap,
  Layers,
  HelpCircle,
  Mail,
  Send,
  X,
  Menu,
} from 'lucide-react';
import { LearnerStage, LearnerProfile } from '../../types';
import { StageDetailModal } from './StageDetailModal';

interface LandingPageProps {
  onStartLearning: (chosenProfile?: Partial<LearnerProfile>) => void;
  onLogin: () => void;
  onGoToSignUp?: (preselectedStage?: LearnerStage) => void;
  onLogout?: () => void;
  learner?: LearnerProfile;
  isLoggedIn?: boolean;
  onNavigateBack?: () => void;
  canGoBack?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartLearning,
  onLogin,
  onGoToSignUp,
  onLogout,
  learner,
  isLoggedIn = false,
  onNavigateBack,
  canGoBack = false,
}) => {
  // Stage detail modal
  const [selectedStageModal, setSelectedStageModal] = useState<LearnerStage | null>(null);

  // Dropdown states
  const [stagesDropdownOpen, setStagesDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Contact Us Modal State
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactStage, setContactStage] = useState('junior');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // About Us Modal State
  const [aboutModalOpen, setAboutModalOpen] = useState(false);

  // Helper to trigger sign up with preselected stage
  const handleSignUpClick = (stage?: LearnerStage) => {
    if (onGoToSignUp) {
      onGoToSignUp(stage);
    } else {
      onStartLearning(stage ? { stage } : undefined);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) return;
    setContactSubmitted(true);
  };

  const stagesList = [
    {
      id: 'early' as LearnerStage,
      title: 'Kindergarten',
      brand: 'Berry Early',
      age: 'Ages 3–5 • PP1 & PP2',
      badge: 'Playful & Kid-Friendly',
      desc: 'Joyful early childhood safari with colorful animal sounds, counting games, shapes, phonics, and sensory discovery.',
      gradient: 'from-amber-400 via-orange-400 to-yellow-500',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
      cardBorder: 'hover:border-amber-400',
      icon: Smile,
      highlights: [
        'Animal Safari Phonics (/a/ /b/ /c/)',
        'Counting 1–10 with playful objects',
        'Sensory & psychomotor games',
      ],
      curriculumNote: 'Kenyan CBC Pre-Primary (PP1 & PP2) + Universal EYFS',
    },
    {
      id: 'junior' as LearnerStage,
      title: 'Junior',
      brand: 'Berry Junior',
      age: 'Grades 1–9 • Primary & JSS',
      badge: 'Core CBC Competencies',
      desc: 'Competency-based foundational & junior secondary education with interactive math breakdowns, science labs, and mastery scoring.',
      gradient: 'from-blue-600 via-indigo-600 to-cyan-600',
      badgeClass: 'bg-blue-100 text-blue-900 border-blue-300',
      cardBorder: 'hover:border-blue-400',
      icon: BookOpen,
      highlights: [
        'Kenyan CBC Grades 1 to 9 subjects',
        'Interactive diagnostic quizzes & 80%+ mastery',
        'Socratic step-by-step guidance',
      ],
      curriculumNote: 'Lower Primary, Upper Primary & Junior Secondary',
    },
    {
      id: 'senior' as LearnerStage,
      title: 'Senior',
      brand: 'Berry Senior',
      age: 'Grades 10–12 • Senior School',
      badge: 'Pathways & Exam Prep',
      desc: 'Specialized senior secondary pathways in STEM, Social Sciences, and Arts & Sports with comprehensive national exam simulations.',
      gradient: 'from-indigo-700 via-purple-700 to-violet-800',
      badgeClass: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      cardBorder: 'hover:border-indigo-400',
      icon: GraduationCap,
      highlights: [
        '3 CBC Pathways: STEM, Social, Arts/Sports',
        'KCSE & University entry exam drills',
        'Cryptographic verified certificates',
      ],
      curriculumNote: 'Specialized Pathways + Cambridge & IB options',
    },
    {
      id: 'advance' as LearnerStage,
      title: 'University & Professionals',
      brand: 'Berry Advance',
      age: 'Higher Ed & Career Excellence',
      badge: 'Degree & Career Mastery',
      desc: 'Accelerating higher education and professional careers with real-time lecture audio transcription, research synthesis, and enterprise certs.',
      gradient: 'from-emerald-700 via-teal-700 to-cyan-800',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      cardBorder: 'hover:border-emerald-400',
      icon: Briefcase,
      highlights: [
        'Live speech-to-text lecture transcription',
        'University degree & thesis revision decks',
        'Enterprise professional upskilling tracks',
      ],
      curriculumNote: 'Undergraduate, Postgraduate & Industry Certification',
    },
  ];

  const faqs = [
    {
      q: 'How does Berry align with the Kenyan CBC curriculum?',
      a: 'Berry is built strictly around the Kenya Institute of Curriculum Development (KICD) Competency-Based Curriculum framework. From Pre-Primary (PP1 & PP2) through Lower Primary, Upper Primary, Junior Secondary (Grades 7–9), and Senior Secondary (Grades 10–12), our strands, sub-strands, and competency rubrics match national standards.',
    },
    {
      q: 'Can a learner choose Universal Learning instead of Kenyan CBC?',
      a: 'Yes. Berry features a dual curriculum engine. Learners or international schools can toggle Universal Learning to access Cambridge Primary/Secondary, US Common Core, and International Baccalaureate (IB) benchmarks alongside global transferable skills.',
    },
    {
      q: 'What makes Kindergarten (Berry Early) kid-friendly and safe?',
      a: 'Berry Early is specifically created for 3 to 5-year-olds. It features bright, high-contrast, playful illustrations, warm spoken voice guidance, cheerful animal companions, zero text-heavy screens, and tactile drag-and-drop activities designed for young fine motor skills.',
    },
    {
      q: 'How does Berry Senior handle the new CBC pathways?',
      a: 'Berry Senior provides dedicated curricula for the three official senior pathways: (1) STEM (Pure Sciences, Applied Sciences, Mathematics & ICT), (2) Social Sciences (Humanities, Business Studies, Economics, Languages), and (3) Arts & Sports Science. Learners select their pathway upon registration and receive tailored course syllabi and exam simulations.',
    },
    {
      q: 'How does live lecture transcription work for University & Professionals?',
      a: 'In Berry Advance, learners can start a live audio session during lectures or corporate seminars. Berry securely captures speech in real-time, generates timestamped transcripts, and uses AI to summarize key takeaways, vocabulary, and exam flashcards automatically.',
    },
    {
      q: 'Are the certifications officially verifiable?',
      a: 'Yes. Every course completed with demonstrated 80%+ mastery awards an official Berry Competency Certificate with a unique cryptographic verification hash (e.g., BERRY-CBC-2026-XXXX) that can be verified by schools, universities, or employers.',
    },
  ];

  const testimonials = [
    {
      quote:
        'Berry Early transformed how my 4-year-old learns letters and numbers. The safari animals and gentle voice cues make him excited to learn every single afternoon.',
      author: 'Wanjiku Kamau',
      role: 'Parent of PP2 Learner',
      location: 'Nairobi, Kenya',
      stage: 'Kindergarten',
      avatar: '🦒',
    },
    {
      quote:
        'The step-by-step math breakdowns in Berry Junior helped me finally understand fraction geometry. The AI tutor doesn’t just give answers, it shows me what I missed.',
      author: 'Brian Omondi',
      role: 'Grade 8 Junior Secondary Student',
      location: 'Kisumu, Kenya',
      stage: 'Junior',
      avatar: '📐',
    },
    {
      quote:
        'As a Grade 11 student in the STEM pathway, having access to advanced chemistry labs and verified practice exams gave me the confidence to aim for top engineering programs.',
      author: 'Zawadi Mutua',
      role: 'Senior STEM Scholar',
      location: 'Eldoret, Kenya',
      stage: 'Senior',
      avatar: '🔬',
    },
    {
      quote:
        'Live lecture transcription is an absolute game-changer. During 2-hour medical lectures, Berry captures every term and compiles neat study notes instantly.',
      author: 'Dr. Faith Kiprop',
      role: 'Postgraduate Medical Fellow',
      location: 'Mombasa, Kenya',
      stage: 'University & Professional',
      avatar: '🩺',
    },
    {
      quote:
        'Our school adopted Berry for our CBC continuous assessment tracking. The competency rubrics and automated mastery analytics save our teachers dozens of hours.',
      author: 'Peter Nderitu',
      role: 'Curriculum Director & Senior Educator',
      location: 'Nakuru, Kenya',
      stage: 'Educator',
      avatar: '👨‍🏫',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-purple-100 selection:text-purple-900">
      {/* 1. Modern Top Navbar */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Optional Back Arrow + Logo */}
            <div className="flex items-center gap-3">
              {canGoBack && (
                <button
                  onClick={onNavigateBack}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Go back to previous page"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-4 h-4 text-purple-700" />
                  <span className="hidden sm:inline">Back</span>
                </button>
              )}

              <a
                href="#hero"
                className="flex items-center gap-2.5 text-slate-900 group"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-purple-600 via-purple-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-200 text-base font-black">
                  🍇
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-lg tracking-tight bg-linear-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent">
                    BERRY
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest -mt-1">
                    Learning Ecosystem
                  </span>
                </div>
              </a>
            </div>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1 lg:gap-2">
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
              >
                Home
              </a>

              <button
                onClick={() => setAboutModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors cursor-pointer"
              >
                About Us
              </button>

              {/* Explore Stages Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStagesDropdownOpen(!stagesDropdownOpen)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span>Explore Stages</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {stagesDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95"
                    onMouseLeave={() => setStagesDropdownOpen(false)}
                  >
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Select a Stage
                    </div>
                    {stagesList.map((s) => {
                      const Icon = s.icon;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setStagesDropdownOpen(false);
                            setSelectedStageModal(s.id);
                          }}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-purple-50 transition-colors flex items-center gap-3 cursor-pointer group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-purple-100 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-purple-700" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                              {s.title}
                            </div>
                            <div className="text-[10px] text-slate-500">{s.age}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <a
                href="#features"
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors"
              >
                Features
              </a>

              <button
                onClick={() => setContactModalOpen(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-purple-700 hover:bg-purple-50/50 transition-colors cursor-pointer"
              >
                Contact Us
              </button>
            </div>

            {/* Desktop Auth Action Buttons */}
            <div className="hidden md:flex items-center gap-2.5">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => onStartLearning()}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  {onLogout && (
                    <button
                      onClick={onLogout}
                      className="px-3.5 py-2 rounded-xl text-xs font-extrabold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all cursor-pointer"
                    >
                      Log Out
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={onLogin}
                    className="px-4 py-2 rounded-xl text-xs font-extrabold text-slate-700 hover:text-purple-700 hover:bg-purple-50 border border-slate-200/80 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <LogIn className="w-3.5 h-3.5 text-purple-600" />
                    <span>Log In</span>
                  </button>

                  <button
                    onClick={() => handleSignUpClick()}
                    className="px-5 py-2 rounded-xl text-xs font-extrabold bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Sign Up</span>
                  </button>
                </>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <div className="flex md:hidden items-center gap-2">
              {isLoggedIn ? (
                <button
                  onClick={() => onStartLearning()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white"
                >
                  Dashboard
                </button>
              ) : (
                <button
                  onClick={() => handleSignUpClick()}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white"
                >
                  Sign Up
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 animate-in slide-in-from-top-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Home
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setAboutModalOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              About Us
            </button>
            <div className="py-1">
              <span className="block px-3 py-1 text-[10px] font-black uppercase text-slate-400">
                Explore Stages:
              </span>
              {stagesList.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setSelectedStageModal(s.id);
                  }}
                  className="w-full text-left px-4 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 rounded-lg"
                >
                  • {s.title} ({s.age})
                </button>
              ))}
            </div>
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Features
            </a>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setContactModalOpen(true);
              }}
              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              Contact Us
            </button>
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onStartLearning();
                    }}
                    className="flex-1 py-2 text-center text-xs font-bold text-white bg-purple-600 rounded-xl"
                  >
                    Dashboard
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="flex-1 py-2 text-center text-xs font-bold text-rose-600 border border-rose-200 rounded-xl"
                    >
                      Log Out
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogin();
                    }}
                    className="flex-1 py-2 text-center text-xs font-bold text-purple-700 border border-purple-200 rounded-xl"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignUpClick();
                    }}
                    className="flex-1 py-2 text-center text-xs font-bold text-white bg-purple-600 rounded-xl"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <section
        id="hero"
        className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-linear-to-b from-purple-50/70 via-white to-slate-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Mission Statement Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/80 border border-purple-200 text-purple-900 text-xs font-bold tracking-wide shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Berry&apos;s Mission: Empowering Every Learner from First Steps to Career Mastery</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              From Kindergarten to Career:{' '}
              <span className="bg-linear-to-r from-purple-600 via-indigo-600 to-purple-800 bg-clip-text text-transparent">
                Smart Learning Built for CBC & Beyond
              </span>
            </h1>

            {/* Short Description */}
            <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
              A unified, competency-based education ecosystem tailored to every milestone. Personalized curriculum pathways, Socratic AI tutoring, interactive exercises, verified certifications, and real-time lecture transcription.
            </p>

            {/* Main Action CTAs */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {isLoggedIn ? (
                <button
                  onClick={() => onStartLearning()}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-black text-base shadow-xl shadow-purple-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={() => handleSignUpClick()}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-black text-base shadow-xl shadow-purple-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2.5"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              )}

              <a
                href="#stages"
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white text-slate-800 font-extrabold text-base border border-slate-300/80 hover:border-purple-400 hover:bg-purple-50/40 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Explore Berry</span>
                <ChevronDown className="w-4 h-4 text-purple-600" />
              </a>
            </div>

            {/* Trust Metrics Bar */}
            <div className="pt-8 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-xl sm:text-2xl font-black text-purple-700">4 Stages</div>
                <div className="text-[11px] font-semibold text-slate-500">Kindergarten to Career</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-indigo-700">100% CBC</div>
                <div className="text-[11px] font-semibold text-slate-500">+ Universal Standards</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-emerald-700">Verified</div>
                <div className="text-[11px] font-semibold text-slate-500">Digital Credentials</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-black text-blue-700">Socratic AI</div>
                <div className="text-[11px] font-semibold text-slate-500">Tutor & Lecture Audio</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Central Section: Four Stages */}
      <section id="stages" className="py-16 md:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <span className="text-xs font-black uppercase tracking-widest text-purple-700 bg-purple-100 px-3.5 py-1 rounded-full inline-block mb-3">
              Core Framework
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Four Tailored Stages. One Unified Journey.
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-3">
              Whether introducing a 4-year-old to letters or preparing an engineer for enterprise cloud certification, Berry adapts the environment, tone, and rigor to the learner.
            </p>
          </div>

          {/* Four Distinct Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stagesList.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.id}
                  className={`bg-white rounded-3xl border border-slate-200 shadow-lg p-6 flex flex-col justify-between transition-all duration-200 ${s.cardBorder} hover:shadow-xl hover:-translate-y-1 group`}
                >
                  <div>
                    {/* Top Stage Header */}
                    <div className="flex items-start justify-between gap-2 mb-4">
                      <div
                        className={`w-12 h-12 rounded-2xl bg-linear-to-tr ${s.gradient} text-white flex items-center justify-center shadow-md`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${s.badgeClass}`}>
                        {s.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900 mb-1">{s.title}</h3>
                    <div className="text-xs font-bold text-purple-700 mb-2">{s.age}</div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">{s.desc}</p>

                    {/* Highlights */}
                    <div className="space-y-1.5 mb-6 pt-3 border-t border-slate-100">
                      {s.highlights.map((h, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-slate-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="leading-tight">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => setSelectedStageModal(s.id)}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Explore Syllabus</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleSignUpClick(s.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-extrabold hover:bg-purple-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Start in {s.title}</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Features Section */}
      <section id="features" className="py-16 md:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-indigo-700 bg-indigo-100 px-3.5 py-1 rounded-full inline-block mb-3">
              Why Berry Leads
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Engineered for Genuine Competence & Confidence
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-2">
              Every feature is built around the modern science of learning: diagnostic feedback, mastery pacing, active problem solving, and verifiable credentials.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: ShieldCheck,
                title: 'Competency Mastery Engine',
                desc: 'No arbitrary passing grades. Learners must demonstrate 80%+ genuine understanding on each lesson to advance, with misconceptions remediated on the spot.',
                color: 'text-purple-600 bg-purple-100',
              },
              {
                icon: Layers,
                title: 'Dual Curriculum Intelligence',
                desc: 'Seamlessly toggle between official Kenya CBC competencies and Universal Learning (Cambridge / US Common Core / IB) without losing progress.',
                color: 'text-blue-600 bg-blue-100',
              },
              {
                icon: Sparkles,
                title: 'Socratic Berry AI Tutor',
                desc: 'An AI mentor that coaches instead of giving away answers. Adapts its language from cheerful preschool audio guidance to senior mathematical proofs.',
                color: 'text-indigo-600 bg-indigo-100',
              },
              {
                icon: Award,
                title: 'Verified Digital Credentials',
                desc: 'Pass comprehensive chapter and final examinations to earn tamper-proof certificates with digital seals and QR verification codes for portfolios.',
                color: 'text-amber-600 bg-amber-100',
              },
              {
                icon: Mic,
                title: 'Live Lecture Audio Transcription',
                desc: 'Designed for university students and corporate seminars. Real-time speech-to-text, speaker notes, and AI-generated study flashcards.',
                color: 'text-emerald-600 bg-emerald-100',
              },
              {
                icon: Zap,
                title: 'Multi-Modal Interactive Practice',
                desc: 'Drag-and-drop matching, sequence ordering, interactive blanks, and tactile simulations that keep learners actively engaged rather than passively watching.',
                color: 'text-rose-600 bg-rose-100',
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. Who It's For Section */}
      <section className="py-16 md:py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3.5 py-1 rounded-full inline-block mb-3">
              Audience & Community
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Designed for Every Step of the Learning Journey
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-2">
              Discover how Berry serves distinct roles across homes, primary schools, secondary institutions, universities, and enterprise workplaces.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                tag: 'Early Childhood',
                title: 'Young Explorers & Parents',
                desc: 'Parents looking for screen time with meaningful educational value. Playful safari phonics, counting games, and safe, ad-free exploration.',
                icon: Smile,
              },
              {
                tag: 'Primary & JSS',
                title: 'CBC Junior Learners',
                desc: 'Students tackling Grades 1 through 9. Step-by-step math breakdowns, integrated science labs, and instant misconception diagnostics.',
                icon: BookOpen,
              },
              {
                tag: 'Senior High School',
                title: 'Senior Pathway Candidates',
                desc: 'Students focused on STEM, Social Sciences, or Arts & Sports pathways preparing for national examinations and competitive university admissions.',
                icon: GraduationCap,
              },
              {
                tag: 'Higher Education',
                title: 'University Undergraduates',
                desc: 'College students balancing demanding lecture schedules with automated live lecture transcription, study decks, and research synthesis.',
                icon: Briefcase,
              },
              {
                tag: 'Workforce',
                title: 'Working Professionals',
                desc: 'Engineers, managers, and analysts seeking career upskilling, cloud certifications, and verified credentials to share on LinkedIn.',
                icon: Award,
              },
              {
                tag: 'Institutions',
                title: 'Teachers & School Leaders',
                desc: 'Educators managing continuous CBC assessments with real-time class analytics, rubric grading, and automated student progress records.',
                icon: Globe2,
              },
            ].map((role, idx) => {
              const Icon = role.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                        {role.tag}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-base text-slate-900 mb-2">{role.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{role.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Testimonials Section */}
      <section className="py-16 md:py-24 bg-linear-to-b from-slate-50 via-purple-50/30 to-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-black uppercase tracking-widest text-purple-700 bg-purple-100 px-3.5 py-1 rounded-full inline-block mb-3">
              Real Experiences
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Trusted by Students, Parents & Professionals Across Kenya
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm md:text-base mt-2">
              Hear directly from learners excelling with Berry&apos;s competency-based curriculum.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="text-2xl mb-3">{t.avatar}</div>
                  <p className="text-xs sm:text-sm text-slate-700 italic leading-relaxed mb-6">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-xs text-slate-900">{t.author}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">{t.role}</p>
                    <p className="text-[10px] text-purple-700 font-semibold">{t.location}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {t.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. FAQ Accordion Section */}
      <section className="py-16 md:py-24 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500 bg-slate-100 px-3.5 py-1 rounded-full inline-block mb-3">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
              Got Questions? We Have Answers.
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    <span className="font-extrabold text-xs sm:text-sm text-slate-900">
                      {faq.q}
                    </span>
                    <span className="text-purple-600 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {isOpen && (
                    <div className="p-4 sm:p-5 pt-0 text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50/50 border-t border-slate-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Call To Action Banner */}
      <section className="py-16 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
            Ready to Experience Mastery Learning?
          </h2>
          <p className="text-purple-100 text-xs sm:text-sm md:text-base max-w-xl mx-auto">
            Choose your learning stage now and access your personalized CBC subjects, interactive quizzes, and verified credentials today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isLoggedIn ? (
              <button
                onClick={() => onStartLearning()}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-purple-900 font-black text-sm shadow-xl hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4 text-purple-700" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => handleSignUpClick()}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-white text-purple-900 font-black text-sm shadow-xl hover:bg-purple-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4 text-purple-700" />
                </button>
                <button
                  onClick={onLogin}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-purple-900/50 hover:bg-purple-900/80 text-white border border-purple-400/40 font-bold text-sm transition-all cursor-pointer"
                >
                  Sign In to Existing Account
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* 9. Comprehensive Footer */}
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Col 1: Brand & Mission */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                  🍇
                </div>
                <span className="font-black text-xl text-white tracking-tight">BERRY</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Empowering learners from kindergarten through career mastery. Full alignment with the Kenyan Competency-Based Curriculum (CBC) and global academic standards.
              </p>
              <div className="pt-2 flex items-center gap-3 text-slate-400">
                <span className="text-xs font-semibold text-slate-300">Socials:</span>
                <span className="text-xs hover:text-white cursor-pointer">X (Twitter)</span>
                <span>·</span>
                <span className="text-xs hover:text-white cursor-pointer">LinkedIn</span>
                <span>·</span>
                <span className="text-xs hover:text-white cursor-pointer">YouTube</span>
                <span>·</span>
                <span className="text-xs hover:text-white cursor-pointer">GitHub</span>
              </div>
            </div>

            {/* Col 2: Explore Stages */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Explore Stages</h4>
              <ul className="text-xs space-y-2 text-slate-400">
                <li>
                  <button
                    onClick={() => setSelectedStageModal('early')}
                    className="hover:text-purple-400 cursor-pointer"
                  >
                    Kindergarten (PP1–PP2)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSelectedStageModal('junior')}
                    className="hover:text-purple-400 cursor-pointer"
                  >
                    Junior (Grades 1–9)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSelectedStageModal('senior')}
                    className="hover:text-purple-400 cursor-pointer"
                  >
                    Senior (Grades 10–12)
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setSelectedStageModal('advance')}
                    className="hover:text-purple-400 cursor-pointer"
                  >
                    University & Professionals
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 3: Essential Navigation */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Navigation</h4>
              <ul className="text-xs space-y-2 text-slate-400">
                <li>
                  <button onClick={() => setAboutModalOpen(true)} className="hover:text-white cursor-pointer">
                    About Us
                  </button>
                </li>
                <li>
                  <a href="#features" className="hover:text-white">
                    Features
                  </a>
                </li>
                <li>
                  <button onClick={() => handleSignUpClick()} className="hover:text-white cursor-pointer">
                    Sign Up
                  </button>
                </li>
                <li>
                  <button onClick={onLogin} className="hover:text-white cursor-pointer">
                    Log In
                  </button>
                </li>
                <li>
                  <button onClick={() => setContactModalOpen(true)} className="hover:text-white cursor-pointer">
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>

            {/* Col 4: Legal & Standards */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Curriculum & Legal</h4>
              <ul className="text-xs space-y-2 text-slate-400">
                <li>Kenya CBC Framework</li>
                <li>Universal Standards (IB / Cambridge)</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Accessibility Standards (WCAG AA)</li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>© {new Date().getFullYear()} Berry Learning Ecosystem. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <span>Nairobi • Kisumu • Mombasa • Global</span>
              <span>·</span>
              <span className="text-emerald-400 font-bold">100% Verified System</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Stage Detail Interactive Modal */}
      {selectedStageModal && (
        <StageDetailModal
          stageId={selectedStageModal}
          isOpen={!!selectedStageModal}
          onClose={() => setSelectedStageModal(null)}
          onSelectStageForSignUp={(stg) => {
            setSelectedStageModal(null);
            handleSignUpClick(stg);
          }}
        />
      )}

      {/* Contact Us Interactive Modal */}
      {contactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="font-black text-base text-slate-900">Contact Berry Education Team</h3>
                <p className="text-xs text-slate-500">We respond to student, school & parent inquiries within 24 hours.</p>
              </div>
              <button
                onClick={() => setContactModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {contactSubmitted ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 mb-1">Message Sent Successfully!</h4>
                <p className="text-xs text-slate-600 mb-6">
                  Thank you, <strong className="text-slate-900">{contactName}</strong>! Our curriculum advisory team has received your inquiry and will reach out to <strong className="text-slate-900">{contactEmail}</strong> shortly.
                </p>
                <button
                  onClick={() => {
                    setContactSubmitted(false);
                    setContactModalOpen(false);
                    setContactMessage('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grace Achieng"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="grace@example.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Stage of Interest</label>
                  <select
                    value={contactStage}
                    onChange={(e) => setContactStage(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="early">Kindergarten (Berry Early • Ages 3-5)</option>
                    <option value="junior">Junior (Berry Junior • Grades 1-9)</option>
                    <option value="senior">Senior (Berry Senior • Grades 10-12)</option>
                    <option value="advance">University & Professionals (Berry Advance)</option>
                    <option value="institution">School / Institutional Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Message / Question</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tell us what you'd like to learn or how we can assist..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setContactModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 shadow-md shadow-purple-200 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Send Message</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* About Us Interactive Modal */}
      {aboutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                  🍇
                </div>
                <h3 className="font-black text-base text-slate-900">About Berry Ecosystem</h3>
              </div>
              <button
                onClick={() => setAboutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-600 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <p>
                <strong>Berry</strong> was founded with a single mission: to eliminate educational inequality by providing a unified, mastery-driven learning continuum that guides individuals from early childhood through professional achievement.
              </p>
              <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-purple-950 space-y-1">
                <div className="font-bold text-xs">Our Four Pillars of Mastery:</div>
                <ul className="text-xs list-disc pl-4 space-y-1 text-purple-900">
                  <li><strong>Kindergarten (Berry Early):</strong> Playful sensory phonics & early numeracy.</li>
                  <li><strong>Junior (Berry Junior):</strong> Kenyan CBC Grades 1-9 competency development.</li>
                  <li><strong>Senior (Berry Senior):</strong> Specialized STEM, Social Science, and Arts pathways.</li>
                  <li><strong>University & Professionals (Berry Advance):</strong> Real-time audio lecture transcription and enterprise certifications.</li>
                </ul>
              </div>
              <p>
                We believe in genuine mastery over memorization. Every student progresses at their own pace, with diagnostic assistance that uncovers misconceptions rather than penalizing mistakes.
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAboutModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
