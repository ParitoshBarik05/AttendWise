import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from './attendance.js';
const rows = (present, absent, cancelled = 0) => [
  ...Array.from({ length: present }, () => ({ status: 'present' })),
  ...Array.from({ length: absent }, () => ({ status: 'absent' })),
  ...Array.from({ length: cancelled }, () => ({ status: 'cancelled' }))
];
test('cancelled classes do not count toward attendance', () => { const x = summarize(rows(3, 1, 5), 75); assert.equal(x.total, 4); assert.equal(x.percentage, 75); });
test('calculates classes needed to reach 75 percent', () => { const x = summarize(rows(20, 10), 75); assert.equal(x.classesNeeded, 10); });
test('returns zero classes needed when target already met', () => { assert.equal(summarize(rows(9, 1), 75).classesNeeded, 0); });
test('does not claim a 100 percent target can be recovered after an absence', () => { assert.equal(summarize(rows(9, 1), 100).classesNeeded, null); });
test('empty records are represented without division by zero', () => { const x = summarize([], 75); assert.equal(x.percentage, 0); assert.equal(x.total, 0); });
