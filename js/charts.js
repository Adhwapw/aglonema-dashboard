/* ============================================================
   charts.js - Inisialisasi dan opsi chart Apache ECharts
   ============================================================ */

const Charts = (() => {
  let gauge = null;
  let histMini = null;
  let histFull = null;

  // Warna zona pada gauge: [batasProporsi, warna]
  const GAUGE_ZONES = [[0.40, '#dc2626'], [0.55, '#f59e0b'], [0.65, '#16a34a'], [0.80, '#f59e0b'], [1, '#dc2626']];

  function gaugeOption(value) {
    return {
      series: [{
        type: 'gauge',
        min: 0, max: 100,
        startAngle: 200, endAngle: -20,
        radius: '100%', center: ['50%', '58%'],
        axisLine: { roundCap: true, lineStyle: { width: 16, color: GAUGE_ZONES } },
        pointer: { show: true, length: '48%', width: 4, itemStyle: { color: '#334155' } },
        anchor: { show: true, size: 14, itemStyle: { color: '#334155', borderColor: '#fff', borderWidth: 2 } },
        axisTick: { distance: -22, length: 6, lineStyle: { color: '#64748b', width: 1.5 } },
        splitLine: { distance: -26, length: 10, lineStyle: { color: '#64748b', width: 2 } },
        axisLabel: { distance: -6, color: '#475569', fontSize: 10 },
        title: { show: false },
        detail: {
          valueAnimation: true, offsetCenter: [0, '44%'],
          formatter: '{value}%', color: '#0f172a', fontSize: 32, fontWeight: 700
        },
        data: [{ value: value === null ? 0 : value }]
      }]
    };
  }

  function historyOption(seriesData) {
    return {
      tooltip: { trigger: 'axis', valueFormatter: (v) => v + '%' },
      legend: { bottom: 0, textStyle: { color: '#475569', fontSize: 12 } },
      grid: { left: 10, right: 18, top: 30, bottom: 52, containLabel: true },
      xAxis: { type: 'time', axisLabel: { color: '#475569', fontSize: 11, hideOverlap: true } },
      yAxis: {
        type: 'value', min: 0, max: 100,
        axisLabel: { formatter: '{value}%', color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e2e8f0' } }
      },
      series: seriesData.map((s, i) => ({
        name: s.name, type: 'line', smooth: true, showSymbol: false, data: s.points,
        lineStyle: { width: 2.5, color: s.color },
        itemStyle: { color: s.color },
        areaStyle: { color: s.color, opacity: 0.08 },
        markArea: i === 0 ? {
          silent: true,
          itemStyle: { color: 'rgba(22,163,74,0.08)' },
          label: { show: true, position: 'insideTopRight', color: '#065f46', fontSize: 11, formatter: 'Zona optimal' },
          data: [[{ yAxis: AppConfig.optimalMin }, { yAxis: AppConfig.optimalMax }]]
        } : undefined
      }))
    };
  }

  function init() {
    if (!window.echarts) return false;
    gauge = echarts.init(document.getElementById('gaugeMoist'));
    histMini = echarts.init(document.getElementById('histMini'));
    histFull = echarts.init(document.getElementById('histFull'));
    gauge.setOption(gaugeOption(null));
    window.addEventListener('resize', resizeAll);
    return true;
  }

  function resizeAll() {
    [gauge, histMini, histFull].forEach(c => { if (c) c.resize(); });
  }

  function setGauge(value) {
    if (gauge) gauge.setOption(gaugeOption(value));
  }

  function setHistory(chart, points) {
    if (!chart) return; // ECharts gagal dimuat (CDN terblokir): jangan crash
    chart.setOption(historyOption([
      { name: 'Kelembapan tanah', color: '#047857', points }
    ]), true);
  }

  function getMini() { return histMini; }
  function getFull() { return histFull; }

  return { init, resizeAll, setGauge, setHistory, getMini, getFull };
})();
