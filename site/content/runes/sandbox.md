---
title: Sandbox
description: Isolated HTML/CSS/JS rendering in an iframe with optional framework loading
category: Layout
plugin: core
status: stable
type: rune
---

# Sandbox

Render raw HTML, CSS, and JavaScript in an isolated iframe. The sandbox handles isolation and optional framework loading — useful for live examples, embedded widgets, and framework demos.

## Basic usage

Write HTML directly inside the sandbox tag. The content is rendered in an iframe, completely isolated from the rest of the page.

{% preview source=true %}
{% sandbox %}
<style>
  .badge {
    display: inline-block;
    padding: 4px 12px;
    background: #7C3AED;
    color: white;
    border-radius: 9999px;
    font-family: system-ui;
    font-size: 14px;
  }
</style>
<span class="badge">Live HTML</span>
{% /sandbox %}
{% /preview %}

## Framework presets

The `framework` attribute loads a CSS framework from CDN automatically.

{% preview source=true %}
{% sandbox framework="tailwind" %}
<div class="flex gap-3 p-4">
  <button class="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors">
    Primary
  </button>
  <button class="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
    Secondary
  </button>
</div>
{% /sandbox %}
{% /preview %}

Available presets:

| Preset | What's loaded |
|--------|--------------|
| `tailwind` | Tailwind Play CDN |
| `bootstrap` | Bootstrap 5 CSS |
| `bulma` | Bulma CSS |
| `pico` | Pico CSS |

## Custom dependencies

Load any script or stylesheet by URL with the `dependencies` attribute.

{% preview source=true %}
{% sandbox dependencies="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" %}
<main class="container">
  <article>
    <h2>Pico CSS card</h2>
    <p>Loaded via the dependencies attribute.</p>
    <button>Click me</button>
  </article>
</main>
{% /sandbox %}
{% /preview %}

## With JavaScript

Scripts run inside the sandboxed iframe, fully isolated from the host page.

