import test from 'node:test';
import assert from 'node:assert/strict';
import { clearExamDraft, readExamDraft, writeExamDraft } from './examDraft';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

test('exam draft restores selected answers for the same active server session', () => {
  const storage = createStorage();
  writeExamDraft(storage, 'exam', { q1: 2, q2: 0 }, '2026-11-06T12:00:00.000Z');
  assert.deepEqual(readExamDraft(storage, 'exam', '2026-11-06T12:00:00.000Z'), { q1: 2, q2: 0 });
});

test('exam draft is not carried into a different exam session or retake', () => {
  const storage = createStorage();
  writeExamDraft(storage, 'exam', { q1: 2 }, '2026-11-06T12:00:00.000Z');
  assert.deepEqual(readExamDraft(storage, 'exam', '2026-11-07T12:00:00.000Z'), {});
});

test('exam draft ignores malformed data and invalid answer values', () => {
  const storage = createStorage();
  storage.setItem('bad', '{not-json');
  assert.deepEqual(readExamDraft(storage, 'bad', 'expiry'), {});
  storage.setItem('mixed', JSON.stringify({ expiresAt: 'expiry', answers: { q1: 1, q2: -1, q3: '2', '': 0 } }));
  assert.deepEqual(readExamDraft(storage, 'mixed', 'expiry'), { q1: 1 });
});

test('exam draft can be cleared after a submitted attempt', () => {
  const storage = createStorage();
  writeExamDraft(storage, 'exam', { q1: 1 }, 'expiry');
  clearExamDraft(storage, 'exam');
  assert.deepEqual(readExamDraft(storage, 'exam', 'expiry'), {});
});
