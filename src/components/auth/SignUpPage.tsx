import React, { useState } from 'react';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  User,
  Building2,
  Globe2,
  Eye,
  EyeOff,
  Compass,
  GraduationCap,
  Briefcase,
  Smile,
  ShieldCheck,
  Award,
  BookOpen,
} from 'lucide-react';
import { LearnerStage, LearnerProfile, Curriculum, SeniorPathway, AdvanceTrack } from '../../types';
import { getFirebaseAuthErrorMessage } from '../../services/firebaseAuth';

interface SignUpPageProps {
  onRegister: (email: string, password: string, profile: Partial<LearnerProfile>) => Promise<void>;
  onCompleteSignUp: (profile: Partial<LearnerProfile>) => void;
  onGoToLogin: () => void;
  onNavigateBack: () => void;
  initialStage?: LearnerStage;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({
  onRegister,
  onCompleteSignUp,
  onGoToLogin,
  onNavigateBack,
  initialStage = 'junior',
}) => {
  // Stage selection: Kindergarten, Junior, Senior, University and Professionals
  const [stage, setStage] = useState<LearnerStage>(initialStage);

  // Curriculum choice: Kenyan CBC vs Universal Learning
  const [curriculumType, setCurriculumType] = useState<'kenya_cbc' | 'universal'>('kenya_cbc');
  const [globalCurriculum, setGlobalCurriculum] = useState<Exclude<Curriculum, 'kenya_cbc'>>('cambridge');

  // Form states
  const [fullName, setFullName] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [institution, setInstitution] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Stage-specific dynamic fields
  const [gradeLevel, setGradeLevel] = useState('Grade 1');
  const [seniorPathway, setSeniorPathway] = useState<SeniorPathway>('stem');
  const [advanceTrack, setAdvanceTrack] = useState<AdvanceTrack>('university');
  const [advanceDegreeYear, setAdvanceDegreeYear] = useState('Bachelor Year 2');
  const [advanceProfField, setAdvanceProfField] = useState('Software Engineering & AI');

  // UI state: Registration success screen
  const [registeredProfile, setRegisteredProfile] = useState<Partial<LearnerProfile> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update defaults when stage changes
  const handleStageSelect = (newStage: LearnerStage) => {
    setStage(newStage);
    setErrorMessage(null);
    if (newStage === 'early') {
      setGradeLevel('PP1');
    } else if (newStage === 'junior') {
      setGradeLevel('Grade 1');
    } else if (newStage === 'senior') {
      setGradeLevel('Grade 10');
      setSeniorPathway('stem');
    } else if (newStage === 'advance' || newStage === 'university' || newStage === 'professionals') {
      setGradeLevel(advanceTrack === 'university' ? advanceDegreeYear : 'Professional');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!emailOrUsername.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!country.trim()) {
      setErrorMessage('Please specify your country.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }
    if (!agreedTerms) {
      setErrorMessage('Please agree to Berry\'s Terms of Service and Privacy Policy to create an account.');
      return;
    }

    // Determine final curriculum value
    let resolvedCurriculum: Curriculum = 'kenya_cbc';
    if (curriculumType === 'universal') {
      resolvedCurriculum = globalCurriculum;
    }

    // Determine effective grade level
    let effectiveGrade = gradeLevel;
    if (stage === 'early') {
      effectiveGrade = curriculumType === 'kenya_cbc' ? gradeLevel : 'Early Years Foundation';
    } else if (stage === 'advance' || stage === 'university' || stage === 'professionals') {
      effectiveGrade = advanceTrack === 'university' ? advanceDegreeYear : advanceProfField;
    }

    const newProfile: Partial<LearnerProfile> = {
      name: fullName.trim(),
      stage: stage,
      country: country.trim(),
      curriculum: resolvedCurriculum,
      gradeLevel: effectiveGrade,
      seniorPathway: stage === 'senior' ? seniorPathway : undefined,
      advanceTrack:
        stage === 'advance' || stage === 'university' || stage === 'professionals'
          ? advanceTrack
          : undefined,
      institutionOrCompany: institution.trim() || undefined,
    };

    setIsSubmitting(true);
    
    try {
      await onRegister(emailOrUsername.trim(), password, newProfile);
      onCompleteSignUp(newProfile);
    } catch (error) {
      setErrorMessage(getFirebaseAuthErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stage display info
  const stageDefinitions = [
    {
      id: 'early' as LearnerStage,
      title: 'Kindergarten',
      sub: 'Berry Early • Ages 3–5',
      desc: 'Playful, kid-friendly learning with phonics, counting, shapes, and interactive games.',
      icon: Smile,
      color: 'border-amber-400 bg-amber-50/50 text-amber-900',
      activeColor: 'border-amber-500 bg-amber-50 ring-2 ring-amber-400',
      badge: 'PP1 & PP2 Ready',
    },
    {
      id: 'junior' as LearnerStage,
      title: 'Junior',
      sub: 'Berry Junior • Grades 1–9',
      desc: 'Primary & Junior Secondary competency curriculum with interactive lessons & mastery quizzes.',
      icon: BookOpen,
      color: 'border-blue-300 bg-blue-50/50 text-blue-900',
      activeColor: 'border-blue-600 bg-blue-50 ring-2 ring-blue-500',
      badge: 'CBC Grades 1–9',
    },
    {
      id: 'senior' as LearnerStage,
      title: 'Senior',
      sub: 'Berry Senior • Grades 10–12',
      desc: 'Senior Secondary pathways: STEM, Social Sciences, and Arts & Sports with KCSE/CBC exam prep.',
      icon: GraduationCap,
      color: 'border-indigo-300 bg-indigo-50/50 text-indigo-900',
      activeColor: 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-500',
      badge: 'STEM / Arts / Social',
    },
    {
      id: 'advance' as LearnerStage,
      title: 'University & Professionals',
      sub: 'Berry Advance • Higher Ed & Career',
      desc: 'Degree mastery, live lecture transcription, AI research synthesis, and executive upskilling.',
      icon: Briefcase,
      color: 'border-emerald-300 bg-emerald-50/50 text-emerald-900',
      activeColor: 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500',
      badge: 'Degree & Professional',
    },
  ];

  // If user completed registration, show the celebratory Welcome screen
  if (registeredProfile) {
    const stageTitle =
      registeredProfile.stage === 'early'
        ? 'Kindergarten (Berry Early)'
        : registeredProfile.stage === 'junior'
        ? 'Junior (Berry Junior)'
        : registeredProfile.stage === 'senior'
        ? 'Senior (Berry Senior)'
        : 'University & Professionals (Berry Advance)';

    return (
      <div className="min-h-screen bg-linear-to-b from-purple-50 via-white to-slate-50 flex flex-col justify-center items-center p-4 md:p-8">
        <div className="max-w-xl w-full bg-white rounded-3xl shadow-2xl border border-purple-100 p-8 md:p-10 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-linear-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-200 mb-6">
            <Sparkles className="w-10 h-10 animate-bounce" />
          </div>

          <span className="text-xs font-bold tracking-widest text-purple-700 uppercase bg-purple-100 px-3.5 py-1 rounded-full inline-block mb-3">
            Account Created
          </span>

          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-3">
            Welcome to Berry!
          </h1>

          <p className="text-slate-600 text-sm md:text-base leading-relaxed mb-6">
            Hello, <strong className="text-purple-700 font-bold">{registeredProfile.name}</strong>! Your Berry account is ready. You can continue to your learning space now.
          </p>

          {/* Profile Overview Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 mb-8 text-left space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider">Account Summary</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Ready
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Stage</span>
                <span className="font-bold text-slate-900">{stageTitle}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Curriculum</span>
                <span className="font-bold text-purple-700">
                  {curriculumType === 'kenya_cbc' ? 'Kenyan CBC Standard' : 'Universal Learning'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Level / Track</span>
                <span className="font-bold text-slate-900">{registeredProfile.gradeLevel}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Location</span>
                <span className="font-bold text-slate-900">{registeredProfile.country}</span>
              </div>
              {registeredProfile.seniorPathway && (
                <div className="col-span-2">
                  <span className="text-slate-500 block">Senior Pathway</span>
                  <span className="font-bold text-indigo-700 uppercase">
                    {registeredProfile.seniorPathway.replace('_', ' ')} Pathway
                  </span>
                </div>
              )}
              {registeredProfile.institutionOrCompany && (
                <div className="col-span-2">
                  <span className="text-slate-500 block">Institution / Organization</span>
                  <span className="font-medium text-slate-800">{registeredProfile.institutionOrCompany}</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => onCompleteSignUp(registeredProfile)}
              className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-extrabold text-base shadow-xl shadow-purple-300 hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Continue to Dashboard</span>
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              onClick={onNavigateBack}
              className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              Return to Landing Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header Bar with Back Arrow */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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
            Have an account?{' '}
            <button
              onClick={onGoToLogin}
              className="font-bold text-purple-700 hover:text-purple-800 hover:underline cursor-pointer"
            >
              Log In
            </button>
          </div>
        </div>
      </header>

      {/* Main Sign-Up Form Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 md:py-12">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 md:p-10">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized Learning Ecosystem</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-2">
              Create Your Berry Account
            </h1>
            <p className="text-slate-600 text-xs md:text-sm">
              Empowering learners from early childhood through professional excellence with Kenyan CBC and global curriculum standards.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span>⚠️ {errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 1. Stage Selection Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
                  Step 1: Choose Your Learning Stage <span className="text-rose-500">*</span>
                </label>
                <span className="text-xs text-slate-500">Tailors tools, subjects & experience</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {stageDefinitions.map((s) => {
                  const Icon = s.icon;
                  const isSelected = stage === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleStageSelect(s.id)}
                      className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected ? s.activeColor : `${s.color} hover:border-slate-300`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-white shadow-xs border border-slate-200/80 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-purple-700" />
                          </div>
                          <div>
                            <h2 className="font-extrabold text-sm text-slate-900">{s.title}</h2>
                            <p className="text-xs text-slate-500 font-medium">{s.sub}</p>
                          </div>
                        </div>
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-600 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                            {s.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{s.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Curriculum Choice & Dynamic Options */}
            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200">
              <div className="mb-4">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1">
                  Step 2: Curriculum Framework <span className="text-rose-500">*</span>
                </label>
                <p className="text-xs text-slate-500">
                  Select your core learning framework. Subject syllabi and competency rubrics will automatically adapt.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                <button
                  type="button"
                  onClick={() => setCurriculumType('kenya_cbc')}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    curriculumType === 'kenya_cbc'
                      ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-500 text-purple-950'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">Kenyan CBC (Competency-Based)</span>
                    {curriculumType === 'kenya_cbc' && (
                      <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    Official Kenya Ministry of Education competencies, strands, sub-strands, and continuous assessments.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCurriculumType('universal')}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    curriculumType === 'universal'
                      ? 'border-purple-600 bg-purple-50 ring-1 ring-purple-500 text-purple-950'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs">Universal Learning Framework</span>
                    {curriculumType === 'universal' && (
                      <span className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    International Cambridge, US Common Core, and IB Diploma mastery benchmarks with global transferable skills.
                  </p>
                </button>
              </div>

              {curriculumType === 'universal' && (
                <div className="mb-5 rounded-xl border border-purple-100 bg-purple-50/60 p-4">
                  <label htmlFor="global-curriculum" className="block text-xs font-bold text-slate-700 mb-2">
                    Choose your Global Classroom curriculum
                  </label>
                  <select
                    id="global-curriculum"
                    value={globalCurriculum}
                    onChange={(event) => setGlobalCurriculum(event.target.value as Exclude<Curriculum, 'kenya_cbc'>)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="cambridge">Cambridge International</option>
                    <option value="uk_national">England National Curriculum</option>
                    <option value="us_common_core">US Common Core</option>
                    <option value="ib">International Baccalaureate (IB)</option>
                  </select>
                  <p className="mt-2 text-[11px] text-slate-500">Your choice sets the curriculum filter for your learning profile. Course availability depends on the current catalogue.</p>
                </div>
              )}

              {/* Dynamic Curriculum Options by Stage */}
              <div className="pt-4 border-t border-slate-200">
                {/* Kindergarten dynamic options */}
                {stage === 'early' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Kindergarten Level / Pre-Primary Grade:
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'PP1', title: 'PP1 (Pre-Primary 1)', desc: 'Age 4 • Sensory play, counting 1-10, basic phonics' },
                        { id: 'PP2', title: 'PP2 (Pre-Primary 2)', desc: 'Age 5 • Reading readiness, animal sounds, writing' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGradeLevel(item.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer text-xs ${
                            gradeLevel === item.id
                              ? 'border-amber-500 bg-amber-50 font-bold text-amber-900 ring-1 ring-amber-400'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold">{item.title}</div>
                          <div className="text-[11px] text-slate-500 font-normal">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Junior dynamic options */}
                {stage === 'junior' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">
                      Select Junior Grade (Grades 1 to 9):
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                      {[
                        'Grade 1',
                        'Grade 2',
                        'Grade 3',
                        'Grade 4',
                        'Grade 5',
                        'Grade 6',
                        'Grade 7',
                        'Grade 8',
                        'Grade 9',
                      ].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGradeLevel(g)}
                          className={`py-2 px-1 text-center rounded-xl border text-xs font-bold cursor-pointer ${
                            gradeLevel === g
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          {g.replace('Grade ', 'G')}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      {gradeLevel.startsWith('Grade 1') || gradeLevel.startsWith('Grade 2') || gradeLevel.startsWith('Grade 3')
                        ? 'Lower Primary: Foundational literacy, numeracy, and environmental activities.'
                        : gradeLevel.startsWith('Grade 7') || gradeLevel.startsWith('Grade 8') || gradeLevel.startsWith('Grade 9')
                        ? 'Junior Secondary: Integrated science, pre-technical studies, mathematics, and social studies.'
                        : 'Upper Primary: Science & technology, mathematics, creative arts, and languages.'}
                    </p>
                  </div>
                )}

                {/* Senior dynamic options */}
                {stage === 'senior' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        Senior Grade Level (Grades 10–12):
                      </label>
                      <div className="flex gap-3">
                        {['Grade 10', 'Grade 11', 'Grade 12'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGradeLevel(g)}
                            className={`flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer ${
                              gradeLevel === g
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        Kenyan CBC Senior Pathway:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {[
                          {
                            id: 'stem' as SeniorPathway,
                            title: 'STEM Pathway',
                            desc: 'Pure Sciences, Applied Sciences, Mathematics & ICT.',
                          },
                          {
                            id: 'social_sciences' as SeniorPathway,
                            title: 'Social Sciences',
                            desc: 'Humanities, Business, Economics, Languages & Literature.',
                          },
                          {
                            id: 'arts_sports' as SeniorPathway,
                            title: 'Arts & Sports Science',
                            desc: 'Visual Arts, Performing Arts, Music & Physical Education.',
                          },
                        ].map((pathway) => (
                          <button
                            key={pathway.id}
                            type="button"
                            onClick={() => setSeniorPathway(pathway.id)}
                            className={`p-3 rounded-xl border text-left cursor-pointer text-xs ${
                              seniorPathway === pathway.id
                                ? 'border-indigo-600 bg-indigo-50 font-bold text-indigo-950 ring-1 ring-indigo-500'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="font-bold">{pathway.title}</div>
                            <div className="text-[11px] text-slate-500 font-normal">{pathway.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* University and Professionals dynamic options */}
                {(stage === 'advance' || stage === 'university' || stage === 'professionals') && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        Learner Category:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setAdvanceTrack('university')}
                          className={`p-3 rounded-xl border text-left cursor-pointer text-xs ${
                            advanceTrack === 'university'
                              ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950 ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5">
                            <GraduationCap className="w-4 h-4 text-emerald-700" />
                            <span>University Learner</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-1">
                            Undergraduate or Postgraduate degree with AI lecture transcription & paper analysis.
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setAdvanceTrack('professional')}
                          className={`p-3 rounded-xl border text-left cursor-pointer text-xs ${
                            advanceTrack === 'professional'
                              ? 'border-emerald-600 bg-emerald-50 font-bold text-emerald-950 ring-1 ring-emerald-500'
                              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="font-bold flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4 text-emerald-700" />
                            <span>Working Professional</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-normal mt-1">
                            Upskilling, executive credentials, AI workflows, and enterprise certifications.
                          </div>
                        </button>
                      </div>
                    </div>

                    {advanceTrack === 'university' ? (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Current Degree Year:
                        </label>
                        <select
                          value={advanceDegreeYear}
                          onChange={(e) => setAdvanceDegreeYear(e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="Certificate Programme">Certificate Programme</option>
                          <option value="Diploma Programme">Diploma Programme</option>
                          <option value="Higher Diploma Programme">Higher Diploma Programme</option>
                          <option value="Postgraduate Diploma">Postgraduate Diploma</option>
                          <option value="Bachelor Year 1">Bachelor Year 1 (Freshman)</option>
                          <option value="Bachelor Year 2">Bachelor Year 2 (Sophomore)</option>
                          <option value="Bachelor Year 3">Bachelor Year 3 (Junior)</option>
                          <option value="Bachelor Year 4">Bachelor Year 4 (Senior / Final Year)</option>
                          <option value="Master of Science / MA">Masters Degree Student</option>
                          <option value="Postgraduate Diploma">Postgraduate Diploma Student</option>
                          <option value="Doctoral Researcher">Doctoral / Ph.D. Researcher</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Primary Professional Specialization:
                        </label>
                        <select
                          value={advanceProfField}
                          onChange={(e) => setAdvanceProfField(e.target.value)}
                          className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="Software Engineering & AI">Software Engineering & AI</option>
                          <option value="Data Science & Machine Learning">Data Science & Analytics</option>
                          <option value="Business Administration & Management">Business Leadership & Management</option>
                          <option value="Financial Technology & Economics">FinTech & Banking</option>
                          <option value="Digital Health & Medicine">Digital Health & Life Sciences</option>
                          <option value="Education Technology & Instructional Design">EdTech & Curriculum Design</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 3. Account Information & Credentials */}
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-4">
                Step 3: Learner Details & Security Credentials <span className="text-rose-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Zawadi Mutua"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Email / Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="learner@example.com"
                      value={emailOrUsername}
                      onChange={(e) => setEmailOrUsername(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Country */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Globe2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="Kenya">Kenya (CBC Primary Host)</option>
                      <option value="Uganda">Uganda</option>
                      <option value="Tanzania">Tanzania</option>
                      <option value="Rwanda">Rwanda</option>
                      <option value="Nigeria">Nigeria</option>
                      <option value="South Africa">South Africa</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="Other">Other Global Location</option>
                    </select>
                  </div>
                </div>

                {/* School or Institution / Company */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    School / University / Company
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder={
                        stage === 'advance'
                          ? 'e.g. University of Nairobi / Safaricom'
                          : stage === 'early'
                          ? 'e.g. Sunshine Kindergarten Nairobi'
                          : 'e.g. Alliance High School / Nairobi Primary'
                      }
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 6 characters"
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
                  {password && password.length < 6 && (
                    <p className="text-[10px] text-amber-600 mt-1">Must be at least 6 characters</p>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-rose-600 mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedTerms}
                  onChange={(e) => setAgreedTerms(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs text-slate-600 leading-snug">
                  I agree to Berry&apos;s{' '}
                  <span className="text-purple-700 font-semibold underline">Terms of Service</span> and{' '}
                  <span className="text-purple-700 font-semibold underline">Privacy Policy</span>, and consent to receiving mastery updates and learning reminders.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-extrabold text-sm md:text-base shadow-xl shadow-purple-300 hover:shadow-2xl hover:scale-[1.005] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span>{isSubmitting ? 'Creating Account…' : 'Create Account'}</span>
                {!isSubmitting && <Sparkles className="w-4 h-4" />}
              </button>
            </div>

            {/* Bottom link to login */}
            <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onGoToLogin}
                className="font-extrabold text-purple-700 hover:text-purple-800 hover:underline cursor-pointer"
              >
                Log In Here
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
