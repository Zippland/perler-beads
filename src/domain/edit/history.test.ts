import { describe, expect, test } from 'vitest';
import { createHistory, pushHistory, redoHistory, resetHistory, undoHistory } from './history';

describe('history', () => {
  test('pushes atomic transactions and supports undo and redo', () => {
    const first = createHistory('a');
    const second = pushHistory(first, 'b');
    const third = pushHistory(second, 'c');

    expect(third).toEqual({ past: ['a', 'b'], present: 'c', future: [] });
    expect(undoHistory(third)).toEqual({ past: ['a'], present: 'b', future: ['c'] });
    expect(redoHistory(undoHistory(third))).toEqual(third);
  });

  test('clears redo future when a new transaction is pushed after undo', () => {
    const history = pushHistory(undoHistory(pushHistory(pushHistory(createHistory('a'), 'b'), 'c')), 'd');

    expect(history).toEqual({ past: ['a', 'b'], present: 'd', future: [] });
  });

  test('resets to a new revision with empty undo and redo stacks', () => {
    const history = pushHistory(createHistory('a'), 'b');

    expect(resetHistory(history, 'z')).toEqual({ past: [], present: 'z', future: [] });
  });
});
