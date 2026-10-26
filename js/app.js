/* ============================================================
   app.js - Logika utama: refresh data, kontrol pompa,
   riwayat, pengaturan, dan inisialisasi
   ============================================================ */

const App = (() => {
  const P = AppConfig.pins;
  const $ = UI.$;

  const state = {
    moisture: null,   // % kelembapan tanah (V0)
    pumpOn: null,     // status pompa (V4)
    autoMode: null,   // mode otomatis (V5)
    online: null,     // koneksi hardware
    busy: false,      // sedang mengirim perintah
    pendingPump: null,  // target perintah pompa yang menunggu konfirmasi V4
    pendingUntil: 0
  };

  let timer = null;
  let histFullLoaded = false;

  const fmtClock = (d) => d.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });

  /* ---------- Ambil data terbaru dari Blynk ----------
     Setiap datastream diminta independen: satu gagal
     tidak menggagalkan yang lain. */
  async function refresh() {
    if (!Settings.data.token) {
      UI.show(UI.buildSmartAlerts(null, null, false));
      UI.setDevicePill(null);
      return;
    }

    // 1 request batch untuk V0+V4+V5 (lebih hemat), + 1 untuk status koneksi.
    // Jadi tiap refresh hanya 2 request, bukan 4.
    const [rB, rC] = await Promise.all([
      BlynkApi.getPins([P.moisture, P.pumpStatus, P.autoMode]),
      BlynkApi.isHardwareConnected()
    ]);
    const pick = (pin) => rB.ok
      ? { ok: true, value: rB.values[pin], status: rB.status, error: '' }
      : { ok: false, value: null, status: rB.status, error: rB.error };
    const rM = pick(P.moisture), rS = pick(P.pumpStatus), rA = pick(P.autoMode);

    if (rM.ok) {
      state.moisture = rM.value;
      Charts.setGauge(rM.value);
      UI.setZoneLabel(rM.value);
    }
    if (rS.ok) {
      state.pumpOn = rS.value === 1;
      UI.setPumpStatus(state.pumpOn);
    }
    if (rA.ok) {
      state.autoMode = rA.value === 1;
      UI.setModeStatus(state.autoMode);
      $('modeSwitch').checked = state.autoMode;
    }
    if (rC.ok) state.online = rC.value;

    // Konfirmasi perintah pompa: tahan tampilan optimistic sampai V4 dari
    // device cocok dengan perintah, atau sampai batas waktu habis.
    let pendingNote = '';
    if (state.pendingPump !== null) {
      const confirmed = rS.ok && rS.value !== null && ((rS.value === 1) === (state.pendingPump === 1));
      if (confirmed) {
        state.pendingPump = null;
      } else if (Date.now() > state.pendingUntil) {
        state.pendingPump = null;
        pendingNote = UI.alert('warning', '<strong>Perintah terkirim</strong>, tetapi device belum mengonfirmasi status pompa. Periksa koneksi ESP32.');
      } else {
        state.pumpOn = state.pendingPump === 1;
        UI.setPumpStatus(state.pumpOn);
      }
    }

    UI.setDevicePill(rC.ok ? rC.value : null);
    UI.setPumpButton(state.pumpOn, !!state.autoMode, state.busy);

    const failed = [rM, rS, rA, rC].filter(r => !r.ok);
    let html;
    if (failed.length === 4) {
      html = UI.alert('danger', '<strong>Gagal mengambil data.</strong> ' + BlynkApi.errorHint(failed[0].status));
    } else if (failed.length > 0) {
      html = UI.buildSmartAlerts(state.moisture, state.online, true) +
        UI.alert('warning', '<strong>Sebagian data gagal dimuat.</strong> ' + BlynkApi.errorHint(failed[0].status));
    } else {
      html = UI.buildSmartAlerts(state.moisture, state.online, true);
    }
    UI.show(html + pendingNote);

    $('lastUpdate').textContent = 'Terakhir diperbarui: ' + fmtClock(new Date());
    $('serverInfo').textContent = Settings.data.server.replace(/^https?:\/\//, '');
    const iv = Settings.data.interval;
    $('intervalInfo').textContent = iv >= 60 ? (iv / 60) + ' menit' : iv + ' detik';
  }

  function restartTimer() {
    if (timer) clearInterval(timer);
    timer = setInterval(refresh, Settings.data.interval * 1000);
  }

  /* ---------- Kontrol pompa: optimistic UI ----------
     Tampilan langsung berubah saat tombol ditekan,
     lalu dikonfirmasi ke device. Jauh lebih responsif. */
  async function togglePump() {
    if (state.busy || state.pumpOn === null) return;
    const target = state.pumpOn ? 0 : 1;

    state.busy = true;
    state.pumpOn = target === 1; // optimistic
    UI.setPumpStatus(state.pumpOn);
    UI.setPumpButton(state.pumpOn, !!state.autoMode, true);

    const res = await BlynkApi.updatePin(P.pumpSwitch, target);
    state.busy = false;

    if (!res.ok) {
      state.pumpOn = target !== 1; // kembalikan
      UI.setPumpStatus(state.pumpOn);
      UI.setPumpButton(state.pumpOn, !!state.autoMode, false);
      UI.show(UI.alert('danger', '<strong>Perintah gagal terkirim.</strong> ' + BlynkApi.errorHint(res.status)));
      return;
    }
    UI.setPumpButton(state.pumpOn, !!state.autoMode, false);

    // Tunggu konfirmasi V4 dari device: cek tiap 2 detik, maks 20 detik.
    // Selama itu tampilan optimistic dipertahankan oleh refresh().
    state.pendingPump = target;
    state.pendingUntil = Date.now() + 20000;
    const poll = setInterval(() => {
      if (state.pendingPump === null || Date.now() > state.pendingUntil) {
        clearInterval(poll);
        return;
      }
      refresh();
    }, 2000);
    setTimeout(refresh, 1200);
  }

  async function setAutoMode(on) {
    const prev = state.autoMode;
    state.autoMode = on; // optimistic
    UI.setModeStatus(on);
    $('modeSwitch').checked = on;
    UI.setPumpButton(state.pumpOn, on, false);

    const res = await BlynkApi.updatePin(P.autoMode, on ? 1 : 0);
    if (!res.ok) {
      state.autoMode = prev; // kembalikan
      UI.setModeStatus(prev);
      $('modeSwitch').checked = !!prev;
      UI.setPumpButton(state.pumpOn, !!prev, false);
      UI.show(UI.alert('danger', '<strong>Gagal mengubah mode.</strong> ' + BlynkApi.errorHint(res.status)));
      return;
    }
    setTimeout(refresh, 800);
  }

  /* ---------- Riwayat ---------- */
  function parseHistory(raw) {
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      return arr
        .map(p => {
          const ts = Number(p.ts), v = parseFloat(p.value);
          return (isNaN(ts) || isNaN(v)) ? null : [new Date(ts), v];
        })
        .filter(Boolean)
        .sort((a, b) => a[0] - b[0]);
    } catch (e) {
      return [];
    }
  }

  async function loadHistory(chart, period) {
    if (!Settings.data.token) {
      UI.show(UI.buildSmartAlerts(null, null, false));
      return;
    }
    const gran = period === 'THREE_MONTHS' ? 'DAILY' : 'HOURLY';
    const r = await BlynkApi.getHistory(P.moisture, period, gran);
    if (!r.ok) {
      UI.show(UI.alert('danger', '<strong>Gagal memuat riwayat.</strong> ' + BlynkApi.errorHint(r.status)));
      return;
    }
    Charts.setHistory(chart, parseHistory(r.text));
  }

  /* ---------- Form pengaturan ---------- */
  function initSettingsForm() {
    $('tokenInput').value = Settings.data.token;
    $('serverInput').value = Settings.data.server;
    $('intervalSelect').value = String(Settings.data.interval);

    $('saveBtn').addEventListener('click', async () => {
      Settings.save({
        token: $('tokenInput').value.trim(),
        server: $('serverInput').value.trim() || AppConfig.defaults.server,
        interval: parseInt($('intervalSelect').value, 10) || 60
      });
      restartTimer();
      await Promise.allSettled([refresh(), loadHistory(Charts.getMini(), 'DAY')]);
      // Konfirmasi ditampilkan SETELAH refresh selesai, di atas alert hasil
      // refresh, supaya tidak langsung tertimpa seperti sebelumnya.
      UI.show(UI.alert('success', '<strong>Pengaturan disimpan.</strong> Koneksi diperbarui dengan pengaturan baru.') + $('alertArea').innerHTML);
    });

    $('testBtn').addEventListener('click', async () => {
      const bakToken = Settings.data.token;
      const bakServer = Settings.data.server;
      Settings.data.token = $('tokenInput').value.trim();
      Settings.data.server = $('serverInput').value.trim() || AppConfig.defaults.server;

      const c = await BlynkApi.isHardwareConnected();
      const m = await BlynkApi.getPin(P.moisture);

      Settings.data.token = bakToken;
      Settings.data.server = bakServer;

      if (c.ok) {
        UI.show(UI.alert('success',
          '<strong>Koneksi berhasil.</strong> Device ' + (c.value ? 'online' : 'offline') +
          (m.ok && m.value !== null ? ', kelembapan terbaca ' + m.value.toFixed(0) + '%.' : '.')));
      } else {
        UI.show(UI.alert('danger', '<strong>Tes koneksi gagal.</strong> ' + BlynkApi.errorHint(c.status)));
      }
    });
  }

  /* ---------- Inisialisasi ---------- */
  function init() {
    Settings.load();
    UI.initAlertDismiss();
    UI.initNav((view) => {
      Charts.resizeAll();
      if (view === 'riwayat' && !histFullLoaded) {
        histFullLoaded = true;
        loadHistory(Charts.getFull(), $('periodSelect').value);
      }
    });
    UI.refreshIcons();
    UI.renderZoneList();
    Charts.init();
    initSettingsForm();

    $('refreshBtn').addEventListener('click', refresh);
    $('pumpBtn').addEventListener('click', togglePump);
    $('modeSwitch').addEventListener('change', (e) => setAutoMode(e.target.checked));
    $('miniHistBtn').addEventListener('click', () => loadHistory(Charts.getMini(), 'DAY'));
    $('histBtn').addEventListener('click', () => loadHistory(Charts.getFull(), $('periodSelect').value));
    $('periodSelect').addEventListener('change', () => loadHistory(Charts.getFull(), $('periodSelect').value));

    refresh();
    restartTimer();
    if (Settings.data.token) loadHistory(Charts.getMini(), 'DAY');
  }

  return { init, refresh, loadHistory };
})();

document.addEventListener('DOMContentLoaded', App.init);
