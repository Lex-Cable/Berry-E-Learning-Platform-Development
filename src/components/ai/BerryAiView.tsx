import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Square,
  RefreshCw,
  BookOpen,
  ArrowRight,
  Bot,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { LearnerProfile, Course, AiConversation, AiChatMessage } from '../../types';
import { INITIAL_CONVERSATIONS } from '../../data/curriculumData';
import { firebaseAuth } from '../../lib/firebase';
import {
  deleteAiConversation,
  loadAiConversations,
  saveAiConversation,
} from '../../services/aiConversations';

interface BerryAiViewProps {
  learner: LearnerProfile;
  courses: Course[];
  onOpenLesson: (course: Course, lessonId: string) => void;
}

export const BerryAiView: React.FC<BerryAiViewProps> = ({
  learner,
  courses,
  onOpenLesson,
}) => {
  // Find current active course for context
  const activeCourse =
    courses.find((c) => learner.enrolledCourseIds.includes(c.id)) || courses[0];

  const [conversations, setConversations] = useState<AiConversation[]>([]);

  const [activeConvId, setActiveConvId] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingReply, setStreamingReply] = useState('');
  const requestControllerRef = useRef<AbortController | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [loadedForLearner, setLoadedForLearner] = useState<string | null>(null);
  const [persistenceMode, setPersistenceMode] = useState<'cloud' | 'local' | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // In-line thread renaming
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Prefer authenticated Firestore storage so chats survive refreshes and sign-ins on other devices.
  // Keep profile-scoped local storage as a fallback when Firebase is not configured or reachable.
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const localKey = `berry_ai_conversations_${learner.id}`;
      const loadLocal = (): AiConversation[] => {
        try {
          const saved = localStorage.getItem(localKey);
          const parsed = saved ? JSON.parse(saved) : null;
          return Array.isArray(parsed) ? parsed as AiConversation[] : INITIAL_CONVERSATIONS;
        } catch {
          return INITIAL_CONVERSATIONS;
        }
      };

      const user = firebaseAuth?.currentUser;
      if (user && user.uid === learner.id) {
        try {
          const cloudConversations = await loadAiConversations(user.uid);
          if (cancelled) return;
          const localConversations = loadLocal();
          const conversationsToUse = cloudConversations.length
            ? cloudConversations
            : localStorage.getItem(localKey)
              ? localConversations
              : [];
          setConversations(conversationsToUse);
          setActiveConvId(conversationsToUse[0]?.id || '');
          setPersistenceMode('cloud');
        } catch (error) {
          if (cancelled) return;
          console.warn('Could not load Berry AI history from Firestore:', error);
          const localConversations = loadLocal();
          setConversations(localConversations);
          setActiveConvId(localConversations[0]?.id || '');
          setPersistenceMode('local');
          setRequestError('Cloud chat history is unavailable. This chat is using this browser until cloud access is restored.');
        }
      } else {
        const localConversations = loadLocal();
        setConversations(localConversations);
        setActiveConvId(localConversations[0]?.id || '');
        setPersistenceMode('local');
      }
      if (!cancelled) setLoadedForLearner(learner.id);
    };

    setLoadedForLearner(null);
    setPersistenceMode(null);
    void load();
    return () => {
      cancelled = true;
    };
  }, [learner.id]);

  useEffect(() => {
    if (loadedForLearner !== learner.id || persistenceMode === null) return;
    const localKey = `berry_ai_conversations_${learner.id}`;
    try {
      localStorage.setItem(localKey, JSON.stringify(conversations));
    } catch (error) {
      console.warn('Could not save Berry AI chat history locally:', error);
      setRequestError('Chat history could not be saved in this browser. Check available storage.');
    }

    const user = firebaseAuth?.currentUser;
    if (persistenceMode === 'cloud' && user && user.uid === learner.id) {
      conversations.forEach((conversation) => {
        void saveAiConversation(user.uid, conversation).catch((error) => {
          console.warn('Could not sync Berry AI conversation:', error);
          setRequestError('Cloud chat sync failed. Your latest chat remains saved in this browser.');
        });
      });
    }
  }, [conversations, learner.id, loadedForLearner, persistenceMode]);
  // Auto-scroll to bottom of conversation
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversations, activeConvId, loading]);

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0];

  // Stage-tailored prompt suggestions
  const promptSuggestions = {
    early: [
      'Can you sing a number song about 1, 2, and 3 lions? 🦁',
      'What sound does the letter /a/ make in Apple? 🍎',
      'How do domestic animals help families in Kenya? 🐄',
      'Can you tell me a playful story about counting zebras?',
    ],
    junior: [
      'Why does 1/2 + 1/4 equal 3/4 instead of 2/6 in Grade 1 math?',
      'Explain the difference between coarse and fine focus knobs on a microscope!',
      'What are the key safety precautions when using tools in Pre-Technical studies?',
      'Give me a real-world Kenyan example of calculating total magnification.',
    ],
    senior: [
      'Explain Bohr electron configurations of Sodium vs Chlorine',
      'Why does atomic radius decrease across Period 3 in the Periodic Table?',
      'How does the accounting equation maintain balance when purchasing equipment?',
      'Compare aerobic respiration and ATP-PC systems in endurance runners.',
    ],
    advance: [
      'Explain Master Theorem Case 2 with divide-and-conquer recurrence intuition',
      'How should I weight Precision vs Recall for credit card fraud detection?',
      'What are the trade-offs between AVL tree height balancing and Red-Black trees?',
      'How do enterprise ML pipelines remediate concept and covariate drift?',
    ],
    university: [
      'Explain Master Theorem Case 2 with divide-and-conquer recurrence intuition',
      'What are the trade-offs between AVL tree height balancing and Red-Black trees?',
    ],
    professionals: [
      'How should I weight Precision vs Recall for credit card fraud detection?',
      'How do enterprise ML pipelines remediate concept and covariate drift?',
    ],
  }[learner.stage] || [
    'Help me understand the core concepts in my course.',
    'Test my understanding with a guided question!',
  ];

  const handleCreateNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConv: AiConversation = {
      id: newId,
      title: 'New Conversation',
      createdAt: 'Just now',
      updatedAt: 'Just now',
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'assistant',
          text: `Hello ${learner.name}! I am Berry AI, your Socratic study companion for **${
            activeCourse?.title || 'your curriculum'
          }**.\n\nI will help you build deep, genuine understanding step-by-step. What concept, homework problem, or curiosity would you like to explore?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    setConversations([newConv, ...conversations]);
    setActiveConvId(newId);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length <= 1) {
      alert('You must keep at least one conversation in history.');
      return;
    }
    const filtered = conversations.filter((c) => c.id !== id);
    const user = firebaseAuth?.currentUser;
    if (persistenceMode === 'cloud' && user && user.uid === learner.id) {
      void deleteAiConversation(user.uid, id).catch((error) => {
        console.warn('Could not delete Berry AI conversation from Firestore:', error);
        setRequestError('The conversation could not be deleted from cloud history. Please check your connection and try again.');
      });
    }
    setConversations(filtered);
    if (activeConvId === id) {
      setActiveConvId(filtered[0].id);
    }
  };

  const handleStartRename = (conv: AiConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(conv.id);
    setEditTitleText(conv.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editTitleText.trim()) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: editTitleText.trim() } : c))
    );
    setEditingConvId(null);
  };

  const handleSend = async (messageText?: string, retryExisting = false) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading || !activeConversation) return;

    const userMessage: AiChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const isFirstUserMessage =
      activeConversation.messages.filter((m) => m.sender === 'user').length === 0;

    const updatedTitle =
      isFirstUserMessage && activeConversation.title === 'New Conversation'
        ? textToSend.trim().slice(0, 32) + (textToSend.length > 32 ? '...' : '')
        : activeConversation.title;

    if (!retryExisting) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? {
                ...c,
                title: updatedTitle,
                updatedAt: 'Just now',
                messages: [...c.messages, userMessage],
              }
            : c
        )
      );
    }

    setRequestError(null);
    setInput('');
    setLoading(true);
    setStreamingReply('');
    const controller = new AbortController();
    requestControllerRef.current = controller;
    let streamedText = '';
    const retryIndex = retryExisting ? activeConversation.messages.reduce(
      (found, item, index) => item.sender === 'user' && item.text === textToSend.trim() ? index : found, -1
    ) : -1;
    const contextMessages = retryIndex >= 0 ? activeConversation.messages.slice(0, retryIndex) : activeConversation.messages;

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: textToSend,
          stream: true,
          stage: learner.stage,
          courseTitle: activeCourse?.title,
          currentTopic: activeCourse?.chapters[0]?.title,
          history: contextMessages
            .slice(-12)
            .map((message) => ({
              role: message.sender === 'assistant' ? 'model' : 'user',
              text: message.text,
            })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === 'string' ? data.error : 'Berry AI request failed. Please retry.');
      }
      if (!res.body) throw new Error('This browser cannot stream Berry AI responses. Please retry.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let ended = false;
      while (!ended) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        for (const event of events) {
          const line = event.split('\n').find((entry) => entry.startsWith('data: '));
          if (!line) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') { ended = true; break; }
          const chunk = JSON.parse(payload) as { text?: string; error?: string };
          if (chunk.error) throw new Error(chunk.error);
          if (typeof chunk.text === 'string') {
            streamedText += chunk.text;
            setStreamingReply(streamedText);
          }
        }
      }
      if (!streamedText.trim()) throw new Error('Berry AI returned an empty response. Please retry.');
      const assistantMessage: AiChatMessage = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: streamedText,
        source: 'Berry AI · Gemini',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, messages: [...c.messages, assistantMessage] }
            : c
        )
      );
    } catch (err) {
      if (streamedText.trim()) {
        const partial: AiChatMessage = {
          id: `asst-partial-${Date.now()}`, sender: 'assistant', text: streamedText,
          source: 'Berry AI · Interrupted response',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setConversations((prev) => prev.map((conversation) => conversation.id === activeConversation.id
          ? { ...conversation, messages: [...conversation.messages, partial] } : conversation));
      }
      setInput(textToSend);
      setRequestError(err instanceof DOMException && err.name === 'AbortError'
        ? 'Generation stopped. Any response text received so far has been kept in this chat.'
        : err instanceof TypeError
          ? 'Berry AI could not connect. Check your internet connection and retry your message.'
          : err instanceof Error ? err.message
            : 'Berry AI could not respond. Your message is saved in this chat; please retry.');
    } finally {
      requestControllerRef.current = null;
      setStreamingReply('');
      setLoading(false);
    }
  };

  const handleRegenerate = (assistantMessageId: string) => {
    if (loading || !activeConversation) return;
    const messageIndex = activeConversation.messages.findIndex((message) => message.id === assistantMessageId);
    if (messageIndex < 0) return;
    const previousUser = activeConversation.messages.slice(0, messageIndex).reverse().find((message) => message.sender === 'user');
    if (!previousUser) return;

    setConversations((prev) => prev.map((conversation) =>
      conversation.id === activeConversation.id
        ? { ...conversation, messages: conversation.messages.slice(0, messageIndex) }
        : conversation
    ));
    setInput(previousUser.text);
    void handleSend(previousUser.text, true);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter conversations matching search query
  const filteredConversations = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-[calc(100vh-8.5rem)] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      {/* =========================================
          LEFT COLLAPSIBLE SIDEBAR: CONVERSATION HISTORY
          ========================================= */}
      <div
        className={`flex flex-col border-r border-slate-200 bg-slate-50 transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'w-80' : 'w-0 -translate-x-full lg:w-0'
        } overflow-hidden`}
      >
        {/* Top Controls: New Chat & Search */}
        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <button
            onClick={handleCreateNewChat}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-all active:scale-95"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>

          {/* Search Conversation History */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search chat history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-transparent focus:border-purple-300 focus:bg-white focus:outline-none transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Conversation Threads List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Past Conversations ({filteredConversations.length})
          </div>

          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No conversations found matching "{searchQuery}"
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              const isEditing = editingConvId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`group relative flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                    isActive
                      ? 'bg-purple-100/70 text-purple-950 font-bold border border-purple-200'
                      : 'text-slate-700 hover:bg-slate-200/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 overflow-hidden flex-1 mr-2">
                    <MessageSquare
                      size={15}
                      className={isActive ? 'text-purple-600 flex-shrink-0' : 'text-slate-400 flex-shrink-0'}
                    />

                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(conv.id, e)}
                        className="flex-1 flex items-center gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editTitleText}
                          onChange={(e) => setEditTitleText(e.target.value)}
                          className="w-full text-xs px-2 py-0.5 rounded bg-white border border-purple-400 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="p-1 hover:text-emerald-600"
                          title="Save"
                        >
                          <Check size={13} />
                        </button>
                      </form>
                    ) : (
                      <div className="flex-1 truncate">
                        <span className="truncate block">{conv.title}</span>
                        <span className="text-[10px] font-normal text-slate-400 block truncate">
                          {conv.updatedAt}
                        </span>
                      </div>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="hidden group-hover:flex items-center gap-1">
                      <button
                        onClick={(e) => handleStartRename(conv, e)}
                        title="Rename"
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        title="Delete"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: Model Specs */}
        <div className="p-3 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles size={13} className="text-purple-600" />
            <span className="font-semibold text-slate-700">Berry Gemini Socratic</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold text-slate-600 uppercase">
            Active
          </span>
        </div>
      </div>

      {/* =========================================
          MAIN CHAT AREA: CHATGPT STYLE
          ========================================= */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Header Bar */}
        <div className="h-14 border-b border-slate-200 px-4 flex items-center justify-between bg-white/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
              title={sidebarOpen ? 'Collapse conversation sidebar' : 'Expand conversation sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
            </button>

            <div>
              <h2 className="text-sm font-bold text-slate-900 line-clamp-1">
                {activeConversation?.title || 'Berry AI Socratic Tutor'}
              </h2>
              <p className="text-[10px] text-slate-500">
                Course: {activeCourse?.title} • {learner.stage.toUpperCase()} Mode
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateNewChat}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
            >
              <Plus size={13} />
              <span>New Thread</span>
            </button>
          </div>
        </div>

        {/* Messages Scroll View */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
          {requestError && (
            <div role="alert" className="mx-auto max-w-3xl flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <span>{requestError}</span>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => handleSend(input, true)} disabled={!input.trim() || loading} className="font-bold underline disabled:opacity-50">Retry</button>
                <button type="button" onClick={() => setRequestError(null)} className="font-bold underline">Dismiss</button>
              </div>
            </div>
          )}
          {activeConversation?.messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const messageIndex = activeConversation.messages.findIndex((message) => message.id === msg.id);
            const hasEarlierUserMessage = activeConversation.messages.slice(0, messageIndex).some((message) => message.sender === 'user');

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-xs ${
                    isUser
                      ? 'bg-purple-600 text-white'
                      : 'bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-400 text-white'
                  }`}
                >
                  {isUser ? <User size={14} /> : <Bot size={15} />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`space-y-1.5 max-w-2xl ${
                    isUser ? 'text-right' : 'text-left'
                  }`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 px-1">
                    <span className="font-semibold text-slate-600">
                      {isUser ? learner.name : 'Berry AI Tutor'}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line text-left shadow-xs ${
                      isUser
                        ? 'bg-purple-600 text-white rounded-tr-xs font-medium'
                        : 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    {msg.text}

                    {/* Copy action on assistant response */}
                    {!isUser && (
                      <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between gap-3 text-[11px] text-slate-400">
                        <span className="text-[10px] font-semibold text-purple-600">{msg.source || 'Socratic Dialogue'}</span>
                        <div className="flex items-center gap-3">
                          {hasEarlierUserMessage && (
                            <button type="button" onClick={() => handleRegenerate(msg.id)} disabled={loading} className="flex items-center gap-1 hover:text-slate-700 disabled:opacity-40 transition-colors" title="Regenerate response">
                              <RefreshCw size={12} /><span>Regenerate</span>
                            </button>
                          )}
                          <button type="button" onClick={() => handleCopy(msg.id, msg.text)} className="flex items-center gap-1 hover:text-slate-700 transition-colors">
                            {copiedId === msg.id ? <><Check size={12} className="text-emerald-600" /><span className="text-emerald-600">Copied</span></> : <><Copy size={12} /><span>Copy</span></>}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Socratic Follow-Up Chips */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.suggestedFollowUps.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(prompt)}
                          className="px-2.5 py-1 rounded-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-[11px] font-medium transition-all text-left"
                        >
                          👉 {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator Bubble */}
          {loading && (
            <div className="flex gap-3 mr-auto max-w-3xl">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-amber-400 text-white flex items-center justify-center flex-shrink-0 text-xs"><Bot size={15} /></div>
              <div className="min-w-0 flex-1 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 rounded-tl-xs text-xs sm:text-sm text-slate-800 whitespace-pre-wrap">
                {streamingReply || <span className="inline-flex items-center gap-2 text-purple-700 font-semibold"><Sparkles size={14} className="animate-spin" />Berry AI is thinking…</span>}
                {streamingReply && <span className="inline-block w-1.5 h-4 ml-1 bg-purple-500 animate-pulse align-middle" aria-label="Generating response" />}
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Suggested Prompts (when starting fresh chat) */}
        {activeConversation?.messages.length <= 1 && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Suggested Topics for {learner.stage.toUpperCase()}:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {promptSuggestions.slice(0, 4).map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p)}
                  className="text-left p-2 rounded-xl bg-white border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-xs text-slate-700 transition-all line-clamp-1"
                >
                  💡 {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Input Area */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 max-w-4xl mx-auto"
          >
            <div className="relative flex-1">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Ask Berry AI about ${activeCourse?.subject || 'your subjects'}... (Enter to send)`}
                className="w-full pl-4 pr-10 py-3 text-xs sm:text-sm rounded-2xl bg-slate-50 border border-slate-200 focus:border-purple-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-100 resize-none transition-all text-slate-800"
              />
            </div>

            {loading ? (
              <button type="button" onClick={() => requestControllerRef.current?.abort()} className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white shadow flex-shrink-0" title="Stop generation" aria-label="Stop generation">
                <Square size={16} fill="currentColor" />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="p-3 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white shadow transition-all active:scale-95 flex-shrink-0" title="Send message">
                <Send size={16} />
              </button>
            )}
          </form>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            Berry AI guides learning through Socratic dialogue. Never replaces classroom teachers or official exams.
          </p>
          <p className="text-[10px] text-center text-slate-400 mt-1" aria-live="polite">
            {persistenceMode === 'cloud'
              ? 'Chat history syncs to your Berry account.'
              : persistenceMode === 'local'
                ? 'Chat history is saved only in this browser.'
                : 'Loading chat history…'}
          </p>
        </div>
      </div>
    </div>
  );
};
