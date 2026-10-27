// api/log.js - POST /api/log
// Mencatat satu titik riwayat ke Turso. Dipanggil dashboard tiap
// pembacaan live sukses (sudah di-throttle 1 menit di sisi klien).
// Kredensial Turso HANYA dibaca dari environment variable Vercel
// (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN), tidak pernah dikirim
// ke browser.

const { createClient } = require('@libsql/client');

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
  const msg = (err && err.message) || 'Gagal mencatat riwayat.';
  if (msg.includes('no such table')) {
    return 'Tabel moisture_history belum dibuat di Turso. Jalankan SQL pembuatan tabel dulu.';
  }
  return msg;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Metode harus POST.' });
  }

  const body = req.body || {};
  const moisture = Number(body.moisture);
  const pump = body.pump === null || body.pump === undefined ? null : (body.pump ? 1 : 0);
  const auto = body.auto === null || body.auto === undefined ? null : (body.auto ? 1 : 0);
  let tsMs = Date.parse(body.ts);
  if (isNaN(tsMs)) tsMs = Date.now();

  if (!Number.isFinite(moisture) || moisture < 0 || moisture > 100) {
    return res.status(400).json({ ok: false, error: 'moisture harus angka 0-100.' });
  }

  try {
    const client = getClient();
    await client.execute({
      sql: 'INSERT INTO moisture_history (ts_ms, moisture, pump, auto) VALUES (?, ?, ?, ?)',
      args: [tsMs, moisture, pump, auto]
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    if (err.code === 'ENV_MISSING') {
      return res.status(500).json({ ok: false, error: err.message });
    }
    return res.status(500).json({ ok: false, error: friendlyError(err) });
  }
};
