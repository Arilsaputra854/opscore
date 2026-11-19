import test from 'node:test';
import assert from 'node:assert/strict';
import { seed, can, createPR, approve, moveStock } from '../src/core.js';

test('seeder produces 300+ rows deterministically', () => {
  const a = seed(), b = seed();
  assert.ok(a.assets.length + a.moves.length + a.prs.length >= 300);
  assert.deepEqual(a.assets[0], b.assets[0]);
});

test('permissions follow the role matrix', () => {
  assert.equal(can('staff', 'pr:approve1'), false);
  assert.equal(can('manager', 'pr:approve2'), false);
  assert.equal(can('admin', 'pr:approve2'), true);
  assert.equal(can('staff', 'audit:read'), false);
});

test('large purchase needs manager then admin, small needs manager only', () => {
  const db = seed();
  const big = createPR(db, 'staff', 'Dewi', 'Laptop', 8e6);
  assert.throws(() => approve(db, 'staff', 'Dewi', big.id, 'approve'), /Forbidden/);
  approve(db, 'manager', 'Budi', big.id, 'approve');
  assert.equal(big.status, 'pending_admin');
  assert.throws(() => approve(db, 'manager', 'Budi', big.id, 'approve'), /Forbidden/);
  approve(db, 'admin', 'Aril', big.id, 'approve');
  assert.equal(big.status, 'approved');
  assert.throws(() => approve(db, 'admin', 'Aril', big.id, 'approve'), /final/);
  const small = createPR(db, 'staff', 'Dewi', 'Kabel', 1e5);
  approve(db, 'manager', 'Budi', small.id, 'approve');
  assert.equal(small.status, 'approved');
});

test('rejection ends the chain', () => {
  const db = seed(), pr = createPR(db, 'staff', 'Dewi', 'Kursi', 9e6);
  approve(db, 'manager', 'Budi', pr.id, 'reject');
  assert.equal(pr.status, 'rejected');
});

test('stock movement validates role and quantity, and is audited', () => {
  const db = seed(), a = db.assets[0];
  assert.throws(() => moveStock(db, 'staff', 'Dewi', a.id, 'in', 1), /Forbidden/);
  assert.throws(() => moveStock(db, 'manager', 'Budi', a.id, 'out', a.qty + 1), /tidak cukup/);
  const before = a.qty; moveStock(db, 'manager', 'Budi', a.id, 'in', 5);
  assert.equal(a.qty, before + 5);
  assert.equal(db.audit[0].action, 'stock.in');
});
