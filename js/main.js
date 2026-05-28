'use strict';

const CONTENT_BASE = 'content';
const HERO_ASSETS = {
  desktop: `${CONTENT_BASE}/home/main.webm`,
  mobile: `${CONTENT_BASE}/home/main-mobile.webm`
};

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
  if (key === 'podcast') return '(max-width: 680px) 78vw, 702px';
  if (key === 'talking-head' || key === 'food' || key === 'cinema') {
    return '(max-width: 680px) 85vw, 520px';
  }
  return '(max-width: 680px) 65vw, 585px';
}

function carouselImageSrc(fullSrc, isActive) {
  if (isActive || /\.webp$/i.test(fullSrc)) return fullSrc;
  return displaySrcFor(fullSrc);
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
    }, instant ? 0 : index * 24);
  });
}

function displaySrcFor(fullSrc) {
  const dot = fullSrc.lastIndexOf('.');
  if (dot === -1) return fullSrc;
  return fullSrc.slice(0, dot) + '-display.jpg';
}

function loadPortfolioImage(img, fullSrc, options = {}) {
  const { priority = 'auto', sizes = '', active = false } = options;
  const src = carouselImageSrc(fullSrc, active);

  if (priority === 'high') img.fetchPriority = 'high';
  else if (priority === 'low') img.fetchPriority = 'low';

  img.dataset.fullSrc = fullSrc;
  img.decoding = 'async';
  if (sizes) img.sizes = sizes;

  img.addEventListener('error', () => {
    if (img.src !== fullSrc) img.src = fullSrc;
  }, { once: true });

  img.src = src;
}

function loadSlideImage(slide, fullSrc, priority, sizes, isActive) {
  const img = slide.querySelector('img');
  if (!img) return;

  const nextSrc = carouselImageSrc(fullSrc, isActive);
  const loadedSrc = img.getAttribute('src') || '';

  if (img.dataset.loaded === '1' && loadedSrc === nextSrc) return;

  if (img.dataset.loaded === '1' && isActive && loadedSrc !== fullSrc) {
    img.src = fullSrc;
    return;
  }

  if (img.dataset.loaded === '1' && !isActive) return;

  img.dataset.loaded = '1';
  loadPortfolioImage(img, fullSrc, { priority, sizes, active: isActive });
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
    const isActive = offset === 0;
    loadSlideImage(slides[idx], imageUrls[idx], isActive ? 'high' : 'low', sizes, isActive);
  }

  unloadDistantSlides(track, current, keepRange + 1);
}

