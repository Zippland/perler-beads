import { describe, expect, test } from 'vitest';
import { createBoardPlan } from './boardPlan';

describe('createBoardPlan', () => {
  test('uses a single 52 peg board for charts that fit within 52 by 52', () => {
    const plan = createBoardPlan({ gridWidth: 48, gridHeight: 39, preference: 'auto' });

    expect(plan.boardSize).toBe(52);
    expect(plan.columns).toBe(1);
    expect(plan.rows).toBe(1);
    expect(plan.totalBoards).toBe(1);
    expect(plan.capacityWidth).toBe(52);
    expect(plan.capacityHeight).toBe(52);
    expect(plan.wasteCells).toBe(832);
    expect(plan.boards).toEqual([
      {
        id: 'A1',
        boardRow: 0,
        boardColumn: 0,
        gridStartRow: 0,
        gridStartColumn: 0,
        gridEndRowExclusive: 39,
        gridEndColumnExclusive: 48,
        usedWidth: 48,
        usedHeight: 39,
      },
    ]);
  });

  test('uses a single 104 peg board for charts that exceed 52 but fit within 104', () => {
    const plan = createBoardPlan({ gridWidth: 87, gridHeight: 66, preference: 'auto' });

    expect(plan.boardSize).toBe(104);
    expect(plan.columns).toBe(1);
    expect(plan.rows).toBe(1);
    expect(plan.totalBoards).toBe(1);
    expect(plan.wasteCells).toBe(5074);
  });

  test('chooses fewer total boards before comparing waste', () => {
    const plan = createBoardPlan({ gridWidth: 170, gridHeight: 88, preference: 'auto' });

    expect(plan.boardSize).toBe(104);
    expect(plan.columns).toBe(2);
    expect(plan.rows).toBe(1);
    expect(plan.totalBoards).toBe(2);
    expect(plan.capacityWidth).toBe(208);
    expect(plan.capacityHeight).toBe(104);
    expect(plan.wasteCells).toBe(6672);
    expect(plan.boards.map((board) => board.id)).toEqual(['A1', 'A2']);
    expect(plan.boards[1]).toMatchObject({
      gridStartColumn: 104,
      gridEndColumnExclusive: 170,
      usedWidth: 66,
      usedHeight: 88,
    });
  });

  test('honors a fixed board preference without changing chart size', () => {
    const plan = createBoardPlan({ gridWidth: 170, gridHeight: 88, preference: 52 });

    expect(plan.boardSize).toBe(52);
    expect(plan.columns).toBe(4);
    expect(plan.rows).toBe(2);
    expect(plan.totalBoards).toBe(8);
    expect(plan.usedWidth).toBe(170);
    expect(plan.usedHeight).toBe(88);
    expect(plan.boards.at(-1)).toMatchObject({
      id: 'B4',
      gridStartRow: 52,
      gridStartColumn: 156,
      gridEndRowExclusive: 88,
      gridEndColumnExclusive: 170,
      usedWidth: 14,
      usedHeight: 36,
    });
  });
});
