/* ============================================================
   history.js - Riwayat kelembapan mandiri via Turso
   ------------------------------------------------------------
   Dashboard mencatat sendiri tiap pembacaan live yang sukses
   lewat fungsi serverless Vercel (/api/log), dan view Riwayat
   membaca dari /api/history. Kredensial Turso TIDAK ada di
   kode ini: fungsi serverless membacanya dari environment
   variable Vercel, sehingga browser tidak pernah melihatnya.
   Menumpang refresh Blynk yang sudah berjalan (tanpa request
   tambahan ke Blynk, jadi tidak membakar kuota riwayat Blynk).
   Riwayat Blynk tetap dipakai sebagai cadangan bila /api gagal.
   ============================================================ */

const HistoryLog = (() => {
  // Satu titik per menit, apa pun interval refresh yang dipilih.
  const MIN_GAP_MS = 60000;
  let lastRecordedAt = 0;

  // Catat satu titik. Gagal diam-diam (return false) supaya tidak
  // pernah mengganggu pemantauan live. Dipanggil setelah refresh
  // sukses; moisture null (baca gagal) tidak dicatat.
  async function maybeRecord(point) {
    if (point.moisture === null || point.moisture === undefined) return false;
    const now = Date.now();
    if (now - lastRecordedAt < MIN_GAP_MS) return false;
    lastRecordedAt = now;
    try {
      const res = await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ts: new Date(now).toISOString(),
          moisture: point.moisture,
          pump: point.pump === null || point.pump === undefined ? null : (point.pump ? 1 : 0),
          auto: point.auto === null || point.auto === undefined ? null : (point.auto ? 1 : 0)
        })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  // Ambil titik-titik untuk satu periode. Agregasi (rata-rata per
  // jam untuk WEEK, per hari untuk THREE_MONTHS) sudah dilakukan
  // di SQL oleh /api/history, jadi klien tinggal memetakan.
  // @returns {Promise<{ok, configured, points:[[Date, number]], error}>}}
  // ok=false bila request gagal (app.js lalu memakai cadangan Blynk).
  async function fetchPoints(period) {
    try {
      const res = await fetch('/api/history?period=' + encodeURIComponent(period));
      if (!res.ok) {
        let error = 'HTTP ' + res.status;
        try {
          const j = await res.json();
          if (j && j.error) error = j.error;
        } catch (e) { /* pakai HTTP */ }
        return { ok: false, configured: true, points: [], error };
      }
      const j = await res.json();
      const points = (Array.isArray(j.points) ? j.points : [])
        .map((p) => {
          const t = new Date(p.ts).getTime();
          const v = parseFloat(p.moisture);
          return (isNaN(t) || isNaN(v)) ? null : [new Date(t), v];
        })
        .filter(Boolean)
        .sort((a, b) => a[0] - b[0]);
      return { ok: true, configured: true, points };
    } catch (e) {
      return { ok: false, configured: true, points: [], error: e.message || 'Koneksi gagal' };
    }
  }

  // Tes koneksi + keberadaan tabel: baca riwayat DAY.
  // @returns {Promise<{ok, status, error, count}>}
  async function test() {
    try {
      const res = await fetch('/api/history?period=DAY');
      if (!res.ok) {
        let error = 'HTTP ' + res.status;
        try {
          const j = await res.json();
          if (j && j.error) error = j.error;
        } catch (e) { /* pakai HTTP */ }
        return { ok: false, status: res.status, error };
      }
      const j = await res.json();
      return { ok: true, status: res.status, error: '', count: Array.isArray(j.points) ? j.points.length : 0 };
    } catch (e) {
      return { ok: false, status: 0, error: e.message || 'Koneksi gagal' };
    }
  }

  return { maybeRecord, fetchPoints, test };
})();