const CAROUSEL_IMAGES = {
  'talking-head': [
    `${CONTENT_BASE}/content-creation/talking-head/CC1.webp`,
    `${CONTENT_BASE}/content-creation/talking-head/CC2.webp`,
    `${CONTENT_BASE}/content-creation/talking-head/CC3.webp`
  ],
  podcast: [
    `${CONTENT_BASE}/content-creation/podcast/podcast1.jpg`,
    `${CONTENT_BASE}/content-creation/podcast/podcast2.jpg`
  ],
  food: [
    `${CONTENT_BASE}/content-creation/food/food1.jpg`,
    `${CONTENT_BASE}/content-creation/food/food2.jpg`,
    `${CONTENT_BASE}/content-creation/food/food3.jpg`,
    `${CONTENT_BASE}/content-creation/food/food4.jpg`,
    `${CONTENT_BASE}/content-creation/food/food5.jpg`,
    `${CONTENT_BASE}/content-creation/food/food6.jpg`,
    `${CONTENT_BASE}/content-creation/food/food7.jpg`
  ],
  cinema: [
    `${CONTENT_BASE}/cinema/cinema1.webp`,
    `${CONTENT_BASE}/cinema/cinema3.webp`,
    `${CONTENT_BASE}/cinema/cinema4.webp`,
    `${CONTENT_BASE}/cinema/cinema5.webp`,
    `${CONTENT_BASE}/cinema/cinema6.webp`
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
    const useFlat = mobileQuery.matches || reducedMotionQuery.matches;

    allSlides.forEach((slide, idx) => {
      if (useFlat) {
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
      slide.style.setProperty('--offset', String(offset));
      slide.style.setProperty('--abs-offset', String(Math.abs(offset)));
      slide.classList.toggle('is-active', offset === 0);
      slide.style.zIndex = String(10 - Math.abs(offset));
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

function getLeadTypeLabel(value, selectEl) {
  if (!selectEl) return value;
  const option = selectEl.querySelector(`option[value="${value}"]`);
  return option ? option.textContent : value;
}

const SITE_ORIGIN = 'https://hmayed.online';
let activeRouteId = 'home';

const ROUTES = {
  home: {
    path: '/',
    viewId: 'view-home',
    title: 'HMAYED',
    description: 'Cinema-trained director and content strategist. High-end commercial production and brand visual authority.',
    header: 'home'
  },
  about: {
    path: '/about',
    viewId: 'view-about',
    title: 'HMAYED · About Me',
    description: 'Documentary filmmaker, cinematographer, and content strategist bridging cinematic storytelling and digital marketing.',
    header: 'inner'
  },
  cinema: {
    path: '/cinema',
    viewId: 'view-cinema',
    title: 'HMAYED · Cinema',
    description: 'Brand films, commercials, music videos, and cinematic storytelling. Book your cinema session with HMAYED.',
    header: 'book',
    bookTargetId: 'cinBookingForm'
  },
  'content-creation': {
    path: '/content-creation',
    viewId: 'view-content-creation',
    title: 'HMAYED · Content Creation',
    description: 'Talking head, podcast, and food content production. Book a free consultation with HMAYED.',
    header: 'book',
    bookTargetId: 'ccBookingForm'
  },
  'thank-you': {
    path: '/thank-you',
    viewId: 'view-thank-you',
    title: 'HMAYED · Thank You',
    description: 'Your booking request was received. HMAYED will contact you within 24 hours.',
    header: 'none'
  }
};

const PATH_TO_ROUTE = Object.fromEntries(
  Object.entries(ROUTES).map(([routeId, route]) => [route.path, routeId])
);

function normalizePath(pathname) {
  let path = pathname.replace(/\/index\.html$/i, '/').replace(/\.html$/i, '');
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/+$/, '') || '/';
  return path;
}

function resolveRouteId(pathname) {
  return PATH_TO_ROUTE[normalizePath(pathname)] || 'home';
}

function currentRouteId() {
  return activeRouteId;
}

function navigateTo(url, options = {}) {
  const target = new URL(url, window.location.href);
  const routeId = resolveRouteId(target.pathname);
  const nextUrl = `${ROUTES[routeId].path}${target.search}${target.hash}`;

  if (options.replace) history.replaceState({ routeId }, '', nextUrl);
  else history.pushState({ routeId }, '', nextUrl);

  activateRoute(routeId);
}

function updateDocumentMeta(route) {
  document.title = route.title;

  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', route.description);

  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', `${SITE_ORIGIN}${route.path}`);

  document.querySelector('meta[property="og:title"]')?.setAttribute('content', route.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', route.description);
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', `${SITE_ORIGIN}${route.path}`);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', route.title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', route.description);
}

const HEADER_BACK_MARKUP =
  '<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15 4 7.4 12 15 20l-1.4 1.4-7.6-7.6 7.6-7.6L15 4z"/></svg>';

function ensureHeaderBack(header, show) {
  let backBtn = document.getElementById('headerBack');
  if (!show) {
    backBtn?.remove();
    return;
  }

  if (!backBtn) {
    backBtn = document.createElement('a');
    backBtn.href = '/';
    backBtn.className = 'back-btn';
    backBtn.id = 'headerBack';
    backBtn.setAttribute('aria-label', 'Back to home');
    backBtn.innerHTML = HEADER_BACK_MARKUP;
    header.insertBefore(backBtn, header.firstChild);
  }
}

function updateHeader(route) {
  const header = document.getElementById('appHeader');
  const bookBtn = document.getElementById('headerBookNow');
  if (!header || !bookBtn) return;

  if (route.header === 'none') {
    header.hidden = true;
    return;
  }

  header.hidden = false;
  header.classList.toggle('top-bar-home', route.header === 'home');
  ensureHeaderBack(header, route.header !== 'home');
  bookBtn.hidden = route.header !== 'book';

  if (route.bookTargetId) {
    bookBtn.dataset.scrollTarget = route.bookTargetId;
  } else {
    delete bookBtn.dataset.scrollTarget;
  }
}

function showRouteView(routeId) {
  const activeViewId = ROUTES[routeId].viewId;
  document.querySelectorAll('.spa-view').forEach((view) => {
    const isActive = view.id === activeViewId;
    view.classList.toggle('is-active', isActive);
    view.hidden = !isActive;
  });
  document.body.classList.toggle('page-home', routeId === 'home');
}

function scrollToRouteTarget() {
  const hash = window.location.hash.replace('#', '');
  if (hash) {
    const target = document.getElementById(hash);
    if (target) {
      window.requestAnimationFrame(() => {
        target.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start'
        });
      });
      return;
    }
  }
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function mountCarouselsInView(viewId, sessionName) {
  const root = document.getElementById(viewId);
  if (!root) return;

  root.querySelectorAll('.media-carousel').forEach((carouselRoot) => {
    if (carouselRoot.dataset.carouselBuilt === '1') return;
    const key = carouselRoot.getAttribute('data-carousel-key') || '';
    const imageUrls = CAROUSEL_IMAGES[key] || [];
    if (imageUrls.length === 0) return;
    initResponsiveCarousel(carouselRoot, imageUrls, sessionName);
  });
}

function syncHomeVideo(isHome) {
  const video = document.querySelector('#view-home .hero-video');
  if (!video || video.dataset.mediaLoaded !== '1') return;
  if (isHome) video.play().catch(() => {});
  else video.pause();
}

function activateRoute(routeId) {
  activeRouteId = routeId;
  const route = ROUTES[routeId];

  showRouteView(routeId);
  updateHeader(route);
  updateDocumentMeta(route);

  if (routeId === 'home') initHomePage();
  else if (routeId === 'about') initAboutPage();
  else if (routeId === 'content-creation') {
    initBookingPage({
      viewId: 'view-content-creation',
      prefix: 'cc',
      sessionName: 'Content Session',
      leadFieldKey: 'business_type'
    });
    mountCarouselsInView(route.viewId, 'Content Session');
  } else if (routeId === 'cinema') {
    initBookingPage({
      viewId: 'view-cinema',
      prefix: 'cin',
      sessionName: 'Cinema Session',
      leadFieldKey: 'project_type'
    });
    mountCarouselsInView(route.viewId, 'Cinema Session');
  } else if (routeId === 'thank-you') initThankYouPage();

  syncHomeVideo(routeId === 'home');
  scrollToRouteTarget();
}

function initSpaRouter() {
  document.getElementById('headerBookNow')?.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = e.currentTarget.dataset.scrollTarget;
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start'
    });
  });

  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;

    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;

    const path = normalizePath(url.pathname);
    const routeId = PATH_TO_ROUTE[path];
    if (!routeId) return;

    e.preventDefault();

    if (routeId === activeRouteId && url.hash) {
      history.pushState({ routeId }, '', `${ROUTES[routeId].path}${url.search}${url.hash}`);
      scrollToRouteTarget();
      return;
    }

    navigateTo(`${path}${url.search}${url.hash}`);
  });

  window.addEventListener('popstate', () => {
    activateRoute(resolveRouteId(window.location.pathname));
  });

  activateRoute(resolveRouteId(window.location.pathname));
}

