export type ExamDraftAnswers = Record<string, number>;

export function readExamDraft(
  storage: Pick<Storage, 'getItem'>,
  key: string,
  expiresAt: string,
): ExamDraftAnswers {
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { expiresAt?: unknown; answers?: unknown };
    if (parsed.expiresAt !== expiresAt || !parsed.answers || typeof parsed.answers !== 'object' || Array.isArray(parsed.answers)) return {};
    return Object.fromEntries(
      Object.entries(parsed.answers as Record<string, unknown>)
        .filter(([questionId, answer]) => questionId.length > 0 && Number.isInteger(answer) && Number(answer) >= 0),
    ) as ExamDraftAnswers;
  } catch {
    return {};
  }
}

export function writeExamDraft(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  answers: ExamDraftAnswers,
  expiresAt: string,
): void {
  storage.setItem(key, JSON.stringify({ answers, expiresAt }));
}

export function clearExamDraft(storage: Pick<Storage, 'removeItem'>, key: string): void {
  storage.removeItem(key);
}
