/* ============================================================
   splash.js - Animasi intro saat membuka website.
   Tampil ~2,8 detik lalu memudar; bisa diklik untuk lewati.
   ============================================================ */
(function () {
  function hide() {
    const splash = document.getElementById('splash');
    if (!splash || splash.dataset.done) return;
    splash.dataset.done = '1';
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 700);
  }

  // Hormati preferensi gerak minimal: langsung lewati animasi.
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    hide();
    return;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const splash = document.getElementById('splash');
    if (!splash) return;
    splash.addEventListener('click', hide);
    setTimeout(hide, 2800);
  });
})();
