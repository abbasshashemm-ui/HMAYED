/* HMAYED site behaviour. No dependencies.
   Every feature is progressive: each page is complete without this file. */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const hasIO = 'IntersectionObserver' in window;

  const prefersSaveData = () => {
    const c = navigator.connection;
    return !!(c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
  };

  // Forwards to an analytics snippet if one is ever added (gtag or Plausible).
  function track(name, props = {}) {
    if (typeof window.gtag === 'function') window.gtag('event', name, props);
    if (typeof window.plausible === 'function') window.plausible(name, { props });
  }

  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4v16L20 12z" fill="currentColor"/></svg>';
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 5h4v14h-4zM13.5 5h4v14h-4z" fill="currentColor"/></svg>';
  const ICON_SOUND = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 9.5H7l4.5-4v13L7 14.5H3.5z" fill="currentColor"/><path d="M15 9a4.2 4.2 0 0 1 0 6M17.5 6.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" stroke-width="1.75" stroke-linecap="square"/></svg>';
  const ICON_MUTED = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 9.5H7l4.5-4v13L7 14.5H3.5z" fill="currentColor"/><path d="m15.5 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.75" stroke-linecap="square"/></svg>';

  /* Header: hairline once scrolled, and the mobile menu ------------------ */
  function initHeader() {
    const header = $('[data-header]');
    if (!header) return;

    if (hasIO) {
      const sentinel = document.createElement('div');
      sentinel.setAttribute('aria-hidden', 'true');
      sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none';
      document.body.prepend(sentinel);
      new IntersectionObserver(([entry]) => {
        header.toggleAttribute('data-scrolled', !entry.isIntersecting);
      }).observe(sentinel);
    }

    const toggle = $('[data-nav-toggle]', header);
    const nav = $('#site-nav');
    if (!toggle || !nav) return;
    const label = $('.label', toggle);

    const setOpen = (open) => {
      header.toggleAttribute('data-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close' : 'Menu';
    };
    const isOpen = () => header.hasAttribute('data-open');

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    nav.addEventListener('click', (e) => {
      if (e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', (e) => {
      if (isOpen() && !header.contains(e.target)) setOpen(false);
    });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', () => setOpen(false));
  }

  /* YouTube: nothing loads from YouTube until the visitor presses play --- */
  function youtubeFrame(id, title) {
    const frame = document.createElement('iframe');
    frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
    frame.title = title || 'YouTube video';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    return frame;
  }

  const isModifiedClick = (e) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

  function initInlinePlayers() {
    $$('[data-player] [data-yt-id]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        if (isModifiedClick(e)) return;
        e.preventDefault();
        const box = trigger.closest('[data-player]');
        const frame = youtubeFrame(trigger.dataset.ytId, trigger.dataset.ytTitle);
        box.replaceChildren(frame);
        frame.focus();
        track('video_play', { id: trigger.dataset.ytId, where: 'inline' });
      });
    });
  }

  function initDialogPlayer() {
    const triggers = $$('.work-card__link[data-yt-id]');
    if (!triggers.length || typeof HTMLDialogElement !== 'function') return;

    let dialog;
    let slot;
    let title;

    const build = () => {
      dialog = document.createElement('dialog');
      dialog.className = 'player-dialog surface-ink';
      dialog.setAttribute('aria-labelledby', 'player-dialog-title');
      dialog.innerHTML =
        '<div class="player-dialog__bar">' +
        '<p class="player-dialog__title" id="player-dialog-title"></p>' +
        '<button type="button" class="player-dialog__close" data-close>Close</button>' +
        '</div>' +
        '<div class="media media--16x9" data-slot></div>';
      document.body.append(dialog);
      slot = $('[data-slot]', dialog);
      title = $('#player-dialog-title', dialog);
      $('[data-close]', dialog).addEventListener('click', () => dialog.close());
      // A click on the backdrop lands on the <dialog> element itself.
      dialog.addEventListener('click', (e) => {
        if (e.target === dialog) dialog.close();
      });
      // Stop playback by removing the iframe.
      dialog.addEventListener('close', () => slot.replaceChildren());
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        if (isModifiedClick(e)) return;
        e.preventDefault();
        if (!dialog) build();
        title.textContent = trigger.dataset.ytTitle || 'Video';
        slot.replaceChildren(youtubeFrame(trigger.dataset.ytId, trigger.dataset.ytTitle));
        dialog.showModal();
        track('video_play', { id: trigger.dataset.ytId, where: 'work' });
      });
    });
  }

  /* Self-hosted clip: muted autoplay while visible, pause and sound controls */
  function initClips() {
    $$('[data-clip]').forEach((box) => {
      const video = $('video', box);
      const button = $('[data-clip-toggle]', box);
      const sound = $('[data-clip-sound]', box);
      if (!video || !button) return;

      video.removeAttribute('controls');
      button.hidden = false;

      // Respect reduced motion and data saver: start paused, play on request.
      let userPaused = reducedMotion.matches || prefersSaveData();

      if (sound) {
        sound.hidden = false;
        const renderSound = () => {
          const on = !video.muted;
          sound.setAttribute('aria-pressed', String(on));
          sound.innerHTML = `${on ? ICON_SOUND : ICON_MUTED}<span>Sound</span>`;
        };
        sound.addEventListener('click', () => {
          video.muted = !video.muted;
          if (!video.muted && video.paused) {
            userPaused = false;
            video.play().catch(() => {});
          }
          renderSound();
          track(video.muted ? 'video_mute' : 'video_unmute', { where: 'intro' });
        });
        video.addEventListener('volumechange', renderSound);
        renderSound();
      }

      const render = () => {
        const playing = !video.paused;
        button.innerHTML = playing ? `${ICON_PAUSE}<span>Pause</span>` : `${ICON_PLAY}<span>Play</span>`;
      };

      const toggle = () => {
        if (video.paused) {
          userPaused = false;
          video.play().catch(() => {});
        } else {
          userPaused = true;
          video.pause();
        }
        render(); // paused flips synchronously; don't wait for the media event
      };

      video.addEventListener('play', render);
      video.addEventListener('pause', render);
      button.addEventListener('click', toggle);
      video.addEventListener('click', toggle);
      render();

      if (hasIO) {
        new IntersectionObserver(([entry]) => {
          if (entry.isIntersecting && !userPaused) video.play().catch(() => {});
          else if (!entry.isIntersecting && !video.paused) video.pause();
        }, { threshold: 0.35 }).observe(box);
      }
    });
  }

  /* Work filters --------------------------------------------------------- */
  function initFilters() {
    const bar = $('[data-filters]');
    const grid = $('[data-work-grid]');
    if (!bar || !grid) return;

    const cards = $$('.work-card', grid);
    const empty = $('[data-work-empty]');
    const status = $('[data-filter-status]');
    bar.hidden = false;

    const apply = (key, announce) => {
      let shown = 0;
      cards.forEach((card) => {
        const match = key === 'all' || card.dataset.cat === key;
        card.hidden = !match;
        if (match) shown += 1;
      });
      $$('[data-filter]', bar).forEach((btn) => {
        btn.setAttribute('aria-pressed', String(btn.dataset.filter === key));
      });
      if (empty) empty.hidden = shown > 0;
      if (status && announce) status.textContent = `${shown} project${shown === 1 ? '' : 's'} shown`;
    };

    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;
      apply(btn.dataset.filter, true);
      track('work_filter', { filter: btn.dataset.filter });
    });

    // Deep link: /work?filter=documentary
    const initial = new URLSearchParams(window.location.search).get('filter');
    if (initial && $$('[data-filter]', bar).some((b) => b.dataset.filter === initial)) {
      apply(initial, false);
    }
  }

  /* Contact form --------------------------------------------------------- */
  function initContactForm() {
    const form = $('[data-contact-form]');
    if (!form) return;

    const status = $('[data-form-status]', form);
    const submit = $('[data-submit]', form);
    const field = (name) => form.elements.namedItem(name);

    // Prefill from links such as /contact?type=content or ?role=focus-puller
    const params = new URLSearchParams(window.location.search);
    const prefill = (name, key) => {
      const select = field(name);
      if (!key || !select) return;
      const option = Array.from(select.options).find((o) => o.dataset.key === key);
      if (option) select.value = option.value;
    };
    prefill('project_type', params.get('type'));
    prefill('role', params.get('role') || (params.get('type') === 'content' ? 'content' : null));

    const rules = {
      name: (v) => (v.trim() ? '' : 'Enter your name.'),
      email: (v) => {
        if (!v.trim()) return 'Enter your email address.';
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address, like name@example.com.';
      },
      summary: (v) => (v.trim().length >= 10 ? '' : 'Describe the project in a sentence or two.'),
    };

    const showError = (name, message) => {
      const input = field(name);
      const error = document.getElementById(`${input.id}-error`);
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
      if (error) {
        error.textContent = message;
        error.hidden = !message;
      }
    };

    const validate = () => {
      let firstInvalid = null;
      Object.entries(rules).forEach(([name, rule]) => {
        const message = rule(field(name).value);
        showError(name, message);
        if (message && !firstInvalid) firstInvalid = field(name);
      });
      return firstInvalid;
    };

    // Once a field has been flagged, clear the error as soon as it is fixed.
    Object.keys(rules).forEach((name) => {
      field(name).addEventListener('input', () => {
        if (field(name).getAttribute('aria-invalid') === 'true') showError(name, rules[name](field(name).value));
      });
    });

    const setStatus = (text, state = '') => {
      status.textContent = text;
      status.dataset.state = state;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (field('_honey') && field('_honey').value) return;

      const invalid = validate();
      if (invalid) {
        setStatus('Please fix the highlighted fields.', 'error');
        invalid.focus();
        return;
      }

      const data = Object.fromEntries(new FormData(form));
      delete data._next;
      data._replyto = data.email;

      submit.disabled = true;
      setStatus('Sending...');

      try {
        const endpoint = form.action.replace('://formsubmit.co/', '://formsubmit.co/ajax/');
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || String(body.success) === 'false') throw new Error(body.message || 'Request failed');

        track('form_submit_success', { type: data.project_type || 'unspecified' });
        try {
          sessionStorage.setItem('hmayed:first-name', data.name.trim().split(/\s+/)[0]);
        } catch (_) { /* storage unavailable: thank-you page falls back to generic copy */ }
        window.location.assign('/thank-you');
      } catch (_) {
        submit.disabled = false;
        setStatus('Could not send right now. Please try again, or message on WhatsApp.', 'error');
        track('form_submit_error');
      }
    });
  }

  function initThanks() {
    const el = $('[data-thanks]');
    if (!el) return;
    let name = '';
    try {
      name = sessionStorage.getItem('hmayed:first-name') || '';
      sessionStorage.removeItem('hmayed:first-name');
    } catch (_) { /* ignore */ }
    if (name) el.textContent = `Thanks, ${name}. ${el.textContent}`;
  }

  /* Reveal on scroll ----------------------------------------------------- */
  function initReveal() {
    const items = $$('.reveal');
    if (!items.length || reducedMotion.matches || !hasIO) return;

    // Hide only once the observer is ready, so content never stays hidden.
    document.documentElement.classList.add('reveal-ready');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    items.forEach((el) => {
      const siblings = Array.from(el.parentElement.children).filter((c) => c.classList.contains('reveal'));
      const index = siblings.indexOf(el);
      if (index > 0) el.style.setProperty('--reveal-delay', `${Math.min(index % 3, 2) * 80}ms`);
      observer.observe(el);
    });
  }

  function initYear() {
    $$('[data-year]').forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  initHeader();
  initInlinePlayers();
  initDialogPlayer();
  initClips();
  initFilters();
  initContactForm();
  initThanks();
  initReveal();
  initYear();
})();
