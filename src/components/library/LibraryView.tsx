import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  BookOpen,
  Filter,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { LibraryCurriculumGroup, LibraryMaterialType, LibraryResource, LearnerProfile, LearnerStage } from '../../types';

interface LibraryViewProps {
  resources: LibraryResource[];
  learner: LearnerProfile;
  onToggleBookmark: (resourceId: string, resource?: LibraryResource) => void;
}

type StageFilter = 'all' | 'early' | 'junior' | 'senior' | 'university' | 'advanced';
type CurriculumFilter = 'all' | LibraryCurriculumGroup;
type MaterialFilter = 'all' | LibraryMaterialType;

const stageOptions: { id: StageFilter; label: string; emoji: string }[] = [
  { id: 'all', label: 'Every level', emoji: '🌍' },
  { id: 'early', label: 'Berry Early', emoji: '🌱' },
  { id: 'junior', label: 'Berry Junior', emoji: '🧭' },
  { id: 'senior', label: 'Berry Senior', emoji: '🚀' },
  { id: 'university', label: 'University', emoji: '🎓' },
  { id: 'advanced', label: 'Advanced', emoji: '✨' },
];

const curriculumOptions: { id: CurriculumFilter; label: string }[] = [
  { id: 'all', label: 'All curriculum connections' },
  { id: 'kenya_cbc', label: 'Kenya CBC / CBE' },
  { id: 'african_curricula', label: 'African curricula' },
  { id: 'international', label: 'International' },
  { id: 'multi_curriculum', label: 'Multi-curriculum' },
];

const materialOptions: { id: MaterialFilter; label: string }[] = [
  { id: 'all', label: 'Every resource type' },
  { id: 'curriculum_guides', label: 'Curriculum guides' },
  { id: 'textbooks', label: 'Textbooks' },
  { id: 'stories', label: 'Storybooks & reading' },
  { id: 'exam_samples', label: 'Exam samples & practice' },
  { id: 'course_materials', label: 'Course materials' },
  { id: 'open_catalog', label: 'Resource catalogs' },
];

const levelLabels: Record<LearnerStage, string> = {
  early: 'Early years',
  junior: 'Junior school',
  senior: 'Senior school',
  university: 'University',
  advance: 'University',
  professionals: 'Professional learning',
};

const typeLabels: Record<LibraryMaterialType, string> = {
  curriculum_guides: 'Curriculum guides',
  textbooks: 'Textbooks',
  stories: 'Stories',
  exam_samples: 'Exam samples',
  course_materials: 'Course materials',
  open_catalog: 'Open catalog',
};

const selectedStageFor = (stage: LearnerStage): StageFilter => {
  if (stage === 'advance' || stage === 'professionals') return 'advanced';
  return stage;
};

const matchesStage = (resource: LibraryResource, selectedStage: StageFilter) => {
  if (selectedStage === 'all') return true;
  if (resource.levels.length === 0) return true;
  if (selectedStage === 'advanced') {
    return resource.levels.includes('advance') || resource.levels.includes('professionals');
  }
  return resource.levels.includes(selectedStage);
};

const ResourceCover: React.FC<{ resource: LibraryResource }> = ({ resource }) => {
  const [failed, setFailed] = useState(false);
  if (resource.coverImageUrl && !failed) {
    return <img src={resource.coverImageUrl} alt={`Cover of ${resource.title}`} loading="lazy" onError={() => setFailed(true)} className="h-20 w-14 shrink-0 rounded-lg object-cover shadow-sm" />;
  }
  return (
    <div aria-hidden="true" className="grid h-20 w-14 shrink-0 place-items-center rounded-lg bg-purple-50 text-purple-500">
      <BookOpen size={21} />
    </div>
  );
};

