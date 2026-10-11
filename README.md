# Aglonema Monitor

Dashboard web untuk monitoring kelembapan tanah dan kontrol pompa penyiraman tanaman aglonema.
Data diambil dari [Blynk IoT](https://blynk.io) via HTTPS REST API. Tanpa backend, tanpa build step:
cukup buka `index.html` atau hosting sebagai situs statis.

## Fitur

- Gauge kelembapan tanah real-time (Apache ECharts) dengan zona warna sesuai riset:
  hijau tepat di zona optimal **55% - 65%**
- Kontrol pompa manual (optimistic UI: tombol langsung merespons)
- Toggle mode otomatis / manual
- Grafik riwayat kelembapan dengan area penanda zona optimal
- Alert cerdas gaya Bootstrap 4 (kering, optimal, terlalu basah, device offline)
- Status koneksi device, refresh otomatis
- Mobile friendly, sidebar off-canvas di layar kecil

## Struktur project

```
aglonema-dashboard/
├── index.html        # Markup utama (3 view: Dashboard, Riwayat, Pengaturan)
├── css/
│   └── style.css     # Semua style: layout, sidebar, alert Bootstrap 4, dsb.
└── js/
    ├── config.js     # Konstanta, zona kelembapan, settings (localStorage)
    ├── api.js        # Klien Blynk HTTPS API (resilient per-request)
    ├── charts.js     # Inisialisasi & opsi Apache ECharts
    ├── ui.js         # Komponen UI: alert, badge, sidebar
    └── app.js        # Logika utama & wiring
```

## Datastream Blynk

| Pin | Nama           | Fungsi                          |
|-----|----------------|---------------------------------|
| V0  | Moisture       | Kelembapan tanah (%)            |
| V1  | Switch pompa   | Kontrol pompa (0/1)             |
| V4  | Status pompa   | Status pompa aktual (0/1)       |
| V5  | Mode otomatis  | 0 = manual, 1 = otomatis        |

## Cara pakai

1. Buka `index.html` di browser (atau deploy ke GitHub Pages / Netlify / Vercel).
2. Buka menu **Pengaturan**, masukkan **Device Auth Token** dari Blynk.Console
   (Devices → pilih device → Device Info).
3. Klik **Tes Koneksi**, lalu **Simpan Pengaturan**.

Token hanya tersimpan di `localStorage` browser perangkatmu, tidak tertulis di kode.

## Catatan

- Zona optimal 55% - 65% merujuk pada riset Binus (2024):
  *"Soil Moisture-based IoT Drip Irrigation System to Optimize Water Usage for Aglaonema
  in Greenhouse Environment"* (eksperimen 30 hari, Aglaonema Stardust).
- Blynk membatasi pengambilan data historis (`data/get`) maksimal 10x per 24 jam per device.
- Jika API sering mengembalikan HTTP 500, kemungkinan auth token salah atau akunmu berada
  di server region lain. Coba ganti server ke `https://sgp1.blynk.cloud` (region Asia)
  di menu Pengaturan.
- Ikon: [Lucide](https://lucide.dev). Font judul: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans).