function prefersSaveData() {
  const c = navigator.connection;
  return !!(c && (c.saveData || /(^|-)2g/.test(c.effectiveType || '')));
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function shouldSkipSpline() {
  return prefersReducedMotion();
}

const MOBILE_LAYOUT_QUERY = window.matchMedia('(max-width: 768px)');

function isMobileLayout() {
  return MOBILE_LAYOUT_QUERY.matches;
}

const HERO_VIDEO_VERSION = '20260522';

function heroVideoSrc() {
  if (isMobileLayout() || prefersSaveData()) {
    return `${HERO_ASSETS.mobile}?v=${HERO_VIDEO_VERSION}`;
  }
  return `${HERO_ASSETS.desktop}?v=${HERO_VIDEO_VERSION}`;
}

function whenIdle(callback, timeoutMs) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(callback, { timeout: timeoutMs });
  } else {
    window.setTimeout(callback, Math.min(timeoutMs, 400));
  }
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

function lockSplineCamera(viewer) {
  if (!viewer) return;

  const applyLock = () => {
    const app = viewer._spline;
    if (!app) return false;

    app.eventManager?.updateUseWindowEvents?.(false);

    const lockedZoom = 1;
    const syncViewport = () => {
      app.setSize(window.innerWidth, window.innerHeight);
      app.setZoom(lockedZoom);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewport, { passive: true });
      window.visualViewport.addEventListener('scroll', syncViewport, { passive: true });
    }
    return true;
  };

  let attempts = 0;
  const tryLock = () => {
    if (applyLock()) return;
    attempts += 1;
    if (attempts < 24) window.requestAnimationFrame(tryLock);
  };
  tryLock();
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
    finishReveal();
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

  const onSplineReady = () => {
    lockSplineCamera(viewer);
    reveal();
  };

  viewer.addEventListener('load-complete', onSplineReady, { once: true });
  viewer.addEventListener('load', onSplineReady, { once: true });
  window.setTimeout(reveal, 5000);
  customElements.whenDefined('spline-viewer').catch(reveal);
}

