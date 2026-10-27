import {
  Timestamp,
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { BlogPost, BlogPostComment, LearnerStage } from '../types';
import { firebaseAuth, firestoreDb } from '../lib/firebase';

const PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 30;

type LocalPost = Record<string, unknown> & { id: string; pending?: boolean };
type LocalComment = Record<string, unknown> & { id: string; postId: string; pending?: boolean };
interface LocalCommunityState {
  posts: LocalPost[];
  comments: LocalComment[];
  likes: Record<string, boolean>;
  pendingLikes: Record<string, boolean>;
  reports: CommunityReport[];
}
const emptyLocalState = (): LocalCommunityState => ({ posts: [], comments: [], likes: {}, pendingLikes: {}, reports: [] });
const localStateMemory = new Map<string, LocalCommunityState>();
const localStateListeners = new Map<string, Set<(state: LocalCommunityState) => void>>();
const storageModeListeners = new Set<(mode: 'cloud' | 'local') => void>();
const failedCloudStreams = new Set<string>();
let storageMode: 'cloud' | 'local' = 'cloud';
let pendingSync: Promise<void> | null = null;

function storageKey(uid: string) { return `berry-community-v1:${uid}`; }
function readLocalState(uid: string): LocalCommunityState {
  if (localStateMemory.has(uid)) return localStateMemory.get(uid)!;
  try {
    const saved = localStorage.getItem(storageKey(uid));
    const parsed = saved ? JSON.parse(saved) as Partial<LocalCommunityState> : {};
    const state = { ...emptyLocalState(), ...parsed } as LocalCommunityState;
    localStateMemory.set(uid, state);
    return state;
  } catch { return emptyLocalState(); }
}
function writeLocalState(uid: string, state: LocalCommunityState) {
  localStateMemory.set(uid, state);
  try { localStorage.setItem(storageKey(uid), JSON.stringify(state)); } catch { /* Keep the in-memory fallback usable in private browsing. */ }
  localStateListeners.get(uid)?.forEach((listener) => listener(state));
}
function subscribeLocalState(uid: string, listener: (state: LocalCommunityState) => void) {
  const listeners = localStateListeners.get(uid) ?? new Set();
  listeners.add(listener); localStateListeners.set(uid, listeners); listener(readLocalState(uid));
  return () => { listeners.delete(listener); if (!listeners.size) localStateListeners.delete(uid); };
}
function setStorageMode(mode: 'cloud' | 'local') {
  if (mode === 'cloud' && failedCloudStreams.size > 0) return;
  if (storageMode === mode) return;
  storageMode = mode;
  storageModeListeners.forEach((listener) => listener(mode));
}
function markCloudStream(uid: string, stream: string, available: boolean) {
  const key = `${uid}:${stream}`;
  if (available) failedCloudStreams.delete(key); else failedCloudStreams.add(key);
  refreshStorageMode(uid);
}
function refreshStorageMode(uid: string) {
  const state = readLocalState(uid);
  const pending = state.posts.some((post) => post.pending) || state.comments.some((comment) => comment.pending)
    || state.reports.some((report) => report.pending) || Object.keys(state.pendingLikes).length > 0;
  setStorageMode(failedCloudStreams.size || pending ? 'local' : 'cloud');
}
export function subscribeToCommunityStorageMode(listener: (mode: 'cloud' | 'local') => void) {
  storageModeListeners.add(listener); listener(storageMode);
  return () => { storageModeListeners.delete(listener); };
}
export function getCommunityStorageMode() { return storageMode; }
function isFallbackError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : '';
  return ['permission-denied', 'unavailable', 'failed-precondition'].some((value) => code.endsWith(value));
}
function asDate(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') { const parsed = new Date(value); if (!Number.isNaN(parsed.getTime())) return parsed; }
  return new Date();
}
function serializeValue(value: unknown): unknown {
  return value instanceof Timestamp ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : value;
}
function serializePost(id: string, data: Record<string, unknown>, pending = false): LocalPost {
  return { ...Object.fromEntries(Object.entries(data).map(([key, value]) => [key, serializeValue(value)])), id, ...(pending ? { pending: true } : {}) } as LocalPost;
}
function cacheRemotePosts(uid: string, posts: QueryDocumentSnapshot<DocumentData>[]) {
  const state = readLocalState(uid);
  const byId = new Map(state.posts.map((post) => [post.id, post]));
  posts.forEach((snapshot) => {
    const old = byId.get(snapshot.id);
    if (old?.pending) return;
    const remote = serializePost(snapshot.id, snapshot.data());
    const hasPendingComment = state.comments.some((comment) => comment.postId === snapshot.id && comment.pending);
    byId.set(snapshot.id, {
      ...remote,
      ...(hasPendingComment && old ? { commentCount: old.commentCount } : {}),
      ...(Object.hasOwn(state.pendingLikes, snapshot.id) && old ? { likeCount: old.likeCount } : {}),
    });
  });
  writeLocalState(uid, { ...state, posts: [...byId.values()] });
}
function mappedLocalPosts(state: LocalCommunityState, uid: string, status: 'published' | 'draft', likedIds: Set<string>) {
  return state.posts.filter((post) => post.status === status && (status !== 'draft' || post.authorId === uid))
    .sort((a, b) => asDate(b.publishedAt ?? b.updatedAt ?? b.createdAt).getTime() - asDate(a.publishedAt ?? a.updatedAt ?? a.createdAt).getTime())
    .map((post) => mapPostData(post.id, post, uid, likedIds));
}
function notifyCombinedFeed(uid: string, likedIds: Set<string>, cloudPosts: BlogPost[], onPosts: (page: CommunityPage) => void) {
  const local = mappedLocalPosts(readLocalState(uid), uid, 'published', likedIds);
  const combined = new Map(local.map((post) => [post.id, post]));
  cloudPosts.forEach((post) => combined.set(post.id, post));
  const posts = [...combined.values()].sort((a, b) => asDate(b.publishedAt ?? b.updatedAt ?? b.createdAt).getTime() - asDate(a.publishedAt ?? a.updatedAt ?? a.createdAt).getTime());
  onPosts({ posts, cursor: null, hasMore: false });
}
function notifyCombinedDrafts(uid: string, likedIds: Set<string>, cloudPosts: BlogPost[], onPosts: (posts: BlogPost[]) => void) {
  const local = mappedLocalPosts(readLocalState(uid), uid, 'draft', likedIds);
  const combined = new Map(local.map((post) => [post.id, post])); cloudPosts.forEach((post) => combined.set(post.id, post));
  onPosts([...combined.values()].sort((a, b) => asDate(b.updatedAt ?? b.createdAt).getTime() - asDate(a.updatedAt ?? a.createdAt).getTime()).slice(0, 50));
}

