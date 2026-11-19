// OpsCore core: seeder (300+ rows), RBAC, 2-level approval state machine, audit log.
export function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; }

export const ROLES = {
  staff:   ['asset:read', 'stock:read', 'pr:create', 'pr:read'],
  manager: ['asset:read', 'stock:read', 'stock:move', 'pr:create', 'pr:read', 'pr:approve1', 'audit:read'],
  admin:   ['asset:read', 'asset:write', 'stock:read', 'stock:move', 'pr:create', 'pr:read', 'pr:approve1', 'pr:approve2', 'audit:read'],
};
export const can = (role, perm) => ROLES[role].includes(perm);

const CATS = ['Laptop', 'Monitor', 'Kursi', 'Meja', 'Printer', 'Router', 'Proyektor', 'Kabel', 'Tinta'];
const NAMES = ['Aril', 'Dewi', 'Budi', 'Sari', 'Rudi', 'Maya'];

export function seed(seed = 42) {
  const r = rng(seed), pick = a => a[Math.floor(r() * a.length)];
  const assets = Array.from({ length: 150 }, (_, i) => ({ id: `AST-${String(i + 1).padStart(4, '0')}`, name: `${pick(CATS)} #${i + 1}`, cat: pick(CATS), qty: Math.floor(r() * 50), loc: pick(['Gudang A', 'Gudang B', 'Kantor Pusat', 'Cabang 1']) }));
  const moves = Array.from({ length: 120 }, (_, i) => ({ id: i + 1, asset: pick(assets).id, type: r() > .45 ? 'in' : 'out', qty: 1 + Math.floor(r() * 10), by: pick(NAMES), at: new Date(Date.UTC(2026, 0, 1) + r() * 300 * 864e5).toISOString().slice(0, 10) }));
  const states = ['pending_manager', 'pending_admin', 'approved', 'rejected'];
  const prs = Array.from({ length: 60 }, (_, i) => ({ id: `PR-${String(i + 1).padStart(3, '0')}`, item: `${pick(CATS)} baru`, amount: Math.round((1 + r() * 40) * 250000), by: pick(NAMES), status: pick(states) }));
  return { assets, moves, prs, audit: [] };
}

export function audit(db, who, action, target, from, to) {
  db.audit.unshift({ at: new Date().toISOString().replace('T', ' ').slice(0, 19), who, action, target, from: from ?? '', to: to ?? '' });
}

export function createPR(db, role, who, item, amount) {
  if (!can(role, 'pr:create')) throw new Error('Forbidden');
  const pr = { id: `PR-${String(db.prs.length + 1).padStart(3, '0')}`, item, amount, by: who, status: 'pending_manager' };
  db.prs.unshift(pr); audit(db, who, 'pr.create', pr.id, '', pr.status); return pr;
}

/** Level 1 (manager): any amount. Level 2 (admin): required when amount >= 5,000,000. */
export function approve(db, role, who, id, decision) {
  const pr = db.prs.find(p => p.id === id); if (!pr) throw new Error('Not found');
  const from = pr.status;
  if (from === 'pending_manager') {
    if (!can(role, 'pr:approve1')) throw new Error('Forbidden: butuh Manager');
    pr.status = decision === 'reject' ? 'rejected' : (pr.amount >= 5e6 ? 'pending_admin' : 'approved');
  } else if (from === 'pending_admin') {
    if (!can(role, 'pr:approve2')) throw new Error('Forbidden: butuh Admin');
    pr.status = decision === 'reject' ? 'rejected' : 'approved';
  } else throw new Error('PR sudah final');
  audit(db, who, 'pr.' + decision, id, from, pr.status); return pr;
}

export function moveStock(db, role, who, assetId, type, qty) {
  if (!can(role, 'stock:move')) throw new Error('Forbidden');
  const a = db.assets.find(x => x.id === assetId); if (!a) throw new Error('Aset tidak ada');
  if (type === 'out' && a.qty < qty) throw new Error('Stok tidak cukup');
  const before = a.qty; a.qty += type === 'in' ? qty : -qty;
  db.moves.unshift({ id: db.moves.length + 1, asset: assetId, type, qty, by: who, at: new Date().toISOString().slice(0, 10) });
  audit(db, who, 'stock.' + type, assetId, before, a.qty);
}
