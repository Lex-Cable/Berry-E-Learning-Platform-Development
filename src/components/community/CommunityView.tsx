import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  PlusCircle,
  Clock,
  User,
  Tag,
  Edit3,
  Trash2,
  X,
  Send,
  CheckCircle2,
  Sparkles,
  BookOpen,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { BlogPost, BlogPostComment, LearnerProfile } from '../../types';
import { INITIAL_BLOG_POSTS } from '../../data/curriculumData';

interface CommunityViewProps {
  posts?: BlogPost[];
  learner: LearnerProfile;
  onAddPost?: (post: BlogPost) => void;
  onLikePost?: (postId: string) => void;
  onReplyPost?: (postId: string, replyText: string) => void;
}

export const CommunityView: React.FC<CommunityViewProps> = ({
  learner,
}) => {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(() => {
    const saved = localStorage.getItem('berry_community_blogs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_BLOG_POSTS;
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [readingPost, setReadingPost] = useState<BlogPost | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);

  // Form states for Create / Edit
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'Subject Insights' as BlogPost['category'],
    subjectTag: 'General',
    readTimeMinutes: 3,
  });

  // Comment input state inside read modal
  const [newCommentText, setNewCommentText] = useState('');

  // Persist blog posts
  const persistPosts = (updated: BlogPost[]) => {
    setBlogPosts(updated);
    localStorage.setItem('berry_community_blogs', JSON.stringify(updated));
    if (readingPost) {
      const refreshed = updated.find((p) => p.id === readingPost.id);
      if (refreshed) setReadingPost(refreshed);
    }
  };

  // Like Toggle
  const handleToggleLike = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = blogPosts.map((post) => {
      if (post.id === postId) {
        const nextLiked = !post.hasLiked;
        return {
          ...post,
          hasLiked: nextLiked,
          likesCount: nextLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1),
        };
      }
      return post;
    });
    persistPosts(updated);
  };

  // Delete Post
  const handleDeletePost = (postId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this blog post?')) return;
    const updated = blogPosts.filter((p) => p.id !== postId);
    persistPosts(updated);
    if (readingPost?.id === postId) setReadingPost(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (post: BlogPost, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingPost(post);
    setFormData({
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      category: post.category,
      subjectTag: post.subjectTag,
      readTimeMinutes: post.readTimeMinutes,
    });
  };

  // Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !formData.title.trim()) return;

    const updated = blogPosts.map((p) =>
      p.id === editingPost.id
        ? {
            ...p,
            title: formData.title.trim(),
            excerpt: formData.excerpt.trim(),
            content: formData.content.trim(),
            category: formData.category,
            subjectTag: formData.subjectTag.trim(),
            readTimeMinutes: formData.readTimeMinutes || 3,
          }
        : p
    );

    persistPosts(updated);
    setEditingPost(null);
  };

  // Create New Post
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    const gradients = [
      'from-purple-600 via-indigo-600 to-blue-700',
      'from-emerald-500 via-teal-600 to-cyan-700',
      'from-amber-500 via-orange-600 to-rose-600',
      'from-blue-600 via-cyan-600 to-teal-700',
    ];
    const randomGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const newPost: BlogPost = {
      id: `post-${Date.now()}`,
      title: formData.title.trim(),
      excerpt: formData.excerpt.trim() || formData.content.slice(0, 120) + '...',
      content: formData.content.trim(),
      authorName: learner.name,
      authorRole: 'learner',
      authorStage: learner.stage,
      authorGrade: learner.gradeLevel,
      category: formData.category,
      stage: learner.stage,
      subjectTag: formData.subjectTag.trim() || 'General',
      coverGradient: randomGradient,
      readTimeMinutes: formData.readTimeMinutes || 3,
      timestamp: 'Just now',
      likesCount: 0,
      hasLiked: false,
      comments: [],
      isUserPost: true,
    };

    persistPosts([newPost, ...blogPosts]);
    setShowCreateModal(false);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'Subject Insights',
      subjectTag: 'General',
      readTimeMinutes: 3,
    });
  };

  // Add Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!readingPost || !newCommentText.trim()) return;

    const comment: BlogPostComment = {
      id: `comm-${Date.now()}`,
      authorName: learner.name,
      authorRole: `${learner.gradeLevel} Learner`,
      content: newCommentText.trim(),
      timestamp: 'Just now',
      likesCount: 0,
    };

    const updated = blogPosts.map((p) =>
      p.id === readingPost.id
        ? {
            ...p,
            comments: [...p.comments, comment],
          }
        : p
    );

    persistPosts(updated);
    setNewCommentText('');
  };

  // Filtered posts
  const filteredPosts = blogPosts.filter((p) => {
    if (activeCategory !== 'all' && p.category !== activeCategory) return false;
    if (
      searchQuery &&
      !p.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !p.subjectTag.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold mb-2">
            <Sparkles size={14} className="text-purple-600" />
            <span>Berry Community Blog & Articles</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Knowledge Sharing & Academic Blogs
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Explore guides, study hacks, and curriculum breakdowns contributed by learners, mentors, and educators.
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({
              title: '',
              excerpt: '',
              content: '',
              category: 'Subject Insights',
              subjectTag: 'General',
              readTimeMinutes: 3,
            });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex-shrink-0"
        >
          <PlusCircle size={16} />
          <span>Write a Blog Post</span>
        </button>
      </div>

      {/* Filter and Category Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {/* Categories */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'All Articles' },
            { id: 'Subject Insights', label: 'Subject Insights' },
            { id: 'Study Hacks', label: 'Study Hacks' },
            { id: 'CBC Guides', label: 'CBC Guides' },
            { id: 'Tech & Innovation', label: 'Tech & Innovation' },
            { id: 'Career & University', label: 'Career & University' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-8 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-purple-300 transition-all text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* =========================================
          RESPONSIVE BLOG GRID
          ========================================= */}
      {filteredPosts.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <BookOpen size={36} className="mx-auto text-slate-300" />
          <h3 className="font-bold text-slate-700">No blog posts found</h3>
          <p className="text-xs text-slate-400">
            Be the first to share an article or adjust your search filter!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <article
              key={post.id}
              onClick={() => setReadingPost(post)}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-purple-300 transition-all cursor-pointer flex flex-col group"
            >
              {/* Cover Gradient Banner */}
              <div
                className={`h-36 bg-gradient-to-tr ${post.coverGradient} p-4 flex flex-col justify-between text-white relative`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold tracking-wide uppercase border border-white/20">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1 text-[11px] font-medium bg-black/20 backdrop-blur-md px-2 py-0.5 rounded-full">
                    <Clock size={12} />
                    <span>{post.readTimeMinutes} min read</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Tag size={13} className="opacity-80" />
                  <span>{post.subjectTag}</span>
                </div>
              </div>

              {/* Body Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-purple-700 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>
                </div>

                {/* Author Card & Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs">
                        {post.authorName.charAt(0)}
                      </div>
                      <div className="leading-tight">
                        <span className="font-bold text-xs text-slate-800 block">
                          {post.authorName}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {post.authorGrade} • {post.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Edit / Delete (for user posts or demo) */}
                    {(post.isUserPost || post.authorName === learner.name) && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => handleOpenEdit(post, e)}
                          title="Edit post"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={(e) => handleDeletePost(post.id, e)}
                          title="Delete post"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Likes and Comments Bar */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => handleToggleLike(post.id, e)}
                        className={`flex items-center gap-1 font-semibold transition-colors ${
                          post.hasLiked ? 'text-rose-600' : 'hover:text-rose-600'
                        }`}
                      >
                        <Heart
                          size={15}
                          className={post.hasLiked ? 'fill-rose-500 text-rose-500' : ''}
                        />
                        <span>{post.likesCount}</span>
                      </button>

                      <div className="flex items-center gap-1 font-semibold">
                        <MessageCircle size={15} />
                        <span>{post.comments.length}</span>
                      </div>
                    </div>

                    <span className="text-purple-600 font-bold text-[11px] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Read full article <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* =========================================
          READ ARTICLE & COMMENTS MODAL
          ========================================= */}
      {readingPost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col">
            {/* Modal Header */}
            <div
              className={`p-6 sm:p-8 bg-gradient-to-tr ${readingPost.coverGradient} text-white relative`}
            >
              <button
                onClick={() => setReadingPost(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
                  {readingPost.category}
                </span>
                <span className="text-xs font-medium opacity-90">
                  {readingPost.readTimeMinutes} min read • {readingPost.subjectTag}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black leading-tight">
                {readingPost.title}
              </h2>

              <div className="flex items-center gap-3 mt-4 text-xs font-medium opacity-90">
                <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center font-bold">
                  {readingPost.authorName.charAt(0)}
                </div>
                <div>
                  <span className="block font-bold">{readingPost.authorName}</span>
                  <span className="text-[11px] opacity-80">
                    {readingPost.authorGrade} • {readingPost.timestamp}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 flex-1">
              <div className="prose prose-slate max-w-none text-sm sm:text-base leading-relaxed text-slate-800 whitespace-pre-line">
                {readingPost.content}
              </div>

              {/* Like inside article */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => handleToggleLike(readingPost.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    readingPost.hasLiked
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Heart
                    size={16}
                    className={readingPost.hasLiked ? 'fill-rose-500 text-rose-500' : ''}
                  />
                  <span>
                    {readingPost.hasLiked ? 'Liked' : 'Like this post'} ({readingPost.likesCount})
                  </span>
                </button>

                {(readingPost.isUserPost || readingPost.authorName === learner.name) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(readingPost)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeletePost(readingPost.id)}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Comments Section */}
              <div className="pt-6 border-t border-slate-200 space-y-4">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <MessageCircle size={18} className="text-purple-600" />
                  <span>Discussion & Comments ({readingPost.comments.length})</span>
                </h3>

                {/* New Comment Input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder="Share your feedback, question, or study tip..."
                    className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!newCommentText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                  >
                    <Send size={13} />
                    <span>Post</span>
                  </button>
                </form>

                {/* Comments List */}
                <div className="space-y-3 pt-2">
                  {readingPost.comments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No comments yet. Be the first to start the conversation!
                    </p>
                  ) : (
                    readingPost.comments.map((comm) => (
                      <div
                        key={comm.id}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{comm.authorName}</span>
                            <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {comm.authorRole}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400">{comm.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{comm.content}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          CREATE BLOG POST MODAL
          ========================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-900">Write a Community Blog Post</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Article Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to Tackle Grade 10 Periodic Trends Without Cramming"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as BlogPost['category'],
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  >
                    <option value="Subject Insights">Subject Insights</option>
                    <option value="Study Hacks">Study Hacks</option>
                    <option value="CBC Guides">CBC Guides</option>
                    <option value="Tech & Innovation">Tech & Innovation</option>
                    <option value="Career & University">Career & University</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Subject Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chemistry, Math"
                    value={formData.subjectTag}
                    onChange={(e) => setFormData({ ...formData, subjectTag: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Read Time (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.readTimeMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        readTimeMinutes: parseInt(e.target.value) || 3,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Short Excerpt *
                </label>
                <input
                  type="text"
                  required
                  placeholder="One or two sentences summarizing the key takeaway..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Content (Markdown supported) *
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Share your structured insights, examples, or revision tips here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-3.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-purple-400 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          EDIT BLOG POST MODAL
          ========================================= */}
      {editingPost && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-900">Edit Blog Post</h3>
              <button
                onClick={() => setEditingPost(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as BlogPost['category'],
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  >
                    <option value="Subject Insights">Subject Insights</option>
                    <option value="Study Hacks">Study Hacks</option>
                    <option value="CBC Guides">CBC Guides</option>
                    <option value="Tech & Innovation">Tech & Innovation</option>
                    <option value="Career & University">Career & University</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Subject Tag
                  </label>
                  <input
                    type="text"
                    value={formData.subjectTag}
                    onChange={(e) => setFormData({ ...formData, subjectTag: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Excerpt</label>
                <input
                  type="text"
                  required
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Content</label>
                <textarea
                  required
                  rows={6}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full p-3.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
