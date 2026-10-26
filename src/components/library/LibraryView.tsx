import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Filter,
  Download,
  Bookmark,
  Share2,
  FileText,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Eye,
  Check,
  X,
  FileCheck2,
} from 'lucide-react';
import { LibraryResource, LearnerProfile, LearnerStage, Curriculum } from '../../types';

interface LibraryViewProps {
  resources: LibraryResource[];
  learner: LearnerProfile;
  onToggleBookmark: (resourceId: string) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  resources,
  learner,
  onToggleBookmark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>(learner.stage);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [activePreviewResource, setActivePreviewResource] = useState<LibraryResource | null>(null);
  const [citationCopied, setCitationCopied] = useState(false);

  // Filtered resources
  const filtered = resources.filter((r) => {
    if (selectedStage !== 'all' && r.stage !== selectedStage) return false;
    if (selectedType !== 'all' && r.type !== selectedType) return false;
    if (
      searchQuery &&
      !r.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.author.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.subject.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !r.description.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleCopyCitation = (resource: LibraryResource) => {
    const citation = `${resource.author} (${resource.year}). ${resource.title}. ${resource.publisher}. Berry Educational Digital Library.`;
    navigator.clipboard?.writeText(citation);
    setCitationCopied(true);
    setTimeout(() => setCitationCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <BookOpen size={14} />
            <span>Digital Repository & Verified Textbooks</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Berry Digital Library
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Access authorized curriculum textbooks, KICD pupil guides, academic monographs, past papers, and research documents.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200">
            {filtered.length} Resources Available
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        {/* Stage Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wider">
            Stage:
          </span>
          {[
            { id: 'all', label: 'All Stages' },
            { id: 'junior', label: 'Berry Junior (PP1-G9)' },
            { id: 'senior', label: 'Berry Senior (G10-G12)' },
            { id: 'university', label: 'Berry University' },
            { id: 'professionals', label: 'Berry Professionals' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStage(st.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedStage === st.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Search & Resource Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, author, KICD guide, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-400 flex-shrink-0" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              <option value="all">All Document Types</option>
              <option value="cbc_guide">Official CBC Curriculum Guides</option>
              <option value="textbook">Textbooks & Workbooks</option>
              <option value="past_paper">Past Examination Papers</option>
              <option value="research_paper">Academic & White Papers</option>
              <option value="reference">Comprehensive Reference</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resource Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((resource) => (
          <div
            key={resource.id}
            className="bg-white rounded-3xl border border-slate-200/80 hover:border-purple-300 hover:shadow-lg transition-all p-5 flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  {resource.gradeLevel} • {resource.subject}
                </span>

                <button
                  onClick={() => onToggleBookmark(resource.id)}
                  aria-label={resource.isSaved ? 'Remove bookmark' : 'Bookmark resource'}
                  className="p-1 text-slate-400 hover:text-purple-600 transition-colors"
                >
                  <Bookmark
                    size={16}
                    className={resource.isSaved ? 'fill-purple-600 text-purple-600' : ''}
                  />
                </button>
              </div>

              {resource.verifiedOfficialCBC && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit">
                  <ShieldCheck size={13} />
                  <span>KICD Verified Material</span>
                </div>
              )}

              <h4 className="font-extrabold text-slate-900 text-sm leading-snug group-hover:text-purple-700 transition-colors line-clamp-2">
                {resource.title}
              </h4>

              <p className="text-xs text-slate-500 line-clamp-1">
                By {resource.author} • {resource.publisher} ({resource.year})
              </p>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {resource.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>{resource.pages} pages</span>
                <span>~{resource.readTimeMinutes} mins read</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActivePreviewResource(resource)}
                  className="flex-1 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-all flex items-center justify-center gap-1.5"
                >
                  <Eye size={13} />
                  <span>Preview & Read</span>
                </button>

                {resource.downloadPermitted && (
                  <button
                    onClick={() => alert(`Starting authorized download for: ${resource.title}`)}
                    aria-label="Download resource"
                    className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                    title="Download PDF"
                  >
                    <Download size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reader / Document Preview Modal */}
      {activePreviewResource && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  {activePreviewResource.subject} • {activePreviewResource.gradeLevel}
                </span>
                <h3 className="font-bold text-slate-900 text-base line-clamp-1">
                  {activePreviewResource.title}
                </h3>
              </div>

              <button
                onClick={() => setActivePreviewResource(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
                aria-label="Close reader preview"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Reader View */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs md:text-sm">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200">
                <h4 className="font-bold text-purple-950 mb-1">Bibliographic Metadata & Access</h4>
                <p className="text-xs text-purple-800">
                  Author: {activePreviewResource.author} • Publisher: {activePreviewResource.publisher} • Pages: {activePreviewResource.pages}
                </p>
                <p className="text-[11px] text-purple-700 mt-1">
                  License: {activePreviewResource.accessType === 'full_open_access' ? 'Open Educational Resource (OER)' : 'Institutional Protected Access'}
                </p>
              </div>

              {/* Table of Contents */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Table of Contents</h4>
                <ul className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {activePreviewResource.tableOfContents.map((toc, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                      <span>{toc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Sample Excerpt */}
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-2">Excerpt Preview</h4>
                <div className="p-4 rounded-xl border border-slate-200 bg-white leading-relaxed text-slate-700 text-xs font-serif italic">
                  "{activePreviewResource.sampleContent}"
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                onClick={() => handleCopyCitation(activePreviewResource)}
                className="text-xs font-semibold text-slate-600 hover:text-purple-700 flex items-center gap-1.5"
              >
                {citationCopied ? <Check size={14} className="text-emerald-600" /> : <FileCheck2 size={14} />}
                <span>{citationCopied ? 'Citation Copied!' : 'Copy Citation (APA/MLA)'}</span>
              </button>

              <button
                onClick={() => setActivePreviewResource(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all"
              >
                Done Reading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
