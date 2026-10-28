import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const openTextbookCache = new Map<string, { expiresAt: number; payload: unknown }>();

app.use(express.json({ limit: '10mb' }));

// Open Textbook Library's public JSON API proxy. Keep the upstream request on
// the existing Express server and cache query results briefly for resilience.
app.get('/api/library/open-textbooks', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 100) : '';
  const requestedPage = Number.parseInt(typeof req.query.page === 'string' ? req.query.page : '1', 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, Math.min(requestedPage, 100)) : 1;
  const cacheKey = `${query.toLocaleLowerCase()}|${page}`;
  const cached = openTextbookCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('X-Berry-Catalogue', 'cache');
    return res.json(cached.payload);
  }

  try {
    const apiUrl = new URL('https://open.umn.edu/opentextbooks/textbooks.json');
    apiUrl.searchParams.set('page', String(page));
    if (query) apiUrl.searchParams.set('q', query);

    const response = await fetch(apiUrl, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`Open Textbook Library returned ${response.status}`);
    }

    const body = await response.json() as {
      data?: Array<Record<string, any>>;
      links?: { next?: string | null };
    };
    if (!Array.isArray(body.data)) throw new Error('Unexpected Open Textbook Library response');

    const licenseLabels: Record<string, string> = {
      Attribution: 'CC BY',
      'Attribution-ShareAlike': 'CC BY-SA',
      'Attribution-NonCommercial': 'CC BY-NC',
      'Attribution-NonCommercial-ShareAlike': 'CC BY-NC-SA',
      'Attribution-NoDerivs': 'CC BY-ND',
      'Attribution-NonCommercial-NoDerivs': 'CC BY-NC-ND',
      'No Rights Reserved': 'CC0',
      'Free Documentation License (GNU)': 'GNU Free Documentation License',
    };
    const languageNames: Record<string, string> = { eng: 'English', spa: 'Spanish', fre: 'French', fra: 'French', por: 'Portuguese', deu: 'German', ger: 'German', ita: 'Italian', ara: 'Arabic', zho: 'Chinese', rus: 'Russian' };
    const now = new Date().toISOString();
    const data = body.data.map((book) => {
      const contributors = Array.isArray(book.contributors) ? book.contributors : [];
      const authors = contributors
        .filter((person: Record<string, any>) => !person.contribution || /author/i.test(person.contribution))
        .map((person: Record<string, any>) => [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ').trim() || person.name)
        .filter(Boolean);
      const subjects = Array.isArray(book.subjects) ? book.subjects.map((subject: Record<string, any>) => subject.name).filter(Boolean) : [];
      const publishers = Array.isArray(book.publishers) ? book.publishers.map((publisher: Record<string, any>) => publisher.name).filter(Boolean) : [];
      const formats = Array.isArray(book.formats) ? book.formats : [];
      const onlineFormat = formats.find((format: Record<string, any>) => /online/i.test(format.type || ''));
      const pdfFormat = formats.find((format: Record<string, any>) => /pdf/i.test(format.type || ''));
      const chosenFormat = onlineFormat || pdfFormat || formats.find((format: Record<string, any>) => format.url);
      const formatNames = [...new Set(formats.map((format: Record<string, any>) => format.type).filter(Boolean))];
      const recordUrl = typeof book.url === 'string' && book.url.startsWith('https://open.umn.edu/')
        ? book.url
        : `https://open.umn.edu/opentextbooks/textbooks/${book.id}`;

      return {
        id: `otl-${book.id}`,
        title: book.title,
        author: authors.length ? authors.join(', ') : undefined,
        publisher: publishers.length ? publishers.join(', ') : undefined,
        description: typeof book.description === 'string' ? book.description : undefined,
        language: languageNames[book.language] || (typeof book.language === 'string' ? book.language : undefined),
        accessType: pdfFormat && chosenFormat === pdfFormat ? 'download' : 'read_online',
        provider: 'Open Textbook Library',
        url: typeof chosenFormat?.url === 'string' && /^https?:\/\//i.test(chosenFormat.url) ? chosenFormat.url : recordUrl,
        recordUrl,
        levels: ['university'],
        curriculumGroup: 'international',
        curriculumLabel: 'University • international supplemental',
        subjects,
        keywords: subjects,
        materialTypes: ['textbooks'],
        accessLabel: pdfFormat ? 'Free • online and PDF options' : 'Free online textbook',
        accessNote: formatNames.length ? `Available formats listed by the library: ${formatNames.join(', ')}.` : 'Open the library record to check available formats.',
        licenseLabel: licenseLabels[book.license] || (typeof book.license === 'string' ? book.license : 'Check the library record'),
        isOfficial: false,
        verifiedAt: now,
        catalogueUpdatedAt: typeof book.updated_at === 'string' ? book.updated_at : undefined,
        catalogueSource: 'api',
      };
    });

    const payload = { data, nextPageAvailable: Boolean(body.links?.next), page, source: 'Open Textbook Library API' };
    openTextbookCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60 * 1000, payload });
    if (openTextbookCache.size > 50) {
      const oldestKey = openTextbookCache.keys().next().value;
      if (oldestKey) openTextbookCache.delete(oldestKey);
    }
    res.setHeader('X-Berry-Catalogue', 'live');
    return res.json(payload);
  } catch (error) {
    console.error('Open Textbook Library catalogue error:', error);
    if (cached) {
      res.setHeader('X-Berry-Catalogue', 'stale-cache');
      return res.json(cached.payload);
    }
    return res.status(502).json({ error: 'The Open Textbook Library is temporarily unavailable.' });
  }
});

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Socratic pedagogical tutor endpoint
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, stage, courseTitle, currentTopic, history } = req.body;
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'A non-empty message is required.' });
    }

    // Accept only a short, well-formed conversation history from the client.
    // Bound message sizes so a stale or malformed client cannot send huge prompts.
    const safeHistory = Array.isArray(history)
      ? history.slice(-12)
          .filter((item: unknown): item is { role: 'user' | 'model'; text: string } => {
            if (!item || typeof item !== 'object') return false;
            const candidate = item as { role?: unknown; text?: unknown };
            return (
              (candidate.role === 'user' || candidate.role === 'model') &&
              typeof candidate.text === 'string'
            );
          })
          .map((item) => ({
            role: item.role,
            parts: [{ text: item.text.slice(0, 8000) }],
          }))
      : [];

    // Gemini conversation contents should begin with a user turn; a new Berry chat
    // starts with a local welcome message, so discard any leading assistant-only turns.
    while (safeHistory[0]?.role === 'model') {
      safeHistory.shift();
    }

    const stageGuidelines: Record<string, string> = {
      early: 'The learner is in PP1 or PP2. Use very simple, playful, child-friendly language, short sentences, concrete examples, and gentle encouragement. Keep content age-appropriate and safe.',
      junior: 'The learner is a child or early adolescent (PP1-Grade 9 CBC). Use simple, encouraging, warm, concrete language with analogies and examples. Do not give direct solutions to homework; guide them step-by-step.',
      senior: 'The learner is a secondary/high school student (Grades 10-12 CBC/international). Provide clear conceptual explanations, step-by-step problem-solving hints, and revision strategies without answering test questions directly.',
      advance: 'The learner is in an advanced learning pathway. Provide deeper technical explanations, structured reasoning, practical examples, and clear distinctions between established facts and uncertainty.',
      university: 'The learner is an undergraduate or postgraduate student. Use rigorous academic terminology, cite research methodologies, provide structured guidance, and encourage critical thinking.',
      professionals: 'The learner is a working professional or career changer. Provide pragmatic workplace applications, real-world industry best practices, and action-oriented takeaways.',
    };

    const personaInstructions = stageGuidelines[stage] || stageGuidelines['senior'];

    if (aiClient) {
      const systemInstruction = `You are Berry AI, the personalized learning assistant for the Berry learning platform.
Current Learner Stage: ${stage}
Current Course: ${courseTitle || 'General Studies'}
Current Topic: ${currentTopic || 'Active Curriculum'}

${personaInstructions}

Core Principles:
1. You are a Socratic tutor, NOT an answer vending machine.
2. Never give away raw answers to quizzes, graded assignments, or tests.
3. Ask guiding questions, point out conceptual connections, and recommend practical practice.
4. Keep answers focused, well-formatted with markdown, bolding, and bullet points.`;

      const contents = [
        ...safeHistory,
        { role: 'user' as const, parts: [{ text: message.trim().slice(0, 8000) }] },
      ];
      const generationConfig = {
        systemInstruction,
        temperature: 0.7,
      };

      if (req.body?.stream === true) {
        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        try {
          const stream = await aiClient.models.generateContentStream({
            model: 'gemini-3.8-flash',
            contents,
            config: generationConfig,
          });
          for await (const chunk of stream) {
            if (res.destroyed) return;
            const text = typeof chunk.text === 'string' ? chunk.text : '';
            if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
          }
          if (!res.destroyed) {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        } catch (streamError) {
          console.error('Berry AI stream error:', streamError);
          if (!res.destroyed) {
            res.write(`data: ${JSON.stringify({ error: 'Berry AI generation was interrupted. Please retry.' })}\n\n`);
            res.end();
          }
        }
        return;
      }

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: generationConfig,
      });

      const reply = response.text || 'I am here to guide your learning. Could you rephrase your question?';
      return res.json({ reply, source: 'gemini' });
    } else {
      return res.status(503).json({
        error: 'Berry AI is not configured yet. Add the server-side GEMINI_API_KEY to enable live AI responses.',
      });
    }
  } catch (err: any) {
    console.error('Berry AI Chat Error:', err);
    return res.status(500).json({
      error: 'Unable to process tutor request',
      details: err?.message || 'Server error',
    });
  }
});

