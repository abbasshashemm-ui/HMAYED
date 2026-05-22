'use strict';

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

function carouselSizesFor(key) {
  if (key === 'podcast') return '(max-width: 680px) 94vw, 702px';
  return '(max-width: 680px) 85vw, 520px';
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
  const instant = prefersReducedMotion();
  nodes.forEach((item, index) => {
    item.classList.add('reveal-item');
    if (instant) {
      item.classList.add('in');
      return;
    }
    window.setTimeout(() => {
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
    'content/content-creation/talking-head/CC1.webp',
    'content/content-creation/talking-head/CC2.webp',
    'content/content-creation/talking-head/CC3.webp'
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
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const LOAD_RANGE = 1;

  function applyMode() {
    root.classList.toggle('is-mobile', mobileQuery.matches);
    root.classList.toggle('is-desktop', !mobileQuery.matches);
    root.classList.toggle('is-reduced-motion', reducedMotionQuery.matches);
  }

  function render() {
    const allSlides = track.querySelectorAll('.carousel-slide');
    const total = slides.length;

    if (!mobileQuery.matches) {
      allSlides.forEach((slide, idx) => {
        slide.hidden = false;
        slide.style.removeProperty('--offset');
        slide.style.removeProperty('--abs-offset');
        slide.style.removeProperty('z-index');
        slide.classList.add('is-active');
        loadSlideImage(slide, slides[idx], idx === 0 ? 'high' : 'auto', imageSizes);
      });
      dots.forEach((dot, idx) => {
        dot.classList.toggle('is-active', idx === 0);
      });
      progress.textContent = `${slides.length} photos`;
      return;
    }

    const flat = true;

    allSlides.forEach((slide, idx) => {
      if (flat) {
        const active = idx === current;
        slide.hidden = !active;
        slide.style.setProperty('--offset', '0');
        slide.style.setProperty('--abs-offset', active ? '0' : '1');
        slide.classList.toggle('is-active', active);
        slide.style.zIndex = active ? 2 : 1;
        return;
      }

      slide.hidden = false;
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
    mobileQuery.addEventListener('change', () => {
      applyMode();
      render();
    });
  } else if (typeof mobileQuery.addListener === 'function') {
    mobileQuery.addListener(() => {
      applyMode();
      render();
    });
  }

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', () => {
      applyMode();
      render();
    });
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(() => {
      applyMode();
      render();
    });
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

function prefersSaveData() {
  const c = navigator.connection;
  return !!(c && (c.saveData || /(^|-)2g/.test(c.effectiveType || '')));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const MOBILE_LAYOUT_QUERY = window.matchMedia('(max-width: 768px)');

function isMobileLayout() {
  return MOBILE_LAYOUT_QUERY.matches;
}

function shouldSkipSpline() {
  return prefersReducedMotion();
}

function heroVideoSrc() {
  if (isMobileLayout() || prefersSaveData()) return 'main-mobile.webm';
  return 'main.webm';
}

function whenPageRevealed(callback, fallbackMs = 5200) {
  if (document.body.classList.contains('loaded')) {
    window.setTimeout(callback, 400);
    return;
  }
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.setTimeout(callback, 400);
  };
  document.addEventListener('spline-ready', run, { once: true });
  window.setTimeout(run, fallbackMs);
}

function initSplineScene() {
  const wrap = document.querySelector('.spline-bg');
  const viewer = document.querySelector('spline-viewer');

  const finishReveal = () => {
    wrap?.classList.add('is-ready');
    document.body.classList.add('loaded');
    document.dispatchEvent(new CustomEvent('spline-ready'));
  };

  if (!wrap) {
    document.body.classList.add('loaded');
    document.dispatchEvent(new CustomEvent('spline-ready'));
    return;
  }

  if (shouldSkipSpline()) {
    wrap.classList.add('is-reduced-motion-hidden');
    document.body.classList.add('no-spline-motion');
    viewer?.remove();
    finishReveal();
    return;
  }

  let done = false;
  const reveal = () => {
    if (done) return;
    done = true;
    finishReveal();
  };

  if (!viewer) {
    reveal();
    return;
  }

  viewer.addEventListener('load-complete', reveal, { once: true });
  viewer.addEventListener('load', reveal, { once: true });
  window.setTimeout(reveal, 5000);
  customElements.whenDefined('spline-viewer').catch(reveal);
}

function initHomePage() {
  const video = document.querySelector('.hero-video');
  const unmuteBtn = document.getElementById('unmuteBtn');
  const replayBtn = document.getElementById('replayBtn');
  if (!video || !unmuteBtn || !replayBtn) return;

  trackEvent('page_view', { page_type: 'home' });

  const videoBlock = video.closest('.video-block');

  const attachHeroVideo = () => {
    if (video.dataset.mediaLoaded === '1') return;
    video.dataset.mediaLoaded = '1';
    const source = document.createElement('source');
    source.src = heroVideoSrc();
    source.type = 'video/webm';
    video.appendChild(source);
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
    if (prefersSaveData()) {
      const loadOnIntent = () => attachHeroVideo();
      unmuteBtn.addEventListener('click', loadOnIntent, { once: true });
      video.addEventListener('click', loadOnIntent, { once: true });
      return;
    }
    const start = () => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(attachHeroVideo, { timeout: 800 });
      } else {
        window.setTimeout(attachHeroVideo, 200);
      }
    };
    whenPageRevealed(start);
  };

  if (videoBlock && 'IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting) return;
      videoObserver.disconnect();
      scheduleHeroVideo();
    }, { rootMargin: '80px', threshold: 0.08 });
    videoObserver.observe(videoBlock);
  } else {
    scheduleHeroVideo();
  }

  let isUnmuted = false;
  let lastTime = 0;

  video.loop = true;
  video.muted = true;
  unmuteBtn.style.display = 'flex';

  function unmuteVideo() {
    attachHeroVideo();
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
    attachHeroVideo();
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

  document.querySelectorAll('.social-link').forEach((link) => {
    let holdTimer;
    const clearHold = () => clearTimeout(holdTimer);

    link.addEventListener('click', () => {
      trackEvent('social_click', { network: link.getAttribute('data-label') || 'social' });
    });

    link.addEventListener('touchstart', () => {
      clearHold();
      holdTimer = setTimeout(() => {
        link.classList.add('show-label');
        setTimeout(() => link.classList.remove('show-label'), 1400);
      }, 360);
    }, { passive: true });

    link.addEventListener('touchend', clearHold, { passive: true });
    link.addEventListener('touchmove', clearHold, { passive: true });
    link.addEventListener('touchcancel', clearHold, { passive: true });
  });
}

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

function initAboutPage() {
  if (currentPageName() !== 'about') return;
  trackEvent('page_view', { page_type: 'about' });
  revealItems('.top-bar, .about-portrait, .about-section, .footnote', 100);
}

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

const WHATSAPP_URL = 'https://wa.me/96171661075';

function initFloatingWhatsApp() {
  if (document.getElementById('floatingWhatsApp')) return;

  const link = document.createElement('a');
  link.id = 'floatingWhatsApp';
  link.className = 'floating-whatsapp';
  link.href = WHATSAPP_URL;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', 'Chat on WhatsApp');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML =
    '<path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"></path>';
  link.appendChild(svg);

  link.addEventListener('click', () => {
    trackEvent('whatsapp_float_click', { href: WHATSAPP_URL });
  });

  document.body.appendChild(link);
}

function initScrollReveal() {
  const instant = prefersReducedMotion();
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.form-group, .book-header, .section-divider').forEach(el => {
    el.classList.add('scroll-reveal');
    if (instant) {
      el.classList.add('is-visible');
      return;
    }
    observer.observe(el);
  });
}

(function bootstrap() {
  initSplineScene();
  initFloatingWhatsApp();

  const page = currentPageName();
  const isHome = !page || page === 'index.html';

  if (isHome) initHomePage();
  else if (page === 'content-creation') {
    initBookingPage({
      pageFile: 'content-creation',
      sessionName: 'Content Session',
      leadFieldKey: 'business_type',
      carouselKey: 'content'
    });
  } else if (page === 'cinema') {
    initBookingPage({
      pageFile: 'cinema',
      sessionName: 'Cinema Session',
      leadFieldKey: 'project_type',
      carouselKey: 'cinema'
    });
  } else if (page === 'about') initAboutPage();
  else initThankYouPage();

  initScrollReveal();

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
})();
