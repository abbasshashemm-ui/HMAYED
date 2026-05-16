(function initRefractiveControls() {
  const rootNode = document.getElementById('refractiveControlsRoot');
  if (!rootNode) return;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

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
    } else {
      svg.innerHTML = '<path fill="currentColor" d="M4 5.5A1.5 1.5 0 0 1 5.5 4h2.18l1-2h6.64l1 2H18.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13ZM12 8a4.5 4.5 0 1 0 .001 9.001A4.5 4.5 0 0 0 12 8Z"></path>';
    }
    return svg;
  }

  const buttons = [];
  const start = performance.now();
  let rafId = 0;
  let lastPaint = 0;

  function updateSurface(event, element, pressed) {
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const dx = x - 50;
    const dy = y - 50;
    const energy = Math.max(0, 1 - (Math.sqrt(dx * dx + dy * dy) / 72));
    element.style.setProperty('--mx', x.toFixed(2) + '%');
    element.style.setProperty('--my', y.toFixed(2) + '%');
    element.style.setProperty('--energy', energy.toFixed(3));
    element.style.setProperty('--corner', (14 + energy * 24 + (pressed ? 6 : 0)).toFixed(2) + 'px');
    element.style.setProperty('--press', pressed ? '1' : '0');
  }

  function resetSurface(element) {
    element.style.setProperty('--mx', '50%');
    element.style.setProperty('--my', '50%');
    element.style.setProperty('--energy', '0');
    element.style.setProperty('--corner', '20px');
    element.style.setProperty('--press', '0');
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

    const state = {
      el: link,
      pressed: false,
      target: { x: 50, y: 50, energy: 0.16 },
      anim: { x: 50, y: 50, e: 0.2, vx: 0, vy: 0, ve: 0 }
    };

    if (!config.target && !String(config.href).startsWith('http')) {
      link.addEventListener('pointerenter', () => {
        if (link.dataset.prefetched === '1') return;
        link.dataset.prefetched = '1';
        const hint = document.createElement('link');
        hint.rel = 'prefetch';
        hint.as = 'document';
        hint.href = config.href;
        document.head.appendChild(hint);
      }, { once: true });
    }

    link.addEventListener('pointermove', (event) => {
      const rect = link.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      state.target = { x, y, energy: Math.max(0, 1 - (Math.hypot(x - 50, y - 50) / 66)) };
      updateSurface(event, link, state.pressed);
    });

    link.addEventListener('pointerleave', () => {
      state.pressed = false;
      state.target.energy = 0.16;
      resetSurface(link);
    });

    link.addEventListener('pointerdown', (event) => {
      state.pressed = true;
      updateSurface(event, link, true);
    });

    link.addEventListener('pointerup', (event) => {
      state.pressed = false;
      updateSurface(event, link, false);
    });

    link.addEventListener('blur', () => {
      state.pressed = false;
      state.target.energy = 0.16;
      resetSurface(link);
    });

    buttons.push(state);
    return link;
  }

  function tick(now) {
    if (document.hidden) {
      rafId = requestAnimationFrame(tick);
      return;
    }

    if (now - lastPaint < (1000 / 30)) {
      rafId = requestAnimationFrame(tick);
      return;
    }
    lastPaint = now;

    const elapsed = (now - start) * 0.001;
    const dt = 1 / 60;

    buttons.forEach((state) => {
      const idleX = 50 + (Math.sin(elapsed * 1.35) * 11) + (Math.cos(elapsed * 0.66) * 6);
      const idleY = 50 + (Math.cos(elapsed * 1.18) * 9) + (Math.sin(elapsed * 0.52) * 4);
      const te = state.target.energy || 0;
      const attract = Math.min(1, te * 1.9);
      const desiredX = (state.target.x * attract) + (idleX * (1 - attract));
      const desiredY = (state.target.y * attract) + (idleY * (1 - attract));
      const desiredEnergy = Math.max(0.2, te * 1.06);
      const a = state.anim;

      const ax = (desiredX - a.x) * 36 - a.vx * 9.5;
      const ay = (desiredY - a.y) * 36 - a.vy * 9.5;
      a.vx += ax * dt;
      a.vy += ay * dt;
      a.x += a.vx * dt;
      a.y += a.vy * dt;

      const ae = (desiredEnergy - a.e) * 28 - a.ve * 8.5;
      a.ve += ae * dt;
      a.e += a.ve * dt;
      a.e = clamp(a.e, 0.12, 1.4);

      state.el.style.setProperty('--ax', a.x.toFixed(2) + '%');
      state.el.style.setProperty('--ay', a.y.toFixed(2) + '%');
      state.el.style.setProperty('--flow', a.e.toFixed(3));
    });

    rafId = requestAnimationFrame(tick);
  }

  const stack = document.createElement('div');
  stack.className = 'refract-stack';

  stack.appendChild(createButton({
    href: 'content-creation',
    label: 'Content Creation',
    className: 'lt-button refract-btn',
    icon: 'video'
  }));

  stack.appendChild(createButton({
    href: 'cinema',
    label: 'Cinema',
    className: 'lt-button refract-btn',
    icon: 'film'
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

  rafId = requestAnimationFrame(tick);
  window.addEventListener('pagehide', () => cancelAnimationFrame(rafId), { once: true });
})();