// Transcript summarizer endpoint (University & Professionals only)
app.post('/api/ai/summarize-transcript', async (req, res) => {
  try {
    const { transcript, title, stage } = req.body;

    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: 'No transcript text provided' });
    }

    if (stage !== 'university' && stage !== 'professionals') {
      return res.status(403).json({ error: 'Live transcription analysis is restricted to University and Professional stages.' });
    }

    if (aiClient) {
      const prompt = `You are Berry Academic Assistant. Provide a structured, highly useful lecture summary of the following lecture/meeting transcript for a ${stage} learner.
Include:
1. Executive Summary (2-3 sentences)
2. Key Takeaways & Core Concepts (bullet points)
3. Action Items & Follow-up Study Questions

Title: ${title}
Transcript:
${transcript}`;

      const response = await aiClient.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      return res.json({
        summary: response.text || 'Summary generated.',
        source: 'gemini',
      });
    } else {
      return res.status(503).json({
        error: 'Berry AI summarization is not configured yet. Add the server-side GEMINI_API_KEY to enable AI summaries.',
      });
    }
  } catch (err: any) {
    console.error('Transcript summary error:', err);
    return res.status(500).json({ error: 'Failed to summarize transcript' });
  }
});

// Dev server / production static handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

   
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('');
    console.log('🍓 Berry is running!');
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://127.0.0.1:${PORT}`);
    console.log('');
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other server or choose another port.`);
    } else {
      console.error('Berry server failed to start:', error);
    }
    process.exitCode = 1;
  });
}

startServer();
