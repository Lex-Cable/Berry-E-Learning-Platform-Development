import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Clock, Edit3, Flag, Heart, MessageCircle, PlusCircle, Search, Send, ShieldCheck, Sparkles, Tag, Trash2, X } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import type { BlogPost, BlogPostComment, LearnerProfile } from '../../types';
import { firebaseAuth } from '../../lib/firebase';
import { addBlogComment, createBlog, deleteBlog, deleteBlogComment, loadCommunityReportContext, loadMoreBlogComments, loadMorePublishedBlogs, reportCommunityItem, reviewCommunityReport, subscribeToBlogComments, subscribeToLearnerDrafts, subscribeToOpenCommunityReports, subscribeToPublishedBlogs, subscribeToUserLikes, toggleBlogLike, updateBlog, updateBlogComment, type BlogPostInput, type CommunityPage, type CommunityReport } from '../../services/community';

interface CommunityViewProps { learner: LearnerProfile; }
type ReportTarget = { targetType: 'post' | 'comment'; postId: string; targetId: string };
const categories: BlogPost['category'][] = ['Subject Insights', 'Study Hacks', 'CBC Guides', 'Tech & Innovation', 'Career & University'];
const reportReasons = ['Bullying or harassment', 'Private information', 'Copyright concern', 'Spam or scam', 'Unsafe or harmful content', 'Other'];
const blankForm = () => ({ title: '', excerpt: '', content: '', category: 'Subject Insights' as BlogPost['category'], subjectTag: '', tags: '', imageUrl: '', readTimeMinutes: 3 });
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong. Please try again.';

