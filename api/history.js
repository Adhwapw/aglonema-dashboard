// api/history.js - GET /api/history?period=DAY|WEEK|THREE_MONTHS
// Membaca riwayat dari Turso untuk view Riwayat dashboard.
// DAY: titik mentah (maks 1/menit, jadi maks ~1440 baris).
// WEEK: rata-rata per jam. THREE_MONTHS: rata-rata per hari.
// Agregasi dilakukan di SQL supaya beban transfer tetap kecil.
// Kredensial Turso HANYA dari environment variable Vercel.

const { createClient } = require('@libsql/client');

const PERIODS = {
  DAY: { days: 1, bucketMs: null },
  WEEK: { days: 7, bucketMs: 3600000 },
  THREE_MONTHS: { days: 90, bucketMs: 86400000 }
};

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    const err = new Error('TURSO_DATABASE_URL belum disetel di Vercel (Settings -> Environment Variables).');
    err.code = 'ENV_MISSING';
    throw err;
  }
  // URL file: hanya untuk pengujian lokal, tidak butuh token.
  if (!authToken && !url.startsWith('file:')) {
    const err = new Error('TURSO_AUTH_TOKEN belum disetel di Vercel (Settings -> Environment Variables).');
    err.code = 'ENV_MISSING';
    throw err;
  }
  return createClient({ url, authToken });
}

function friendlyError(err) {
  const msg = (err && err.message) || 'Gagal membaca riwayat.';
  if (msg.includes('no such table')) {
    return 'Tabel moisture_history belum dibuat di Turso. Jalankan SQL pembuatan tabel dulu.';
  }
  return msg;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Metode harus GET.' });
  }

  const period = PERIODS[req.query.period] ? req.query.period : 'DAY';
  const { days, bucketMs } = PERIODS[period];
  const fromMs = Date.now() - days * 86400000;

  try {
    const client = getClient();
    let rows;
    if (bucketMs === null) {
      const r = await client.execute({
        sql: 'SELECT ts_ms, moisture FROM moisture_history WHERE ts_ms >= ? ORDER BY ts_ms ASC LIMIT 2000',
        args: [fromMs]
      });
      rows = r.rows;
    } else {
      // Bucket = ts_ms dibulatkan ke bawah ke kelipatan bucketMs.
      // Pakai modulo, bukan pembagian: di SQLite operator / selalu
      // menghasilkan float, jadi (ts_ms / n) * n tidak membulatkan.
      const r = await client.execute({
        sql: 'SELECT (ts_ms - (ts_ms % ?)) AS bucket, AVG(moisture) AS v FROM moisture_history WHERE ts_ms >= ? GROUP BY bucket ORDER BY bucket ASC',
        args: [bucketMs, fromMs]
      });
      rows = r.rows;
    }
    const points = rows
      .map((row) => {
        const t = row.ts_ms !== undefined ? row.ts_ms : row.bucket;
        const v = row.moisture !== undefined ? row.moisture : row.v;
        const ms = Number(t);
        const val = Number(v);
        return (Number.isFinite(ms) && Number.isFinite(val))
          ? { ts: new Date(ms).toISOString(), moisture: val }
          : null;
      })
      .filter(Boolean);
    return res.status(200).json({ ok: true, points });
  } catch (err) {
    if (err.code === 'ENV_MISSING') {
      return res.status(500).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: friendlyError(err) });
  }
};
