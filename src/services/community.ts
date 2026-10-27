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
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { BlogPost, BlogPostComment } from '../types';
import { firestoreDb } from '../lib/firebase';

const PAGE_SIZE = 20;
const COMMENT_PAGE_SIZE = 30;

function db() {
  if (!firestoreDb) throw new Error('Berry Community is not connected to Firebase. Check the Firebase configuration.');
  return firestoreDb;
}

function dateLabel(value: unknown) {
  const date = value instanceof Timestamp ? value.toDate() : value instanceof Date ? value : null;
  if (!date) return 'Recently';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date);
}

function mapPost(snapshot: QueryDocumentSnapshot<DocumentData>, currentUserId: string, likedPostIds: Set<string>): BlogPost {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    authorId: String(data.authorId ?? ''),
    authorName: String(data.authorName ?? 'Berry learner'),
    authorAvatarUrl: typeof data.authorAvatarUrl === 'string' ? data.authorAvatarUrl : undefined,
    authorRole: data.authorRole ?? 'learner',
    authorStage: data.authorStage ?? 'early',
    authorGrade: String(data.authorGrade ?? ''),
    title: String(data.title ?? ''),
    excerpt: String(data.excerpt ?? ''),
    content: String(data.content ?? ''),
    category: data.category,
    stage: data.authorStage ?? 'early',
    subjectTag: String(data.subjectTag ?? 'General'),
    tags: Array.isArray(data.tags) ? data.tags.filter((tag: unknown): tag is string => typeof tag === 'string') : [],
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
    coverGradient: String(data.coverGradient ?? 'from-purple-600 via-indigo-600 to-blue-700'),
    readTimeMinutes: Number(data.readTimeMinutes ?? 3),
    timestamp: dateLabel(data.publishedAt ?? data.updatedAt ?? data.createdAt),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    publishedAt: data.publishedAt,
    status: data.status,
    likesCount: Number(data.likeCount ?? 0),
    commentsCount: Number(data.commentCount ?? 0),
    hasLiked: likedPostIds.has(snapshot.id),
    comments: [],
    isUserPost: data.authorId === currentUserId,
  };
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
  const feedQuery = query(
    collection(db(), 'blogs'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    limit(PAGE_SIZE),
  );
  return onSnapshot(feedQuery, (snapshot) => {
    onPosts({
      posts: snapshot.docs.map((post) => mapPost(post, currentUserId, likedPostIds)),
      cursor: snapshot.docs.at(-1) ?? null,
      hasMore: snapshot.size === PAGE_SIZE,
    });
  }, onError);
}

export async function loadMorePublishedBlogs(
  currentUserId: string,
  likedPostIds: Set<string>,
  cursor: QueryDocumentSnapshot<DocumentData>,
) {
  const snapshot = await getDocs(query(
    collection(db(), 'blogs'),
    where('status', '==', 'published'),
    orderBy('publishedAt', 'desc'),
    startAfter(cursor),
    limit(PAGE_SIZE),
  ));
  return {
    posts: snapshot.docs.map((post) => mapPost(post, currentUserId, likedPostIds)),
    cursor: snapshot.docs.at(-1) ?? cursor,
    hasMore: snapshot.size === PAGE_SIZE,
  } satisfies CommunityPage;
}

export function subscribeToLearnerDrafts(
  uid: string,
  currentUserId: string,
  likedPostIds: Set<string>,
  onPosts: (posts: BlogPost[]) => void,
  onError: (error: Error) => void,
) {
  const draftsQuery = query(
    collection(db(), 'blogs'),
    where('authorId', '==', uid),
    where('status', '==', 'draft'),
    orderBy('updatedAt', 'desc'),
    limit(50),
  );
  return onSnapshot(draftsQuery, (snapshot) => {
    onPosts(snapshot.docs.map((post) => mapPost(post, currentUserId, likedPostIds)));
  }, onError);
}

export function subscribeToUserLikes(uid: string, onLikedPostIds: (postIds: Set<string>) => void, onError: (error: Error) => void) {
  const likesQuery = query(collectionGroup(db(), 'likes'), where('userId', '==', uid));
  return onSnapshot(likesQuery, (snapshot) => {
    onLikedPostIds(new Set(snapshot.docs.map((item) => item.ref.parent.parent?.id).filter((id): id is string => Boolean(id))));
  }, onError);
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
  const ref = await addDoc(collection(db(), 'blogs'), {
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
  });
  return ref.id;
}

export async function updateBlog(postId: string, input: BlogPostInput) {
  const ref = doc(db(), 'blogs', postId);
  const snapshot = await runTransaction(db(), async (transaction) => {
    const post = await transaction.get(ref);
    if (!post.exists()) throw new Error('This blog post no longer exists.');
    return post.data();
  });
  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
    publishedAt: snapshot.publishedAt ?? (input.status === 'published' ? serverTimestamp() : null),
  });
}

