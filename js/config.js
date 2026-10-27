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
    interval: 15, // detik
    supabaseUrl: '',
    supabaseKey: ''
  },

  // Pemetaan datastream Blynk (virtual pin)
  pins: {
    moisture: 'V0',    // Kelembapan tanah (%)
    pumpSwitch: 'V1',   // Kontrol pompa (0/1)
    pumpStatus: 'V4',   // Status pompa (0/1)
    autoMode: 'V5'      // Mode otomatis (0 = manual, 1 = otomatis)
  },

  // Zona kelembapan tanah untuk aglonema (%)
  // Sumber zona optimal: Karenza et al. (2025), eksperimen 30 hari,
  // Aglaonema Stardust. Batas 40% dan 80% ditetapkan tim.
  // Setiap zona membawa rentang tampil (range) untuk kartu zona di HTML.
  zones: [
    { min: null, max: 40,   inclusiveMax: false, type: 'danger',  label: 'Terlalu kering',  color: '#dc2626', range: 'Di bawah 40%' },
    { min: 40,   max: 55,   inclusiveMax: false, type: 'warning', label: 'Kurang optimal', color: '#f59e0b', range: '40% – 55%' },
    { min: 55,   max: 65,   inclusiveMax: true,  type: 'success', label: 'Optimal',         color: '#16a34a', range: '55% – 65%' },
    { min: 65,   max: 80,   inclusiveMax: true,  type: 'warning', label: 'Agak basah',      color: '#f59e0b', range: '65% – 80%' },
    { min: 80,   max: null, inclusiveMax: false, type: 'danger',  label: 'Terlalu basah',   color: '#dc2626', range: 'Di atas 80%' }
  ],
  optimalMin: 55,
  optimalMax: 65
};

// Kepemilikan nilai tepat di batas: 40 masuk Kurang optimal, 55 dan 65
// masuk Optimal (selaras dengan pita netral firmware: pompa nyala di
// bawah 55, mati di atas 65), 80 masuk Agak basah.
function zoneOf(value) {
  for (const z of AppConfig.zones) {
    const aboveMin = z.min === null || value >= z.min;
    const belowMax = z.max === null || (z.inclusiveMax ? value <= z.max : value < z.max);
    if (aboveMin && belowMax) return z;
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
