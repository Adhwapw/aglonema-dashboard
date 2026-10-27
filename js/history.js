/* ============================================================
   history.js - Riwayat kelembapan mandiri via Supabase
   ------------------------------------------------------------
   Dashboard mencatat sendiri tiap pembacaan live yang sukses,
   menumpang refresh Blynk yang sudah berjalan (tanpa request
   tambahan ke Blynk, jadi tidak membakar kuota riwayat Blynk).
   View Riwayat membaca dari simpanan ini dulu; riwayat Blynk
   tetap dipakai sebagai cadangan bila Supabase tidak disetel,
   atau request-nya gagal.
   ============================================================ */

const HistoryLog = (() => {
  const TABLE = 'moisture_history';
  const PAGE = 20000;
  const MAX_PAGES = 10;
  // Satu titik per menit, apa pun interval refresh yang dipilih.
  const MIN_GAP_MS = 60000;
  let lastRecordedAt = 0;

  // null bila URL/kunci belum diisi; kunci disimpan di localStorage
  // browser (form Pengaturan), tidak pernah ikut ke repo.
  function configured() {
    const url = (Settings.data.supabaseUrl || '').replace(/\/+$/, '');
    const key = Settings.data.supabaseKey || '';
    return url !== '' && key !== '' ? { url, key } : null;
  }

  function headers(cfg) {
    return {
      'apikey': cfg.key,
      'Authorization': 'Bearer ' + cfg.key,
      'Content-Type': 'application/json'
    };
  }

  // Catat satu titik. Gagal diam-diam (return false) supaya tidak
  // pernah mengganggu pemantauan live. Dipanggil setelah refresh
  // sukses; moisture null (baca gagal) tidak dicatat.
  async function maybeRecord(point) {
    const cfg = configured();
    if (!cfg || point.moisture === null || point.moisture === undefined) return false;
    const now = Date.now();
    if (now - lastRecordedAt < MIN_GAP_MS) return false;
    lastRecordedAt = now;
    try {
      const res = await fetch(cfg.url + '/rest/v1/' + TABLE, {
        method: 'POST',
        headers: Object.assign(headers(cfg), { 'Prefer': 'return=minimal' }),
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

  // Rata-ratakan per jam (WEEK) atau per hari (THREE_MONTHS) supaya
  // grafik tetap ringan; DAY memakai titik mentah per menit.
  function bucketize(points, period) {
    if (period === 'DAY' || points.length === 0) return points;
    const bucketMs = period === 'WEEK' ? 3600000 : 86400000;
    const buckets = new Map();
    for (const [d, v] of points) {
      const k = Math.floor(d.getTime() / bucketMs);
      if (!buckets.has(k)) buckets.set(k, { sum: 0, n: 0 });
      const b = buckets.get(k);
      b.sum += v; b.n++;
    }
    return [...buckets.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([k, b]) => [new Date(k * bucketMs), b.sum / b.n]);
  }

  // Ambil titik-titik Supabase untuk satu periode.
  // @returns {Promise<{ok, configured, points:[[Date, number]]>}}
  // ok=false bila request gagal; configured=false bila Supabase
  // tidak disetel.
  async function fetchPoints(period) {
    const cfg = configured();
    if (!cfg) return { ok: false, configured: false, points: [] };
    const days = period === 'THREE_MONTHS' ? 90 : (period === 'WEEK' ? 7 : 1);
    const from = new Date(Date.now() - days * 86400000).toISOString();
    const rows = [];
    try {
      for (let page = 0; page < MAX_PAGES; page++) {
        const url = cfg.url + '/rest/v1/' + TABLE +
          '?select=ts,moisture&ts=gte.' + encodeURIComponent(from) +
          '&order=ts.asc&limit=' + PAGE + '&offset=' + (page * PAGE);
        const res = await fetch(url, { headers: headers(cfg) });
        if (!res.ok) return { ok: false, configured: true, points: [] };
        const chunk = await res.json();
        if (!Array.isArray(chunk) || chunk.length === 0) break;
        rows.push(...chunk);
        if (chunk.length < PAGE) break;
      }
    } catch (e) {
      return { ok: false, configured: true, points: [] };
    }
    const points = rows
      .map((r) => {
        const t = new Date(r.ts).getTime();
        const v = parseFloat(r.moisture);
        return (isNaN(t) || isNaN(v)) ? null : [new Date(t), v];
      })
      .filter(Boolean)
      .sort((a, b) => a[0] - b[0]);
    return { ok: true, configured: true, points: bucketize(points, period) };
  }

  // Tes koneksi + keberadaan tabel: SELECT satu baris saja.
  // @returns {Promise<{ok, status, error}>}
  async function test() {
    const cfg = configured();
    if (!cfg) return { ok: false, status: 0, error: 'URL atau kunci Supabase belum diisi.' };
    try {
      const res = await fetch(cfg.url + '/rest/v1/' + TABLE + '?select=id&limit=1', { headers: headers(cfg) });
      if (!res.ok) {
        let msg = 'HTTP ' + res.status;
        try {
          const j = await res.json();
          if (j && j.message) msg = j.message;
        } catch (e) { /* pakai HTTP */ }
        return { ok: false, status: res.status, error: msg };
      }
      return { ok: true, status: res.status, error: '' };
    } catch (e) {
      return { ok: false, status: 0, error: e.message || 'Koneksi gagal' };
    }
  }

  return { configured, maybeRecord, fetchPoints, test };
})();
