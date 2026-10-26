/* ============================================================
   ui.js - Komponen UI: alert, badge, sidebar (CSS mandiri, tanpa Bootstrap)
   ============================================================ */

const UI = (() => {
  const $ = (id) => document.getElementById(id);

  /* ---------- Alert (gaya Bootstrap 4, bisa di-dismiss) ---------- */
  function initAlertDismiss() {
    $('alertArea').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-dismiss="alert"]');
      if (btn) btn.closest('.alert').remove();
    });
  }

  function alert(type, msg) {
    return '<div class="alert alert-' + type + ' alert-dismissible" role="alert">' + msg +
      '<button type="button" class="close" data-dismiss="alert" aria-label="Tutup">' +
      '<span aria-hidden="true">&times;</span></button></div>';
  }

  function show(html) { $('alertArea').innerHTML = html; }
  function clear() { $('alertArea').innerHTML = ''; }

  /* ---------- Alert cerdas berdasarkan kondisi terkini ---------- */
  function buildSmartAlerts(moisture, online, hasToken) {
    const out = [];
    if (!hasToken) {
      out.push(alert('info', '<strong>Belum ada auth token.</strong> Buka menu <strong>Pengaturan</strong> lalu masukkan Device Auth Token dari Blynk.Console.'));
      return out.join('');
    }
    if (online === false) {
      out.push(alert('danger', '<strong>Device offline.</strong> ESP32 tidak terhubung ke Blynk. Periksa daya dan koneksi WiFi perangkat.'));
    }
    if (moisture !== null && moisture !== undefined) {
      const z = zoneOf(moisture);
      const v = moisture.toFixed(0);
      if (z.label === 'Terlalu kering') {
        out.push(alert('danger', '<strong>Terlalu kering (' + v + '%).</strong> Kelembapan di bawah 40%. Aglonema membutuhkan 55% - 65%. Segera siram atau periksa pompa.'));
      } else if (z.label === 'Kurang optimal') {
        out.push(alert('warning', '<strong>Kurang optimal (' + v + '%).</strong> Kelembapan di bawah zona ideal 55% - 65%. Pertimbangkan penyiraman.'));
      } else if (z.label === 'Optimal') {
        out.push(alert('success', '<strong>Zona optimal (' + v + '%).</strong> Kelembapan tanah berada di rentang ideal untuk aglonema.'));
      } else if (z.label === 'Agak basah') {
        out.push(alert('warning', '<strong>Agak basah (' + v + '%).</strong> Kelembapan di atas 65%. Perhatikan drainase media tanam.'));
      } else if (z.label === 'Terlalu basah') {
        out.push(alert('danger', '<strong>Terlalu basah (' + v + '%).</strong> Kelembapan di atas 80%, rawan busuk akar. Hentikan penyiraman sementara.'));
      }
    }
    return out.join('');
  }

  /* ---------- Badge & label ---------- */
  function setDevicePill(online) {
    const el = $('deviceStatus');
    if (online === true) {
      el.innerHTML = '<span class="dot bg-green-600"></span>Online';
      el.className = 'badge badge-green';
    } else if (online === false) {
      el.innerHTML = '<span class="dot bg-red-600"></span>Offline';
      el.className = 'badge badge-red';
    } else {
      el.innerHTML = '<span class="dot bg-slate-400"></span>Tidak diketahui';
      el.className = 'badge badge-gray';
    }
  }

  function setZoneLabel(value) {
    const el = $('zoneLabel');
    if (value === null || value === undefined) {
      el.textContent = 'Tidak ada data';
      el.style.color = '#94a3b8';
      return;
    }
    const z = zoneOf(value);
    el.textContent = z.label + ' (' + value.toFixed(0) + '%)';
    el.style.color = z.color;
  }

  function setPumpStatus(onOrNull) {
    const el = $('pumpStatus');
    if (onOrNull === null || onOrNull === undefined) {
      el.textContent = '-'; el.className = 'badge badge-gray'; return;
    }
    el.textContent = onOrNull ? 'Menyala' : 'Mati';
    el.className = 'badge ' + (onOrNull ? 'badge-green' : 'badge-gray');
  }

  function setModeStatus(autoOrNull) {
    const el = $('modeStatus');
    if (autoOrNull === null || autoOrNull === undefined) {
      el.textContent = '-'; el.className = 'badge badge-gray'; return;
    }
    el.textContent = autoOrNull ? 'Otomatis' : 'Manual';
    el.className = 'badge ' + (autoOrNull ? 'badge-blue' : 'badge-gray');
  }

  /**
   * Update tampilan tombol pompa.
   * @param {boolean|null} pumpOn - status pompa (null = tidak diketahui)
   * @param {boolean} autoMode
   * @param {boolean} busy - sedang mengirim perintah (optimistic)
   */
  function setPumpButton(pumpOn, autoMode, busy) {
    const btn = $('pumpBtn');
    const label = btn.querySelector('span');
    btn.disabled = autoMode || pumpOn === null || !!busy;
    if (label) label.textContent = pumpOn ? 'Matikan Pompa' : 'Nyalakan Pompa';
    btn.classList.remove('btn-green', 'btn-red');
    btn.classList.add(pumpOn ? 'btn-red' : 'btn-green');
    if (busy && label) label.textContent = 'Mengirim...';
    // Keterangan hanya tampil saat mode otomatis aktif (tombol disabled).
    // Saat mode manual, keterangan disembunyikan.
    const note = $('pumpNote');
    if (autoMode) {
      note.style.display = '';
      note.textContent = 'Mode otomatis aktif, tombol pompa dinonaktifkan.';
    } else {
      note.style.display = 'none';
    }
  }

  /* ---------- Daftar zona (dirender dari AppConfig, bukan hardcode di HTML) ---------- */
  function renderZoneList() {
    const ul = $('zoneList');
    if (!ul) return;
    ul.innerHTML = AppConfig.zones.map(z =>
      '<li class="zone-row"><span class="dot" style="background:' + z.color + '"></span>' +
      '<span class="text-slate-600">' + z.range + '</span>' +
      '<span class="ml-auto font-semibold text-slate-800">' + z.label + '</span></li>'
    ).join('');
  }

  /* ---------- Sidebar & navigasi ---------- */
  const TITLES = { dashboard: 'Dashboard', riwayat: 'Riwayat', pengaturan: 'Pengaturan' };

  function initNav(onSwitch) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        const v = link.dataset.view;
        ['dashboard', 'riwayat', 'pengaturan'].forEach(k => {
          $('view-' + k).classList.toggle('hidden', k !== v);
        });
        $('pageTitle').textContent = TITLES[v];
        closeSidebar();
        if (onSwitch) onSwitch(v);
      });
    });
    $('menuBtn').addEventListener('click', openSidebar);
    $('sidebarOverlay').addEventListener('click', closeSidebar);
  }

  function openSidebar() {
    $('sidebar').style.transform = 'translateX(0)';
    $('sidebarOverlay').classList.remove('hidden');
  }
  function closeSidebar() {
    if (window.innerWidth < 768) {
      $('sidebar').style.transform = '';
      $('sidebarOverlay').classList.add('hidden');
    }
  }

  function refreshIcons() {
    if (window.lucide) lucide.createIcons();
  }

  return {
    $, initAlertDismiss, alert, show, clear,
    buildSmartAlerts, setDevicePill, setZoneLabel,
    setPumpStatus, setModeStatus, setPumpButton,
    initNav, refreshIcons, renderZoneList
  };
})();
