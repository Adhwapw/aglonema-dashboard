# DESIGN.md TetraSense

Arah desain dashboard TetraSense, diekstrak dari UI yang sudah ada per 31 Oktober 2026,
setelah perbaikan antislop di commit `d883cc3`. File ini bukan usulan gaya baru.
Kalau gaya berubah, ubah file ini dulu, baru ubah kode, supaya perbaikan berikutnya
tetap memakai arah yang sama.

## Produk dan pekerjaan layar

TetraSense adalah dashboard monitoring kelembapan tanah dan kontrol pompa penyiraman
tanaman aglonema. Perangkat ESP32 mengirim data lewat Blynk IoT, riwayat utama dicatat
ke Turso saat dashboard dibuka.

Satu keputusan per layar:

- Dashboard: apakah tanah perlu disiram sekarang? Jawabannya dibaca dari gauge,
  status pompa, dan zona kelembapan.
- Riwayat: bagaimana tren kelembapan dibanding zona optimal?
- Pengaturan: apakah koneksi Blynk dan Turso sudah benar?

## Identitas dan suasana

Tenang, teknis, dan data dulu, bukan halaman marketing. Bahasa UI Bahasa Indonesia,
kalimat spesifik, dan tidak ada klaim tanpa bukti.

Motif identitasnya adalah tanaman aglonema yang disiram perangkat IoT, digambar sebagai
SVG kustom di splash intro. Motif ini spesifik untuk produk ini, bukan ilustrasi stok
generik.

## Dial antislop

- ENERGY 1 (tenang). Tidak ada hero marketing, tidak ada sapaan keras. Layar langsung
  membuka ke angka dan kontrol.
- RHYTHM 2 (konsisten dengan beberapa pengecualian). Sebagian besar kartu memakai pola
  yang sama, tapi kartu gauge dibedakan dan grafik riwayat dibuat lebar dua kolom di
  desktop, karena keduanya adalah informasi utama.
- MOTION 1 (hanya hover dan transisi). Pengecualian satu-satunya adalah splash intro
  sekitar 2,8 detik, yang bisa diklik untuk dilewati dan langsung dilewati bila pengguna
  mengaktifkan pengurangan gerak.

## Palet

Maksimal 2 sampai 3 warna inti plus 1 aksen, sesuai R-29. Warna status di bawah bukan
palet tambahan bebas, melainkan penanda keadaan yang nyata.

Inti:

- Hitam sidebar: `#0b0e13`, garis pemisah sidebar `#1c222c`
- Putih kartu dan topbar: `#ffffff`, garis kartu `#e2e8f0`
- Latar halaman: `#f1f5f9` (slate-100)

Aksen, hijau zamrud:

- Tombol utama: `#047857`, hover `#065f46`
- Navigasi aktif di sidebar: `#064e3b`
- Kartu utama gauge: latar `#f0fdf4`, garis `#a7f3d0`
- Zona optimal: `#16a34a`
- Fokus keyboard: outline `#059669`

Status:

- Bahaya: `#dc2626` untuk penanda, `#991b1b` di atas `#fee2e2` untuk badge dan alert
- Peringatan: `#f59e0b` untuk zona kurang optimal dan agak basah
- Sukses: `#065f46` di atas `#d1fae5` untuk badge dan alert
- Netral: `#475569` di atas `#e2e8f0` untuk badge abu-abu

Aturan teks, sudah dicek dengan contrast-check antislop-human per 31 Oktober 2026:

- Judul: `#0f172a`
- Teks kecil di latar terang: `#475569`, bukan abu-abu yang lebih muda
- `#64748b` hanya di atas putih, rasionya 4,76:1, jadi lolos teks normal
- `#94a3b8` hanya di atas sidebar hitam, rasionya 7,54:1, dan tidak boleh dipakai
  untuk teks kecil di latar terang karena di sana rasionya hanya 2,34:1
- Teks putih di atas tombol hijau `#047857` rasionya 5,48:1, dan di atas hover
  `#065f46` rasionya 7,68:1

## Tipografi

- Judul, judul brand, dan judul kartu: Plus Jakarta Sans, tebal 700 sampai 800.
  Alasannya, judul harus tegas dan cepat dibaca sekilas saat memeriksa tanaman.
- Isi: font sistem (`-apple-system`, Segoe UI, Roboto, Helvetica Neue, Arial).
  Alasannya, isi tidak bergantung pada unduhan font tambahan dan tetap terbaca
  bila font judul gagal dimuat.

## Layout dan komponen

- Sidebar lebar 16rem, latar hitam, statis di desktop, off-canvas dengan overlay
  di layar kecil. Tombol menu di HP menampilkan ikon plus kata "Menu", bukan
  ikon saja.
- Topbar tinggi 4rem, latar putih, berisi satu judul halaman, badge status device,
  dan tombol refresh. Judul halaman adalah satu-satunya `h1` di layar.
- Kartu: latar putih, garis `#e2e8f0`, radius 0,9rem, satu bayangan tipis
  `0 1px 3px rgba(15, 23, 42, .06)` sebagai penanda elevasi, bukan dekorasi di
  semua elemen. Padding kartu `p-5` di semua kartu, kecuali kartu gauge yang
  dibedakan lewat kelas `card-main`.
- Grid atas: 1 kolom di HP, 2 kolom di tablet, 3 kolom di desktop. Di tablet,
  kartu zona melebar 2 kolom di bawah gauge dan kontrol pompa.
