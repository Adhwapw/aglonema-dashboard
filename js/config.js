/* ============================================================
   config.js - Konstanta, zona kelembapan, dan pengaturan
   ============================================================ */

const AppConfig = {
  // Kunci penyimpanan di localStorage
  LS_KEY: 'aglonema_dashboard_settings_v2',

  // Nilai bawaan
  defaults: {
    token: '',
    server: 'https://blynk.cloud',
    interval: 15 // detik
  },

  // Pemetaan datastream Blynk (virtual pin)
  pins: {
    moisture: 'V0',    // Kelembapan tanah (%)
    pumpSwitch: 'V1',   // Kontrol pompa (0/1)
    pumpStatus: 'V4',   // Status pompa (0/1)
    autoMode: 'V5'      // Mode otomatis (0 = manual, 1 = otomatis)
  },

  // Zona kelembapan tanah untuk aglonema (%)
  // Sumber: Binus (2024) - eksperimen 30 hari, Aglaonema Stardust
  zones: [
    { max: 40,  type: 'danger',  label: 'Terlalu kering',  color: '#dc2626' },
    { max: 55,  type: 'warning', label: 'Kurang optimal', color: '#f59e0b' },
    { max: 65,  type: 'success', label: 'Optimal',         color: '#16a34a' },
    { max: 80,  type: 'warning', label: 'Agak basah',      color: '#f59e0b' },
    { max: 100, type: 'danger',  label: 'Terlalu basah',   color: '#dc2626' }
  ],
  optimalMin: 55,
  optimalMax: 65
};

function zoneOf(value) {
  for (const z of AppConfig.zones) {
    if (value <= z.max) return z;
  }
  return AppConfig.zones[AppConfig.zones.length - 1];
}

/* ---------- Pengaturan (localStorage) ---------- */
const Settings = {
  data: Object.assign({}, AppConfig.defaults),

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(AppConfig.LS_KEY));
      if (saved) this.data = Object.assign({}, AppConfig.defaults, saved);
    } catch (e) { /* abaikan, pakai bawaan */ }
    return this.data;
  },

  save(patch) {
    this.data = Object.assign({}, this.data, patch);
    try {
      localStorage.setItem(AppConfig.LS_KEY, JSON.stringify(this.data));
    } catch (e) { /* abaikan */ }
    return this.data;
  }
};