function initHomePage() {
  const homeView = document.getElementById('view-home');
  if (!homeView || homeView.dataset.homeInit === '1') return;
  homeView.dataset.homeInit = '1';

  const video = homeView.querySelector('.hero-video');
  const unmuteBtn = document.getElementById('unmuteBtn');
  const replayBtn = document.getElementById('replayBtn');
  if (!video || !unmuteBtn || !replayBtn) return;

  trackEvent('page_view', { page_type: 'home' });

  const videoBlock = video.closest('.video-block');
  let isUnmuted = false;

  video.loop = true;
  video.defaultMuted = true;
  video.muted = true;
  unmuteBtn.style.display = 'flex';

  const applyAudioState = () => {
    video.muted = !isUnmuted;
    video.defaultMuted = !isUnmuted;
    unmuteBtn.style.display = isUnmuted ? 'none' : 'flex';
  };

  const attachHeroVideo = () => {
    if (video.dataset.mediaLoaded === '1') return;
    video.dataset.mediaLoaded = '1';
    video.fetchPriority = 'high';
    const source = document.createElement('source');
    source.src = heroVideoSrc();
    source.type = 'video/webm';
    video.appendChild(source);
    video.load();
    applyAudioState();
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

  function unmuteVideo() {
    attachHeroVideo();
    isUnmuted = true;
    applyAudioState();
    trackEvent('video_unmute', { source: 'home_hero' });
    video.play().catch(() => {});
  }

  function syncMuteUi() {
    applyAudioState();
  }

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
    syncMuteUi();
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

  document.querySelectorAll('#view-home .lt-button').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const href = btn.getAttribute('href') || '';
      const label = (btn.textContent || '').trim();
      trackEvent('menu_click', { label, href });
      if (href === '#') e.preventDefault();
    });
  });

  revealItems('#appHeader, #view-home .video-block, #view-home .section-divider, #view-home .lt-button, #view-home .social-link, #view-home .footnote', 90);

  const divider = homeView.querySelector('.section-divider');
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
    const container = homeView.querySelector('.video-block');
    if (container) container.classList.add('video-ready');
  };
  video.addEventListener('loadeddata', markVideoReady, { once: true });
  video.addEventListener('playing', markVideoReady, { once: true });

  document.querySelectorAll('#view-home .social-link').forEach((link) => {
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
  const root = document.getElementById(config.viewId);
  if (!root || root.dataset.bookingInit === '1') return;
  root.dataset.bookingInit = '1';

  const prefix = config.prefix;
  const form = document.getElementById(`${prefix}BookingForm`);
  const formMessage = document.getElementById(`${prefix}FormMessage`);
  const submitBtn = document.getElementById(`${prefix}SubmitBtn`);
  const submitText = submitBtn ? submitBtn.querySelector('span') : null;
  const submitIcon = submitBtn ? submitBtn.querySelector('.submit-icon') : null;
  const thankYouState = document.getElementById(`${prefix}ThankYouState`);
  const thankYouName = document.getElementById(`${prefix}ThankYouName`);
  const businessTypeSelect = document.getElementById(`${prefix}BusinessType`);
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

    const name = document.getElementById(`${prefix}Name`).value.trim();
    const leadType = document.getElementById(`${prefix}BusinessType`).value;
    const countryCode = document.getElementById(`${prefix}CountryCode`).value;
    const phone = document.getElementById(`${prefix}Phone`).value.trim();
    const email = document.getElementById(`${prefix}Email`).value.trim();

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
      _replyto: email
    };
    payload[config.leadFieldKey] = getLeadTypeLabel(leadType, businessTypeSelect);

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
        navigateTo(`/thank-you?session=${encodeURIComponent(config.sessionName)}&name=${encodeURIComponent(name)}`);
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

  revealItems(`#${config.viewId} .video-block, #${config.viewId} .book-header, #${config.viewId} .booking-form, #${config.viewId} .footnote`, 110);
}

