# Money Management — AL-HAZA Production

Aplikasi pencatat keuangan pribadi (web, tanpa build): Dashboard, Kalender, Transaksi, Anggaran,
Hutang & Piutang, Akun, Impian & Tabungan (Tangga Kekayaan Abadi), Target Berkala, Laporan, Laporan AI.
Data disimpan per-akun di **Firebase Firestore**, login lewat Email/Password atau Google.

## Struktur
```
index.html          halaman utama
css/style.css       tema Neumorphism (gelap/terang)
js/app.js           seluruh logika aplikasi
js/firebase.js      inisialisasi Firebase
firestore.rules     aturan keamanan database (WAJIB dipublikasikan, lihat di bawah)
firebase.json       supaya aturan bisa di-deploy dengan Firebase CLI
tests/              pemeriksaan otomatis (opsional)
```

## Menjalankan di komputer sendiri
Aplikasi memakai ES Modules, jadi **tidak bisa dibuka dengan klik dua kali** — harus lewat server lokal:
```
python3 -m http.server 8080      # lalu buka http://localhost:8080
```

## Setup Firebase (sekali saja)
1. Firebase Console → **Authentication** → Sign-in method: aktifkan **Email/Password** dan **Google**.
2. Authentication → Settings → **Authorized domains**: tambahkan domain tempat aplikasi di-host
   (mis. `usernamu.github.io`; `localhost` biasanya sudah ada).
3. **Firestore Database** → tab **Rules** → tempel seluruh isi `firestore.rules` → **Publish**.
   (Atau: `firebase deploy --only firestore:rules` bila memakai Firebase CLI.)
   Aplikasi tetap berjalan dengan aturan lama, tetapi validasi baru (peran transaksi hutang,
   batas data, pengaturan) baru aktif setelah aturan ini dipublikasikan.
4. (Disarankan) Google Cloud Console → APIs & Services → Credentials → API key browser →
   **batasi ke domain (HTTP referrer)** aplikasi Anda. API key Firebase di `js/firebase.js` memang publik
   (bukan rahasia); yang melindungi data adalah `firestore.rules`.

## Hosting di GitHub Pages
Push semua file, lalu Settings → Pages → Deploy from branch (`main`, folder `/root`). Jangan lupa langkah 2 di atas.

## Pemeriksaan otomatis (opsional)
```
sh tests/run-all.sh
```
Memeriksa sintaks, kesesuaian tombol/handler, dan alur sinkronisasi uang (hutang, cicilan, transfer, impor, reset)
memakai Firestore tiruan — tidak menyentuh data asli.

## Cara kerja sinkronisasi uang (ringkas)
* Saldo akun = jumlah semua transaksi di akun tsb (termasuk arus hutang/piutang & transfer).
* Pendapatan/pengeluaran di Dashboard, Laporan, Anggaran, Target, dan AI **hanya** menghitung arus kas riil —
  pinjaman, cicilan pokok, dan transfer antar-akun dikecualikan (bunga/denda tetap dihitung).
* Cicilan lewat tombol *Bayar/Terima* **atau** lewat form Transaksi (centang "Ini pembayaran Hutang Saya?")
  sama-sama mengurangi sisa hutang. Edit/hapus transaksi cicilan otomatis menyesuaikan sisa hutang.
* Setiap perubahan yang menyentuh beberapa data sekaligus ditulis **atomik** (semua berhasil atau semua batal).
