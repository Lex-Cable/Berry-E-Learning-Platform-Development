export interface InteractiveChoiceOption {
  id: string;
  label: string;
  isCorrect?: boolean;
}

function normalizeChoiceLabel(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
    : '';
}

export function isInteractiveChoiceCorrect(
  choices: InteractiveChoiceOption[],
  answer: { choiceId?: unknown; choiceLabel?: unknown } | null | undefined,
): boolean {
  const choiceId = typeof answer?.choiceId === 'string' ? answer.choiceId.trim() : '';
  const choiceLabel = normalizeChoiceLabel(answer?.choiceLabel);
  const selected = choices.find((choice) => choiceId && String(choice.id) === choiceId)
    || choices.find((choice) => choiceLabel && normalizeChoiceLabel(choice.label) === choiceLabel);
  return selected?.isCorrect === true;
}
