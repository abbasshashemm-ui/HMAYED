'use strict';

/* ===== Shared ===== */

function trackEvent(eventName, data = {}) {
  const payload = {
    event: eventName,
    data,
    page: window.location.pathname,
    timestamp: new Date().toISOString()
  };

  try {
    const key = 'hmayed_analytics';
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    current.push(payload);
    localStorage.setItem(key, JSON.stringify(current.slice(-300)));
  } catch (_) {}

  if (window.gtag) window.gtag('event', eventName, data);
  if (window.plausible) window.plausible(eventName, { props: data });
}

function prefersLightMedia() {
  const c = navigator.connection;
  if (!c) return false;
  return !!(c.saveData || /(^|-)2g/.test(c.effectiveType || ''));
}

function carouselSizesFor(key) {
  if (key === 'podcast') return '(max-width: 680px) 90vw, 468px';
  if (key === 'cinema') return '(max-width: 680px) 85vw, 520px';
  return '(max-width: 680px) 86vw, 400px';
}

const SUBMIT_ICONS = {
  arrowRight: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 5l7 7-7 7-1.4-1.4 5.6-5.6H4v-2h13.2l-5.6-5.6L13 5z"/></svg>',
  check: '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.5 16.2 4.8 11.5l1.4-1.4 3.3 3.3 8-8 1.4 1.4-9.4 9.4z"/></svg>',
  spinner: '<svg class="ui-icon ui-icon--spin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="28 56" stroke-linecap="round"/></svg>'
};

function setSubmitIcon(el, type) {
  if (!el) return;
  el.innerHTML = SUBMIT_ICONS[type] || SUBMIT_ICONS.arrowRight;
}

function revealItems(selector, delayStep) {
  const nodes = document.querySelectorAll(selector);
  nodes.forEach((item, index) => {
    item.classList.add('reveal-item');
    setTimeout(() => {
      item.classList.add('in');
    }, 70 + (index * delayStep));
  });
}

function displaySrcFor(fullSrc) {
  const dot = fullSrc.lastIndexOf('.');
  if (dot === -1) return fullSrc;
  return fullSrc.slice(0, dot) + '-display.jpg';
}

function loadPortfolioImage(img, fullSrc, options = {}) {
  const displaySrc = displaySrcFor(fullSrc);
  const { priority = 'auto', sizes = '' } = options;

  if (priority === 'high') img.fetchPriority = 'high';
  else if (priority === 'low') img.fetchPriority = 'low';

  img.dataset.fullSrc = fullSrc;
  img.decoding = 'async';
  if (sizes) img.sizes = sizes;

  img.addEventListener('error', () => {
    if (img.src !== fullSrc) img.src = fullSrc;
  }, { once: true });

  img.src = displaySrc === fullSrc ? fullSrc : displaySrc;
}

function loadSlideImage(slide, fullSrc, priority, sizes) {
  const img = slide.querySelector('img');
  if (!img || img.dataset.loaded === '1') return;
  img.dataset.loaded = '1';
  loadPortfolioImage(img, fullSrc, { priority, sizes });
}

function unloadDistantSlides(track, current, keepRange) {
  track.querySelectorAll('.carousel-slide').forEach((slide, idx) => {
    if (Math.abs(idx - current) <= keepRange) return;
    const img = slide.querySelector('img');
    if (!img || img.dataset.loaded !== '1') return;
    img.removeAttribute('src');
    img.dataset.loaded = '0';
  });
}

function primeCarouselWindow(root, imageUrls, current, keepRange, sizes) {
  const track = root.querySelector('.carousel-track');
  if (!track) return;
  const slides = track.querySelectorAll('.carousel-slide');
  const total = slides.length;

  for (let offset = -keepRange; offset <= keepRange; offset += 1) {
    const idx = ((current + offset) % total + total) % total;
    loadSlideImage(slides[idx], imageUrls[idx], offset === 0 ? 'high' : 'low', sizes);
  }

  unloadDistantSlides(track, current, keepRange + 1);
}