{% preview source=true %}
{% sandbox %}
<style>
  .counter {
    font-family: system-ui;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
  }
  .counter button {
    padding: 6px 16px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    font-size: 16px;
  }
  .counter button:hover { background: #f3f4f6; }
  .counter span { font-size: 24px; font-weight: 600; min-width: 3ch; text-align: center; }
  @media (prefers-color-scheme: dark) {
    .counter button { background: #374151; border-color: #4b5563; color: #f3f4f6; }
    .counter button:hover { background: #4b5563; }
  }
  [data-theme="dark"] .counter button { background: #374151; border-color: #4b5563; color: #f3f4f6; }
  [data-theme="dark"] .counter button:hover { background: #4b5563; }
</style>
<div class="counter">
  <button onclick="update(-1)">−</button>
  <span id="count">0</span>
  <button onclick="update(1)">+</button>
</div>
<script>
  let count = 0;
  function update(delta) {
    count += delta;
    document.getElementById('count').textContent = count;
  }
</script>
{% /sandbox %}
{% /preview %}

## ES modules from a CDN

Because scripts run for real, you can `import` an ES module straight from a CDN inside a `<script type="module">` — no bundler, no install. Here a version-pinned three.js draws a spinning cube:

{% preview source=true %}
{% sandbox height=300 %}
<style>html,body{height:100%;margin:0}canvas{display:block;width:100%;height:100%}</style>
<canvas id="c"></canvas>
<script type="module">
  import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  const canvas = document.getElementById('c');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.z = 3;
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshStandardMaterial({ color: 0xe15f80, flatShading: true }),
  );
  scene.add(cube);
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(2, 3, 4);
  scene.add(light, new THREE.AmbientLight(0xffffff, 0.6));
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  (function loop() {
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.013;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  })();
</script>
{% /sandbox %}
{% /preview %}

Pin the version for reproducibility; for production also honour `prefers-reduced-motion` and provide a fallback — see the polished [three.js scene in Media guests](/runes/media-guests#live-program).

## Deferred activation — keep heavy sandboxes off the critical path

A sandbox is **eager** by default: its iframe and every dependency download as the page renders. That's fine for a small demo, but a heavy scene — a three.js render, a large framework playground — shouldn't tax a perf-sensitive page (a landing page, a long article) before the visitor has even scrolled to it.

Set `activation` to defer the mount. The sandbox shows a `poster` (and an explicit **Run** control) in the iframe's place; nothing downloads until it activates:

- **`visible`** — mounts when scrolled into view (via `IntersectionObserver`). Best for below-the-fold scenes.
- **`click`** — mounts only when the visitor presses the control. Best for the heaviest cases.

```markdoc
{% sandbox activation="visible" poster="/img/scene-poster.png" height=400 %}
<canvas id="c"></canvas>
<script type="module">
  import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
  // … heavy scene; nothing here loads until the sandbox scrolls into view
</script>
{% /sandbox %}
```

Under `prefers-reduced-motion`, a non-eager sandbox does **not** auto-activate even in `visible` mode — the poster and Run control stay, so motion-sensitive visitors opt in deliberately. Eager sandboxes are unaffected.

## Data binding — `window.RF_DATA`

A sandbox can be **fed data from your registry**. Set a `data` query — the same field-match grammar [`collection`](/runes/collection) uses — and the build resolves it, serializes the result, and exposes it to the iframe as a frozen `window.RF_DATA`. Your code renders *anything* from your own content: the registry's third render target, after `collection` (HTML) and `aggregate` (SVG) — bring your own renderer.

| Attribute | Effect |
|-----------|--------|
| `data` | A registry query, e.g. `type:page` or `type:work status:done` |
| `data-shape` | `flat` (default — a record array), `tree` (nested by `parentUrl`), or `graph` (nodes + SPEC-072 relationship edges) |
| `data-fields` | Comma-separated data fields to project (keeps the payload lean) |
| `data-limit` | Max records (default 500; over → truncated with a build warning) |

Here a `data-shape="tree"` binding feeds this site's own rune-section page tree to a three.js scene — a live, navigable **3D star-map**: each section is a star and its pages orbit it as a little planetary system, nested by URL depth (drag to rotate, click a node to open it). It's a heavy WebGL scene, so it's set `activation="visible"` — the scene (and three.js) only loads once you scroll it into view:

{% preview source=true %}

{% sandbox src="sitemap-3d" data="type:page url:/runes/*" data-shape="tree" activation="visible" height=440 /%}

{% /preview %}

**Always pair a data-bound visualization with an accessible fallback** — the 3D view is progressive enhancement, not the only representation. The *same* query as an honest, navigable list (what no-JS, no-WebGL, and screen readers get):

{% collection type="page" filter="url:/runes/*" sort="url" layout="list" /%}

### `data-shape="graph"` — nodes and edges

`data-shape="graph"` projects the queried entities as **nodes** and walks their [relationship edges](/runes/relationships) into a node-link payload — `window.RF_DATA = { shape: "graph", nodes, edges }`, where each edge is `{ from, to, kind }`. Only edges whose *both* endpoints are in the selection are kept, so the graph is closed: ready for a node-link or force-directed layout.

Here a single `data="type:spec type:work type:decision type:milestone" data-shape="graph"` binding feeds this project's **own plan** — every spec, work item, decision, and milestone, wired by their SPEC-072 relationships — to a three.js force-directed graph. Specs, decisions, and milestones glow brightest; work items cluster around the specs they implement. Drag to rotate, hover for a title, click a node to open its [plan-site](https://plan.refrakt.md) page. Like the star-map, it's a heavy scene, so it mounts on `activation="visible"`:

{% sandbox data="type:spec type:work type:decision type:milestone" data-shape="graph" data-fields="title,status" data-limit=600 activation="visible" height=520 %}
<style>
  html, body { height: 100%; margin: 0; overflow: hidden; }
  body { background: radial-gradient(ellipse at 50% 45%, #15151f 0%, #0a0a10 72%); }
  #c { display: block; width: 100%; height: 100%; cursor: grab; touch-action: none; }
  #c:active { cursor: grabbing; }
  #tip {
    position: fixed; left: 0; top: 0; pointer-events: none; z-index: 2;
    padding: 3px 10px; border-radius: 6px; opacity: 0;
    font: 12px/1.4 system-ui, -apple-system, sans-serif;
    background: rgba(18,16,22,.94); color: #f6f4ef; white-space: nowrap;
    transform: translate(-50%, -160%); transition: opacity .12s;
    box-shadow: 0 2px 10px rgba(0,0,0,.55);
  }
  #tip b { color: #ffd9a8; font-weight: 600; }
  #legend {
    position: fixed; left: 12px; bottom: 12px; z-index: 2; display: flex; gap: 14px;
    font: 11px/1 system-ui, -apple-system, sans-serif; color: #b8b4c4;
    background: rgba(18,16,22,.55); padding: 8px 12px; border-radius: 8px;
  }
  #legend span { display: inline-flex; align-items: center; gap: 5px; }
  #legend i { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
  #fallback {
    display: none; height: 100%; box-sizing: border-box; padding: 1.5rem;
    align-items: center; justify-content: center; text-align: center;
    font: 14px/1.5 system-ui, -apple-system, sans-serif; color: #9a96a4;
  }
</style>

<canvas id="c"></canvas>
<div id="tip"></div>
<div id="legend">
  <span><i style="background:#6ea8fe"></i>spec</span>
  <span><i style="background:#e8788f"></i>work</span>
  <span><i style="background:#ffd166"></i>decision</span>
  <span><i style="background:#8ce99a"></i>milestone</span>
</div>
<div id="fallback">A 3D relationship graph of the plan renders here — it needs WebGL and JavaScript. The entity list below is the accessible equivalent.</div>

<script type="module">
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('c');
  const tip = document.getElementById('tip');
  const showFallback = () => { canvas.style.display = 'none'; document.getElementById('legend').style.display = 'none'; document.getElementById('fallback').style.display = 'flex'; };

  // Deterministic 0..1 hash — keeps the initial layout stable across renders.
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };

  // Plan entities have no page on this site, so nodes link to the plan site.
  const PLAN = 'https://plan.refrakt.md';
  const ROUTE = { spec: 'specs', work: 'work', decision: 'decisions', milestone: 'milestones' };
  const nodeUrl = (n) => n.url || (ROUTE[n.type] ? PLAN + '/' + ROUTE[n.type] + '/' + encodeURIComponent(n.id) + '/' : null);

  const TYPE = {
    spec:      { color: 0x6ea8fe, r: 0.55, emissive: 0.7 },
    decision:  { color: 0xffd166, r: 0.52, emissive: 0.7 },
    milestone: { color: 0x8ce99a, r: 0.60, emissive: 0.75 },
    work:      { color: 0xe8788f, r: 0.26, emissive: 0.35 },
  };
  const DEFAULT = { color: 0xb8b4c4, r: 0.28, emissive: 0.35 };

  try {
    const DATA = window.RF_DATA;
    if (!DATA || DATA.shape !== 'graph' || !Array.isArray(DATA.nodes) || DATA.nodes.length === 0) throw new Error('no graph');
    const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    const _v = new THREE.Vector3(), _u = new THREE.Vector3();

    // Build nodes, spread on an initial sphere from a stable hash.
    const byId = new Map();
    const nodes = DATA.nodes.map((n) => {
      const th = hash(n.id) * 6.283, ph = Math.acos(2 * hash(n.id + '~') - 1), rr = 6 + hash(n.id + '#') * 6;
      const rec = {
        id: n.id, type: n.type, url: nodeUrl(n),
        title: (n.data && n.data.title) || n.id,
        status: n.data && n.data.status,
        pos: new THREE.Vector3(rr * Math.sin(ph) * Math.cos(th), rr * Math.cos(ph), rr * Math.sin(ph) * Math.sin(th)),
        disp: new THREE.Vector3(), deg: 0,
      };
      byId.set(n.id, rec);
      return rec;
    });
    const edges = (DATA.edges || [])
      .filter((e) => byId.has(e.from) && byId.has(e.to) && e.from !== e.to)
      .map((e) => ({ a: byId.get(e.from), b: byId.get(e.to) }));
    for (const e of edges) { e.a.deg++; e.b.deg++; }

    // Force-directed layout (Fruchterman–Reingold), run up front.
    const k = 5.5;
    let temp = 8;
    const ITERS = nodes.length > 320 ? 120 : 200;
    for (let it = 0; it < ITERS; it++) {
      for (const n of nodes) n.disp.set(0, 0, 0);
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          _v.subVectors(a.pos, b.pos);
          let len = _v.length();
          if (len < 0.05) { _v.set(hash(a.id + j) - 0.5, hash(b.id + i) - 0.5, hash(a.id + b.id) - 0.5); len = _v.length() || 0.05; }
          _u.copy(_v).multiplyScalar((k * k) / (len * len));
          a.disp.add(_u); b.disp.sub(_u);
        }
      }
      for (const e of edges) {
        _v.subVectors(e.a.pos, e.b.pos);
        const len = _v.length() || 0.05;
        _u.copy(_v).multiplyScalar((len * len) / k / len);
        e.a.disp.sub(_u); e.b.disp.add(_u);
      }
      for (const n of nodes) {
        n.disp.addScaledVector(n.pos, -0.05);
        const dl = n.disp.length() || 1e-4;
        n.pos.addScaledVector(n.disp, Math.min(dl, temp) / dl);
      }
      temp *= 0.975;
    }
    const ctr = new THREE.Vector3();
    for (const n of nodes) ctr.add(n.pos);
    ctr.multiplyScalar(1 / nodes.length);
    for (const n of nodes) n.pos.sub(ctr);
    // Normalise to a fixed radius so node sizes read the same at any node count.
    let R0 = 0; for (const n of nodes) R0 = Math.max(R0, n.pos.length());
    const scl = R0 > 0 ? 13 / R0 : 1;
    for (const n of nodes) n.pos.multiplyScalar(scl);

    // Scene.
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.AmbientLight(0x8088aa, 0.7));
    const key = new THREE.PointLight(0xffe6c0, 1.6, 0, 0.4); key.position.set(20, 30, 25); scene.add(key);

    const geo = new THREE.SphereGeometry(1, 16, 16);
    const meshes = [];
    for (const n of nodes) {
      const t = TYPE[n.type] || DEFAULT;
      const r = t.r + Math.min(n.deg, 12) * 0.012;
      const color = new THREE.Color(t.color);
      const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: t.emissive, roughness: 0.5, metalness: 0.1 });
      const m = new THREE.Mesh(geo, mat);
      m.scale.setScalar(r);
      m.position.copy(n.pos);
      m.userData = { rec: n, baseScale: r };
      group.add(m);
      meshes.push(m);
    }

    const pos = new Float32Array(edges.length * 6);
    edges.forEach((e, i) => { e.a.pos.toArray(pos, i * 6); e.b.pos.toArray(pos, i * 6 + 3); });
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    group.add(new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x9a96ff, transparent: true, opacity: 0.2 })));

    const SF = 900, sf = new Float32Array(SF * 3);
    for (let i = 0; i < SF; i++) {
      const rr = 80 + Math.random() * 140, th = Math.random() * 6.283, ph = Math.acos(2 * Math.random() - 1);
      sf[i * 3] = rr * Math.sin(ph) * Math.cos(th); sf[i * 3 + 1] = rr * Math.cos(ph); sf[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
    }
    const sfGeo = new THREE.BufferGeometry(); sfGeo.setAttribute('position', new THREE.BufferAttribute(sf, 3));
    scene.add(new THREE.Points(sfGeo, new THREE.PointsMaterial({ color: 0xc9c6e0, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.5 })));

    const box = new THREE.Box3(); nodes.forEach((n) => box.expandByPoint(n.pos));
    const sph = box.getBoundingSphere(new THREE.Sphere());
    const view = { center: sph.center.clone(), dist: Math.max(10, sph.radius / Math.sin((camera.fov / 2) * Math.PI / 180) * 1.1) };
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
      renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    resize(); window.addEventListener('resize', resize);

    let rotX = 0.3, rotY = 0.4, dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointerup', (e) => { dragging = false; canvas.releasePointerCapture?.(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => {
      if (dragging) { rotY += (e.clientX - lx) * 0.005; rotX = Math.max(-1.3, Math.min(1.3, rotX + (e.clientY - ly) * 0.005)); lx = e.clientX; ly = e.clientY; }
      hover(e);
    });

    const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2(); let hovered = null;
    function pick(e) {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      return ray.intersectObjects(meshes, false)[0]?.object ?? null;
    }
    function hover(e) {
      hovered = pick(e);
      if (hovered) {
        const rec = hovered.userData.rec;
        tip.innerHTML = '<b>' + rec.id + '</b> ' + rec.title + (rec.status ? ' · ' + rec.status : '');
        tip.style.left = e.clientX + 'px'; tip.style.top = e.clientY + 'px'; tip.style.opacity = '1';
        canvas.style.cursor = 'pointer';
      } else { tip.style.opacity = '0'; canvas.style.cursor = dragging ? 'grabbing' : 'grab'; }
    }
    canvas.addEventListener('click', (e) => {
      const url = pick(e)?.userData?.rec?.url;
      if (url) { try { window.top.location.href = url; } catch { window.open(url, '_top'); } }
    });

    // Under reduced motion the layout is static (no auto-spin); drag still works.
    function frame() {
      for (const m of meshes) m.scale.setScalar(m.userData.baseScale * (m === hovered ? 1.6 : 1));
      if (!reduce && !dragging) rotY += 0.0014;
      group.rotation.set(rotX, rotY, 0);
      camera.position.set(view.center.x, view.center.y + view.dist * 0.15, view.center.z + view.dist);
      camera.lookAt(view.center);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } catch (err) {
    showFallback();
  }
