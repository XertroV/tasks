/* ============================================================
   SOMNOGRAPHY HYBRID -- Scripts
   EEG Trace Generation, Hypnogram, Decay System, Redactions
   ============================================================ */

(function () {
  'use strict';

  // ---- Utility: generate sine wave SVG path ----
  function sineWavePath(startX, startY, width, frequency, amplitude, phase) {
    const points = [];
    const steps = Math.ceil(width / 2);
    for (let i = 0; i <= steps; i++) {
      const x = startX + (i / steps) * width;
      const y = startY + Math.sin((i / steps) * Math.PI * 2 * frequency + phase) * amplitude;
      points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return 'M' + points.join(' L');
  }

  // ---- Utility: approximate path length ----
  function approxPathLength(startX, width, frequency, amplitude) {
    let len = 0;
    const steps = Math.ceil(width / 2);
    let prevX = startX, prevY = 0;
    for (let i = 1; i <= steps; i++) {
      const x = startX + (i / steps) * width;
      const y = Math.sin((i / steps) * Math.PI * 2 * frequency) * amplitude;
      const dx = x - prevX;
      const dy = y - prevY;
      len += Math.sqrt(dx * dx + dy * dy);
      prevX = x;
      prevY = y;
    }
    return Math.ceil(len);
  }

  // ---- EEG Trace Draw Animation (Landing Page) ----
  function initEEGTraces() {
    const container = document.getElementById('eeg-traces-svg');
    if (!container) return;

    const width = container.viewBox.baseVal.width || 540;
    const traceConfigs = [
      { label: 'Alpha (Commands)', freq: 2, amp: 10, y: 20, cls: 'trace-alpha', delay: '' },
      { label: 'Beta (Active)',    freq: 8, amp: 5,  y: 48, cls: 'trace-beta',  delay: 'delay-1' },
      { label: 'Theta (Guides)',   freq: 0.5, amp: 14, y: 76, cls: 'trace-theta', delay: 'delay-2' },
      { label: 'Delta (Deep)',     freq: 0.25, amp: 18, y: 104, cls: 'trace-delta', delay: 'delay-3' },
    ];

    traceConfigs.forEach(function (cfg) {
      // Label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '0');
      text.setAttribute('y', String(cfg.y + 4));
      text.setAttribute('class', 'eeg-trace-label');
      text.textContent = cfg.label;
      container.appendChild(text);

      // Trace path
      const traceStartX = 130;
      const traceWidth = width - traceStartX - 10;
      const d = sineWavePath(traceStartX, cfg.y, traceWidth, cfg.freq, cfg.amp, 0);
      const pathLen = approxPathLength(traceStartX, traceWidth, cfg.freq, cfg.amp);

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'eeg-trace ' + cfg.cls + (cfg.delay ? ' ' + cfg.delay : ''));
      path.style.setProperty('--trace-len', String(pathLen));
      container.appendChild(path);
    });
  }

  // ---- Hypnogram Timeline ----
  function initHypnogram() {
    const container = document.getElementById('hypnogram-svg');
    if (!container) return;

    const tooltip = document.getElementById('hypnogram-tooltip');
    const currentPage = document.body.dataset.page || 'index';

    // Section definitions
    const sections = [
      { id: 'index', label: 'Overview', stage: 'W', stageY: 8, file: 'index.html',
        note: "Subject baseline. All readings nominal." },
      { id: 'commands', label: 'Commands', stage: 'N1', stageY: 20, file: 'commands.html',
        note: "Light documentation. Subject responsive." },
      { id: 'commands-grab', label: 'Grab', stage: 'N2', stageY: 32, file: 'commands-grab.html',
        note: "The corridors continue." },
      { id: 'reference', label: 'Reference', stage: 'N3', stageY: 44, file: '#',
        note: "Deep documentation. Reduced subject awareness." },
      { id: 'internals', label: 'Internals', stage: 'REM', stageY: 56, file: 'internals.html',
        note: "Subject is dreaming. Do not wake." },
    ];

    const svgWidth = container.viewBox.baseVal.width || 860;
    const svgHeight = container.viewBox.baseVal.height || 64;
    const leftMargin = 40;
    const rightMargin = 20;
    const usableWidth = svgWidth - leftMargin - rightMargin;
    const sectionWidth = usableWidth / (sections.length);

    // Stage labels on left axis
    const stages = ['W', 'N1', 'N2', 'N3', 'REM'];
    const stageYs = [8, 20, 32, 44, 56];
    stages.forEach(function (s, i) {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '4');
      text.setAttribute('y', String(stageYs[i] + 3));
      text.setAttribute('class', 'hypnogram-labels');
      text.textContent = s;
      container.appendChild(text);
    });

    // Horizontal axis rules (faint)
    stageYs.forEach(function (y) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(leftMargin - 5));
      line.setAttribute('y1', String(y));
      line.setAttribute('x2', String(svgWidth - rightMargin));
      line.setAttribute('y2', String(y));
      line.setAttribute('stroke', '#1A2838');
      line.setAttribute('stroke-width', '0.5');
      line.setAttribute('stroke-dasharray', '4,4');
      container.appendChild(line);
    });

    // Build stepped line path
    let pathD = '';
    const sectionCenters = [];

    sections.forEach(function (sec, i) {
      const x = leftMargin + i * sectionWidth + sectionWidth / 2;
      sectionCenters.push({ x: x, y: sec.stageY });

      if (i === 0) {
        pathD += 'M' + x + ',' + sec.stageY;
      } else {
        // Horizontal to the x of this section, then vertical to its stage
        const prevY = sections[i - 1].stageY;
        pathD += ' L' + x + ',' + prevY;
        pathD += ' L' + x + ',' + sec.stageY;
      }
    });

    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linePath.setAttribute('d', pathD);
    linePath.setAttribute('class', 'hypnogram-line');
    container.appendChild(linePath);

    // Dots and labels
    sections.forEach(function (sec, i) {
      const cx = sectionCenters[i].x;
      const cy = sectionCenters[i].y;
      const isCurrent = sec.id === currentPage;

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('class', isCurrent ? 'hypnogram-dot' : 'hypnogram-dot-inactive');

      // Hover area (larger invisible circle)
      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      hitArea.setAttribute('cx', String(cx));
      hitArea.setAttribute('cy', String(cy));
      hitArea.setAttribute('r', '18');
      hitArea.setAttribute('fill', 'transparent');
      hitArea.setAttribute('cursor', sec.file !== '#' ? 'pointer' : 'default');
      hitArea.dataset.index = String(i);

      // Click to navigate
      if (sec.file !== '#') {
        hitArea.addEventListener('click', function () {
          window.location.href = sec.file;
        });
      }

      // Tooltip
      hitArea.addEventListener('mouseenter', function (e) {
        if (!tooltip) return;
        tooltip.innerHTML =
          '<strong>Stage: ' + sec.stage + '</strong> | ' + sec.label +
          '<br><span style="opacity:0.7">Subject notes: "' + sec.note + '"</span>';
        tooltip.classList.add('visible');
        const rect = container.parentElement.getBoundingClientRect();
        const px = cx / svgWidth * rect.width;
        tooltip.style.left = px + 'px';
        tooltip.style.top = '68px';
      });

      hitArea.addEventListener('mouseleave', function () {
        if (tooltip) tooltip.classList.remove('visible');
      });

      container.appendChild(circle);
      container.appendChild(hitArea);

      // Section label below
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(cx));
      text.setAttribute('y', '63');
      text.setAttribute('class', 'hypnogram-section-labels');
      text.setAttribute('font-weight', isCurrent ? '700' : '400');
      if (isCurrent) text.setAttribute('fill', '#C0D0E0');
      text.textContent = sec.label;
      container.appendChild(text);
    });
  }

  // ---- Decay System ----
  function initDecay() {
    const decay = parseFloat(document.body.dataset.decay || '0');
    document.documentElement.style.setProperty('--page-decay', String(decay));
  }

  // ---- Small nav wave snippets ----
  function initNavWaves() {
    document.querySelectorAll('.nav-wave').forEach(function (svg) {
      const freq = parseFloat(svg.dataset.freq || '2');
      const amp = parseFloat(svg.dataset.amp || '4');
      const color = svg.dataset.color || '#4477CC';
      const w = 32, h = 10;
      const d = sineWavePath(0, h / 2, w, freq, amp, 0);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', color);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '1.5');
      svg.appendChild(path);
    });
  }

  // ---- Active sidebar trace ----
  function initSidebarTraces() {
    document.querySelectorAll('.active-trace').forEach(function (svg) {
      const color = svg.dataset.color || '#4477CC';
      const freq = parseFloat(svg.dataset.freq || '3');
      const d = sineWavePath(0, 6, 40, freq, 4, 0);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', color);
      path.setAttribute('class', 'active-trace-line');
      svg.appendChild(path);
    });
  }

  // ---- Decay background traces (for deeper pages) ----
  function initDecayTraces() {
    const container = document.getElementById('decay-traces-svg');
    if (!container) return;
    const decay = parseFloat(document.body.dataset.decay || '0');
    if (decay < 0.1) return;

    const w = 2000;
    const h = 1200;
    container.setAttribute('viewBox', '0 0 ' + w + ' ' + h);

    const configs = [
      { freq: 1.5, amp: 40, y: 200, color: '#4477CC', minDecay: 0.1 },
      { freq: 6, amp: 15, y: 400, color: '#55CC66', minDecay: 0.2 },
      { freq: 0.4, amp: 60, y: 650, color: '#DDAA33', minDecay: 0.25 },
      { freq: 0.15, amp: 80, y: 900, color: '#9966DD', minDecay: 0.35 },
    ];

    configs.forEach(function (cfg) {
      if (decay < cfg.minDecay) return;
      const d = sineWavePath(0, cfg.y, w, cfg.freq, cfg.amp, Math.random() * 6);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', cfg.color);
      path.setAttribute('class', 'decay-trace');
      path.setAttribute('opacity', String(Math.min(decay * 0.4, 0.25)));
      container.appendChild(path);
    });
  }

  // ---- Recording timer (landing page) ----
  function initRecordingTimer() {
    const timerEl = document.getElementById('recording-timer');
    if (!timerEl) return;
    let seconds = 0;
    function updateTimer() {
      seconds++;
      const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
      const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
      const s = String(seconds % 60).padStart(2, '0');
      timerEl.textContent = h + ':' + m + ':' + s;
    }
    setInterval(updateTimer, 1000);
  }

  // ---- H1 decorative wave ----
  function initH1Waves() {
    document.querySelectorAll('.h1-wave').forEach(function (svg) {
      const color = svg.dataset.color || '#4477CC';
      const freq = parseFloat(svg.dataset.freq || '3');
      const w = svg.clientWidth || 400;
      const d = sineWavePath(0, 8, w, freq, 5, 0);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('stroke', color);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-width', '1.5');
      svg.appendChild(path);
    });
  }

  // ---- Init ----
  document.addEventListener('DOMContentLoaded', function () {
    initDecay();
    initEEGTraces();
    initHypnogram();
    initNavWaves();
    initSidebarTraces();
    initDecayTraces();
    initRecordingTimer();
    initH1Waves();
  });
})();