const CAROUSEL_IMAGES = {
  'talking-head': [
    'content/content-creation/talking-head/th1.webp',
    'content/content-creation/talking-head/th2.webp',
    'content/content-creation/talking-head/th3.webp',
    'content/content-creation/talking-head/th4.webp',
    'content/content-creation/talking-head/th5.webp'
  ],
  podcast: [
    'content/content-creation/podcast/podcast1.jpg',
    'content/content-creation/podcast/podcast2.jpg'
  ],
  food: [
    'content/content-creation/food/food1.jpg',
    'content/content-creation/food/food2.jpg',
    'content/content-creation/food/food3.jpg',
    'content/content-creation/food/food4.jpg',
    'content/content-creation/food/food5.jpg',
    'content/content-creation/food/food6.jpg',
    'content/content-creation/food/food7.jpg'
  ],
  cinema: [
    'content/cinema/cinema1.webp',
    'content/cinema/cinema2.webp',
    'content/cinema/cinema3.webp',
    'content/cinema/cinema4.webp',
    'content/cinema/cinema5.webp',
    'content/cinema/cinema6.webp'
  ]
};

function initResponsiveCarousel(root, imageUrls, trackingSession) {
  if (!root || !Array.isArray(imageUrls) || imageUrls.length === 0) return;
  if (root.dataset.carouselBuilt === '1') return;

  const track = root.querySelector('.carousel-track');
  const viewport = root.querySelector('.carousel-viewport');
  const dotsWrap = root.querySelector('.carousel-dots');
  const prevBtn = root.querySelector('.carousel-prev');
  const nextBtn = root.querySelector('.carousel-next');
  if (!track || !viewport || !dotsWrap || !prevBtn || !nextBtn) return;

  const slides = imageUrls.slice(0, 9);
  const carouselKey = root.getAttribute('data-carousel-key') || '';
  const imageSizes = carouselSizesFor(carouselKey);
  const progress = document.createElement('span');
  progress.className = 'carousel-progress';
  dotsWrap.appendChild(progress);

  slides.forEach((src, index) => {
    const slide = document.createElement('figure');
    slide.className = 'carousel-slide';
    slide.dataset.fullSrc = src;

    const img = document.createElement('img');
    img.alt = `${trackingSession} photo ${index + 1}`;
    img.loading = 'lazy';
    slide.appendChild(img);
    track.appendChild(slide);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Go to photo ${index + 1}`);
    dot.addEventListener('click', () => goTo(index, 'dot'));
    dotsWrap.appendChild(dot);
  });

  let current = 0;
  const dots = Array.from(dotsWrap.querySelectorAll('.carousel-dot'));
  const mobileQuery = window.matchMedia('(max-width: 900px)');
  const LOAD_RANGE = 1;

  function applyMode() {
    root.classList.toggle('is-mobile', mobileQuery.matches);
    root.classList.toggle('is-desktop', !mobileQuery.matches);
  }

  function render() {
    const allSlides = track.querySelectorAll('.carousel-slide');
    const total = slides.length;
    allSlides.forEach((slide, idx) => {
      let offset = idx - current;
      if (total > 2) {
        const half = Math.floor(total / 2);
        if (offset > half) offset -= total;
        else if (offset < -Math.floor((total - 1) / 2)) offset += total;
      }
      slide.style.setProperty('--offset', offset);
      slide.style.setProperty('--abs-offset', Math.abs(offset));
      slide.classList.toggle('is-active', offset === 0);
      slide.style.zIndex = 10 - Math.abs(offset);
    });
    dots.forEach((dot, idx) => {
      dot.classList.toggle('is-active', idx === current);
    });
    progress.textContent = `${current + 1}/${slides.length}`;
    primeCarouselWindow(root, slides, current, LOAD_RANGE, imageSizes);
  }

  function goTo(nextIndex, source) {
    const total = slides.length;
    current = ((nextIndex % total) + total) % total;
    render();
    if (source) {
      trackEvent('carousel_navigate', {
        session: trackingSession,
        source,
        slide: current + 1
      });
    }
  }

  prevBtn.addEventListener('click', () => goTo(current - 1, 'arrow_prev'));
  nextBtn.addEventListener('click', () => goTo(current + 1, 'arrow_next'));

  let touchStartX = 0;
  let touchDeltaX = 0;
  let trackingTouch = false;

  viewport.addEventListener('touchstart', (e) => {
    if (!mobileQuery.matches || !e.touches[0]) return;
    trackingTouch = true;
    touchStartX = e.touches[0].clientX;
    touchDeltaX = 0;
  }, { passive: true });

  viewport.addEventListener('touchmove', (e) => {
    if (!trackingTouch || !mobileQuery.matches || !e.touches[0]) return;
    touchDeltaX = e.touches[0].clientX - touchStartX;
  }, { passive: true });

  viewport.addEventListener('touchend', () => {
    if (!trackingTouch || !mobileQuery.matches) return;
    const threshold = 42;
    if (touchDeltaX <= -threshold) {
      goTo(current + 1, 'swipe_left');
    } else if (touchDeltaX >= threshold) {
      goTo(current - 1, 'swipe_right');
    }
    trackingTouch = false;
    touchDeltaX = 0;
  }, { passive: true });

  viewport.addEventListener('touchcancel', () => {
    trackingTouch = false;
    touchDeltaX = 0;
  }, { passive: true });

  if (typeof mobileQuery.addEventListener === 'function') {
    mobileQuery.addEventListener('change', applyMode);
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(applyMode);
  }

  applyMode();
  render();
  root.dataset.carouselBuilt = '1';
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  const digitsOnly = phone.replace(/[^0-9]/g, '');
  return digitsOnly.length >= 6 && digitsOnly.length <= 15;
}

function getLeadTypeLabel(value) {
  const select = document.getElementById('businessType');
  if (!select) return value;
  const option = select.querySelector(`option[value="${value}"]`);
  return option ? option.textContent : value;
}

function currentPageName() {
  return (window.location.pathname.split('/').pop() || '').toLowerCase();
}

/* ===== Home ===== */

function initHomePage() {
  const video = document.querySelector('.hero-video');
  const unmuteBtn = document.getElementById('unmuteBtn');
  const replayBtn = document.getElementById('replayBtn');
  if (!video || !unmuteBtn || !replayBtn) return;

  trackEvent('page_view', { page_type: 'home' });

  const sources = Array.from(video.querySelectorAll('source'));
  const videoBlock = video.closest('.video-block');
  const lightMedia = prefersLightMedia();

  const attachHeroVideo = () => {
    if (video.dataset.mediaLoaded === '1') return;
    video.dataset.mediaLoaded = '1';
    sources.forEach((el) => {
      if (el.dataset.src) el.src = el.dataset.src;
    });
    video.load();
    video.play().catch(() => {});

    if (videoBlock && 'IntersectionObserver' in window) {
      const pauseObserver = new IntersectionObserver((entries) => {
        if (!video.dataset.mediaLoaded) return;
        if (entries[0].isIntersecting) video.play().catch(() => {});
        else video.pause();
      }, { threshold: 0.12 });
      pauseObserver.observe(videoBlock);
    }
  };

  const scheduleHeroVideo = () => {
    if (lightMedia) {
      const loadOnIntent = () => attachHeroVideo();
      unmuteBtn.addEventListener('click', loadOnIntent, { once: true });
      video.addEventListener('click', loadOnIntent, { once: true });
      return;
    }
    if ('requestIdleCallback' in window) {
      requestIdleCallback(attachHeroVideo, { timeout: 1800 });
    } else {
      setTimeout(attachHeroVideo, 450);
    }
  };

  if (videoBlock && 'IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      videoObserver.disconnect();
      scheduleHeroVideo();
    }, { rootMargin: '60px', threshold: 0.12 });
    videoObserver.observe(videoBlock);
  } else {
    scheduleHeroVideo();
  }

  // Mark page ready shortly after first paint (cinematic intro)
  requestAnimationFrame(() => {
    setTimeout(() => document.body.classList.add('page-ready'), 90);
  });

  // Environment lighting controller (pointer + scroll -> CSS vars)
  (function initEnvironment() {
    const root = document.documentElement;
    let targetX = 0.5;
    let targetY = 0.35;
    let targetE = 0.25;
    let x = targetX;
    let y = targetY;
    let e = targetE;
    let vx = 0, vy = 0, ve = 0;
    let scroll = 0;
    let rafId = 0;

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    function setTargetsFromPointer(clientX, clientY) {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      targetX = clamp(clientX / w, 0, 1);
      targetY = clamp(clientY / h, 0, 1);
      const dx = (targetX - 0.5);
      const dy = (targetY - 0.35);
      targetE = clamp(0.28 + Math.sqrt(dx * dx + dy * dy) * 0.85, 0.2, 1);
    }

    window.addEventListener('pointermove', (ev) => {
      setTargetsFromPointer(ev.clientX, ev.clientY);
    }, { passive: true });

    window.addEventListener('scroll', () => {
      const doc = document.documentElement;
      const max = Math.max(1, doc.scrollHeight - doc.clientHeight);
      scroll = clamp(window.scrollY / max, 0, 1);
    }, { passive: true });

    let lastPaint = 0;
    function tick(now) {
      if (document.hidden) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      // Throttle updates to ~30fps (CSS var writes are not free)
      if (now - lastPaint < (1000 / 30)) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      lastPaint = now;

      const dt = 1 / 60;
      const k = 22; // stiffness
      const d = 8.2; // damping

      const ax = (targetX - x) * k - vx * d;
      const ay = (targetY - y) * k - vy * d;
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;

      const ke = 18;
      const de = 7.2;
      const ae = (targetE - e) * ke - ve * de;
      ve += ae * dt;
      e += ve * dt;

      root.style.setProperty('--env-x', x.toFixed(4));
      root.style.setProperty('--env-y', y.toFixed(4));
      root.style.setProperty('--env-e', e.toFixed(4));
      root.style.setProperty('--scroll', scroll.toFixed(4));

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);
    window.addEventListener('pagehide', () => cancelAnimationFrame(rafId), { once: true });
  })();

  let isUnmuted = false;
  let lastTime = 0;

  video.loop = true;
  video.muted = true;
  unmuteBtn.style.display = 'flex';

  function unmuteVideo() {
    video.muted = false;
    isUnmuted = true;
    unmuteBtn.style.display = 'none';
    trackEvent('video_unmute', { source: 'home_hero' });
    video.play().catch(() => {});
  }

  function muteVideoOnLoop() {
    video.muted = true;
    isUnmuted = false;
    unmuteBtn.style.display = 'flex';
  }

  video.addEventListener('timeupdate', () => {
    // Some browsers report small time jumps during buffering/seeking; only treat it as a loop
    // when we were near the end and suddenly jumped back near the start.
    if (isUnmuted && video.duration && isFinite(video.duration)) {
      const nearEnd = lastTime > Math.max(0, video.duration - 0.5);
      const jumpedToStart = video.currentTime < 0.35;
      if (nearEnd && jumpedToStart) {
        muteVideoOnLoop();
      }
    }
    lastTime = video.currentTime;
  });

  unmuteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    unmuteVideo();
  });

  video.addEventListener('click', () => {
    if (video.muted) unmuteVideo();
  });

  replayBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    video.currentTime = 0;
    muteVideoOnLoop();
    replayBtn.classList.remove('visible');
    trackEvent('video_replay', { source: 'home_hero' });
    video.play().catch(() => {});
  });

  video.addEventListener('dblclick', (e) => {
    e.preventDefault();
    replayBtn.classList.add('visible');
    setTimeout(() => replayBtn.classList.remove('visible'), 2000);
  });

  replayBtn.addEventListener('mousedown', (e) => e.stopPropagation());
  replayBtn.addEventListener('touchstart', (e) => e.stopPropagation());

  document.querySelectorAll('.lt-button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const href = btn.getAttribute('href') || '';
      const label = (btn.textContent || '').trim();
      trackEvent('menu_click', { label, href });
      if (href === '#') e.preventDefault();
    });
  });

  document.querySelectorAll('.social-link').forEach((link) => {
    link.addEventListener('click', () => {
      const network = link.getAttribute('data-label') || 'social';
      trackEvent('social_click', { network });
    });
  });

  revealItems('.top-bar, .video-block, .section-divider, .lt-button, .social-link, .footnote', 90);

  const divider = document.querySelector('.section-divider');
  if (divider && 'IntersectionObserver' in window) {
    const dividerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        divider.classList.toggle('in-view', entry.isIntersecting);
      });
    }, { threshold: 0.45 });
    dividerObserver.observe(divider);
  } else if (divider) {
    divider.classList.add('in-view');
  }

  const markVideoReady = () => {
    const container = document.querySelector('.video-block');
    if (container) container.classList.add('video-ready');
  };
  video.addEventListener('loadeddata', markVideoReady, { once: true });
  video.addEventListener('playing', markVideoReady, { once: true });

  const artLines = document.querySelector('.art-lines');
  let parallaxScheduled = false;
  function runParallax() {
    if (!artLines) return;
    const y = Math.max(-4, Math.min(4, window.scrollY * 0.03));
    artLines.style.transform = `translateY(${y}px)`;
    parallaxScheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!parallaxScheduled) {
      parallaxScheduled = true;
      requestAnimationFrame(runParallax);
    }
  }, { passive: true });

  document.querySelectorAll('.social-link').forEach((link) => {
    let holdTimer;
    const clearHold = () => {
      clearTimeout(holdTimer);
    };
    const hideLabel = () => {
      link.classList.remove('show-label');
    };

    link.addEventListener('touchstart', () => {
      clearHold();
      holdTimer = setTimeout(() => {
        link.classList.add('show-label');
        setTimeout(hideLabel, 1400);
      }, 360);
    }, { passive: true });

    link.addEventListener('touchend', clearHold, { passive: true });
    link.addEventListener('touchmove', clearHold, { passive: true });
    link.addEventListener('touchcancel', clearHold, { passive: true });
  });
}

/* ===== Booking ===== */

function initBookingPage(config) {
  const page = currentPageName();
  if (page !== config.pageFile) return;

  const form = document.getElementById('bookingForm');
  const formMessage = document.getElementById('formMessage');
  const submitBtn = document.getElementById('submitBtn');
  const submitText = submitBtn ? submitBtn.querySelector('span') : null;
  const submitIcon = submitBtn ? submitBtn.querySelector('.submit-icon') : null;
  const thankYouState = document.getElementById('thankYouState');
  const thankYouName = document.getElementById('thankYouName');
  const honeypot = document.getElementById('website');
  const carouselRoots = document.querySelectorAll('.media-carousel');
  let submissionSucceeded = false;

  if (!form || !formMessage) return;

  const formInputs = Array.from(form.querySelectorAll('.form-group .form-input'));
  function updateFloatingLabelState(input) {
    const group = input.closest('.form-group');
    if (!group) return;

    const hasValue = input.tagName === 'SELECT'
      ? input.value !== ''
      : input.value.trim() !== '';
    const isFocused = document.activeElement === input;

    group.classList.toggle('is-active', isFocused || hasValue);
    group.classList.toggle('is-filled', hasValue);
  }

  function initFloatingLabels() {
    formInputs.forEach((input) => {
      input.addEventListener('focus', () => updateFloatingLabelState(input));
      input.addEventListener('blur', () => updateFloatingLabelState(input));
      input.addEventListener('input', () => updateFloatingLabelState(input));
      input.addEventListener('change', () => updateFloatingLabelState(input));
      updateFloatingLabelState(input);
    });
  }

  initFloatingLabels();
  trackEvent('page_view', { session: config.sessionName });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const leadType = document.getElementById('businessType').value;
    const countryCode = document.getElementById('countryCode').value;
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const honeypotValue = honeypot ? honeypot.value.trim() : '';

    if (honeypotValue) {
      trackEvent('form_bot_blocked', { session: config.sessionName });
      return;
    }

    trackEvent('form_submit_attempt', { session: config.sessionName });

    if (!name || !leadType || !countryCode || !phone || !email) {
      showMessage('Please fill in all fields', 'error');
      trackEvent('form_validation_error', { type: 'missing_fields', session: config.sessionName });
      return;
    }

    if (!isValidEmail(email)) {
      showMessage('Please enter a valid email address', 'error');
      trackEvent('form_validation_error', { type: 'email', session: config.sessionName });
      return;
    }

    if (!isValidPhone(phone)) {
      showMessage('Please enter a valid phone number', 'error');
      trackEvent('form_validation_error', { type: 'phone', session: config.sessionName });
      return;
    }

    const payload = {
      name,
      country_code: countryCode,
      local_phone: phone,
      phone: `${countryCode} ${phone}`,
      email,
      session_type: config.sessionName,
      _subject: config.sessionName + ' Request - ' + name,
      _captcha: 'false',
      _template: 'table',
      _replyto: email,
      _honey: honeypotValue
    };
    payload[config.leadFieldKey] = getLeadTypeLabel(leadType);

    try {
      submissionSucceeded = false;
      setSubmitting(true);
      showMessage('Sending your request...', 'success');

      const response = await fetch('https://formsubmit.co/ajax/Dhmayedmhmd@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok || (result && result.success === 'false')) {
        throw new Error('Submission failed');
      }

      trackEvent('form_submit_success', { session: config.sessionName });
      showMessage('', 'success');
      setSubmitSuccess();
      form.reset();
      formInputs.forEach(updateFloatingLabelState);

      setTimeout(() => {
        showThankYou(name);
      }, 420);

      setTimeout(() => {
        window.location.href = `thank-you?session=${encodeURIComponent(config.sessionName)}&name=${encodeURIComponent(name)}`;
      }, 900);
      submissionSucceeded = true;
    } catch (_) {
      showMessage('Could not send right now. Please try again in a moment.', 'error');
      trackEvent('form_submit_error', { session: config.sessionName });
      setSubmitSuccess(false);
    } finally {
      if (!submissionSucceeded) {
        setSubmitting(false);
      }
    }
  });

  function setSubmitting(isSubmitting) {
    if (!submitBtn) return;
    submitBtn.classList.remove('is-success');
    submitBtn.disabled = isSubmitting;
    submitBtn.classList.toggle('is-loading', isSubmitting);
    submitBtn.style.pointerEvents = isSubmitting ? 'none' : 'auto';

    if (submitText) {
      submitText.textContent = isSubmitting ? 'Sending...' : 'Reserve Your Spot';
    }
    setSubmitIcon(submitIcon, isSubmitting ? 'spinner' : 'arrowRight');
  }

  function setSubmitSuccess(isSuccess = true) {
    if (!submitBtn) return;
    submitBtn.classList.remove('is-loading');
    submitBtn.classList.toggle('is-success', isSuccess);
    submitBtn.disabled = isSuccess;
    submitBtn.style.pointerEvents = isSuccess ? 'none' : 'auto';

    if (submitText) {
      submitText.textContent = isSuccess ? 'Sent' : 'Reserve Your Spot';
    }
    setSubmitIcon(submitIcon, isSuccess ? 'check' : 'arrowRight');
  }

  function showThankYou(name) {
    form.style.display = 'none';
    if (thankYouName) {
      thankYouName.textContent = name || 'there';
    }
    if (thankYouState) {
      thankYouState.classList.add('visible');
    }
  }

  function showMessage(text, type) {
    formMessage.textContent = text;
    formMessage.className = `form-message ${type}`;
    if (!text) {
      formMessage.className = 'form-message';
    }
  }

  carouselRoots.forEach((root) => {
    const key = root.getAttribute('data-carousel-key') || config.carouselKey;
    const imageUrls = CAROUSEL_IMAGES[key] || [];
    if (imageUrls.length === 0) return;

    const startCarousel = () => {
      initResponsiveCarousel(root, imageUrls, config.sessionName);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          startCarousel();
        });
      }, { rootMargin: '200px 0px', threshold: 0.05 });
      observer.observe(root);
    } else {
      startCarousel();
    }
  });
  revealItems('.top-bar, .video-block, .book-header, .booking-form, .footnote', 110);
}

/* ===== Thank-you ===== */

function initThankYouPage() {
  const sessionTag = document.getElementById('sessionTag');
  const sessionBack = document.getElementById('sessionBack');
  const message = document.getElementById('message');
  if (!sessionTag || !sessionBack || !message) return;

  const params = new URLSearchParams(window.location.search);
  const session = (params.get('session') || '').toLowerCase();
  const name = params.get('name') || '';

  let sessionLabel = 'Session';
  let backHref = 'content-creation';

  if (session.includes('cinema')) {
    sessionLabel = 'Cinema Session';
    backHref = 'cinema';
  } else if (session.includes('content')) {
    sessionLabel = 'Content Session';
    backHref = 'content-creation';
  }

  if (name) {
    message.textContent = `Thanks, ${name}. Your request was received successfully. We will contact you within 24 hours.`;
  }

  sessionTag.textContent = sessionLabel;
  sessionBack.href = backHref;
}

function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });

  document.querySelectorAll('.form-group, .book-header, .section-divider').forEach(el => {
    el.classList.add('scroll-reveal');
    observer.observe(el);
  });
}

(function bootstrap() {
  initHomePage();
  initBookingPage({
    pageFile: 'content-creation',
    sessionName: 'Content Session',
    leadFieldKey: 'business_type',
    carouselKey: 'content'
  });
  initBookingPage({
    pageFile: 'cinema',
    sessionName: 'Cinema Session',
    leadFieldKey: 'project_type',
    carouselKey: 'cinema'
  });
  initThankYouPage();
  initScrollReveal();

  // Page Transitions
  document.body.classList.add('loaded');

  document.addEventListener('pointerenter', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || link.hostname !== window.location.hostname) return;
    if (link.getAttribute('target') === '_blank') return;
    const href = link.getAttribute('href');
    if (!href || href.includes('#') || link.dataset.prefetched === '1') return;
    link.dataset.prefetched = '1';
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = href;
    document.head.appendChild(hint);
  }, true);

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a');
    if (
      link && 
      link.hostname === window.location.hostname && 
      link.getAttribute('target') !== '_blank' && 
      !link.href.includes('#') && 
      !link.href.startsWith('mailto:') && 
      !link.href.startsWith('tel:')
    ) {
      e.preventDefault();
      const href = link.getAttribute('href');
      document.body.classList.remove('loaded');
      document.body.classList.add('fade-out');
      setTimeout(() => {
        window.location.href = href;
      }, 400); // Wait for CSS transition
    }
  });
})();
