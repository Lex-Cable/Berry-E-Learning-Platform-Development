import test from 'node:test';
import assert from 'node:assert/strict';
import { isInteractiveChoiceCorrect } from './interactiveChoiceGrading';

const choices = [
  { id: 't1', label: 'Try Square', isCorrect: true },
  { id: 't2', label: 'Crosscut Saw', isCorrect: false },
];

test('grades the selected correct choice by stable option ID', () => {
  assert.equal(isInteractiveChoiceCorrect(choices, { choiceId: 't1' }), true);
  assert.equal(isInteractiveChoiceCorrect(choices, { choiceId: 't2' }), false);
});

test('uses normalized visible label when a client option ID is stale', () => {
  assert.equal(isInteractiveChoiceCorrect(choices, { choiceId: 'old-option-id', choiceLabel: 'Try Square' }), true);
  assert.equal(isInteractiveChoiceCorrect(choices, { choiceId: 'old-option-id', choiceLabel: 'Crosscut Saw' }), false);
});

test('does not award marks for unknown or empty answers', () => {
  assert.equal(isInteractiveChoiceCorrect(choices, { choiceId: 'unknown' }), false);
  assert.equal(isInteractiveChoiceCorrect(choices, {}), false);
});
