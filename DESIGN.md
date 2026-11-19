# Arah desain: OpsCore

Reading this as: alat kerja harian staf kantor, bergaya aplikasi administrasi korporat yang padat, dial ENERGY 1 / RHYTHM 1 / MOTION 1.

| Keputusan | Alasan satu baris |
|---|---|
| Sidebar biru denim `#1f3a5f`, konten abu terang | Pola navigasi kiri sudah dikenal pengguna aplikasi kantor, jadi tidak perlu dipelajari. |
| Aksen satu warna: oranye tua `#b85a0f` | Hanya untuk tindakan utama (Ajukan, Catat mutasi), supaya mudah ditemukan di antara tabel. |
| Source Sans 3 saja | Antarmuka data padat butuh satu huruf yang jelas pada ukuran kecil. |
| Tabel padat dengan header lengket | Pengguna memindai banyak baris. Kepadatan adalah fitur di sini. |
| Status ditulis sebagai teks berwarna ("Menunggu Manager") | Status tidak boleh bergantung pada warna saja. |
| Tombol tindakan tidak disembunyikan untuk peran tanpa izin | Pengguna melihat penolakan dan alasannya; ini yang diperagakan demo RBAC. |
| Tanpa animasi, bayangan, atau gradien | Alat internal; hierarki dibuat dari garis dan bobot huruf. |