function db() {
  if (!firestoreDb) throw new Error('Berry Community is not connected to Firebase. Check the Firebase configuration.');
  return firestoreDb;
}

function dateLabel(value: unknown) {
  const date = value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : typeof value === 'string' || typeof value === 'number' ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function mapPostData(id: string, data: Record<string, unknown>, currentUserId: string, likedPostIds: Set<string>): BlogPost {
  return {
    id,
    authorId: String(data.authorId ?? ''),
    authorName: String(data.authorName ?? 'Berry learner'),
    authorAvatarUrl: typeof data.authorAvatarUrl === 'string' ? data.authorAvatarUrl : undefined,
    authorRole: (data.authorRole ?? 'learner') as BlogPost['authorRole'],
    authorStage: (data.authorStage ?? 'early') as LearnerStage,
    authorGrade: String(data.authorGrade ?? ''),
    title: String(data.title ?? ''),
    excerpt: String(data.excerpt ?? ''),
    content: String(data.content ?? ''),
    category: data.category as BlogPost['category'],
    stage: (data.authorStage ?? 'early') as LearnerStage,
    subjectTag: String(data.subjectTag ?? 'General'),
    tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown): tag is string => typeof tag === 'string') : [],
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
    coverGradient: String(data.coverGradient ?? 'from-purple-600 via-indigo-600 to-blue-700'),
    readTimeMinutes: Number(data.readTimeMinutes ?? 3),
    timestamp: dateLabel(data.publishedAt ?? data.updatedAt ?? data.createdAt),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    publishedAt: data.publishedAt,
    status: data.status as BlogPost['status'],
    likesCount: Number(data.likeCount ?? 0),
    commentsCount: Number(data.commentCount ?? 0),
    hasLiked: likedPostIds.has(id),
    comments: [],
    isUserPost: data.authorId === currentUserId,
  };
}
function mapPost(snapshot: QueryDocumentSnapshot<DocumentData>, currentUserId: string, likedPostIds: Set<string>): BlogPost {
  return mapPostData(snapshot.id, snapshot.data(), currentUserId, likedPostIds);
}

