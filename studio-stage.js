(function initStudioStage() {
  const section = document.querySelector('.links-section');
  if (!section || section.querySelector('.studio-stage')) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function svgProp(className, depth, markup) {
    const prop = el('div', `studio-prop ${className}`);
    prop.dataset.depth = String(depth);
    prop.appendChild(el('div', 'studio-prop-shadow'));
    const body = el('div', 'studio-prop-body');
    body.innerHTML = markup;
    prop.appendChild(body);
    return prop;
  }

  function particleLayer(count) {
    const layer = el('div', 'studio-particles');
    for (let i = 0; i < count; i += 1) {
      const p = el('span', 'studio-particle');
      const size = 2 + Math.random() * 3;
      p.style.setProperty('--p-x', `${8 + Math.random() * 84}%`);
      p.style.setProperty('--p-y', `${12 + Math.random() * 76}%`);
      p.style.setProperty('--p-size', `${size}px`);
      p.style.setProperty('--p-delay', `${-(Math.random() * 14).toFixed(2)}s`);
      p.style.setProperty('--p-duration', `${10 + Math.random() * 12}s`);
      p.style.setProperty('--p-drift', `${-16 - Math.random() * 28}px`);
      layer.appendChild(p);
    }
    return layer;
  }

  function bokehLayer(count) {
    const layer = el('div', 'studio-bokeh');
    for (let i = 0; i < count; i += 1) {
      const orb = el('span', 'studio-bokeh-orb');
      const size = 40 + Math.random() * 100;
      orb.style.setProperty('--b-x', `${Math.random() * 100}%`);
      orb.style.setProperty('--b-y', `${Math.random() * 100}%`);
      orb.style.setProperty('--b-size', `${size}px`);
      orb.style.setProperty('--b-delay', `${-(Math.random() * 10).toFixed(2)}s`);
      orb.style.setProperty('--b-opacity', `${0.04 + Math.random() * 0.08}`);
      orb.style.setProperty('--b-duration', `${14 + Math.random() * 10}s`);
      layer.appendChild(orb);
    }
    return layer;
  }

  const SVGS = {
    camera: `<svg viewBox="0 0 200 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="cam-body" x1="8" y1="20" x2="168" y2="108" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1a2332"/><stop offset="0.42" stop-color="#3d4f63"/><stop offset="0.68" stop-color="#2a3544"/><stop offset="1" stop-color="#121a24"/></linearGradient><linearGradient id="cam-lens" x1="118" y1="44" x2="196" y2="88" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0f172a"/><stop offset="0.35" stop-color="#334155"/><stop offset="0.72" stop-color="#64748b"/><stop offset="1" stop-color="#1e293b"/></linearGradient><radialGradient id="cam-glass" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(168 66) rotate(90) scale(22 22)"><stop offset="0" stop-color="#94a3b8" stop-opacity="0.55"/><stop offset="0.45" stop-color="#334155" stop-opacity="0.35"/><stop offset="1" stop-color="#0f172a" stop-opacity="0.9"/></radialGradient><linearGradient id="cam-highlight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><ellipse cx="98" cy="118" rx="72" ry="8" fill="#0f172a" opacity="0.08"/><path d="M12 52h52l14-18h28l10 18h54v34H12V52Z" fill="url(#cam-body)"/><path d="M12 52h52l14-18h28l10 18h54v34H12V52Z" fill="url(#cam-highlight)" opacity="0.35"/><rect x="26" y="58" width="38" height="22" rx="1.5" fill="#0f172a" opacity="0.35"/><path d="M78 48h18v8H78z" fill="#1e293b" opacity="0.5"/><rect x="108" y="46" width="72" height="44" rx="6" fill="url(#cam-lens)"/><circle cx="144" cy="68" r="26" fill="url(#cam-lens)" stroke="#64748b" stroke-width="0.75" opacity="0.9"/><circle cx="144" cy="68" r="18" stroke="#94a3b8" stroke-width="0.6" opacity="0.5"/><circle cx="144" cy="68" r="11" fill="url(#cam-glass)"/><path d="M182 68h14" stroke="#475569" stroke-width="1.1" stroke-linecap="round"/><path d="M188 62v12" stroke="#64748b" stroke-width="0.9" stroke-linecap="round" opacity="0.7"/><path d="M64 40h22l6 12H58l6-12Z" fill="#243044" opacity="0.85"/></svg>`,
    light: `<svg viewBox="0 0 96 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="light-head" x1="20" y1="8" x2="76" y2="52" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2a3544"/><stop offset="0.5" stop-color="#4b5c6f"/><stop offset="1" stop-color="#1a2332"/></linearGradient><linearGradient id="light-stand" x1="44" y1="52" x2="52" y2="132" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#1e293b"/></linearGradient><radialGradient id="light-beam" cx="48" cy="30" r="28" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f8fafc" stop-opacity="0.35"/><stop offset="0.55" stop-color="#e2e8f0" stop-opacity="0.08"/><stop offset="1" stop-color="#e2e8f0" stop-opacity="0"/></radialGradient></defs><ellipse cx="48" cy="134" rx="22" ry="4" fill="#0f172a" opacity="0.07"/><path d="M44 132V54" stroke="url(#light-stand)" stroke-width="2.2" stroke-linecap="round"/><path d="M30 132h36" stroke="#334155" stroke-width="2" stroke-linecap="round"/><path d="M18 54h60l-4 8H22l-4-8Z" fill="#243044"/><rect x="16" y="12" width="64" height="44" rx="3" fill="url(#light-head)"/><rect x="20" y="16" width="56" height="36" rx="2" fill="url(#light-beam)"/><path d="M16 28h64M16 40h64" stroke="#64748b" stroke-width="0.5" opacity="0.35"/><path d="M12 56l36-10 36 10" stroke="#475569" stroke-width="0.8" opacity="0.4"/></svg>`,
    softbox: `<svg viewBox="0 0 110 130" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="box-face" x1="12" y1="14" x2="98" y2="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f1f5f9"/><stop offset="0.45" stop-color="#cbd5e1"/><stop offset="1" stop-color="#94a3b8"/></linearGradient><linearGradient id="box-rim" x1="8" y1="10" x2="102" y2="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#475569"/><stop offset="1" stop-color="#1e293b"/></linearGradient><linearGradient id="box-stand" x1="50" y1="58" x2="58" y2="124" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs><ellipse cx="55" cy="124" rx="26" ry="4" fill="#0f172a" opacity="0.06"/><path d="M52 122V62" stroke="url(#box-stand)" stroke-width="1.8" stroke-linecap="round"/><path d="M38 122h30" stroke="#334155" stroke-width="1.6" stroke-linecap="round"/><rect x="10" y="14" width="90" height="48" rx="2" fill="url(#box-rim)"/><rect x="14" y="18" width="82" height="40" rx="1" fill="url(#box-face)"/><path d="M14 34h82" stroke="#fff" stroke-width="0.4" opacity="0.35"/><path d="M10 62l45-12 45 12" stroke="#475569" stroke-width="0.7" opacity="0.35"/></svg>`,
    tripod: `<svg viewBox="0 0 88 96" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="pod-leg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#334155"/><stop offset="1" stop-color="#1e293b"/></linearGradient></defs><ellipse cx="44" cy="90" rx="28" ry="4" fill="#0f172a" opacity="0.06"/><path d="M44 10v26" stroke="url(#pod-leg)" stroke-width="1.6" stroke-linecap="round"/><circle cx="44" cy="10" r="5" fill="#334155" stroke="#64748b" stroke-width="0.6"/><path d="M44 36 16 84M44 36 72 84M44 36 44 84" stroke="url(#pod-leg)" stroke-width="1.4" stroke-linecap="round"/><path d="M26 84h36" stroke="#475569" stroke-width="1.2" stroke-linecap="round"/></svg>`
  };

  const stage = el('div', 'studio-stage');
  stage.setAttribute('aria-hidden', 'true');

  stage.appendChild(el('div', 'studio-floor'));
  stage.appendChild(el('div', 'studio-floor-sheen'));
  stage.appendChild(el('div', 'studio-grid-glow'));
  stage.appendChild(el('div', 'studio-depth-mist'));

  const wild = el('div', 'wild-3d-bg cinematic');
  ['spot-left', 'spot-right', 'spot-center', 'spot-accent'].forEach((name) => {
    wild.appendChild(el('div', `spotlight ${name}`));
  });
  stage.appendChild(wild);

  const rays = el('div', 'studio-rays');
  ['studio-ray studio-ray-1', 'studio-ray studio-ray-2', 'studio-ray studio-ray-3'].forEach((cls) => {
    rays.appendChild(el('div', cls));
  });
  stage.appendChild(rays);

  if (!reducedMotion) {
    stage.appendChild(bokehLayer(7));
    stage.appendChild(particleLayer(28));
  }

  const geometry = el('div', 'studio-geometry');
  ['geo-arc geo-arc-1', 'geo-arc geo-arc-2', 'geo-line geo-line-1', 'geo-line geo-line-2'].forEach((cls) => {
    geometry.appendChild(el('span', cls));
  });
  stage.appendChild(geometry);

  const props = el('div', 'studio-props');
  props.appendChild(svgProp('prop-camera', 0.88, SVGS.camera));
  props.appendChild(svgProp('prop-light-rig', 0.58, SVGS.light));
  props.appendChild(svgProp('prop-softbox', 0.72, SVGS.softbox));
  props.appendChild(svgProp('prop-tripod', 0.32, SVGS.tripod));
  stage.appendChild(props);

  const glow = el('div', 'studio-prop-glows');
  glow.appendChild(el('div', 'studio-glow studio-glow-camera'));
  glow.appendChild(el('div', 'studio-glow studio-glow-softbox'));
  stage.appendChild(glow);

  stage.appendChild(el('div', 'studio-fog'));
  stage.appendChild(el('div', 'studio-vignette-depth'));
  section.insertBefore(stage, section.firstChild);

  props.querySelectorAll('.studio-prop[data-depth]').forEach((prop, index) => {
    prop.style.setProperty('--float-delay', `${index * -2.4}s`);
  });
})();
