(function initRefractiveControls() {
  const rootNode = document.getElementById('refractiveControlsRoot');
  if (!rootNode || !window.React || !window.ReactDOM) return;

  const React = window.React;
  const createRoot = window.ReactDOM.createRoot;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateSurface(event, element, pressed) {
    const rect = element.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const dx = x - 50;
    const dy = y - 50;
    const distance = Math.sqrt((dx * dx) + (dy * dy));
    const energy = Math.max(0, 1 - (distance / 72));
    const radius = 14 + (energy * 24) + (pressed ? 6 : 0);

    element.style.setProperty('--mx', x.toFixed(2) + '%');
    element.style.setProperty('--my', y.toFixed(2) + '%');
    element.style.setProperty('--energy', energy.toFixed(3));
    element.style.setProperty('--corner', radius.toFixed(2) + 'px');
    element.style.setProperty('--press', pressed ? '1' : '0');
  }

  function resetSurface(element) {
    element.style.setProperty('--mx', '50%');
    element.style.setProperty('--my', '50%');
    element.style.setProperty('--energy', '0');
    element.style.setProperty('--corner', '20px');
    element.style.setProperty('--press', '0');
  }

  function BrandLogo(props) {
    const type = props.type;
    const className = 'social-logo social-logo-' + type;

    if (type === 'instagram') {
      return React.createElement(
        'svg',
        {
          className: className,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false'
        },
        React.createElement('rect', { x: '3.25', y: '3.25', width: '17.5', height: '17.5', rx: '5', stroke: 'currentColor', strokeWidth: '1.8' }),
        React.createElement('circle', { cx: '12', cy: '12', r: '4.15', stroke: 'currentColor', strokeWidth: '1.8' }),
        React.createElement('circle', { cx: '17.55', cy: '6.45', r: '1.15', fill: 'currentColor' })
      );
    }

    if (type === 'whatsapp') {
      return React.createElement(
        'svg',
        {
          className: className,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': 'true',
          focusable: 'false'
        },
        React.createElement('path', { d: 'M12 4.1a7.9 7.9 0 0 0-6.89 11.8L4 20l4.25-1.08A7.9 7.9 0 1 0 12 4.1Z', stroke: 'currentColor', strokeWidth: '1.8', strokeLinejoin: 'round' }),
        React.createElement('path', { d: 'M9.1 9.3c.2-.46.42-.47.62-.48h.53c.16 0 .38.06.47.29.11.28.45 1.1.49 1.18.05.09.08.2.02.33-.06.13-.1.22-.2.34-.09.12-.2.27-.3.36-.1.09-.2.2-.08.4.11.2.5.82 1.08 1.32.73.64 1.33.84 1.53.94.2.1.32.09.44-.05.12-.14.5-.57.63-.77.13-.2.26-.17.44-.1.18.08 1.15.54 1.34.63.2.1.34.15.39.24.05.09.05.54-.13 1.06-.18.53-1.03 1.03-1.41 1.1-.36.07-.82.1-1.32-.06-.3-.1-.69-.23-1.18-.44a10.62 10.62 0 0 1-1.96-1.22A8.82 8.82 0 0 1 8.8 11.98c-.35-.6-.74-1.43-.53-2.05Z', fill: 'currentColor' })
      );
    }

    return React.createElement(
      'svg',
      {
        className: className,
        viewBox: '0 0 24 24',
        fill: 'currentColor',
        'aria-hidden': 'true',
        focusable: 'false'
      },
      React.createElement('path', { d: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' })
    );
  }

  function RefractiveButton(props) {
    const className = props.className || '';
    const label = props.label;
    const href = props.href;
    const iconClass = props.iconClass;
    const logoType = props.logoType;
    const ariaLabel = props.ariaLabel || label;
    const linkProps = props.linkProps || {};
    const elementRef = React.useRef(null);
    const pressedRef = React.useRef(false);
    const targetRef = React.useRef({ x: 50, y: 50, energy: 0 });
    const hoverRef = React.useRef(false);

    React.useEffect(function setupAmbientLoop() {
      if (!elementRef.current) return undefined;
      let rafId = 0;
      let active = true;
      let stateX = 50;
      let stateY = 50;
      let stateEnergy = 0.2;
      let vx = 0;
      let vy = 0;
      let ve = 0;
      const start = performance.now();

      let lastPaint = 0;

      function frame(now) {
        if (!active || !elementRef.current) return;
        const elapsed = (now - start) * 0.001;
        const paintBudgetMs = 1000 / 30; // throttle visual updates to ~30fps
        const shouldPaint = (now - lastPaint) >= paintBudgetMs;
        const idleX = 50 + (Math.sin(elapsed * 1.35) * 11) + (Math.cos(elapsed * 0.66) * 6);
        const idleY = 50 + (Math.cos(elapsed * 1.18) * 9) + (Math.sin(elapsed * 0.52) * 4);
        const tx = targetRef.current.x || 50;
        const ty = targetRef.current.y || 50;
        const te = targetRef.current.energy || 0;
        const attract = Math.min(1, te * 1.9);
        const desiredX = (tx * attract) + (idleX * (1 - attract));
        const desiredY = (ty * attract) + (idleY * (1 - attract));
        const desiredEnergy = Math.max(0.2, te * 1.06);

        const dt = 1 / 60;
        const k = 36; // stiffness
        const d = 9.5; // damping
        const ax = (desiredX - stateX) * k - vx * d;
        const ay = (desiredY - stateY) * k - vy * d;
        vx += ax * dt;
        vy += ay * dt;
        stateX += vx * dt;
        stateY += vy * dt;

        const ke = 28;
        const de = 8.5;
        const ae = (desiredEnergy - stateEnergy) * ke - ve * de;
        ve += ae * dt;
        stateEnergy += ve * dt;
        stateEnergy = clamp(stateEnergy, 0.12, 1.4);

        const el = elementRef.current;
        if (shouldPaint) {
          lastPaint = now;
          el.style.setProperty('--ax', stateX.toFixed(2) + '%');
          el.style.setProperty('--ay', stateY.toFixed(2) + '%');
          el.style.setProperty('--flow', stateEnergy.toFixed(3));
        }
        rafId = requestAnimationFrame(frame);
      }

      rafId = requestAnimationFrame(frame);
      return function cleanupAmbientLoop() {
        active = false;
        cancelAnimationFrame(rafId);
      };
    }, []);

    const onMove = React.useCallback(function onMove(event) {
      if (!elementRef.current) return;
      const rect = elementRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      const dx = x - 50;
      const dy = y - 50;
      const distance = Math.sqrt((dx * dx) + (dy * dy));
      const energy = Math.max(0, 1 - (distance / 66));
      targetRef.current = { x: x, y: y, energy: energy };
      updateSurface(event, elementRef.current, pressedRef.current);
    }, []);

    const onEnter = React.useCallback(function onEnter(event) {
      hoverRef.current = true;
      onMove(event);
    }, [onMove]);

    const onLeave = React.useCallback(function onLeave() {
      if (!elementRef.current) return;
      pressedRef.current = false;
      hoverRef.current = false;
      targetRef.current.energy = 0.16;
      resetSurface(elementRef.current);
    }, []);

    const onDown = React.useCallback(function onDown(event) {
      if (!elementRef.current) return;
      pressedRef.current = true;
      updateSurface(event, elementRef.current, true);
    }, []);

    const onUp = React.useCallback(function onUp(event) {
      if (!elementRef.current) return;
      pressedRef.current = false;
      updateSurface(event, elementRef.current, false);
    }, []);

    const onBlur = React.useCallback(function onBlur() {
      if (!elementRef.current) return;
      pressedRef.current = false;
      targetRef.current.energy = 0.16;
      resetSurface(elementRef.current);
    }, []);

    const children = [
      logoType ? React.createElement(BrandLogo, { key: 'logo', type: logoType }) : null,
      iconClass ? React.createElement('i', { key: 'icon', className: iconClass + ' refract-icon', 'aria-hidden': 'true' }) : null,
      React.createElement('span', { key: 'text' }, label)
    ];

    return React.createElement(
      'a',
      Object.assign({}, linkProps, {
        href: href,
        className: className,
        role: 'button',
        'aria-label': ariaLabel,
        ref: elementRef,
        onPointerMove: onMove,
        onPointerEnter: onEnter,
        onPointerLeave: onLeave,
        onPointerDown: onDown,
        onPointerUp: onUp,
        onBlur: onBlur
      }),
      children
    );
  }

  function RefractiveControls() {
    return React.createElement(
      'div',
      { className: 'refract-stack' },
      React.createElement(RefractiveButton, {
        href: 'content-creation.html',
        label: 'Content Creation',
        className: 'lt-button refract-btn',
        iconClass: 'fas fa-video'
      }),
      React.createElement(RefractiveButton, {
        href: 'cinema.html',
        label: 'Cinema',
        className: 'lt-button refract-btn',
        iconClass: 'fas fa-film'
      }),
      React.createElement(
        'div',
        { className: 'social-links-row refract-social-row', 'aria-label': 'Social links' },
        React.createElement(RefractiveButton, {
          href: 'https://www.instagram.com/mhmd_hmayed',
          label: 'Instagram',
          ariaLabel: 'Instagram',
          logoType: 'instagram',
          className: 'social-link social-instagram refract-btn refract-btn--social',
          linkProps: { target: '_blank', rel: 'noopener noreferrer', 'data-label': 'Instagram' }
        }),
        React.createElement(RefractiveButton, {
          href: 'https://wa.me/96171661075',
          label: 'WhatsApp',
          ariaLabel: 'WhatsApp',
          logoType: 'whatsapp',
          className: 'social-link social-whatsapp refract-btn refract-btn--social',
          linkProps: { target: '_blank', rel: 'noopener noreferrer', 'data-label': 'WhatsApp' }
        }),
        React.createElement(RefractiveButton, {
          href: 'https://youtube.com/@mhmdhmayed',
          label: 'YouTube',
          ariaLabel: 'YouTube',
          logoType: 'youtube',
          className: 'social-link social-youtube refract-btn refract-btn--social',
          linkProps: { target: '_blank', rel: 'noopener noreferrer', 'data-label': 'YouTube' }
        })
      )
    );
  }

  createRoot(rootNode).render(React.createElement(RefractiveControls));
})();