export interface CommunityPage {
  posts: BlogPost[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export function subscribeToPublishedBlogs(
  currentUserId: string,
  likedPostIds: Set<string>,
  onPosts: (page: CommunityPage) => void,
  onError: (error: Error) => void,
) {
  let cloudPosts: BlogPost[] = [];
  let cloudCursor: QueryDocumentSnapshot<DocumentData> | null = null;
  let cloudHasMore = false;
  let stopCloud = () => {};
  const notify = (state: LocalCommunityState) => {
    const localPosts = mappedLocalPosts(state, currentUserId, 'published', likedPostIds);
    const combined = new Map(localPosts.map((post) => [post.id, post]));
    cloudPosts.forEach((post) => combined.set(post.id, post));
    const posts = [...combined.values()].sort((a, b) => asDate(b.publishedAt ?? b.updatedAt ?? b.createdAt).getTime() - asDate(a.publishedAt ?? a.updatedAt ?? a.createdAt).getTime());
    onPosts({ posts, cursor: cloudCursor, hasMore: cloudHasMore });
  };
  const stopLocal = subscribeLocalState(currentUserId, notify);
  try {
    const feedQuery = query(collection(db(), 'blogs'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(PAGE_SIZE));
    stopCloud = onSnapshot(feedQuery, (snapshot) => {
      cloudPosts = snapshot.docs.map((post) => mapPost(post, currentUserId, likedPostIds));
      cloudCursor = snapshot.docs.at(-1) ?? null;
      cloudHasMore = snapshot.size === PAGE_SIZE;
      cacheRemotePosts(currentUserId, snapshot.docs);
      notify(readLocalState(currentUserId));
      markCloudStream(currentUserId, 'feed', true);
      void syncPendingLocalPosts(currentUserId);
    }, (error) => {
      if (isFallbackError(error)) { markCloudStream(currentUserId, 'feed', false); notify(readLocalState(currentUserId)); }
      else onError(error);
    });
  } catch (error) {
    if (isFallbackError(error)) { markCloudStream(currentUserId, 'feed', false); notify(readLocalState(currentUserId)); }
    else onError(error instanceof Error ? error : new Error(String(error)));
  }
  return () => { stopLocal(); stopCloud(); };
}

export async function loadMorePublishedBlogs(
  currentUserId: string,
  likedPostIds: Set<string>,
  cursor: QueryDocumentSnapshot<DocumentData>,
) {
  try {
    const snapshot = await getDocs(query(collection(db(), 'blogs'), where('status', '==', 'published'), orderBy('publishedAt', 'desc'), startAfter(cursor), limit(PAGE_SIZE)));
    cacheRemotePosts(currentUserId, snapshot.docs);
    return { posts: snapshot.docs.map((post) => mapPost(post, currentUserId, likedPostIds)), cursor: snapshot.docs.at(-1) ?? cursor, hasMore: snapshot.size === PAGE_SIZE } satisfies CommunityPage;
  } catch (error) {
    if (!isFallbackError(error)) throw error;
    setStorageMode('local');
    return { posts: [], cursor: null, hasMore: false } satisfies CommunityPage;
  }
}

export function subscribeToLearnerDrafts(
  uid: string,
  currentUserId: string,
  likedPostIds: Set<string>,
  onPosts: (posts: BlogPost[]) => void,
  onError: (error: Error) => void,
) {
  let cloudPosts: BlogPost[] = [];
  let stopCloud = () => {};
  const notify = (state: LocalCommunityState) => notifyCombinedDrafts(uid, likedPostIds, cloudPosts, onPosts);
  const stopLocal = subscribeLocalState(uid, notify);
  try {
    const draftsQuery = query(collection(db(), 'blogs'), where('authorId', '==', uid), where('status', '==', 'draft'), orderBy('updatedAt', 'desc'), limit(50));
    stopCloud = onSnapshot(draftsQuery, (snapshot) => {
      cloudPosts = snapshot.docs.map((post) => mapPost(post, currentUserId, likedPostIds));
      cacheRemotePosts(uid, snapshot.docs);
      notify(readLocalState(uid));
      markCloudStream(uid, 'drafts', true);
      void syncPendingLocalPosts(uid);
    }, (error) => {
      if (isFallbackError(error)) { markCloudStream(uid, 'drafts', false); notify(readLocalState(uid)); }
      else onError(error);
    });
  } catch (error) {
    if (isFallbackError(error)) { markCloudStream(uid, 'drafts', false); notify(readLocalState(uid)); }
    else onError(error instanceof Error ? error : new Error(String(error)));
  }
  return () => { stopLocal(); stopCloud(); };
}

export function subscribeToUserLikes(uid: string, onLikedPostIds: (postIds: Set<string>) => void, onError: (error: Error) => void) {
  let cloudIds = new Set<string>();
  const notify = (state: LocalCommunityState) => onLikedPostIds(new Set([...cloudIds, ...Object.entries(state.likes).filter(([, liked]) => liked).map(([id]) => id)]));
  const stopLocal = subscribeLocalState(uid, notify);
  let stopCloud = () => {};
  try {
    const likesQuery = query(collectionGroup(db(), 'likes'), where('userId', '==', uid));
    stopCloud = onSnapshot(likesQuery, (snapshot) => {
      cloudIds = new Set(snapshot.docs.map((item) => item.ref.parent.parent?.id).filter((id): id is string => Boolean(id)));
      const state = readLocalState(uid); const likes = { ...state.likes };
      for (const id of new Set([...Object.keys(likes), ...cloudIds])) if (!Object.hasOwn(state.pendingLikes, id)) likes[id] = cloudIds.has(id);
      writeLocalState(uid, { ...state, likes });
      notify(readLocalState(uid)); markCloudStream(uid, 'likes', true); void syncPendingLocalLikes(uid);
    }, (error) => {
      if (isFallbackError(error)) { markCloudStream(uid, 'likes', false); notify(readLocalState(uid)); }
      else onError(error);
    });
  } catch (error) {
    if (isFallbackError(error)) { markCloudStream(uid, 'likes', false); notify(readLocalState(uid)); }
    else onError(error instanceof Error ? error : new Error(String(error)));
  }
  return () => { stopLocal(); stopCloud(); };
}

export interface BlogPostInput {
  title: string;
  excerpt: string;
  content: string;
  category: BlogPost['category'];
  subjectTag: string;
  tags: string[];
  imageUrl: string;
  readTimeMinutes: number;
  status: 'draft' | 'published';
}

export async function createBlog(input: BlogPostInput, learner: {
  uid: string; name: string; stage: string; gradeLevel: string; avatarUrl: string;
}) {
  const data = {
    ...input,
    authorId: learner.uid,
    authorName: learner.name,
    authorAvatarUrl: learner.avatarUrl,
    authorRole: 'learner',
    authorStage: learner.stage,
    authorGrade: learner.gradeLevel,
    coverGradient: 'from-purple-600 via-indigo-600 to-blue-700',
    likeCount: 0,
    commentCount: 0,
    commentAction: null,
    commentActionId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    publishedAt: input.status === 'published' ? serverTimestamp() : null,
  };
  try {
    const ref = await addDoc(collection(db(), 'blogs'), data);
    const now = new Date().toISOString();
    const state = readLocalState(learner.uid);
    writeLocalState(learner.uid, { ...state, posts: [serializePost(ref.id, { ...data, createdAt: now, updatedAt: now, publishedAt: input.status === 'published' ? now : null }), ...state.posts.filter((post) => post.id !== ref.id)] });
    return ref.id;
  } catch (error) {
    if (!isFallbackError(error)) throw error;
    const id = `local-${learner.uid}-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    const local = { ...serializePost(id, { ...data, createdAt: now, updatedAt: now, publishedAt: input.status === 'published' ? now : null }, true), pendingAction: 'create' };
    const state = readLocalState(learner.uid);
    writeLocalState(learner.uid, { ...state, posts: [local, ...state.posts.filter((post) => post.id !== id)] });
    setStorageMode('local');
    return id;
  }
}

async function syncPendingLocalPosts(uid: string) {
  if (pendingSync) return pendingSync;
  pendingSync = (async () => {
    const initial = readLocalState(uid);
    for (const localPost of initial.posts.filter((post) => post.pending)) {
      try {
        const ref = doc(db(), 'blogs', localPost.id);
        if (localPost.pendingAction === 'delete' || localPost.status === 'deleted') {
          if (!await deleteBlog(localPost.id)) break;
          const latest = readLocalState(uid);
          writeLocalState(uid, { ...latest, posts: latest.posts.filter((post) => post.id !== localPost.id), comments: latest.comments.filter((comment) => comment.postId !== localPost.id) });
          continue;
        }
        if (localPost.pendingAction === 'create') {
          try {
            await setDoc(ref, {
              authorId: localPost.authorId, authorName: localPost.authorName, authorAvatarUrl: localPost.authorAvatarUrl,
              authorRole: localPost.authorRole, authorStage: localPost.authorStage, authorGrade: localPost.authorGrade,
              title: localPost.title, excerpt: localPost.excerpt, content: localPost.content, category: localPost.category,
              subjectTag: localPost.subjectTag, tags: localPost.tags, imageUrl: localPost.imageUrl,
              readTimeMinutes: localPost.readTimeMinutes, status: localPost.status, coverGradient: localPost.coverGradient,
              likeCount: Number(localPost.likeCount ?? 0), commentCount: Number(localPost.commentCount ?? 0),
              commentAction: null, commentActionId: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
              publishedAt: localPost.status === 'published' ? serverTimestamp() : null,
            });
          } catch (writeError) {
            try { const existing = await getDoc(ref); if (!existing.exists() || existing.data().authorId !== uid) throw writeError; }
            catch { throw writeError; }
          }
        } else if (localPost.pendingAction === 'update') {
          await updateDoc(ref, {
            title: localPost.title, excerpt: localPost.excerpt, content: localPost.content, category: localPost.category,
            subjectTag: localPost.subjectTag, tags: localPost.tags, imageUrl: localPost.imageUrl,
            readTimeMinutes: localPost.readTimeMinutes, status: localPost.status,
            publishedAt: localPost.publishedAt ?? (localPost.status === 'published' ? serverTimestamp() : null), updatedAt: serverTimestamp(),
          });
        }
        const latest = readLocalState(uid);
        writeLocalState(uid, { ...latest, posts: latest.posts.map((post) => post.id === localPost.id ? { ...post, pending: false, pendingAction: undefined } : post) });
      } catch (error) {
        if (!isFallbackError(error)) console.warn('Community item remains on this device until it can sync.', error);
        setStorageMode('local');
        break;
      }
    }
    const state = readLocalState(uid);
    for (const comment of state.comments.filter((item) => item.pending)) {
      try {
        if (comment.pendingAction === 'delete') {
          await deleteBlogComment(comment.postId, comment.id);
          const latest = readLocalState(uid); writeLocalState(uid, { ...latest, comments: latest.comments.filter((item) => item.id !== comment.id) });
        } else if (comment.pendingAction === 'update') {
          await updateDoc(doc(db(), 'blogs', comment.postId, 'comments', comment.id), { content: comment.content, updatedAt: serverTimestamp() });
          const latest = readLocalState(uid); writeLocalState(uid, { ...latest, comments: latest.comments.map((item) => item.id === comment.id ? { ...item, pending: false, pendingAction: undefined } : item) });
        } else {
          await addBlogComment(comment.postId, {
            uid, name: String(comment.authorName ?? ''), gradeLevel: String(comment.gradeLevel ?? ''), avatarUrl: String(comment.authorAvatarUrl ?? ''),
          }, String(comment.content ?? ''), comment.id);
        }
      } catch { setStorageMode('local'); break; }
    }
    await syncPendingLocalLikes(uid);
    await syncPendingLocalReports(uid);
    refreshStorageMode(uid);
  })().finally(() => { pendingSync = null; });
  return pendingSync;
}

async function syncPendingLocalLikes(uid: string) {
  const state = readLocalState(uid);
  for (const [postId, liked] of Object.entries(state.pendingLikes)) {
    try { await setBlogLikeState(postId, uid, liked); }
    catch { setStorageMode('local'); return; }
  }
}

export async function updateBlog(postId: string, input: BlogPostInput) {
  const uid = firebaseAuth?.currentUser?.uid;
  try {
    const ref = doc(db(), 'blogs', postId);
    const snapshot = await runTransaction(db(), async (transaction) => {
      const post = await transaction.get(ref);
      if (!post.exists()) throw new Error('This blog post no longer exists.');
      return post.data();
    });
    await updateDoc(ref, { ...input, updatedAt: serverTimestamp(), publishedAt: snapshot.publishedAt ?? (input.status === 'published' ? serverTimestamp() : null) });
    if (uid) {
      const state = readLocalState(uid); const now = new Date().toISOString();
      writeLocalState(uid, { ...state, posts: state.posts.map((post) => post.id === postId ? { ...post, ...input, updatedAt: now, publishedAt: post.publishedAt ?? (input.status === 'published' ? now : null) } : post) });
    }
  } catch (error) {
    if (!uid || !isFallbackError(error)) throw error;
    const state = readLocalState(uid);
    const post = state.posts.find((item) => item.id === postId && item.authorId === uid);
    if (!post) throw error;
    const now = new Date().toISOString();
    const promoted = post.status === 'draft' && input.status === 'published';
    const updated = { ...post, ...input, updatedAt: now, publishedAt: post.publishedAt ?? (promoted ? now : null), pending: true,
      pendingAction: post.pendingAction === 'create' ? 'create' : 'update' };
    writeLocalState(uid, { ...state, posts: state.posts.map((item) => item.id === postId ? updated : item) });
    setStorageMode('local');
  }
}

export async function toggleBlogLike(postId: string, uid: string) {
  try {
    const postRef = doc(db(), 'blogs', postId); const likeRef = doc(db(), 'blogs', postId, 'likes', uid);
    let nextLiked = false;
    let nextCount = 0;
    await runTransaction(db(), async (transaction) => {
      const [post, like] = await Promise.all([transaction.get(postRef), transaction.get(likeRef)]);
      if (!post.exists() || post.data().status !== 'published') throw new Error('This post is no longer available.');
      nextLiked = !like.exists();
      nextCount = Math.max(0, Number(post.data().likeCount ?? 0) + (nextLiked ? 1 : -1));
      if (like.exists()) { transaction.delete(likeRef); transaction.update(postRef, { likeCount: Math.max(0, Number(post.data().likeCount ?? 0) - 1) }); }
      else { transaction.set(likeRef, { userId: uid, createdAt: serverTimestamp() }); transaction.update(postRef, { likeCount: Number(post.data().likeCount ?? 0) + 1 }); }
    });
    const state = readLocalState(uid); writeLocalState(uid, { ...state, likes: { ...state.likes, [postId]: nextLiked }, pendingLikes: Object.fromEntries(Object.entries(state.pendingLikes).filter(([id]) => id !== postId)), posts: state.posts.map((post) => post.id === postId ? { ...post, likeCount: nextCount } : post) });
  } catch (error) {
    if (!isFallbackError(error)) throw error;
    const state = readLocalState(uid); const wasLiked = Boolean(state.likes[postId]); const post = state.posts.find((item) => item.id === postId && item.status === 'published');
    if (!post) throw new Error('This post is not available in local mode. Open it while online first, or publish a local post.');
    writeLocalState(uid, { ...state, likes: { ...state.likes, [postId]: !wasLiked }, pendingLikes: { ...state.pendingLikes, [postId]: !wasLiked },
      posts: state.posts.map((item) => item.id === postId ? { ...item, likeCount: Math.max(0, Number(item.likeCount ?? 0) + (wasLiked ? -1 : 1)) } : item) });
    setStorageMode('local');
  }
}

async function setBlogLikeState(postId: string, uid: string, liked: boolean) {
  const postRef = doc(db(), 'blogs', postId); const likeRef = doc(db(), 'blogs', postId, 'likes', uid);
  let nextCount = 0;
  await runTransaction(db(), async (transaction) => {
    const [post, like] = await Promise.all([transaction.get(postRef), transaction.get(likeRef)]);
    if (!post.exists() || post.data().status !== 'published') throw new Error('This post is no longer available.');
    nextCount = Math.max(0, Number(post.data().likeCount ?? 0) + (like.exists() === liked ? 0 : liked ? 1 : -1));
    if (like.exists() === liked) return;
    transaction.update(postRef, { likeCount: nextCount });
    if (liked) transaction.set(likeRef, { userId: uid, createdAt: serverTimestamp() }); else transaction.delete(likeRef);
  });
  const state = readLocalState(uid); writeLocalState(uid, { ...state, likes: { ...state.likes, [postId]: liked }, pendingLikes: Object.fromEntries(Object.entries(state.pendingLikes).filter(([id]) => id !== postId)), posts: state.posts.map((item) => item.id === postId ? { ...item, likeCount: nextCount } : item) });
}

export function subscribeToBlogComments(
  postId: string,
  onComments: (comments: BlogPostComment[], cursor: QueryDocumentSnapshot<DocumentData> | null, hasMore: boolean) => void,
  onError: (error: Error) => void,
) {
  const uid = firebaseAuth?.currentUser?.uid;
  if (!uid) { onError(new Error('Sign in to view comments.')); return () => {}; }
  let cloudComments: BlogPostComment[] = [];
  let cloudCursor: QueryDocumentSnapshot<DocumentData> | null = null;
  let cloudHasMore = false;
  let stopCloud = () => {};
  const notify = (state: LocalCommunityState) => {
    const local = state.comments.filter((comment) => comment.postId === postId && comment.status === 'published').map((comment) => mapCommentData(comment.id, comment));
    const combined = new Map(local.map((comment) => [comment.id, comment])); cloudComments.forEach((comment) => combined.set(comment.id, comment));
    const comments = [...combined.values()].sort((a, b) => asDate(b.createdAt).getTime() - asDate(a.createdAt).getTime());
    onComments(comments, cloudCursor, cloudHasMore);
  };
  const stopLocal = subscribeLocalState(uid, notify);
  try {
    const commentsQuery = query(collection(db(), 'blogs', postId, 'comments'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(COMMENT_PAGE_SIZE));
    stopCloud = onSnapshot(commentsQuery, (snapshot) => {
      cloudComments = snapshot.docs.map(mapComment);
      cloudCursor = snapshot.docs.at(-1) ?? null; cloudHasMore = snapshot.size === COMMENT_PAGE_SIZE;
      cacheRemoteComments(uid, postId, snapshot.docs); notify(readLocalState(uid)); markCloudStream(uid, `comments:${postId}`, true);
    }, (error) => {
      if (isFallbackError(error)) { markCloudStream(uid, `comments:${postId}`, false); notify(readLocalState(uid)); }
      else onError(error);
    });
  } catch (error) {
    if (isFallbackError(error)) { markCloudStream(uid, `comments:${postId}`, false); notify(readLocalState(uid)); }
    else onError(error instanceof Error ? error : new Error(String(error)));
  }
  return () => { stopLocal(); stopCloud(); };
}

function mapCommentData(id: string, data: Record<string, unknown>): BlogPostComment {
  return {
    id,
    authorId: String(data.authorId ?? ''),
    authorName: String(data.authorName ?? 'Berry learner'),
    authorAvatarUrl: typeof data.authorAvatarUrl === 'string' ? data.authorAvatarUrl : undefined,
    authorRole: String(data.authorRole ?? 'Learner'),
    content: String(data.content ?? ''),
    timestamp: dateLabel(data.createdAt),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    status: data.status as BlogPostComment['status'],
    likesCount: 0,
  };
}
function mapComment(item: QueryDocumentSnapshot<DocumentData>): BlogPostComment { return mapCommentData(item.id, item.data()); }
function cacheRemoteComments(uid: string, postId: string, comments: QueryDocumentSnapshot<DocumentData>[]) {
  const state = readLocalState(uid); const byId = new Map(state.comments.map((comment) => [comment.id, comment]));
  comments.forEach((snapshot) => { const old = byId.get(snapshot.id); if (!old?.pending) byId.set(snapshot.id, { ...serializePost(snapshot.id, snapshot.data()), postId: postId } as LocalComment); });
  writeLocalState(uid, { ...state, comments: [...byId.values()] });
}

export async function loadMoreBlogComments(postId: string, cursor: QueryDocumentSnapshot<DocumentData>) {
  try {
    const snapshot = await getDocs(query(collection(db(), 'blogs', postId, 'comments'), where('status', '==', 'published'), orderBy('createdAt', 'desc'), startAfter(cursor), limit(COMMENT_PAGE_SIZE)));
    return { comments: snapshot.docs.map(mapComment), cursor: snapshot.docs.at(-1) ?? cursor, hasMore: snapshot.size === COMMENT_PAGE_SIZE };
  } catch (error) {
    if (!isFallbackError(error)) throw error;
    setStorageMode('local');
    return { comments: [], cursor, hasMore: false };
  }
}

export async function addBlogComment(postId: string, learner: { uid: string; name: string; gradeLevel: string; avatarUrl: string }, content: string, stableCommentId?: string) {
  try {
    const commentRef = stableCommentId ? doc(db(), 'blogs', postId, 'comments', stableCommentId) : doc(collection(db(), 'blogs', postId, 'comments'));
    const postRef = doc(db(), 'blogs', postId);
    let nextCount = 0;
    await runTransaction(db(), async (transaction) => {
      const post = await transaction.get(postRef);
      if (!post.exists() || post.data().status !== 'published') throw new Error('Comments are closed for this post.');
      nextCount = Number(post.data().commentCount ?? 0);
      if (stableCommentId && post.data().commentAction === 'create' && post.data().commentActionId === stableCommentId) return;
      nextCount += 1;
      transaction.set(commentRef, {
        authorId: learner.uid, authorName: learner.name, authorAvatarUrl: learner.avatarUrl,
        authorRole: `${learner.gradeLevel} learner`, content: content.trim(), status: 'published',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      transaction.update(postRef, {
        commentCount: Number(post.data().commentCount ?? 0) + 1,
        commentAction: 'create', commentActionId: commentRef.id, updatedAt: serverTimestamp(),
      });
    });
    const state = readLocalState(learner.uid); const now = new Date().toISOString();
    const comment: LocalComment = { id: commentRef.id, postId, authorId: learner.uid, authorName: learner.name, authorAvatarUrl: learner.avatarUrl,
      authorRole: `${learner.gradeLevel} learner`, gradeLevel: learner.gradeLevel, content: content.trim(), status: 'published', createdAt: now, updatedAt: now };
    writeLocalState(learner.uid, { ...state, comments: [comment, ...state.comments.filter((item) => item.id !== commentRef.id)], posts: state.posts.map((item) => item.id === postId ? { ...item, commentCount: nextCount } : item) });
  } catch (error) {
    if (!isFallbackError(error)) throw error;
    const state = readLocalState(learner.uid); const post = state.posts.find((item) => item.id === postId && item.status === 'published');
    if (!post) throw new Error('This post is not available in local mode. Open it while online first, or publish a local post.');
    const id = stableCommentId ?? `local-comment-${crypto.randomUUID()}`; const now = new Date().toISOString();
    const alreadyStored = state.comments.some((item) => item.id === id);
    const comment: LocalComment = { id, postId, authorId: learner.uid, authorName: learner.name, authorAvatarUrl: learner.avatarUrl,
      authorRole: `${learner.gradeLevel} learner`, gradeLevel: learner.gradeLevel, content: content.trim(), status: 'published', createdAt: now, updatedAt: now, pending: true, pendingAction: 'create' };
    writeLocalState(learner.uid, { ...state, comments: [comment, ...state.comments.filter((item) => item.id !== id)],
      posts: state.posts.map((item) => item.id === postId ? { ...item, commentCount: Number(item.commentCount ?? 0) + (alreadyStored ? 0 : 1) } : item) });
    setStorageMode('local');
  }
}

export async function updateBlogComment(postId: string, commentId: string, content: string) {
  const uid = firebaseAuth?.currentUser?.uid;
  try {
    await updateDoc(doc(db(), 'blogs', postId, 'comments', commentId), { content: content.trim(), updatedAt: serverTimestamp() });
    if (uid) { const state = readLocalState(uid); writeLocalState(uid, { ...state, comments: state.comments.map((item) => item.id === commentId ? { ...item, content: content.trim(), updatedAt: new Date().toISOString(), pending: false, pendingAction: undefined } : item) }); }
  }
  catch (error) {
    if (!uid || !isFallbackError(error)) throw error;
    const state = readLocalState(uid); const comment = state.comments.find((item) => item.id === commentId && item.postId === postId && item.authorId === uid);
    if (!comment) throw error;
    writeLocalState(uid, { ...state, comments: state.comments.map((item) => item.id === commentId ? { ...item, content: content.trim(), updatedAt: new Date().toISOString(), pending: true, pendingAction: item.pendingAction === 'create' ? 'create' : 'update' } : item) });
    setStorageMode('local');
  }
}

export async function deleteBlogComment(postId: string, commentId: string) {
  const uid = firebaseAuth?.currentUser?.uid;
  try {
    const commentRef = doc(db(), 'blogs', postId, 'comments', commentId); const postRef = doc(db(), 'blogs', postId);
    let nextCount = 0;
    await runTransaction(db(), async (transaction) => {
      const [post, comment] = await Promise.all([transaction.get(postRef), transaction.get(commentRef)]);
      if (!post.exists() || !comment.exists()) throw new Error('This comment no longer exists.');
      transaction.delete(commentRef);
      nextCount = Math.max(0, Number(post.data().commentCount ?? 0) - 1);
      transaction.update(postRef, { commentCount: nextCount, commentAction: 'delete', commentActionId: commentRef.id, updatedAt: serverTimestamp() });
    });
    if (uid) { const state = readLocalState(uid); writeLocalState(uid, { ...state, comments: state.comments.filter((item) => item.id !== commentId), posts: state.posts.map((item) => item.id === postId ? { ...item, commentCount: nextCount } : item) }); }
  } catch (error) {
    if (!uid || !isFallbackError(error)) throw error;
    const state = readLocalState(uid); const comment = state.comments.find((item) => item.id === commentId && item.postId === postId && item.authorId === uid);
    if (!comment) throw error;
    const nextComments = comment.pendingAction === 'create'
      ? state.comments.filter((item) => item.id !== commentId)
      : state.comments.map((item) => item.id === commentId ? { ...item, status: 'hidden', pending: true, pendingAction: 'delete' } : item);
    writeLocalState(uid, { ...state, comments: nextComments,
      posts: state.posts.map((item) => item.id === postId ? { ...item, commentCount: Math.max(0, Number(item.commentCount ?? 0) - (comment.pendingAction === 'delete' ? 0 : 1)) } : item) });
    setStorageMode('local');
  }
}

export async function deleteBlog(postId: string): Promise<boolean> {
  const uid = firebaseAuth?.currentUser?.uid;
  try {
    const postRef = doc(db(), 'blogs', postId);
    await updateDoc(postRef, { status: 'deleted', updatedAt: serverTimestamp() });
    for (const childCollection of ['comments', 'likes']) {
      let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
      while (true) {
        const page = await getDocs(query(collection(db(), 'blogs', postId, childCollection), ...(cursor ? [startAfter(cursor)] : []), limit(400)));
        if (page.empty) break;
        const batch = writeBatch(db()); page.docs.forEach((item) => batch.delete(item.ref)); await batch.commit();
        cursor = page.docs.at(-1); if (page.size < 400) break;
      }
    }
    await deleteDoc(postRef);
    if (uid) {
      const state = readLocalState(uid);
      writeLocalState(uid, { ...state, posts: state.posts.filter((item) => item.id !== postId), comments: state.comments.filter((item) => item.postId !== postId), likes: Object.fromEntries(Object.entries(state.likes).filter(([id]) => id !== postId)) });
    }
    return true;
  } catch (error) {
    if (!uid || !isFallbackError(error)) throw error;
    const state = readLocalState(uid); const post = state.posts.find((item) => item.id === postId && item.authorId === uid);
    if (!post) throw error;
    if (post.pendingAction === 'create') {
      writeLocalState(uid, { ...state, posts: state.posts.filter((item) => item.id !== postId), comments: state.comments.filter((item) => item.postId !== postId), likes: Object.fromEntries(Object.entries(state.likes).filter(([id]) => id !== postId)) });
    } else {
      writeLocalState(uid, { ...state, posts: state.posts.map((item) => item.id === postId ? { ...item, status: 'deleted', pending: true, pendingAction: 'delete' } : item) });
    }
    setStorageMode('local');
    return false;
  }
}

export interface CommunityReport {
  id: string;
  targetType: 'post' | 'comment';
  targetId: string;
  postId: string;
  reporterId: string;
  reason: string;
  details: string;
  status: 'open' | 'reviewed';
  createdAt?: unknown;
  pending?: boolean;
}

async function syncPendingLocalReports(uid: string) {
  const state = readLocalState(uid);
  for (const report of state.reports.filter((item) => item.pending)) {
    try {
      const ref = doc(db(), 'communityReports', report.id);
      try {
        await setDoc(ref, {
          targetType: report.targetType, targetId: report.targetId, postId: report.postId, reporterId: report.reporterId,
          reason: report.reason, details: report.details, status: 'open', createdAt: serverTimestamp(),
        });
      } catch (writeError) {
        try { const existing = await getDoc(ref); if (!existing.exists() || existing.data().reporterId !== uid) throw writeError; }
        catch { throw writeError; }
      }
      const latest = readLocalState(uid);
      writeLocalState(uid, { ...latest, reports: latest.reports.map((item) => item.id === report.id ? { ...item, pending: false } : item) });
    } catch { setStorageMode('local'); return; }
  }
}

export async function loadCommunityReportContext(report: CommunityReport) {
  const post = await getDoc(doc(db(), 'blogs', report.postId));
  if (!post.exists()) return 'The reported post has already been removed.';
  if (report.targetType === 'post') {
    const data = post.data();
    return 'Post: ' + String(data.title ?? '(untitled)') + '\nBy: ' + String(data.authorName ?? 'Learner') + '\n\n' + String(data.content ?? '').slice(0, 1200);
  }
  const comment = await getDoc(doc(db(), 'blogs', report.postId, 'comments', report.targetId));
  if (!comment.exists()) return 'The reported comment has already been removed.';
  const data = comment.data();
  return 'Comment on “' + String(post.data().title ?? 'blog post') + '”\nBy: ' + String(data.authorName ?? 'Learner') + '\n\n' + String(data.content ?? '').slice(0, 1200);
}

export async function reportCommunityItem(input: Omit<CommunityReport, 'id' | 'status' | 'createdAt' | 'pending'>) {
  try {
    await addDoc(collection(db(), 'communityReports'), { ...input, status: 'open', createdAt: serverTimestamp() });
    return false;
  } catch (error) {
    if (!isFallbackError(error)) throw error;
    const id = `local-report-${input.reporterId}-${crypto.randomUUID()}`;
    const state = readLocalState(input.reporterId);
    writeLocalState(input.reporterId, { ...state, reports: [{ ...input, id, status: 'open', createdAt: new Date().toISOString(), pending: true }, ...state.reports] });
    setStorageMode('local');
    return true;
  }
}

export function subscribeToOpenCommunityReports(onReports: (reports: CommunityReport[]) => void, onError: (error: Error) => void) {
  const reportsQuery = query(collection(db(), 'communityReports'), where('status', '==', 'open'), orderBy('createdAt', 'desc'), limit(100));
  return onSnapshot(reportsQuery, (snapshot) => onReports(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as CommunityReport)), onError);
}

export async function reviewCommunityReport(report: CommunityReport, moderatorId: string, action: 'dismiss' | 'hide', notes: string) {
  const reportRef = doc(db(), 'communityReports', report.id);
  const postRef = doc(db(), 'blogs', report.postId);
  const targetRef = report.targetType === 'post'
    ? postRef
    : doc(db(), 'blogs', report.postId, 'comments', report.targetId);
  await runTransaction(db(), async (transaction) => {
    const reads = report.targetType === 'comment'
      ? await Promise.all([transaction.get(reportRef), transaction.get(targetRef), transaction.get(postRef)])
      : await Promise.all([transaction.get(reportRef), transaction.get(targetRef)]);
    const reportDoc = reads[0];
    const targetDoc = reads[1];
    const parentPost = report.targetType === 'comment' ? reads[2] : null;
    if (!reportDoc.exists()) throw new Error('This report is no longer available.');
    if (action === 'hide' && targetDoc.exists() && targetDoc.data().status !== 'hidden') {
      transaction.update(targetRef, {
        status: 'hidden',
        moderation: { moderatorId, reportId: report.id, action, reviewedAt: serverTimestamp(), notes: notes.slice(0, 500) },
        updatedAt: serverTimestamp(),
      });
      if (report.targetType === 'comment' && parentPost?.exists()) {
        transaction.update(postRef, {
          commentCount: Math.max(0, Number(parentPost.data().commentCount ?? 0) - 1),
          commentAction: 'hide',
          commentActionId: report.targetId,
          updatedAt: serverTimestamp(),
        });
      }
    }
    transaction.update(reportRef, {
      status: 'reviewed',
      action,
      notes: notes.slice(0, 500),
      reviewedBy: moderatorId,
      reviewedAt: serverTimestamp(),
    });
  });
}