export const CommunityView: React.FC<CommunityViewProps> = ({ learner }) => {
  const [uid, setUid] = useState<string | null>(firebaseAuth?.currentUser?.uid ?? null);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [drafts, setDrafts] = useState<BlogPost[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [cursor, setCursor] = useState<CommunityPage['cursor']>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [moderator, setModerator] = useState(false);
  const [view, setView] = useState<'feed' | 'drafts'>('feed');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [readingId, setReadingId] = useState<string | null>(null);
  const [comments, setComments] = useState<BlogPostComment[]>([]);
  const [commentCursor, setCommentCursor] = useState<CommunityPage['cursor']>(null);
  const [moreComments, setMoreComments] = useState(false);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [composer, setComposer] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState(blankForm);
  const [accepted, setAccepted] = useState(false);
  const [guidelines, setGuidelines] = useState(false);
  const [report, setReport] = useState<ReportTarget | null>(null);
  const [reason, setReason] = useState(reportReasons[0]);
  const [details, setDetails] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [moderation, setModeration] = useState(false);
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [reportContext, setReportContext] = useState<Record<string, string>>({});
  const [moderationBusy, setModerationBusy] = useState<string | null>(null);
  const loadedAllPosts = useRef(false);

  useEffect(() => {
    if (!firebaseAuth) { setLoading(false); setError('Berry Community needs Firebase Authentication and Firestore configuration.'); return; }
    return onAuthStateChanged(firebaseAuth, (user) => { setUid(user?.uid ?? null); setLoading(Boolean(user)); setError(user ? '' : 'Sign in to browse and participate in Berry Community.'); });
  }, []);
  useEffect(() => {
    const user = firebaseAuth?.currentUser;
    if (!uid || !user) { setModerator(false); return; }
    let active = true;
    void user.getIdTokenResult().then((token) => { if (active) setModerator(token.claims.moderator === true); }).catch(() => { if (active) setModerator(false); });
    return () => { active = false; };
  }, [uid]);
  useEffect(() => {
    if (!uid) return;
    return subscribeToUserLikes(uid, (ids) => setLikedIds((current) => current.size === ids.size && [...current].every((id) => ids.has(id)) ? current : ids), (cause) => setError(messageOf(cause)));
  }, [uid, retryKey]);
  useEffect(() => {
    if (!uid) return;
    loadedAllPosts.current = false;
    setPosts([]); setCursor(null); setHasMore(false);
    setLoading(true);
    const stopFeed = subscribeToPublishedBlogs(uid, new Set(), (page) => {
      setPosts((current) => {
        const firstPageIds = new Set(page.posts.map((post) => post.id));
        return [...page.posts, ...current.filter((post) => !firstPageIds.has(post.id))];
      });
      setCursor((current) => current ?? page.cursor);
      setHasMore((current) => loadedAllPosts.current ? current : page.hasMore);
      setLoading(false); setError('');
    }, (cause) => { setLoading(false); setError(messageOf(cause)); });
    const stopDrafts = subscribeToLearnerDrafts(uid, uid, new Set(), setDrafts, (cause) => setError(messageOf(cause)));
    return () => { stopFeed(); stopDrafts(); };
  }, [uid, retryKey]);
  useEffect(() => {
    if (!readingId) { setComments([]); setCommentCursor(null); setMoreComments(false); return; }
    setComments([]); setCommentCursor(null); setMoreComments(false);
    return subscribeToBlogComments(readingId, (nextComments, nextCursor, hasNext) => {
      setComments((current) => {
        const firstPageIds = new Set(nextComments.map((comment) => comment.id));
        return [...nextComments, ...current.filter((comment) => !firstPageIds.has(comment.id))];
      });
      setCommentCursor((current) => current ?? nextCursor);
      setMoreComments(hasNext);
    }, (cause) => setError(messageOf(cause)));
  }, [readingId, retryKey]);
  useEffect(() => {
    if (!moderator || !moderation) return;
    return subscribeToOpenCommunityReports(setReports, (cause) => setError(messageOf(cause)));
  }, [moderator, moderation, retryKey]);
  useEffect(() => {
    if (!moderator || !moderation || reports.length === 0) return;
    let active = true;
    void Promise.all(reports.slice(0, 30).map(async (item) => [item.id, await loadCommunityReportContext(item)] as const))
      .then((entries) => { if (active) setReportContext(Object.fromEntries(entries)); })
      .catch((cause: unknown) => { if (active) setError(messageOf(cause)); });
    return () => { active = false; };
  }, [moderator, moderation, reports]);

  const items = view === 'drafts' ? drafts : posts;
  const filtered = useMemo(() => items.filter((post) => {
    if (category !== 'all' && post.category !== category) return false;
    const q = search.trim().toLocaleLowerCase();
    return !q || [post.title, post.content, post.excerpt, post.subjectTag, post.authorName, ...(post.tags ?? [])].join(' ').toLocaleLowerCase().includes(q);
  }), [items, category, search]);
  const readingPost = posts.find((post) => post.id === readingId) ?? drafts.find((post) => post.id === readingId) ?? null;

  const openComposer = (post?: BlogPost) => {
    setEditingPost(post ?? null); setAccepted(false);
    setForm(post ? { title: post.title, excerpt: post.excerpt, content: post.content, category: post.category, subjectTag: post.subjectTag, tags: (post.tags ?? []).join(', '), imageUrl: post.imageUrl ?? '', readTimeMinutes: post.readTimeMinutes } : blankForm());
    setComposer(true);
  };
  const savePost = async (status: 'draft' | 'published') => {
    if (!uid || !firebaseAuth?.currentUser) { setError('Sign in again before saving your blog.'); return; }
    const title = form.title.trim(); const content = form.content.trim();
    if (!title || !content) { setError('Add a title and some article content before saving.'); return; }
    let imageUrl = '';
    if (form.imageUrl.trim()) {
      try {
        const parsedImageUrl = new URL(form.imageUrl.trim());
        if (parsedImageUrl.protocol !== 'https:') throw new Error('https required');
        imageUrl = parsedImageUrl.href;
      } catch { setError('Enter a valid secure HTTPS image link.'); return; }
    }
    if (status === 'published' && !accepted) { setError('Review and accept the Berry Community Guidelines before publishing.'); return; }
    const input: BlogPostInput = { title, content, excerpt: form.excerpt.trim() || content.slice(0, 180), category: form.category, subjectTag: form.subjectTag.trim() || 'General', tags: [...new Set(form.tags.split(',').map((tag) => tag.trim().slice(0, 40)).filter(Boolean))].slice(0, 8), imageUrl, readTimeMinutes: Math.max(1, Math.min(30, Number(form.readTimeMinutes) || 3)), status };
    setError('');
    try {
      if (editingPost) await updateBlog(editingPost.id, input);
      else await createBlog(input, { uid, name: learner.name, stage: learner.stage, gradeLevel: learner.gradeLevel, avatarUrl: learner.avatarUrl });
      setNotice(status === 'draft' ? 'Draft saved privately.' : 'Your blog is published in Berry Community.'); setComposer(false); setEditingPost(null); setForm(blankForm());
      if (status === 'draft') setView('drafts');
    } catch (cause) { setError(messageOf(cause)); }
  };
  const toggleLike = async (post: BlogPost, event?: React.MouseEvent) => {
    event?.stopPropagation(); if (!uid) { setError('Sign in to like a blog.'); return; }
    try { await toggleBlogLike(post.id, uid); } catch (cause) { setError(messageOf(cause)); }
  };
  const removePost = async (post: BlogPost) => {
    if (!window.confirm('Delete this blog and its Berry comments and likes? An externally linked image stays at its original source.')) return;
    try { await deleteBlog(post.id); setReadingId(null); setNotice('Your post, its comments, and likes were deleted.'); } catch (cause) { setError(messageOf(cause)); }
  };
  const addComment = async (event: React.FormEvent) => {
    event.preventDefault(); if (!readingPost || !uid || !commentText.trim()) return;
    try { await addBlogComment(readingPost.id, { uid, name: learner.name, gradeLevel: learner.gradeLevel, avatarUrl: learner.avatarUrl }, commentText); setCommentText(''); setError(''); } catch (cause) { setError(messageOf(cause)); }
  };
  const saveComment = async (event: React.FormEvent, postId: string, commentId: string) => {
    event.preventDefault(); if (!editCommentText.trim()) return;
    try { await updateBlogComment(postId, commentId, editCommentText); setEditingComment(null); setEditCommentText(''); } catch (cause) { setError(messageOf(cause)); }
  };
  const removeComment = async (postId: string, commentId: string) => {
    if (!window.confirm('Delete your comment?')) return;
    try { await deleteBlogComment(postId, commentId); } catch (cause) { setError(messageOf(cause)); }
  };
  const sendReport = async (event: React.FormEvent) => {
    event.preventDefault(); if (!report || !uid) return; setReportBusy(true);
    try { await reportCommunityItem({ ...report, reporterId: uid, reason, details: details.trim() }); setReport(null); setDetails(''); setNotice('Your report was sent privately to Berry moderators.'); } catch (cause) { setError(messageOf(cause)); } finally { setReportBusy(false); }
  };
  const reviewReport = async (item: CommunityReport, action: 'dismiss' | 'hide') => {
    if (!uid) return; setModerationBusy(item.id);
    try { await reviewCommunityReport(item, uid, action, 'Reviewed through Berry Community moderation.'); } catch (cause) { setError(messageOf(cause)); } finally { setModerationBusy(null); }
  };
  const loadMore = async () => {
    if (!uid || !cursor || loadingMore) return; setLoadingMore(true);
    try { const page = await loadMorePublishedBlogs(uid, likedIds, cursor); setPosts((current) => [...current, ...page.posts.filter((post) => !current.some((old) => old.id === post.id))]); setCursor(page.cursor); loadedAllPosts.current = !page.hasMore; setHasMore(page.hasMore); } catch (cause) { setError(messageOf(cause)); } finally { setLoadingMore(false); }
  };
  const loadMoreComments = async () => {
    if (!readingId || !commentCursor || loadingComments) return;
    setLoadingComments(true);
    try {
      const page = await loadMoreBlogComments(readingId, commentCursor);
      setComments((current) => [...current, ...page.comments.filter((comment) => !current.some((old) => old.id === comment.id))]);
      setCommentCursor(page.cursor); setMoreComments(page.hasMore);
    } catch (cause) { setError(messageOf(cause)); }
    finally { setLoadingComments(false); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-12">
    <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:p-8">
      <div><div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800"><Sparkles size={14} /> Berry Community Blog & Articles</div><h2 className="text-2xl font-black tracking-tight text-slate-900">Knowledge Sharing & Academic Blogs</h2><p className="mt-1 max-w-xl text-xs text-slate-500">Share learning ideas, study strategies, academic experiences, and projects with other learners.</p><button type="button" onClick={() => setGuidelines(true)} className="mt-2 text-xs font-bold text-purple-700 hover:underline">Community guidelines</button></div>
      <div className="flex flex-wrap gap-2">{moderator && <button type="button" onClick={() => setModeration(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900"><ShieldCheck size={15} /> Review reports</button>}<button type="button" disabled={!uid} onClick={() => openComposer()} className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-3 text-xs font-bold text-white shadow-md hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"><PlusCircle size={16} /> Write a Blog Post</button></div>
    </header>
    {(error || notice) && <div role="status" aria-live="polite" className={'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ' + (error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}><span>{error || notice}</span><button type="button" onClick={() => { setError(''); setNotice(''); }} aria-label="Dismiss message"><X size={16} /></button></div>}
    <section className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
      <div className="flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => { setView('feed'); setCategory('all'); }} className={'rounded-xl px-3 py-1.5 text-xs font-bold ' + (view === 'feed' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>Community feed</button><button type="button" onClick={() => { setView('drafts'); setCategory('all'); }} className={'rounded-xl px-3 py-1.5 text-xs font-bold ' + (view === 'drafts' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:bg-slate-100')}>My drafts ({drafts.length})</button>
        {view === 'feed' && <><span className="mx-1 hidden h-5 border-l border-slate-200 sm:block" /><button type="button" onClick={() => setCategory('all')} className={'rounded-xl px-3 py-1.5 text-xs font-bold ' + (category === 'all' ? 'bg-purple-100 text-purple-800' : 'text-slate-600')}>All articles</button>{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={'rounded-xl px-3 py-1.5 text-xs font-bold ' + (category === item ? 'bg-purple-100 text-purple-800' : 'text-slate-600 hover:bg-slate-100')}>{item}</button>)}</>}
      </div><label className="relative min-w-[220px]"><span className="sr-only">Search community blogs</span><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" placeholder="Search articles and tags…" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs outline-none focus:border-purple-300" /></label>
    </section>
    {loading ? <div className="rounded-3xl border bg-white p-12 text-center text-sm text-slate-500">Loading Berry Community…</div>
      : !uid ? <div className="rounded-3xl border bg-white p-12 text-center"><BookOpen className="mx-auto mb-3 text-slate-300" size={36} /><p className="font-bold text-slate-700">Sign in to join the community</p><p className="mt-1 text-xs text-slate-500">Published blogs are visible to signed-in Berry learners.</p></div>
      : filtered.length === 0 ? <div className="space-y-3 rounded-3xl border bg-white p-12 text-center"><BookOpen className="mx-auto text-slate-300" size={36} /><h3 className="font-bold text-slate-700">{view === 'drafts' ? 'No private drafts yet' : 'No published blogs found'}</h3><p className="text-xs text-slate-400">{view === 'drafts' ? 'Save a draft while you work, then publish it when ready.' : 'Be the first to share a learning idea or adjust your search.'}</p></div>
      : <><p className="px-1 text-sm font-bold text-slate-600">{filtered.length}{hasMore && view === 'feed' ? '+' : ''} {view === 'drafts' ? 'private drafts' : 'published articles'}</p><div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post) => <article key={post.id} onClick={() => { setReadingId(post.id); setCommentText(''); }} className="group flex cursor-pointer flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-purple-300 hover:shadow-md">
          <div className={'relative flex h-36 flex-col justify-between bg-gradient-to-tr ' + post.coverGradient + ' p-4 text-white'} style={post.imageUrl ? { backgroundImage: 'linear-gradient(20deg, rgba(30,20,55,.7), rgba(30,20,55,.1)), url("' + post.imageUrl + '")', backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
            <div className="flex items-center justify-between gap-2"><span className="max-w-[70%] truncate rounded-full border border-white/20 bg-white/20 px-2.5 py-0.5 text-[10px] font-bold uppercase">{post.status === 'draft' ? 'Private draft' : post.category}</span><span className="flex items-center gap-1 rounded-full bg-black/20 px-2 py-0.5 text-[11px]"><Clock size={12} /> {post.readTimeMinutes} min</span></div><div className="flex items-center gap-1.5 text-xs font-semibold"><Tag size={13} /> {post.subjectTag}</div>
          </div>
          <div className="flex flex-1 flex-col justify-between space-y-4 p-5"><div className="space-y-2"><h3 className="line-clamp-2 text-base font-extrabold leading-snug text-slate-900 group-hover:text-purple-700">{post.title}</h3><p className="line-clamp-3 text-xs leading-relaxed text-slate-500">{post.excerpt}</p>{!!post.tags?.length && <div className="flex flex-wrap gap-1">{post.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700">#{tag}</span>)}</div>}</div>
            <div className="space-y-3 border-t border-slate-100 pt-3"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2">{post.authorAvatarUrl ? <img src={post.authorAvatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" /> : <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">{post.authorName.charAt(0).toUpperCase()}</div>}<div className="min-w-0 leading-tight"><span className="block truncate text-xs font-bold text-slate-800">{post.authorName}</span><span className="text-[10px] text-slate-400">{post.authorGrade} · {post.timestamp}</span></div></div>
              {post.authorId === uid && <div className="flex shrink-0 gap-1"><button type="button" onClick={(event) => { event.stopPropagation(); openComposer(post); }} aria-label="Edit your blog" className="rounded-lg p-1.5 text-slate-400 hover:bg-purple-50 hover:text-purple-700"><Edit3 size={14} /></button><button type="button" onClick={(event) => { event.stopPropagation(); void removePost(post); }} aria-label="Delete your blog" className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div>}</div>
              {post.status !== 'draft' ? <><div className="flex items-center justify-between text-xs text-slate-500"><div className="flex items-center gap-3"><button type="button" onClick={(event) => void toggleLike(post, event)} className={'flex items-center gap-1 font-semibold ' + (likedIds.has(post.id) ? 'text-rose-600' : 'hover:text-rose-600')}><Heart size={15} className={likedIds.has(post.id) ? 'fill-rose-500 text-rose-500' : ''} />{post.likesCount}</button><span className="flex items-center gap-1"><MessageCircle size={15} />{post.commentsCount ?? 0}</span></div><span className="flex items-center gap-1 text-[11px] font-bold text-purple-600">Read article <ArrowRight size={12} /></span></div><div className="flex gap-3"><button type="button" onClick={(event) => { event.stopPropagation(); setReport({ targetType: 'post', postId: post.id, targetId: post.id }); }} className="text-left text-[10px] font-semibold text-slate-400 hover:text-rose-600">Report post</button><button type="button" onClick={(event) => { event.stopPropagation(); setGuidelines(true); }} className="text-left text-[10px] font-semibold text-slate-400 hover:text-purple-700">Community guidelines</button></div></> : <p className="text-[10px] font-semibold text-slate-400">Private draft · only you can see this</p>}
            </div>
          </div>
        </article>)}
      </div>{view === 'feed' && hasMore && <div className="text-center"><button type="button" disabled={loadingMore} onClick={() => void loadMore()} className="rounded-xl border border-purple-200 bg-white px-5 py-3 text-xs font-bold text-purple-800 hover:bg-purple-50 disabled:opacity-50">{loadingMore ? 'Loading more…' : 'Load more articles'}</button></div>}</>}
    {error && <div className="flex justify-center"><button type="button" onClick={() => setRetryKey((key) => key + 1)} className="text-xs font-bold text-purple-700">Retry loading Community</button></div>}

    {readingPost && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) setReadingId(null); }}><section role="dialog" aria-modal="true" aria-labelledby="blog-title" className="my-6 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
      <header className={'relative bg-gradient-to-tr ' + readingPost.coverGradient + ' p-6 text-white sm:p-8'} style={readingPost.imageUrl ? { backgroundImage: 'linear-gradient(20deg, rgba(30,20,55,.78), rgba(30,20,55,.2)), url("' + readingPost.imageUrl + '")', backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}><button type="button" onClick={() => setReadingId(null)} aria-label="Close article" className="absolute right-4 top-4 rounded-full bg-black/20 p-2"><X size={18} /></button><div className="mb-3 flex items-center gap-2"><span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase">{readingPost.category}</span><span className="text-xs">{readingPost.readTimeMinutes} min · {readingPost.subjectTag}</span></div><h2 id="blog-title" className="max-w-2xl pr-8 text-2xl font-black leading-tight">{readingPost.title}</h2><div className="mt-4 flex items-center gap-3 text-xs">{readingPost.authorAvatarUrl ? <img src={readingPost.authorAvatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-white/25 font-bold">{readingPost.authorName.charAt(0).toUpperCase()}</span>}<span><b className="block">{readingPost.authorName}</b>{readingPost.authorGrade} · {readingPost.timestamp}</span></div></header>
      <div className="space-y-6 p-6 sm:p-8"><p className="whitespace-pre-line text-sm leading-7 text-slate-800">{readingPost.content}</p>{!!readingPost.tags?.length && <div className="flex flex-wrap gap-2">{readingPost.tags.map((tag) => <span key={tag} className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">#{tag}</span>)}</div>}
        {readingPost.status === 'draft' && <p className="rounded-xl bg-purple-50 p-3 text-xs font-semibold text-purple-800">This is a private draft. Only you can view it until you publish it.</p>}<div className="flex flex-wrap items-center justify-between gap-3 border-y border-slate-200 py-4"><button type="button" onClick={() => void toggleLike(readingPost)} className={(readingPost.status === 'draft' ? 'hidden ' : '') + 'flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold ' + (likedIds.has(readingPost.id) ? 'border border-rose-200 bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-700')}><Heart size={16} className={likedIds.has(readingPost.id) ? 'fill-rose-500' : ''} />{likedIds.has(readingPost.id) ? 'Liked' : 'Like'} ({readingPost.likesCount})</button>{readingPost.authorId === uid && <div className="flex gap-2"><button type="button" onClick={() => openComposer(readingPost)} className="flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold"><Edit3 size={14} />Edit</button><button type="button" onClick={() => void removePost(readingPost)} className="flex items-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600"><Trash2 size={14} />Delete</button></div>}<button type="button" onClick={() => setReport({ targetType: 'post', postId: readingPost.id, targetId: readingPost.id })} className={(readingPost.status === 'draft' ? 'hidden ' : '') + 'flex items-center gap-1 text-xs font-bold text-slate-500'}><Flag size={14} />Report</button></div>
        <button type="button" onClick={() => setGuidelines(true)} className="text-xs font-semibold text-purple-700 hover:underline">Read Berry Community Guidelines</button><section className={readingPost.status === 'draft' ? 'hidden' : 'space-y-4'}><h3 className="flex items-center gap-2 font-extrabold text-slate-900"><MessageCircle size={18} className="text-purple-600" />Discussion & Comments ({readingPost.commentsCount ?? 0})</h3><form onSubmit={(event) => void addComment(event)} className="flex gap-2"><input value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={2000} placeholder="Share a question, feedback, or study tip…" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs" /><button type="submit" disabled={!commentText.trim()} className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Send size={13} />Post</button></form>
          {comments.length === 0 ? <p className="text-xs italic text-slate-400">No comments yet. Start a constructive conversation.</p> : <div className="space-y-3">{comments.map((item) => <article key={item.id} className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3.5"><div className="flex items-center justify-between gap-2 text-xs"><div className="flex min-w-0 items-center gap-2"><b className="truncate text-slate-900">{item.authorName}</b><span className="truncate rounded border bg-white px-1.5 py-0.5 text-[10px] text-slate-500">{item.authorRole}</span></div><time className="shrink-0 text-[10px] text-slate-400">{item.timestamp}</time></div>{editingComment === item.id ? <form onSubmit={(event) => void saveComment(event, readingPost.id, item.id)} className="space-y-2"><textarea value={editCommentText} onChange={(event) => setEditCommentText(event.target.value)} maxLength={2000} className="w-full rounded-xl border bg-white p-3 text-xs" /><div className="flex justify-end gap-2"><button type="button" onClick={() => setEditingComment(null)} className="text-xs text-slate-500">Cancel</button><button type="submit" className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white">Save</button></div></form> : <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">{item.content}</p>}<div className="flex gap-3">{item.authorId === uid && editingComment !== item.id && <><button type="button" onClick={() => { setEditingComment(item.id); setEditCommentText(item.content); }} className="text-[10px] font-semibold text-purple-700">Edit</button><button type="button" onClick={() => void removeComment(readingPost.id, item.id)} className="text-[10px] font-semibold text-rose-600">Delete</button></>}<button type="button" onClick={() => setReport({ targetType: 'comment', postId: readingPost.id, targetId: item.id })} className="text-[10px] font-semibold text-slate-500">Report comment</button></div></article>)}</div>}
          {moreComments && <div className="text-center"><button type="button" disabled={loadingComments} onClick={() => void loadMoreComments()} className="rounded-lg border border-purple-200 px-4 py-2 text-xs font-bold text-purple-700 disabled:opacity-50">{loadingComments ? 'Loading comments…' : 'Load more comments'}</button></div>}
        </section>
      </div>
    </section></div>}

    {composer && <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="composer-title" className="my-6 max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"><div className="mb-5 flex items-center justify-between border-b pb-3"><div><h3 id="composer-title" className="text-xl font-black">{editingPost ? 'Edit your blog' : 'Write a Community Blog Post'}</h3><p className="mt-1 text-xs text-slate-500">Share your own learning experience, ideas, projects, or study strategies.</p></div><button type="button" onClick={() => setComposer(false)} aria-label="Close editor"><X size={18} /></button></div>
      <form onSubmit={(event) => { event.preventDefault(); void savePost('published'); }} className="space-y-4"><label className="block text-xs font-bold">Article title *<input required maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="What would you like to share?" className="mt-1 w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-xs" /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block text-xs font-bold">Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as BlogPost['category'] })} className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-xs">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-xs font-bold">Subject / learning area<input maxLength={60} value={form.subjectTag} onChange={(event) => setForm({ ...form, subjectTag: event.target.value })} placeholder="e.g. Biology, Mathematics" className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-xs" /></label></div>
        <label className="block text-xs font-bold">Short excerpt<input maxLength={400} value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} placeholder="A short summary (generated from your article if blank)" className="mt-1 w-full rounded-xl border bg-slate-50 px-3.5 py-2.5 text-xs" /></label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block text-xs font-bold">Tags (comma separated)<input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="revision, science project" className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-xs" /></label><label className="block text-xs font-bold">Image URL (optional)<input type="url" maxLength={2048} value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://…" className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-xs" /></label></div>
        <label className="block text-xs font-bold">Article *<textarea required maxLength={20000} rows={8} value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="Write your original article here…" className="mt-1 w-full resize-y rounded-xl border bg-slate-50 p-3.5 text-xs leading-relaxed" /></label>
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-xs leading-relaxed text-purple-900"><div className="flex items-center gap-2 font-extrabold"><ShieldCheck size={15} /> Berry Community Guidelines</div><p className="mt-1">Keep posts educational, respectful, original, and safe. Never share passwords, private contact details, personal documents, bullying, or unlicensed copyrighted work.</p><button type="button" onClick={() => setGuidelines(true)} className="mt-2 font-bold underline">Read all guidelines</button><label className="mt-3 flex items-start gap-2 border-t border-purple-100 pt-3 font-semibold"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-0.5 accent-purple-700" />I confirm this post follows the guidelines and is my own work or properly credited.</label></div>
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4"><button type="button" onClick={() => setComposer(false)} className="rounded-xl border px-4 py-2.5 text-xs font-bold">Cancel</button><button type="button" onClick={() => void savePost('draft')} className="rounded-xl border border-purple-200 px-4 py-2.5 text-xs font-bold text-purple-800">Save draft</button><button type="submit" disabled={!accepted} className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{editingPost?.status === 'draft' ? 'Publish article' : editingPost ? 'Save changes' : 'Publish Article'}</button></div>
      </form></section></div>}

    {guidelines && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="guidelines-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><div className="flex items-center justify-between"><h3 id="guidelines-title" className="text-xl font-black">Berry Community Guidelines</h3><button type="button" onClick={() => setGuidelines(false)} aria-label="Close guidelines"><X size={18} /></button></div><ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700"><li><b>Educational relevance:</b> focus on learning, school life, opportunities, skills, projects, and creativity.</li><li><b>Respectful communication:</b> no harassment, bullying, threats, discriminatory abuse, or targeted humiliation.</li><li><b>Protect privacy:</b> never post passwords, private contact details, private conversations, personal ID documents, or another person’s sensitive information.</li><li><b>Original work and copyright:</b> share your own work or permitted material, and credit sources, quotations, research, and images.</li><li><b>No spam or harmful content:</b> no scams, impersonation, malicious links, repetitive promotion, or content intended to harm learners.</li><li><b>Reporting and moderation:</b> report inappropriate posts or comments. Authorized moderators review reports and record actions.</li></ol><button type="button" onClick={() => setGuidelines(false)} className="mt-6 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white">I understand</button></section></div>}

    {report && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="report-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h3 id="report-title" className="text-lg font-black">Report {report.targetType}</h3><button type="button" onClick={() => setReport(null)} aria-label="Close report"><X size={18} /></button></div><p className="mt-2 text-xs text-slate-500">Reports are private to you and authorized moderators.</p><form onSubmit={(event) => void sendReport(event)} className="mt-4 space-y-4"><label className="block text-xs font-bold">Reason<select value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-xl border bg-slate-50 px-3 py-2.5 text-xs">{reportReasons.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-xs font-bold">Additional details (optional)<textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={4} className="mt-1 w-full rounded-xl border bg-slate-50 p-3 text-xs" /></label><div className="flex justify-end gap-2"><button type="button" onClick={() => setReport(null)} className="rounded-xl border px-4 py-2 text-xs font-bold">Cancel</button><button type="submit" disabled={reportBusy} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{reportBusy ? 'Sending…' : 'Send report'}</button></div></form></section></div>}

    {moderation && moderator && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4"><section role="dialog" aria-modal="true" aria-labelledby="moderation-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><div><h3 id="moderation-title" className="text-xl font-black">Community report review</h3><p className="mt-1 text-xs text-slate-500">Moderator access is granted through Firebase custom claims.</p></div><button type="button" onClick={() => setModeration(false)} aria-label="Close moderation"><X size={18} /></button></div>{reports.length === 0 ? <p className="py-12 text-center text-sm text-slate-500">No open reports.</p> : <div className="mt-5 space-y-3">{reports.map((item) => <article key={item.id} className="rounded-2xl border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-extrabold">{item.reason} · {item.targetType}</p><p className="mt-1 text-xs text-slate-500">Reporter {item.reporterId} · item {item.targetId}{item.postId !== item.targetId ? ' on post ' + item.postId : ''}</p>{item.details && <p className="mt-2 text-sm text-slate-700">{item.details}</p>}<pre className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">{reportContext[item.id] ?? 'Loading reported content…'}</pre></div><div className="flex gap-2"><button type="button" disabled={moderationBusy === item.id} onClick={() => void reviewReport(item, 'dismiss')} className="rounded-lg border px-3 py-2 text-xs font-bold">Dismiss</button><button type="button" disabled={moderationBusy === item.id} onClick={() => void reviewReport(item, 'hide')} className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">Hide content</button></div></div></article>)}</div>}</section></div>}
  </div>;
};