</script>

{% /sandbox %}

The accessible fallback — the same plan, as an honest, navigable list. The full interactive plan (with per-entity relationships) lives at [plan.refrakt.md](https://plan.refrakt.md); the currently actionable work:

{% collection type="work" filter="status:ready" sort="priority" group="priority" limit=12 layout="list" /%}

## Source code panels with data-source

When used inside a preview with `source=true`, you can mark elements with `data-source` to control what appears in the source tab. Unmarked elements (scaffolding, wrappers) are excluded from the source view but still render in the preview.

{% preview source=true %}
{% sandbox framework="tailwind" %}
<div class="min-h-[120px] flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
  <button data-source class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium transition-colors">
    Click me
  </button>
</div>
{% /sandbox %}
{% /preview %}

Named `data-source` values create labelled tabs in the source panel.

{% preview source=true %}
{% sandbox %}
<style data-source="CSS">
  .card {
    font-family: system-ui;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 24px;
    max-width: 300px;
  }
  .card h3 { margin: 0 0 8px; }
  .card p { margin: 0; color: #6b7280; }
  @media (prefers-color-scheme: dark) {
    .card { border-color: #374151; }
    .card p { color: #9ca3af; }
  }
  [data-theme="dark"] .card { border-color: #374151; }
  [data-theme="dark"] .card p { color: #9ca3af; }
</style>
<div class="wrapper" style="padding: 24px;">
  <div data-source="HTML" class="card">
    <h3>Card Title</h3>
    <p>Card content goes here.</p>
  </div>
</div>
{% /sandbox %}
{% /preview %}

## Standalone usage

Without a preview wrapper, the sandbox renders inline with no chrome — useful for embedding a live widget in the middle of prose.


{% sandbox %}
<style>
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse-dot {
    width: 12px; height: 12px; border-radius: 50%;
    background: #7C3AED; animation: pulse 2s infinite;
  }
</style>
<div class="pulse-dot"></div>
{% /sandbox %}

```markdoc
{% sandbox %}
<style>
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .pulse-dot {
    width: 12px; height: 12px; border-radius: 50%;
    background: #7C3AED; animation: pulse 2s infinite;
  }
</style>
<div class="pulse-dot"></div>
{% /sandbox %}
```

## Tailwind card grid

A more complete example using Tailwind's utility classes for a responsive card layout.

{% preview source=true responsive="mobile,tablet,desktop" %}
{% sandbox framework="tailwind" %}
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
    <div class="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center mb-4">
      <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    </div>
    <h3 class="font-semibold text-gray-900 dark:text-white mb-1">Fast</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">Built for speed with zero runtime overhead.</p>
  </div>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
    <div class="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center mb-4">
      <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
      </svg>
    </div>
    <h3 class="font-semibold text-gray-900 dark:text-white mb-1">Flexible</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">Works with any content structure.</p>
  </div>
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
    <div class="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mb-4">
      <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
      </svg>
    </div>
    <h3 class="font-semibold text-gray-900 dark:text-white mb-1">Secure</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">Fully isolated in a sandboxed iframe.</p>
  </div>
</div>
{% /sandbox %}
{% /preview %}

## Design token context

When your site uses `{% design-context %}` runes to define tokens, a sandbox can receive those tokens automatically at build time. Use the `context` attribute to reference a named design context by its `scope`.

```markdoc
{% sandbox context="brand" %}
<div style="color: var(--color-primary); font-family: var(--font-body)">
  Styled with brand tokens
</div>
{% /sandbox %}
```

Tokens are injected into the iframe as CSS custom properties and Google Fonts links, using the same names the design-context defines (`--color-*`, `--font-*`, `--spacing-unit`, `--radius-*`, `--shadow-*`). If `context` is omitted or no matching design context exists for the default scope, no tokens are injected.

## External source files

Instead of writing HTML inline, load sandbox content from a directory of source files. The `src` attribute points to a named subdirectory inside your project's examples directory.

```markdoc
{% sandbox src="login-form" /%}
```

### Directory structure

By default, the examples directory is `../examples` relative to your content root. Each example is a subdirectory containing the files for that sandbox.

```
project/
├── content/
│   └── docs/
│       └── components.md
└── examples/
    └── login-form/
        ├── index.html
        ├── styles.css
        └── app.js
```

### File discovery

The sandbox scans the directory and assembles content from these file types:

| Extension | Role | Behavior |
|-----------|------|----------|
| `.html` | HTML body | If multiple exist, `index.html` is preferred |
| `.css` | Stylesheet | Multiple files concatenated alphabetically |
| `.js` | Script | Multiple files concatenated alphabetically |
| `.svg` | SVG asset | Injected into the HTML body |
| `.glsl-vert` | Vertex shader | Exposed as a `VERTEX_SHADER` JavaScript constant |
| `.glsl-frag` | Fragment shader | Exposed as a `FRAGMENT_SHADER` JavaScript constant |

Discovered content is automatically wrapped in `data-source` annotated elements, so source panels appear when used inside `{% preview source=true %}`.

### Combining with frameworks

The `src` attribute works alongside other sandbox attributes. For example, load files from a directory and apply a CSS framework:

{% preview source=true %}
{% sandbox src="profile-card" framework="tailwind" /%}
{% /preview %}

### Merging with inline content

You can combine file-sourced and inline content. Write additional HTML, CSS, or JavaScript between the tags — it merges with the file content.

```markdoc
{% sandbox src="login-form" %}
<style data-source="Overrides">
  .form { border: 2px solid red; }
</style>
{% /sandbox %}
```

### Error handling

If the named directory does not exist, the sandbox displays an error message in place of the preview.

### Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `src` | `string` | — | Name of a subdirectory in the examples directory to load files from |
| `framework` | `string` | — | Framework preset to load: `tailwind`, `bootstrap`, `bulma`, `pico` |
| `dependencies` | `string` | — | Comma-separated URLs of scripts/stylesheets to load |
| `label` | `string` | — | Label for the sandbox (used when inside compare) |
| `height` | `number` | auto | Fixed height in pixels (auto-sizes by default) |
| `context` | `string` | `default` | Name of the design context scope to inject tokens from |
| `activation` | `string` | `eager` | When to mount the iframe: `eager`, `visible` (on scroll-in), or `click` |
| `poster` | `string` | — | Image URL shown in the iframe's place until a non-eager sandbox activates |

### Common attributes

All block runes share these attributes for layout and theming.

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `width` | `string` | `content` | Page grid width: `content`, `wide`, or `full` |
| `spacing` | `string` | — | Vertical spacing: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `inset` | `string` | — | Horizontal padding: `flush`, `tight`, `default`, `loose`, or `breathe` |
| `tint` | `string` | — | Named colour tint from theme configuration |
| `tint-mode` | `string` | `auto` | Colour scheme override: `auto`, `dark`, or `light` |
| `bg` | `string` | — | Named background preset from theme configuration |
