/* =============================================
   SUBLEVEL ZERO — Prototype Scripts
   Split-flap, scroll monitoring, decay effects
   ============================================= */

(function () {
  'use strict';

  // ── Respect reduced motion ──
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Split-Flap Title Animation ──
  function initSplitFlap() {
    const titleEl = document.querySelector('[data-split-flap]');
    if (!titleEl || prefersReducedMotion) return;

    const text = titleEl.getAttribute('data-split-flap');
    const decay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-decay')) || 0;
    const chars = text.split('');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    // Clear and build character cells
    titleEl.textContent = '';
    const spans = chars.map((char, i) => {
      const span = document.createElement('span');
      span.className = 'split-flap-char animating';
      span.setAttribute('data-char', char);
      span.textContent = char === ' ' ? '\u00A0' : randomChar(alphabet);
      titleEl.appendChild(span);
      return span;
    });

    // Determine if any characters should "stick" (decay effect)
    const stickyIndices = new Set();
    if (decay > 0.3 && chars.length > 3) {
      const numSticky = decay > 0.5 ? 2 : 1;
      while (stickyIndices.size < numSticky) {
        stickyIndices.add(Math.floor(Math.random() * chars.length));
      }
    }

    // Wrong letter glitch at high decay
    let wrongLetterIndex = -1;
    if (decay > 0.5 && chars.length > 4) {
      wrongLetterIndex = Math.floor(Math.random() * chars.length);
      while (chars[wrongLetterIndex] === ' ') {
        wrongLetterIndex = Math.floor(Math.random() * chars.length);
      }
    }

    // Animate each character
    const staggerDelay = 40;
    const flipDuration = 360; // ms per character's flip cycle
    const flipInterval = 60; // ms between intermediate characters

    spans.forEach((span, i) => {
      if (chars[i] === ' ') {
        span.textContent = '\u00A0';
        span.classList.remove('animating');
        return;
      }

      const isSticky = stickyIndices.has(i);
      const extraFlips = isSticky ? 6 : 0;
      const totalFlips = 5 + extraFlips;
      const delay = 200 + (i * staggerDelay);

      // Delay start per character for left-to-right stagger
      setTimeout(() => {
        let fc = 0;
        const ft = setInterval(() => {
          fc++;
          span.textContent = randomChar(alphabet);
          span.classList.add('settling');
          setTimeout(() => span.classList.remove('settling'), 70);

          if (fc >= totalFlips) {
            clearInterval(ft);
            if (i === wrongLetterIndex) {
              // Wrong letter glitch: show wrong char briefly, then correct
              span.textContent = randomChar(alphabet);
              setTimeout(() => {
                span.textContent = chars[i];
                span.classList.remove('animating');
                span.classList.add('settling');
                setTimeout(() => span.classList.remove('settling'), 80);
              }, 200);
            } else {
              span.textContent = chars[i];
              span.classList.remove('animating');
              span.classList.add('settling');
              setTimeout(() => span.classList.remove('settling'), 80);
            }
          }
        }, flipInterval);
      }, delay);
    });

    // Fade out cell backgrounds after animation completes
    const totalTime = 200 + (chars.length * staggerDelay) + (11 * flipInterval) + 400;
    setTimeout(() => {
      spans.forEach(s => {
        s.style.transition = 'background 300ms, background-image 300ms';
        s.style.background = 'none';
        s.style.backgroundImage = 'none';
      });
    }, totalTime);
  }

  function randomChar(alphabet) {
    return alphabet[Math.floor(Math.random() * alphabet.length)];
  }


  // ── Scroll-Reactive Monitoring Status ──
  function initMonitoringStatus() {
    const statusEl = document.querySelector('[data-monitoring-status]');
    const ledEl = document.querySelector('[data-monitoring-led]');
    if (!statusEl) return;

    let idleTimer = null;
    let lastScrollTime = Date.now();
    let currentStatus = 'MONITORING';

    function updateStatus(status) {
      if (status === currentStatus) return;
      currentStatus = status;
      statusEl.style.opacity = '0';
      setTimeout(() => {
        statusEl.textContent = 'SYS: ' + status;
        statusEl.style.opacity = '1';
      }, 100);

      // Update LED color
      if (ledEl) {
        ledEl.className = 'led';
        switch (status) {
          case 'READING':
            ledEl.classList.add('led--green');
            break;
          case 'DEEP SCAN':
            // amber (default)
            break;
          case 'IDLE':
            ledEl.classList.add('led--dim');
            break;
          default:
            // amber (default)
            break;
        }
      }
    }

    function onScroll() {
      lastScrollTime = Date.now();
      clearTimeout(idleTimer);

      const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);

      if (scrollPercent < 0.25) {
        updateStatus('MONITORING');
      } else if (scrollPercent < 0.75) {
        updateStatus('READING');
      } else {
        updateStatus('DEEP SCAN');
      }

      idleTimer = setTimeout(() => {
        updateStatus('IDLE');
      }, 10000);
    }

    window.addEventListener('scroll', throttle(onScroll, 200), { passive: true });
    onScroll();
  }


  // ── Grid Drift on Scroll ──
  function initGridDrift() {
    if (prefersReducedMotion) return;
    const decay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-decay')) || 0;
    if (decay === 0) return;

    window.addEventListener('scroll', throttle(() => {
      const scrollFraction = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      const drift = scrollFraction * decay * 2;
      document.body.style.setProperty('--lz-decay-grid-drift', drift + 'px');
    }, 50), { passive: true });
  }


  // ── Stamp Press Animation (Intersection Observer) ──
  function initStampPress() {
    if (prefersReducedMotion) return;

    const stamps = document.querySelectorAll('.stamp, .callout__label');
    if (!stamps.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.animation = 'stamp-press 150ms ease-out';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    stamps.forEach(el => {
      el.style.animation = 'none';
      observer.observe(el);
    });
  }


  // ── Thermal Receipt Entry Numbers ──
  function initReceiptNumbers() {
    const receipts = document.querySelectorAll('.thermal-receipt');
    receipts.forEach((receipt, i) => {
      const entryEl = receipt.querySelector('[data-entry-num]');
      if (entryEl) {
        entryEl.textContent = String(i + 1).padStart(3, '0');
      }
    });
  }


  // ── Decay Animation on Page Load ──
  function initDecayReveal() {
    if (prefersReducedMotion) return;
    const decay = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-decay')) || 0;
    if (decay === 0) return;

    // Temporarily set decay to 0, then animate to target
    const root = document.documentElement;
    root.style.setProperty('--page-decay', '0');

    requestAnimationFrame(() => {
      setTimeout(() => {
        root.style.transition = '--page-decay 600ms ease-out';
        root.style.setProperty('--page-decay', String(decay));

        // CSS custom properties don't transition natively,
        // so we animate manually
        animateDecay(0, decay, 600);
      }, 300);
    });
  }

  function animateDecay(from, to, duration) {
    const start = performance.now();
    const root = document.documentElement;

    function frame(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = from + (to - from) * eased;
      root.style.setProperty('--page-decay', String(current.toFixed(4)));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    }

    requestAnimationFrame(frame);
  }


  // ── Utility: Throttle ──
  function throttle(fn, ms) {
    let last = 0;
    return function (...args) {
      const now = Date.now();
      if (now - last >= ms) {
        last = now;
        fn.apply(this, args);
      }
    };
  }


  // ── Initialize ──
  document.addEventListener('DOMContentLoaded', () => {
    initSplitFlap();
    initMonitoringStatus();
    initGridDrift();
    initStampPress();
    initReceiptNumbers();
    // Decay reveal runs after a frame to read the initial value
    const decayAttr = document.querySelector('[data-page-decay]');
    if (decayAttr) {
      const targetDecay = parseFloat(decayAttr.getAttribute('data-page-decay'));
      if (targetDecay > 0 && !prefersReducedMotion) {
        document.documentElement.style.setProperty('--page-decay', '0');
        setTimeout(() => animateDecay(0, targetDecay, 600), 300);
      }
    }
  });

})();
