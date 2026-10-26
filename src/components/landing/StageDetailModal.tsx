import React from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  BookOpen,
  GraduationCap,
  Briefcase,
  Smile,
  ShieldCheck,
  Mic,
  Award,
  Layers,
} from 'lucide-react';
import { LearnerStage } from '../../types';

interface StageModalInfo {
  title: string;
  brand: string;
  age: string;
  tagline: string;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  bannerGradient: string;
  description: string;
  kenyanCBCFocus: string[];
  universalFocus: string[];
  coreCompetencies: string[];
  sampleSubjects: string[];
  aiFeature: string;
}

interface StageDetailModalProps {
  stageId: LearnerStage;
  isOpen: boolean;
  onClose: () => void;
  onSelectStageForSignUp: (stage: LearnerStage) => void;
}

export const StageDetailModal: React.FC<StageDetailModalProps> = ({
  stageId,
  isOpen,
  onClose,
  onSelectStageForSignUp,
}) => {
  if (!isOpen) return null;

  const stageData: Record<string, StageModalInfo> = {
    early: {
      title: 'Kindergarten',
      brand: 'Berry Early',
      age: 'Ages 3 – 5 • Pre-Primary PP1 & PP2',
      tagline: 'Playful, Sensory, and Joyful Early Learning',
      badge: 'Early Years CBC Foundation',
      icon: Smile,
      bannerGradient: 'from-amber-400 via-orange-400 to-yellow-500',
      description:
        'Designed specifically for young minds. Berry Early transforms early childhood education into a magical safari of interactive phonics, counting games, animal sounds, and psychomotor activities aligned with the Kenyan CBC Early Years Framework.',
      kenyanCBCFocus: [
        'Pre-Primary 1 (PP1): Sensory exploration, numbers 1-10, primary colors, shapes, oral language & basic hygiene.',
        'Pre-Primary 2 (PP2): Phonics /a/ /b/ /c/, animal identification, simple addition with objects, environmental awareness.',
      ],
      universalFocus: [
        'Global Early Years Foundation Stage (EYFS) standards.',
        'Play-based learning with audio narration, gentle pacing, and colorful tactile animations.',
      ],
      coreCompetencies: [
        'Communication and early literacy through playful song & sound',
        'Numeracy readiness and spatial reasoning through sorting & pairing',
        'Creativity, imagination, and digital motor dexterity without cognitive overload',
      ],
      sampleSubjects: [
        'Language Activities (Phonics Safari & Storytime)',
        'Mathematical Activities (Counting & Animal Sorting)',
        'Environmental Activities (Plants, Animals & Weather)',
        'Psychomotor & Creative Activities (Music & Colors)',
      ],
      aiFeature: 'Playful Voice Tutor that cheers on every success with animal animations and gentle hints.',
    },
    junior: {
      title: 'Junior',
      brand: 'Berry Junior',
      age: 'Grades 1 to 9 • Primary & Junior Secondary',
      tagline: 'Competency-Based Mastery & Socratic Problem Solving',
      badge: 'Kenyan CBC Grades 1–9',
      icon: BookOpen,
      bannerGradient: 'from-blue-600 via-indigo-600 to-cyan-600',
      description:
        'Berry Junior guides learners through the core transformation of primary and junior secondary education. With interactive step-by-step math breakdowns, scientific simulations, integrated CBC projects, and instant remedial support.',
      kenyanCBCFocus: [
        'Lower Primary (Grades 1-3): Foundational literacy, numeracy, hygiene, indigenous languages, and creative arts.',
        'Upper Primary (Grades 4-6): Science & technology, agriculture, social studies, and home science.',
        'Junior Secondary (Grades 7-9): Integrated science, pre-technical studies, computer studies, mathematics, and life skills.',
      ],
      universalFocus: [
        'Cambridge Lower Secondary & Checkpoint benchmarks.',
        'US Common Core Mathematics & Next Generation Science Standards (NGSS).',
      ],
      coreCompetencies: [
        'Critical thinking and problem solving with diagnostic misconception tracking',
        'Digital literacy and collaborative team inquiry projects',
        'Mastery scoring (80%+ threshold) ensuring no knowledge gaps are left behind',
      ],
      sampleSubjects: [
        'Mathematics & Spatial Geometry',
        'Integrated Science & Lab Simulations',
        'Pre-Technical & Computer Studies',
        'Social Studies & Citizenship',
      ],
      aiFeature: 'Socratic Berry AI that explains "why" a distractor is incorrect rather than just giving the answer.',
    },
    senior: {
      title: 'Senior',
      brand: 'Berry Senior',
      age: 'Grades 10 to 12 • Senior Secondary Pathways',
      tagline: 'Pathways Specialization, Deep Science & Career Readiness',
      badge: 'Senior CBC Pathways + Exam Prep',
      icon: GraduationCap,
      bannerGradient: 'from-indigo-700 via-purple-700 to-violet-800',
      description:
        'Berry Senior equips students for university admission and specialized career pursuits across the three major CBC pathways: STEM, Social Sciences, and Arts & Sports Science, alongside rigorous KCSE and international curriculum preparation.',
      kenyanCBCFocus: [
        'STEM Pathway: Pure Mathematics, Advanced Physics, Chemistry, Biology, and Computer Science.',
        'Social Sciences Pathway: Economics, Geography, History & Citizenship, Business Studies, and Literature.',
        'Arts & Sports Science Pathway: Fine Art, Music Theory, Performing Arts, Sports Physiology & Physical Training.',
      ],
      universalFocus: [
        'International Baccalaureate (IB) Diploma & Cambridge A-Levels alignment.',
        'Advanced Placement (AP) calculus, statistics, and physics modules.',
      ],
      coreCompetencies: [
        'Independent scientific inquiry, data visualization, and rigorous mathematical proofs',
        'Exam readiness with timed competency simulations and automated marking rubrics',
        'Official CBC verified credentials with cryptographic certificate seals',
      ],
      sampleSubjects: [
        'Advanced Mathematics & Calculus',
        'Organic Chemistry & Molecular Biology',
        'Economics, Macro-policy & Business Case Studies',
        'Computer Science, Python & Algorithmic Problem Solving',
      ],
      aiFeature: 'AI Research Assistant capable of generating revision notes, exam breakdowns, and step-by-step formula derivations.',
    },
    advance: {
      title: 'University & Professionals',
      brand: 'Berry Advance',
      age: 'Undergraduate, Postgraduate & Enterprise Upskilling',
      tagline: 'Higher Education Degree Acceleration & Professional Excellence',
      badge: 'Degree Mastery & Enterprise Certs',
      icon: Briefcase,
      bannerGradient: 'from-emerald-700 via-teal-700 to-cyan-800',
      description:
        'Berry Advance unites university undergraduates, graduate researchers, and working professionals under one powerful platform. Features live audio lecture transcription, AI document synthesis, and industry-standard certifications.',
      kenyanCBCFocus: [
        'Higher Education Degree Track: Core university majors, thesis assistance, lecture capture with timestamps, and automated revision decks.',
        'Enterprise Upskilling Track: Software engineering, cloud architecture, data science, agile product management, and corporate leadership.',
      ],
      universalFocus: [
        'Global university credit recognition and industry certifications (AWS, Google Cloud, PMP, CFA alignment).',
        'Publishable scientific research workflows and executive communication modules.',
      ],
      coreCompetencies: [
        'Real-time lecture audio capture, speech-to-text, and automatic executive summaries',
        'Deep analytical synthesis across multi-page research documents and datasets',
        'Verified digital credentials with verifiable verification codes for LinkedIn and resume sharing',
      ],
      sampleSubjects: [
        'Distributed Systems & Cloud Architecture',
        'Advanced Machine Learning & Applied AI',
        'Corporate Finance & Quantitative Strategy',
        'Biomedical Innovation & Clinical Data Analysis',
      ],
      aiFeature: 'Live Voice & Lecture Transcription with real-time speaker notes, key takeaways, and flashcard generation.',
    },
  };

  const current = stageData[stageId] || stageData.junior;
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header Banner */}
        <div className={`p-6 md:p-8 bg-linear-to-r ${current.bannerGradient} text-white relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close stage details"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full backdrop-blur-xs">
              {current.badge}
            </span>
            <span className="text-xs text-white/80 font-medium">· {current.age}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <Icon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl md:text-3xl font-black tracking-tight">{current.title}</h2>
              <p className="text-white/90 text-xs md:text-sm font-semibold">{current.tagline}</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[68vh] overflow-y-auto">
          {/* Overview */}
          <p className="text-slate-700 text-sm leading-relaxed">{current.description}</p>

          {/* Curriculum Focus Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs uppercase tracking-wider">
                <Layers className="w-4 h-4 text-purple-700" />
                <span>Kenyan CBC Curriculum Alignment</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                {current.kenyanCBCFocus.map((item, idx) => (
                  <li key={idx} className="leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Universal Learning Track</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4">
                {current.universalFocus.map((item, idx) => (
                  <li key={idx} className="leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Core Competencies */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5">
              Core Competencies Mastered
            </h3>
            <div className="space-y-2">
              {current.coreCompetencies.map((comp, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{comp}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sample Subjects */}
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2.5">
              Sample Subjects & Modules
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {current.sampleSubjects.map((sub, idx) => (
                <div
                  key={idx}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-100/80 border border-slate-200/60 text-xs font-bold text-slate-800 flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                  <span>{sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Tutor Feature for this stage */}
          <div className="p-4 rounded-2xl bg-linear-to-r from-purple-100/60 to-indigo-100/60 border border-purple-200 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-purple-950 mb-0.5">
                Tailored Berry AI Intelligence
              </h4>
              <p className="text-xs text-purple-900 leading-snug">{current.aiFeature}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onSelectStageForSignUp(stageId);
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 text-white text-xs font-extrabold shadow-md shadow-purple-200 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Get Started in {current.title}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
