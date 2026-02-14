/* =============================================
   DEPARTURE BOARD -- Scripts
   The Backlogs Transit Terminal Prototype
   ============================================= */

(function () {
  'use strict';

  // ── Character set for split-flap cycling ──
  const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-./:#&';

  // ── Configuration ──
  const CONFIG = {
    charFlipDuration: 280,      // ms per character flip cycle
    charCycleInterval: 50,      // ms between random char changes during flip
    charCycleCount: 5,          // how many random chars before settling
    charStagger: 30,            // ms stagger between characters in a word
    rowStagger: 100,            // ms stagger between board rows
    columnStagger: 100,         // ms stagger between table columns
    tableCharStagger: 20,       // ms per char in status board tables
    intersectionThreshold: 0.2, // how much of table must be visible
  };

  // ── Utility: pick random character ──
  function randomChar() {
    return FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
  }

  // ── Utility: check reduced motion ──
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ── Split-flap animate a single character element ──
  // The element should have data-char set to the target character.
  // Returns a promise that resolves when the character has settled.
  function animateChar(el, delay) {
    return new Promise((resolve) => {
      const target = el.getAttribute('data-char') || el.textContent;

      if (target === ' ') {
        el.classList.add('space-char');
        setTimeout(() => {
          el.textContent = '\u00A0';
          resolve();
        }, delay);
        return;
      }

      el.textContent = '\u00A0'; // blank initially

      setTimeout(() => {
        let cycleCount = 0;
        const totalCycles = CONFIG.charCycleCount;

        // Start the scaleY pinch animation
        el.style.setProperty('--char-flip-dur', CONFIG.charFlipDuration + 'ms');
        el.classList.add('flipping');

        const cycleInterval = setInterval(() => {
          // Show a random character
          el.setAttribute('data-flip-char', randomChar());
          cycleCount++;

          if (cycleCount >= totalCycles) {
            clearInterval(cycleInterval);
            // Settle on the correct character
            el.setAttribute('data-flip-char', target);

            setTimeout(() => {
              el.classList.remove('flipping');
              el.textContent = target;
              el.removeAttribute('data-flip-char');
              resolve();
            }, 60);
          }
        }, CONFIG.charCycleInterval);
      }, delay);
    });
  }

  // ── Split-flap animate a text string inside a container ──
  // Wraps each character in a .split-flap-char span and animates them.
  function splitFlapText(container, text, baseDelay, options = {}) {
    const { settleClass = 'settled', keepCells = false } = options;

    container.innerHTML = '';
    const chars = text.split('');
    const spans = [];

    chars.forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'split-flap-char';
      span.setAttribute('data-char', ch);

      if (ch === ' ') {
        span.classList.add('space-char');
        span.textContent = '\u00A0';
      } else {
        span.textContent = '\u00A0'; // blank placeholder
      }

      container.appendChild(span);
      spans.push(span);
    });

    // If reduced motion, just show immediately
    if (prefersReducedMotion()) {
      spans.forEach((span) => {
        const ch = span.getAttribute('data-char');
        span.textContent = ch === ' ' ? '\u00A0' : ch;
      });
      return Promise.resolve();
    }

    // Animate each character with stagger
    const promises = spans.map((span, i) => {
      const delay = baseDelay + i * CONFIG.charStagger;
      return animateChar(span, delay).then(() => {
        if (!keepCells) {
          span.classList.add(settleClass);
        }
      });
    });

    return Promise.all(promises);
  }

  // ── Departure Board: Animate all rows ──
  function animateDepartureBoard() {
    const board = document.querySelector('.departure-board');
    if (!board) return;

    const rows = board.querySelectorAll('tbody tr');
    if (!rows.length) return;

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');

      cells.forEach((cell, cellIndex) => {
        // Get the target text - handle special elements
        const statusEl = cell.querySelector('.board-status');
        const routeEl = cell.querySelector('.board-route');
        const platformEl = cell.querySelector('.board-platform');
        const targetEl = statusEl || routeEl || platformEl;

        let targetText;
        let animTarget;

        if (targetEl) {
          targetText = targetEl.textContent.trim();
          animTarget = targetEl;
        } else if (cell.querySelector('a')) {
          targetText = cell.querySelector('a').textContent.trim();
          animTarget = cell.querySelector('a');
        } else {
          targetText = cell.textContent.trim();
          animTarget = cell;
        }

        // Save classes for status elements
        const savedClasses = targetEl ? targetEl.className : '';

        const baseDelay = rowIndex * CONFIG.rowStagger + cellIndex * 50;

        splitFlapText(animTarget, targetText, baseDelay, {
          keepCells: true,
          settleClass: 'settled',
        }).then(() => {
          // Restore status classes after animation
          if (targetEl && savedClasses) {
            targetEl.className = savedClasses;
          }
        });
      });
    });
  }

  // ── Status Board Table: Animate on scroll into view ──
  function setupStatusBoardTables() {
    const tables = document.querySelectorAll('.status-board-table');
    if (!tables.length || prefersReducedMotion()) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateStatusBoardTable(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: CONFIG.intersectionThreshold });

    tables.forEach((table) => {
      // Store original content
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell) => {
          cell.setAttribute('data-original', cell.innerHTML);
          // Keep status dots visible, blank the text
          const statusCell = cell.querySelector('.status-cell');
          if (statusCell) {
            const textSpan = statusCell.querySelector('.status-text');
            if (textSpan) {
              textSpan.setAttribute('data-original-text', textSpan.textContent);
            }
          }
        });
      });

      observer.observe(table);
    });
  }

  function animateStatusBoardTable(table) {
    const rows = table.querySelectorAll('tbody tr');
    const numCols = rows[0] ? rows[0].querySelectorAll('td').length : 0;

    // Animate column by column
    for (let colIdx = 0; colIdx < numCols; colIdx++) {
      rows.forEach((row, rowIdx) => {
        const cell = row.querySelectorAll('td')[colIdx];
        if (!cell) return;

        const statusCell = cell.querySelector('.status-cell');
        let targetText, animTarget;

        if (statusCell) {
          const textSpan = statusCell.querySelector('.status-text');
          if (textSpan) {
            targetText = textSpan.getAttribute('data-original-text') || textSpan.textContent;
            animTarget = textSpan;
          }
        } else {
          // Get text content, ignoring child elements' structure
          const codeEl = cell.querySelector('code');
          if (codeEl) {
            targetText = codeEl.textContent.trim();
            animTarget = codeEl;
          } else {
            targetText = cell.textContent.trim();
            animTarget = cell;
          }
        }

        if (!targetText || !animTarget) return;

        const savedHTML = cell.getAttribute('data-original');
        const baseDelay = colIdx * CONFIG.columnStagger + rowIdx * 30;

        splitFlapText(animTarget, targetText, baseDelay, {
          keepCells: false,
          settleClass: 'settled',
        }).then(() => {
          // Restore original HTML structure after animation
          // so status dots etc reappear
          setTimeout(() => {
            cell.innerHTML = savedHTML;
          }, 200);
        });
      });
    }
  }

  // ── Page Title Split-Flap Animation ──
  function animatePageTitle() {
    const titleEl = document.querySelector('.page-title-animated');
    if (!titleEl || prefersReducedMotion()) return;

    const text = titleEl.textContent.trim();
    splitFlapText(titleEl, text, 200, {
      keepCells: false,
      settleClass: 'settled',
    });
  }

  // ── Mobile Navigation Toggle ──
  function setupMobileNav() {
    const toggle = document.querySelector('.mobile-nav-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    // Close on clicking outside
    document.addEventListener('click', (e) => {
      if (sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          e.target !== toggle) {
        sidebar.classList.remove('open');
      }
    });
  }

  // ── Initialize ──
  function init() {
    // Small delay to let fonts load
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        setTimeout(run, 50);
      });
    } else {
      setTimeout(run, 200);
    }
  }

  function run() {
    animateDepartureBoard();
    animatePageTitle();
    setupStatusBoardTables();
    setupMobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