export const LibraryView: React.FC<LibraryViewProps> = ({
  resources,
  learner,
  onToggleBookmark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiResources, setApiResources] = useState<LibraryResource[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [apiHasMore, setApiHasMore] = useState(false);
  const [apiPage, setApiPage] = useState(1);
  const [selectedStage, setSelectedStage] = useState<StageFilter>(() => selectedStageFor(learner.stage));
  const [selectedCurriculum, setSelectedCurriculum] = useState<CurriculumFilter>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialFilter>('all');
  const [savedOnly, setSavedOnly] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setApiLoading(true);
    setApiError(false);
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      params.set('page', String(apiPage));
      fetch(`/api/library/open-textbooks?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error('Open Textbook Library request failed');
          return response.json() as Promise<{ data?: LibraryResource[]; nextPageAvailable?: boolean }>;
        })
        .then((payload) => {
          const nextPage = Array.isArray(payload.data) ? payload.data : [];
          setApiResources((current) => apiPage === 1 ? nextPage : [...current, ...nextPage]);
          setApiHasMore(Boolean(payload.nextPageAvailable));
        })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === 'AbortError') return;
          setApiError(true);
          if (apiPage === 1) setApiResources([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setApiLoading(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, apiPage]);

  useEffect(() => {
    setApiPage(1);
  }, [searchQuery]);

  const availableResources = useMemo(() => {
    const seen = new Set<string>();
    return [...resources, ...apiResources].filter((resource) => {
      const key = `${resource.provider.toLocaleLowerCase()}|${resource.title.trim().toLocaleLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [resources, apiResources]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return availableResources.filter((resource) => {
      if (!matchesStage(resource, selectedStage)) return false;
      if (selectedCurriculum !== 'all' && resource.curriculumGroup !== selectedCurriculum) return false;
      if (selectedMaterial !== 'all' && !resource.materialTypes.includes(selectedMaterial)) return false;
      if (savedOnly && !resource.isSaved) return false;
      if (!query) return true;

      const searchable = [
        resource.title,
        resource.author,
        resource.publisher,
        resource.provider,
        resource.description,
        resource.language,
        resource.gradeLabel,
        resource.intendedAudience,
        ...(resource.keywords ?? []),
        resource.curriculumLabel,
        resource.accessLabel,
        resource.accessNote,
        resource.licenseLabel,
        ...resource.subjects,
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(query);
    });
  }, [availableResources, searchQuery, selectedStage, selectedCurriculum, selectedMaterial, savedOnly]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStage('all');
    setSelectedCurriculum('all');
    setSelectedMaterial('all');
    setSavedOnly(false);
  };

  const savedCount = availableResources.filter((resource) => resource.isSaved).length;
  const groupedResources = useMemo(() => {
    const groups = new Map<string, LibraryResource[]>();
    filtered.forEach((resource) => {
      const items = groups.get(resource.provider) ?? [];
      items.push(resource);
      groups.set(resource.provider, items);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-linear-to-br from-violet-700 via-purple-700 to-indigo-800 p-6 text-white shadow-xl shadow-purple-200 md:p-9">
        <div className="pointer-events-none absolute -right-10 -top-16 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-amber-300/15 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-purple-50">
              <Sparkles size={14} />
              Real books and learning materials, organized by source
            </div>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">Berry Learning Library</h2>
            <p className="mt-2 text-sm leading-relaxed text-purple-100 md:text-base">
              Find specific books, stories, curriculum documents, and practice materials. Every item opens directly
              at its provider’s page, with the source and access details shown clearly.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="text-2xl font-black">{availableResources.length}</div>
            <div className="text-xs font-semibold text-purple-100">individual resources</div>
          </div>
        </div>
      </section>

      {(apiLoading || apiError) && (
        <p role={apiError ? 'status' : undefined} aria-live="polite" className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
          {apiLoading ? 'Connecting to the Open Textbook Library catalogue… Curated Berry resources remain available.' : 'The live Open Textbook Library catalogue is unavailable right now. Showing Berry’s curated resources instead.'}
        </p>
      )}

      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-5" aria-label="Filter library resources">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search resources</span>
            <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search books, subjects, providers, or exams…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
            />
          </label>
          <label className="flex items-center gap-2">
            <Filter size={16} className="shrink-0 text-slate-500" />
            <span className="sr-only">Filter by resource type</span>
            <select
              value={selectedMaterial}
              onChange={(event) => setSelectedMaterial(event.target.value as MaterialFilter)}
              className="min-w-52 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
            >
              {materialOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by curriculum</span>
            <select
              value={selectedCurriculum}
              onChange={(event) => setSelectedCurriculum(event.target.value as CurriculumFilter)}
              className="w-full min-w-56 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-purple-300 focus:ring-4 focus:ring-purple-100"
            >
              {curriculumOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <span className="mr-1 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Learning level</span>
          {stageOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={selectedStage === option.id}
              onClick={() => setSelectedStage(option.id)}
              className={'rounded-full px-3 py-2 text-xs font-bold transition ' + (
                selectedStage === option.id
                  ? 'bg-purple-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
              )}
            >
              <span aria-hidden="true">{option.emoji}</span> {option.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={savedOnly}
            onClick={() => setSavedOnly((current) => !current)}
            className={'ml-auto rounded-full px-3 py-2 text-xs font-bold transition ' + (
              savedOnly ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600 hover:bg-amber-50'
            )}
          >
            <Bookmark size={13} className="mr-1 inline" />
            Saved {savedCount}
          </button>
        </div>
      </section>

      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-bold text-slate-700">
          {filtered.length} {filtered.length === 1 ? 'resource' : 'resources'} across {groupedResources.length} {groupedResources.length === 1 ? 'source' : 'sources'}
        </p>
        {(searchQuery || selectedStage !== 'all' || selectedCurriculum !== 'all' || selectedMaterial !== 'all' || savedOnly) && (
          <button type="button" onClick={resetFilters} className="text-xs font-bold text-purple-700 hover:text-purple-900">
            Clear filters
          </button>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-8">
          {groupedResources.map(([provider, providerResources]) => (
            <section key={provider} aria-label={`Resources from ${provider}`}>
              <div className="mb-4 flex items-center gap-3 border-b border-slate-200 pb-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-purple-100 text-purple-800">
                  <BookOpen size={19} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900">{provider}</h3>
                  <p className="text-xs font-semibold text-slate-500">{providerResources.length} {providerResources.length === 1 ? 'item' : 'items'} from this source</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {providerResources.map((resource) => (
            <article key={resource.id} className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-300 hover:shadow-xl hover:shadow-purple-100/70">
              <div>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-1.5">
                    {resource.isOfficial ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800">
                        <ShieldCheck size={12} /> Official source
                      </span>
                    ) : resource.catalogueSource === 'api' ? (
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-extrabold text-sky-800">Live API listing</span>
                    ) : (
                      <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-extrabold text-violet-800">
                        Verified listing
                      </span>
                    )}
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold text-amber-900">
                      {resource.accessLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleBookmark(resource.id, resource)}
                    aria-label={resource.isSaved ? 'Remove saved resource' : 'Save resource'}
                    aria-pressed={Boolean(resource.isSaved)}
                    title={resource.isSaved ? 'Remove from saved resources' : 'Save resource'}
                    className="shrink-0 rounded-xl p-2 text-slate-400 transition hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <Bookmark size={17} className={resource.isSaved ? 'fill-purple-600 text-purple-600' : ''} />
                  </button>
                </div>

                <div className="flex items-start gap-3">
                  <ResourceCover resource={resource} />
                  <div className="min-w-0">
                    <h3 className="text-lg font-black leading-snug text-slate-900 group-hover:text-purple-800">{resource.title}</h3>
                    {(resource.author || resource.publisher) && <p className="mt-1 text-xs font-semibold text-slate-500">{resource.author ? `By ${resource.author}` : ''}{resource.author && resource.publisher ? ' · ' : ''}{resource.publisher ? `Published by ${resource.publisher}` : ''}</p>}
                    {resource.description && <p className="mt-2 text-sm leading-relaxed text-slate-600">{resource.description}</p>}
                  </div>
                </div>
                {resource.language && <p className="mt-2 text-xs font-semibold text-slate-500">Language: {resource.language}</p>}
                {(resource.intendedAudience || resource.gradeLabel) && <p className="mt-1 text-xs font-semibold text-slate-500">{[resource.intendedAudience, resource.gradeLabel].filter(Boolean).join(' · ')}</p>}

                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {resource.materialTypes.map((materialType) => (
                      <span key={materialType} className="rounded-lg bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-800">
                        {typeLabels[materialType]}
                      </span>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Subjects</p>
                    <div className="flex flex-wrap gap-1.5">
                      {resource.subjects.slice(0, 4).map((subject) => (
                        <span key={subject} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">{subject}</span>
                      ))}
                      {resource.subjects.length > 4 && (
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">+{resource.subjects.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-800">{resource.curriculumLabel}</span>
                    {resource.levels.map((level) => (
                      <span key={level} className="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-800">{levelLabels[level]}</span>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-[11px] font-extrabold text-slate-700">{resource.licenseLabel}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{resource.accessNote}</p>
                  </div>
                </div>
              </div>

              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-700 px-4 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-200"
              >
                {resource.accessType === 'download' ? 'Open PDF / download' : resource.accessType === 'external' ? 'Open resource' : 'Read online'} <ArrowUpRight size={16} />
              </a>
              {resource.recordUrl && resource.recordUrl !== resource.url && (
                <a href={resource.recordUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-center text-xs font-bold text-purple-700 hover:text-purple-900">View catalogue record and full licence details</a>
              )}
            </article>
                ))}
              </div>
            </section>
          ))}
          {apiHasMore && (
            <div className="text-center">
              <button type="button" disabled={apiLoading} onClick={() => setApiPage((page) => page + 1)} className="rounded-2xl border border-purple-200 bg-white px-5 py-3 text-sm font-extrabold text-purple-800 shadow-sm transition hover:bg-purple-50 disabled:cursor-wait disabled:opacity-60">
                {apiLoading ? 'Loading more books…' : 'Load more Open Textbook Library books'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <BookOpen className="mx-auto mb-3 text-slate-300" size={34} />
          <h3 className="text-lg font-black text-slate-800">No resources match those filters</h3>
          <p className="mt-1 text-sm text-slate-500">Try another level, subject, or resource type.</p>
          <button type="button" onClick={resetFilters} className="mt-4 rounded-xl bg-purple-700 px-4 py-2.5 text-xs font-bold text-white hover:bg-purple-800">
            Show all resources
          </button>
        </div>
      )}

      <p className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
        Berry combines a small curated catalogue with live Open Textbook Library search results. The other sources are curated listings. Availability and reuse rights vary by item; follow the licence and access terms on the linked resource page.
      </p>
    </div>
  );
};
