/* ============================================================
   api.js - Klien Blynk IoT HTTPS API
   Setiap request bersifat independen: satu gagal tidak
   menggagalkan yang lain. Error dikembalikan sebagai data,
   bukan exception, supaya UI bisa menanganinya per-bagian.
   ============================================================ */

const BlynkApi = (() => {
  function baseUrl() {
    return Settings.data.server.replace(/\/+$/, '');
  }

  function url(path, extra) {
    let u = baseUrl() + '/external/api/' + path +
      '?token=' + encodeURIComponent(Settings.data.token);
    if (extra) u += '&' + extra;
    return u;
  }

  /**
   * @returns {Promise<{ok:boolean, status:number, text:string, error:string}>}
   */
  async function request(path, extra) {
    try {
      const res = await fetch(url(path, extra));
      const text = (await res.text()).trim();
      if (!res.ok) return { ok: false, status: res.status, text: '', error: text || 'HTTP ' + res.status };
      return { ok: true, status: res.status, text, error: '' };
    } catch (err) {
      return { ok: false, status: 0, text: '', error: err.message || 'Koneksi gagal' };
    }
  }

  /** Baca satu datastream. @returns {Promise<{ok, value:number|null, status, error}>} */
  async function getPin(pin) {
    const r = await request('get', pin);
    if (!r.ok) return { ok: false, value: null, status: r.status, error: r.error };
    const v = parseFloat(r.text);
    return { ok: true, value: isNaN(v) ? null : v, status: r.status, error: '' };
  }

  /** Baca beberapa datastream sekaligus dalam 1 request (lebih hemat).
      GET /external/api/get?token=..&V0&V4&V5 -> {"v0":58,"v4":0,"v5":1}
      @returns {Promise<{ok, values:{pin:number|null}, status, error}>} */
  async function getPins(pins) {
    const r = await request('get', pins.join('&'));
    if (!r.ok) return { ok: false, values: {}, status: r.status, error: r.error };
    try {
      const obj = JSON.parse(r.text);
      const values = {};
      pins.forEach(p => {
        const key = Object.keys(obj).find(k => k.toLowerCase() === p.toLowerCase());
        const v = key === undefined ? NaN : parseFloat(obj[key]);
        values[p] = isNaN(v) ? null : v;
      });
      return { ok: true, values, status: r.status, error: '' };
    } catch (e) {
      return { ok: false, values: {}, status: r.status, error: 'Respons tidak valid' };
    }
  }

  /** Tulis satu datastream. */
  async function updatePin(pin, val) {
    return request('update', pin + '=' + encodeURIComponent(val));
  }

  /** Cek apakah hardware sedang terhubung. */
  async function isHardwareConnected() {
    const r = await request('isHardwareConnected');
    if (!r.ok) return { ok: false, value: null, status: r.status, error: r.error };
    return { ok: true, value: r.text.toLowerCase() === 'true', status: r.status, error: '' };
  }

  /** Ambil data historis satu datastream. */
  async function getHistory(pin, period, granularity) {
    return request('data/get', 'pin=' + pin + '&period=' + period + '&granularityType=' + granularity);
  }

  /** Pesan bantuan sesuai kode error HTTP dari Blynk. */
  function errorHint(status) {
    if (status === 0) return 'Tidak bisa menghubungi server. Periksa koneksi internet dan alamat server di menu Pengaturan.';
    if (status === 400) return 'Token tidak valid (HTTP 400). Periksa kembali Device Auth Token di menu Pengaturan.';
    if (status === 404) return 'Endpoint tidak ditemukan (HTTP 404). Periksa alamat server di menu Pengaturan.';
    if (status === 500) return 'Server Blynk mengembalikan HTTP 500. Periksa kembali Device Auth Token di menu Pengaturan. Untuk riwayat Blynk, HTTP 500 juga bisa berarti datastream belum diaktifkan pelaporan historinya. Server akun ini adalah blynk.cloud, bukan region lain.';
    return 'Server mengembalikan HTTP ' + status + '.';
  }

  return { request, getPin, getPins, updatePin, isHardwareConnected, getHistory, errorHint };
})();