export async function toggleBlogLike(postId: string, uid: string) {
  const postRef = doc(db(), 'blogs', postId);
  const likeRef = doc(db(), 'blogs', postId, 'likes', uid);
  await runTransaction(db(), async (transaction) => {
    const [post, like] = await Promise.all([transaction.get(postRef), transaction.get(likeRef)]);
    if (!post.exists() || post.data().status !== 'published') throw new Error('This post is no longer available.');
    if (like.exists()) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likeCount: Math.max(0, Number(post.data().likeCount ?? 0) - 1) });
    } else {
      transaction.set(likeRef, { userId: uid, createdAt: serverTimestamp() });
      transaction.update(postRef, { likeCount: Number(post.data().likeCount ?? 0) + 1 });
    }
  });
}

export function subscribeToBlogComments(
  postId: string,
  onComments: (comments: BlogPostComment[], cursor: QueryDocumentSnapshot<DocumentData> | null, hasMore: boolean) => void,
  onError: (error: Error) => void,
) {
  const commentsQuery = query(
    collection(db(), 'blogs', postId, 'comments'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    limit(COMMENT_PAGE_SIZE),
  );
  return onSnapshot(commentsQuery, (snapshot) => {
    onComments(snapshot.docs.map(mapComment), snapshot.docs.at(-1) ?? null, snapshot.size === COMMENT_PAGE_SIZE);
  }, onError);
}

function mapComment(item: QueryDocumentSnapshot<DocumentData>): BlogPostComment {
  const data = item.data();
  return {
    id: item.id,
    authorId: String(data.authorId ?? ''),
    authorName: String(data.authorName ?? 'Berry learner'),
    authorAvatarUrl: typeof data.authorAvatarUrl === 'string' ? data.authorAvatarUrl : undefined,
    authorRole: String(data.authorRole ?? 'Learner'),
    content: String(data.content ?? ''),
    timestamp: dateLabel(data.createdAt),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    status: data.status,
    likesCount: 0,
  };
}

export async function loadMoreBlogComments(postId: string, cursor: QueryDocumentSnapshot<DocumentData>) {
  const snapshot = await getDocs(query(
    collection(db(), 'blogs', postId, 'comments'),
    where('status', '==', 'published'),
    orderBy('createdAt', 'desc'),
    startAfter(cursor),
    limit(COMMENT_PAGE_SIZE),
  ));
  return {
    comments: snapshot.docs.map(mapComment),
    cursor: snapshot.docs.at(-1) ?? cursor,
    hasMore: snapshot.size === COMMENT_PAGE_SIZE,
  };
}

export async function addBlogComment(postId: string, learner: { uid: string; name: string; gradeLevel: string; avatarUrl: string }, content: string) {
  const commentRef = doc(collection(db(), 'blogs', postId, 'comments'));
  const postRef = doc(db(), 'blogs', postId);
  await runTransaction(db(), async (transaction) => {
    const post = await transaction.get(postRef);
    if (!post.exists() || post.data().status !== 'published') throw new Error('Comments are closed for this post.');
    transaction.set(commentRef, {
      authorId: learner.uid,
      authorName: learner.name,
      authorAvatarUrl: learner.avatarUrl,
      authorRole: `${learner.gradeLevel} learner`,
      content: content.trim(),
      status: 'published',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    transaction.update(postRef, {
      commentCount: Number(post.data().commentCount ?? 0) + 1,
      commentAction: 'create',
      commentActionId: commentRef.id,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function updateBlogComment(postId: string, commentId: string, content: string) {
  await updateDoc(doc(db(), 'blogs', postId, 'comments', commentId), {
    content: content.trim(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBlogComment(postId: string, commentId: string) {
  const commentRef = doc(db(), 'blogs', postId, 'comments', commentId);
  const postRef = doc(db(), 'blogs', postId);
  await runTransaction(db(), async (transaction) => {
    const [post, comment] = await Promise.all([transaction.get(postRef), transaction.get(commentRef)]);
    if (!post.exists() || !comment.exists()) throw new Error('This comment no longer exists.');
    transaction.delete(commentRef);
    transaction.update(postRef, {
      commentCount: Math.max(0, Number(post.data().commentCount ?? 0) - 1),
      commentAction: 'delete',
      commentActionId: commentRef.id,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function deleteBlog(postId: string) {
  const postRef = doc(db(), 'blogs', postId);
  await updateDoc(postRef, { status: 'deleted', updatedAt: serverTimestamp() });
  for (const childCollection of ['comments', 'likes']) {
    let cursor: QueryDocumentSnapshot<DocumentData> | undefined;
    while (true) {
      const page = await getDocs(query(
        collection(db(), 'blogs', postId, childCollection),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(400),
      ));
      if (page.empty) break;
      const batch = writeBatch(db());
      page.docs.forEach((item) => batch.delete(item.ref));
      await batch.commit();
      cursor = page.docs.at(-1);
      if (page.size < 400) break;
    }
  }
  await deleteDoc(postRef);
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

export async function reportCommunityItem(input: Omit<CommunityReport, 'id' | 'status' | 'createdAt'>) {
  await addDoc(collection(db(), 'communityReports'), { ...input, status: 'open', createdAt: serverTimestamp() });
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