- Grid bawah: 1 kolom sampai desktop, lalu 3 kolom dengan grafik melebar 2 kolom,
  karena grafik butuh lebar untuk dibaca.
- Tombol: radius 0,6rem, tinggi minimal 44px, tombol utama hijau, tombol sekunder
  putih dengan garis, tombol merah hanya untuk aksi "Matikan Pompa" sebagai
  penanda keadaan, bukan sebagai warna dekoratif.
- Badge bentuk pil hanya untuk status nyata: Online atau Offline, Menyala atau Mati,
  Otomatis atau Manual. Badge tidak dipakai sebagai label dekoratif.
- Ikon Lucide hanya bila relevan dengan isinya, misalnya ikon dashboard untuk
  Dashboard dan ikon riwayat untuk Riwayat. Tombol yang hanya berisi ikon wajib
  punya `aria-label`.
- Switch mode otomatis: visual slider tetap 24px, tapi area sentuhnya 44px agar
  mudah ditekan dengan jempol.

## Gerakan dan keadaan

- Halaman utama hanya memakai transisi 0,15 sampai 0,2 detik untuk hover, fokus,
  dan switch. Tidak ada animasi masuk berulang di halaman utama.
- Splash memakai animasi tetesan, daun bergoyang, LED berkedip, sinyal WiFi, dan
  meter terisi, tapi semuanya hanya selama splash, lalu elemen splash dihapus.
  Bila pengguna mengaktifkan pengurangan gerak, splash langsung dilewati dan
  animasinya dimatikan.
- Keadaan yang wajib ada: kosong ("Tidak ada data"), memeriksa ("Memeriksa..."),
  dan galat (alert device offline dan pesan token). Tombol pompa dinonaktifkan
  saat mode otomatis aktif, saat status pompa tidak diketahui, atau saat perintah
  sedang dikirim, dengan keterangan yang menjelaskan alasannya.

## Copy

- Bahasa Indonesia, spesifik, dan menyebut aktornya. Contoh CTA yang benar:
  "Nyalakan Pompa", "Matikan Pompa", "Muat Data", "Simpan Pengaturan",
  "Tes Koneksi". Hindari CTA generik seperti "Mulai" atau "Jelajahi".
- Angka hanya dari sensor, konfigurasi, atau riset. Zona optimal 55% sampai 65%
  selalu disertai sitasi Karenza et al. (2025). Batas 40% dan 80% selalu disebut
  sebagai penetapan tim, jangan disamarkan sebagai hasil riset.
- Tidak ada emoji di UI, tidak ada kata pemasaran kosong, tidak ada testimoni
  dan tidak ada statistik palsu. Kalau data belum ada, tampilkan keadaan kosong
  yang jujur, bukan angka karangan.

## Aksesibilitas

Keputusan ini sudah diverifikasi per 31 Oktober 2026 dan harus dipertahankan
di setiap perubahan berikutnya:

- Semua teks memenuhi kontras WCAG AA 4,5:1 untuk teks normal dan 3:1 untuk
  teks besar, dicek dengan script contrast-check, bukan diperkirakan dengan mata.
- Fokus keyboard terlihat: outline hijau 2px dengan offset 2px untuk tombol,
  link navigasi, tombol ikon, penutup alert, dan switch.
- Target sentuh minimal 44px untuk tombol, link navigasi, tombol ikon, dan switch.
- Setiap kolom form punya label yang terlihat dan terhubung ke inputnya.
- Sidebar mobile bisa ditutup dengan Escape, fokus kembali ke tombol Menu, dan
  tombol Menu memakai `aria-expanded` dan `aria-controls` untuk menyatakan
  keadaan sidebar. Dot status memakai warna yang lebih gelap (hijau 700, merah 700,
  abu-abu 500) agar kontras non-teksnya lolos 3:1 di atas latar badge.
- Halaman memakai `lang="id"`, landmark `header`, `nav`, `main`, dan `footer`,
  satu `h1`, dan tidak ada pembatas zoom di meta viewport.
- Gerakan non-esensial berhenti bila pengguna mengaktifkan pengurangan gerak.

## Yang dilarang di proyek ini tanpa alasan tertulis

Teknik di bawah ini dilarang sebagai default. Teknik itu baru boleh dipakai bila
alasan hierarki atau identitasnya ditulis di file ini:

- Gradien biru ke ungu sebagai warna utama, atau glow di semua elemen
- Glassmorphism di navbar, kartu, modal, dan sidebar sekaligus
- Latar grid, blueprint, atau dot pattern tanpa kaitan dengan identitas
- Stripe warna di tepi kiri kartu sebagai dekorasi
- Badge pil berisi "AI Powered", "Beta", atau "New" tanpa status nyata
- Emoji dekoratif di judul, tombol, atau daftar
- Ikon generik seperti sparkle, bintang, atau robot sebagai ikon fitur
- Kartu seragam tanpa hierarki, padahal isinya punya bobot berbeda
- Angka dan delta tren tanpa periode pembanding yang nyata

## Cara memakai file ini dengan antislop

Sebelum mengedit UI, baca file ini dulu untuk arah, lalu pakai antislop sebagai
filter di atasnya. Bila ada konflik antara arah di sini dan aturan antislop,
sebutkan pola dan nomor aturannya, lalu tanyakan ke pemilik proyek. Jangan
diam-diam mengikuti arah yang melanggar aturan, dan jangan diam-diam menimpa
arah yang sudah disepakati.
