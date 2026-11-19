import { seed, can, createPR, approve, moveStock } from './src/core.js';

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const db = seed(), NAME = { staff: 'Dewi', manager: 'Budi', admin: 'Aril' };
const TITLE = { pr: 'Pengajuan pembelian', assets: 'Aset dan QR', stock: 'Mutasi stok', audit: 'Audit log' };
const STATUS = { pending_manager: ['w', 'Menunggu Manager'], pending_admin: ['i', 'Menunggu Admin'], approved: ['ok', 'Disetujui'], rejected: ['no', 'Ditolak'] };
const idr = n => 'Rp' + n.toLocaleString('id-ID');
let tab = 'pr', qrId = null;
const role = () => $('#role').value, who = () => NAME[role()];

function msg(t) { $('#msg').innerHTML = t ? `<p class="alert">${esc(t)}</p>` : ''; }
function act(fn) { try { fn(); msg(''); } catch (e) { msg(e.message); } render(); }
window.ops = { decide: (id, d) => act(() => approve(db, role(), who(), id, d)), qr: id => { qrId = id; render(); } };

function qrSvg(text) {
  if (typeof qrcode !== 'function') return '<p class="empty">Pustaka QR belum termuat. Periksa koneksi internet.</p>';
  const q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag(6);
}

function render() {
  document.querySelectorAll('nav.side button').forEach(b => { if (b.dataset.t === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#title').textContent = TITLE[tab];
  const waiting = db.prs.filter(p => p.status.startsWith('pending')).length;
  $('#sum').innerHTML = [['Aset', db.assets.length], ['Mutasi stok', db.moves.length], ['Pengajuan menunggu', waiting], ['Catatan audit', db.audit.length]].map(([a, b]) => `<div><b>${b}</b><small>${a}</small></div>`).join('');
  const v = $('#v');

  if (tab === 'pr') {
    v.innerHTML = `<div class="box"><div class="form"><div><label for="pi">Barang</label><input id="pi" style="width:240px"></div><div><label for="pa">Nominal (Rp)</label><input id="pa" type="number" min="1"></div><button class="p" id="pc">Ajukan</button></div>
    <p class="note">Nominal Rp5.000.000 atau lebih membutuhkan persetujuan Manager lalu Admin. Di bawah itu cukup Manager.</p></div>
    <div class="box scroll"><table><thead><tr><th>ID</th><th>Barang</th><th>Nominal</th><th>Pemohon</th><th>Status</th><th>Tindakan</th></tr></thead><tbody>${db.prs.slice(0, 60).map(p => `<tr><td>${p.id}</td><td>${esc(p.item)}</td><td>${idr(p.amount)}</td><td>${p.by}</td><td><span class="tag ${STATUS[p.status][0]}">${STATUS[p.status][1]}</span></td><td>${p.status.startsWith('pending') ? `<button class="s" onclick="ops.decide('${p.id}','approve')">Setujui</button> <button class="s no" onclick="ops.decide('${p.id}','reject')">Tolak</button>` : ''}</td></tr>`).join('')}</tbody></table></div><p class="note">Menampilkan 60 dari ${db.prs.length} pengajuan.</p>`;
    $('#pc').onclick = () => act(() => { const i = $('#pi').value.trim(), a = +$('#pa').value; if (!i || !(a > 0)) throw new Error('Isi nama barang dan nominal lebih dari nol.'); createPR(db, role(), who(), i, a); });
  }
  if (tab === 'assets') {
    v.innerHTML = `<div class="split"><div class="box scroll"><table><thead><tr><th>ID</th><th>Nama</th><th>Jumlah</th><th>Lokasi</th><th>QR</th></tr></thead><tbody>${db.assets.slice(0, 80).map(a => `<tr><td>${a.id}</td><td>${esc(a.name)}</td><td>${a.qty}</td><td>${a.loc}</td><td><button class="s" onclick="ops.qr('${a.id}')">Buat QR</button></td></tr>`).join('')}</tbody></table></div>
    <div class="box qrbox"><b>Label aset</b>${qrId ? `<div>${qrSvg(qrId)}</div><p class="note">${qrId}</p>` : '<p class="empty">Pilih aset untuk membuat QR.</p>'}</div></div><p class="note">Menampilkan 80 dari ${db.assets.length} aset.</p>`;
  }
  if (tab === 'stock') {
    v.innerHTML = `<div class="box"><div class="form"><div><label for="sa">Aset</label><select id="sa">${db.assets.slice(0, 80).map(a => `<option>${a.id}</option>`).join('')}</select></div><div><label for="st">Jenis</label><select id="st"><option value="in">Masuk</option><option value="out">Keluar</option></select></div><div><label for="sq">Jumlah</label><input id="sq" type="number" min="1" value="1" style="width:90px"></div><button class="p" id="sm">Catat mutasi</button></div>
    <p class="note">Hanya Manager dan Admin yang boleh mencatat mutasi. Stok tidak boleh menjadi negatif.</p></div>
    <div class="box scroll"><table><thead><tr><th>Tanggal</th><th>Aset</th><th>Jenis</th><th>Jumlah</th><th>Oleh</th></tr></thead><tbody>${db.moves.slice(0, 60).map(m => `<tr><td>${m.at}</td><td>${m.asset}</td><td>${m.type === 'in' ? 'Masuk' : 'Keluar'}</td><td>${m.qty}</td><td>${m.by}</td></tr>`).join('')}</tbody></table></div>`;
    $('#sm').onclick = () => act(() => moveStock(db, role(), who(), $('#sa').value, $('#st').value, +$('#sq').value));
  }
  if (tab === 'audit') {
    v.innerHTML = !can(role(), 'audit:read') ? '<p class="alert">Peran Staff tidak punya akses ke audit log. Ganti peran di kanan atas.</p>'
      : db.audit.length ? `<div class="box scroll"><table><thead><tr><th>Waktu</th><th>Pelaku</th><th>Aksi</th><th>Target</th><th>Perubahan</th></tr></thead><tbody>${db.audit.map(a => `<tr><td>${a.at}</td><td>${a.who}</td><td>${a.action}</td><td>${a.target}</td><td>${a.from} menjadi ${a.to}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="empty">Belum ada aktivitas tercatat. Setujui satu pengajuan atau catat satu mutasi, lalu kembali ke sini.</p>';
  }
}
document.querySelector('nav.side').onclick = e => { if (e.target.dataset.t) { tab = e.target.dataset.t; msg(''); render(); } };
$('#role').onchange = () => { msg(''); render(); };
render();