function initAboutPage() {
  const aboutView = document.getElementById('view-about');
  if (!aboutView || aboutView.dataset.aboutInit === '1') return;
  aboutView.dataset.aboutInit = '1';

  trackEvent('page_view', { page_type: 'about' });
  revealItems('#appHeader, #view-about .about-portrait, #view-about .about-section, #view-about .footnote', 100);
}

function initThankYouPage() {
  const sessionTag = document.getElementById('sessionTag');
  const sessionBack = document.getElementById('sessionBack');
  const message = document.getElementById('thankYouMessage');
  if (!sessionTag || !sessionBack || !message) return;

  const params = new URLSearchParams(window.location.search);
  const session = (params.get('session') || '').toLowerCase();
  const name = params.get('name') || '';

  let sessionLabel = 'Session';
  let backHref = '/content-creation';

  if (session.includes('cinema')) {
    sessionLabel = 'Cinema Session';
    backHref = '/cinema';
  } else if (session.includes('content')) {
    sessionLabel = 'Content Session';
    backHref = '/content-creation';
  }

  message.textContent = name
    ? `Thanks, ${name}. Your request was received successfully. We will contact you within 24 hours.`
    : 'Your request was received successfully. We will contact you within 24 hours.';

  sessionTag.textContent = sessionLabel;
  sessionBack.setAttribute('href', backHref);
}

const WHATSAPP_URL = 'https://wa.me/96171661075';

function initFloatingWhatsApp() {
  whenIdle(() => {
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
  }, 2500);
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

function initRefractiveControls() {
  const rootNode = document.getElementById('refractiveControlsRoot');
  if (!rootNode) return;

  function brandLogo(type) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'social-logo social-logo-' + type);
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');

    if (type === 'instagram') {
      svg.setAttribute('fill', 'none');
      svg.innerHTML =
        '<rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5" stroke="currentColor" stroke-width="1.8"></rect>' +
        '<circle cx="12" cy="12" r="4.15" stroke="currentColor" stroke-width="1.8"></circle>' +
        '<circle cx="17.55" cy="6.45" r="1.15" fill="currentColor"></circle>';
    } else if (type === 'whatsapp') {
      svg.setAttribute('fill', 'none');
      svg.innerHTML =
        '<path d="M12 4.1a7.9 7.9 0 0 0-6.89 11.8L4 20l4.25-1.08A7.9 7.9 0 1 0 12 4.1Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>' +
        '<path d="M9.1 9.3c.2-.46.42-.47.62-.48h.53c.16 0 .38.06.47.29.11.28.45 1.1.49 1.18.05.09.08.2.02.33-.06.13-.1.22-.2.34-.09.12-.2.27-.3.36-.1.09-.2.2-.08.4.11.2.5.82 1.08 1.32.73.64 1.33.84 1.53.94.2.1.32.09.44-.05.12-.14.5-.57.63-.77.13-.2.26-.17.44-.1.18.08 1.15.54 1.34.63.2.1.34.15.39.24.05.09.05.54-.13 1.06-.18.53-1.03 1.03-1.41 1.1-.36.07-.82.1-1.32-.06-.3-.1-.69-.23-1.18-.44a10.62 10.62 0 0 1-1.96-1.22A8.82 8.82 0 0 1 8.8 11.98c-.35-.6-.74-1.43-.53-2.05Z" fill="currentColor"></path>';
    } else {
      svg.setAttribute('fill', 'currentColor');
      svg.innerHTML =
        '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path>';
    }
    return svg;
  }

  function uiIcon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ui-icon refract-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    if (name === 'video') {
      svg.innerHTML = '<path fill="currentColor" d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Zm2.5-.5a.5.5 0 0 0-.5.5v7.8l7.2-4.05L6.5 6Zm8.2 4.05L18.5 14.2V6.5a.5.5 0 0 0-.5-.5H14.7Z"></path>';
    } else if (name === 'about') {
      svg.innerHTML = '<path fill="currentColor" d="M12 12a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5ZM5 20.5a7 7 0 0 1 14 0v.5H5v-.5Z"></path>';
    } else {
      svg.innerHTML = '<path fill="currentColor" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h2.18l1-2h6.64l1 2H18.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13ZM12 8a4.5 4.5 0 1 0 .001 9.001A4.5 4.5 0 0 0 12 8Z"></path>';
    }
    return svg;
  }

  function setPressed(element, pressed) {
    element.style.setProperty('--press', pressed ? '1' : '0');
  }

  function setHighlight(link, x, y) {
    const energy = Math.max(0.12, 1 - (Math.hypot(x - 50, y - 50) / 66));
    link.style.setProperty('--ax', x.toFixed(2) + '%');
    link.style.setProperty('--ay', y.toFixed(2) + '%');
    link.style.setProperty('--flow', energy.toFixed(3));
  }

  function resetHighlight(link) {
    link.style.setProperty('--ax', '50%');
    link.style.setProperty('--ay', '50%');
    link.style.setProperty('--flow', '0.2');
  }

  function createButton(config) {
    const link = document.createElement('a');
    link.href = config.href;
    link.className = config.className;
    link.setAttribute('role', 'button');
    link.setAttribute('aria-label', config.ariaLabel || config.label);
    if (config.target) link.target = config.target;
    if (config.rel) link.rel = config.rel;
    if (config.dataset) {
      Object.keys(config.dataset).forEach((key) => {
        link.dataset[key] = config.dataset[key];
      });
    }

    if (config.logoType) link.appendChild(brandLogo(config.logoType));
    else if (config.icon) link.appendChild(uiIcon(config.icon));

    const text = document.createElement('span');
    text.textContent = config.label;
    link.appendChild(text);
    resetHighlight(link);

    link.addEventListener('pointermove', (event) => {
      const rect = link.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      setHighlight(link, x, y);
    });

    link.addEventListener('pointerleave', () => {
      resetHighlight(link);
      setPressed(link, false);
    });

    link.addEventListener('pointerdown', () => setPressed(link, true));
    link.addEventListener('pointerup', () => setPressed(link, false));
    link.addEventListener('blur', () => {
      resetHighlight(link);
      setPressed(link, false);
    });

    return link;
  }

  const stack = document.createElement('div');
  stack.className = 'refract-stack';

  stack.appendChild(createButton({
    href: '/content-creation',
    label: 'Content Creation',
    className: 'lt-button refract-btn',
    icon: 'video'
  }));

  stack.appendChild(createButton({
    href: '/cinema',
    label: 'Cinema',
    className: 'lt-button refract-btn',
    icon: 'film'
  }));

  stack.appendChild(createButton({
    href: '/about',
    label: 'About Me',
    className: 'lt-button refract-btn',
    icon: 'about'
  }));

  const socialRow = document.createElement('div');
  socialRow.className = 'social-links-row refract-social-row';
  socialRow.setAttribute('aria-label', 'Social links');

  socialRow.appendChild(createButton({
    href: 'https://www.instagram.com/mhmd_hmayed',
    label: 'Instagram',
    ariaLabel: 'Instagram',
    logoType: 'instagram',
    className: 'social-link social-instagram refract-btn refract-btn--social',
    target: '_blank',
    rel: 'noopener noreferrer',
    dataset: { label: 'Instagram' }
  }));

  socialRow.appendChild(createButton({
    href: 'https://wa.me/96171661075',
    label: 'WhatsApp',
    ariaLabel: 'WhatsApp',
    logoType: 'whatsapp',
    className: 'social-link social-whatsapp refract-btn refract-btn--social',
    target: '_blank',
    rel: 'noopener noreferrer',
    dataset: { label: 'WhatsApp' }
  }));

  socialRow.appendChild(createButton({
    href: 'https://youtube.com/@mhmdhmayed',
    label: 'YouTube',
    ariaLabel: 'YouTube',
    logoType: 'youtube',
    className: 'social-link social-youtube refract-btn refract-btn--social',
    target: '_blank',
    rel: 'noopener noreferrer',
    dataset: { label: 'YouTube' }
  }));

  stack.appendChild(socialRow);
  rootNode.appendChild(stack);
}

(function bootstrap() {
  initRefractiveControls();
  initSplineScene();
  initFloatingWhatsApp();
  initScrollReveal();
  initSpaRouter();
})();
