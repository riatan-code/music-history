(() => {
  "use strict";

  /* ───────── data prep ───────── */
  const { LANES, GENRES, ARTISTS, CHAPTERS, ORIGINS } = window.MH;
  const G = {}, A = {};
  GENRES.forEach((g, i) => { g.no = i + 1; g.children = []; g.artists = []; G[g.id] = g; });
  GENRES.forEach(g => g.parents.forEach(p => G[p] && G[p].children.push(g.id)));
  ARTISTS.forEach((a, i) => {
    a.no = i + 1; A[a.id] = a;
    a.y = Math.min(...a.tracks.map(t => t.y));
    G[a.g].artists.push(a.id);
  });
  GENRES.forEach(g => g.artists.sort((x, y) => A[x].y - A[y].y));
  const laneC = g => LANES[g.lane].c;
  /* reading order from the table of contents: A1, A2 … H4 */
  const ORDER = [];
  CHAPTERS.forEach(ch => ch.genres.forEach((id, i) => { G[id].code = ch.side + (i + 1); G[id].chapter = ch; ORDER.push(id); }));
  /* Figma-style flat color blocks: pick black or white text for each fill */
  const onC = hex => {
    const n = parseInt(hex.slice(1), 16);
    const L = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    return L > 0.55 ? "#1E1E1E" : "#FFFFFF";
  };
  const cv = hex => `--c:${hex};--on:${onC(hex)}`;

  /* ───────── utils ───────── */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const h = html => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hash = s => { let x = 2166136261; for (const ch of s) { x ^= ch.codePointAt(0); x = Math.imul(x, 16777619); } return x >>> 0; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ } }
  };
  const isMobile = () => matchMedia("(max-width: 760px)").matches;
  const ytSearch = (a, t) => "https://www.youtube.com/results?search_query=" + encodeURIComponent(`${a.name} ${t.t}`);
  const pad = (n, l = 2) => String(n).padStart(l, "0");

  const ICON = {
    play: '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17 17 7M9 7h8v8"/></svg>',
    heart: '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    from: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
    playL: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>',
    to: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>'
  };

  /* ───────── time scale (non-linear: older centuries compressed) ───────── */
  const STOPS = [[800, 0], [1400, 170], [1600, 300], [1800, 470], [1900, 640], [1950, 1140], [1980, 1560], [2000, 1830], [2025, 2090]];
  function xs(y) {
    if (y <= STOPS[0][0]) return 0;
    for (let i = 1; i < STOPS.length; i++) {
      const [y0, x0] = STOPS[i - 1], [y1, x1] = STOPS[i];
      if (y <= y1) return x0 + (y - y0) / (y1 - y0) * (x1 - x0);
    }
    return STOPS[STOPS.length - 1][1];
  }
  function ys(x) {
    if (x <= 0) return STOPS[0][0];
    for (let i = 1; i < STOPS.length; i++) {
      const [y0, x0] = STOPS[i - 1], [y1, x1] = STOPS[i];
      if (x <= x1) return y0 + (x - x0) / (x1 - x0) * (y1 - y0);
    }
    return STOPS[STOPS.length - 1][0];
  }

  /* ───────── sleeves (generated record covers) ───────── */
  const SEC = ["#E2432A", "#E2A72E", "#1F4E8C", "#F2EDE3", "#2F5D50", "#D9577F"];
  function sleeve(a) {
    const c = laneC(G[a.g]);
    const hs = hash(a.id);
    const p = hs % 5;
    let c2 = SEC[(hs >>> 3) % SEC.length];
    if (c2.toLowerCase() === c.toLowerCase()) c2 = SEC[((hs >>> 3) + 1) % SEC.length];
    const len = [...a.name].length;
    const k = len <= 6 ? 1.3 : len <= 12 ? 1 : len <= 20 ? .78 : .6;
    const no = `<span class="no">${pad(a.no, 3)}</span>`;
    const st = `${cv(c)};--c2:${c2}`;
    const t = (fs, txt = a.name) => `<span class="t" style="font-size:${(fs * k).toFixed(2)}cqw">${esc(txt)}</span>`;
    switch (p) {
      case 0: return `<div class="slv p0" style="${st}"><i class="bar"></i>${no}${t(15)}</div>`;
      case 1: return `<div class="slv p1" style="${st}"><i class="shape"></i><i class="shape2"></i>${t(11)}</div>`;
      case 2: return `<div class="slv p2" style="${st}">${t(10.5)}</div>`;
      case 3: return `<div class="slv p3" style="${st}"><i class="bar"></i>${t(12)}</div>`;
      default: {
        const first = /^[\x00-\x7F]/.test(a.name) ? a.name.replace(/^The /, "").split(/[\s&]/)[0] : [...a.name].slice(0, 2).join("");
        return `<div class="slv p4" style="${st}"><span class="t" style="font-size:${Math.min(34, 150 / Math.max(3, [...first].length)).toFixed(1)}cqw">${esc(first)}</span><span class="sub">${esc(a.name)}</span></div>`;
      }
    }
  }

  /* ───────── map ───────── */
  const mapScroll = $(".map-scroll"), mapInner = $(".map-inner");
  const nodesEl = $(".nodes"), edgesEl = $(".edges"), lanesEl = $(".lanes"), labelsEl = $(".lane-labels");
  const M = { labelW: 132, pad: 56, axis: 30, laneH: 56, W: 0, H: 0 };
  const nodeX = y => M.labelW + M.pad + xs(y);
  const nodeY = g => M.axis + (g.lane + 0.5 + (g.row || 0)) * M.laneH;

  /* automatic label placement: within each lane, measure every node (disc + name + year);
     nodes whose boxes would touch are moved to an upper / lower track, the rest stay centred */
  function placeRows() {
    /* upper/lower tracks stay at least ~32px apart even when lanes get short */
    const GAP = 10, OFF = Math.max(0.3, 16 / M.laneH);
    LANES.forEach((_, li) => {
      const list = GENRES.filter(g => g.lane === li).sort((a, b) => a.x - b.x);
      list.forEach(g => { g.box0 = g.x - 11; g.box1 = g.x - 11 + g.el.offsetWidth; g.row = 0; });
      /* clusters of consecutive nodes that overlap horizontally */
      let i = 0;
      while (i < list.length) {
        let j = i, end = list[i].box1;
        while (j + 1 < list.length && list[j + 1].box0 < end + GAP) { j++; end = Math.max(end, list[j].box1); }
        if (j > i) {
          const last = { up: -Infinity, down: -Infinity };
          for (let k = i; k <= j; k++) {
            const g = list[k];
            /* take the track that is free; if both are taken, the one that frees up first */
            const pick = last.up <= g.box0 - GAP ? "up" : last.down <= g.box0 - GAP ? "down" : (last.up <= last.down ? "up" : "down");
            g.row = pick === "up" ? -OFF : OFF;
            last[pick] = g.box1;
          }
        }
        i = j + 1;
      }
    });
    /* then refine node by node across all lanes (a node pushed to a lane edge can touch the
       neighbouring lane): try centre / upper / lower and keep the spot with the fewest collisions */
    const yc = (g, r) => (g.lane + 0.5 + r) * M.laneH;
    const ht = g => g.el.offsetHeight - 6; /* text block without the hover padding */
    const hit = (g, r, o) => o !== g &&
      g.box0 < o.box1 + GAP / 2 && o.box0 < g.box1 + GAP / 2 &&
      Math.abs(yc(g, r) - yc(o, o.row)) < (ht(g) + ht(o)) / 2;
    const cost = (g, r) => GENRES.reduce((n, o) => n + (hit(g, r, o) ? 1 : 0), 0) + Math.abs(r) * 0.01;
    for (let pass = 0; pass < 4; pass++) {
      let moved = false;
      GENRES.forEach(g => {
        let best = g.row, bestCost = cost(g, g.row);
        [0, -OFF, OFF].forEach(r => { const c = cost(g, r); if (c < bestCost - 1e-9) { best = r; bestCost = c; } });
        if (best !== g.row) { g.row = best; moved = true; }
      });
      if (!moved) break;
    }
  }

  function buildMap() {
    GENRES.forEach(g => {
      const b = h(`<button class="node" data-g="${g.id}" style="${cv(laneC(g))}">
        <i class="disc"></i><span><span class="nm">${esc(g.short || g.ja)}</span><span class="yr">${esc(g.era)}</span></span></button>`);
      nodesEl.append(b);
      g.el = b;
    });
    LANES.forEach(l => labelsEl.append(h(`<div class="lane-label" style="${cv(l.c)}"><span class="lg"><i></i><span class="ll-full">${esc(l.ja)}</span><span class="ll-short">${esc(l.short || l.ja)}</span></span></div>`)));
  }

  const YEARLINES = [1000, 1200, 1400, 1600, 1700, 1800, 1850, 1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020];

  function layoutMap() {
    const mob = isMobile();
    M.labelW = mob ? 78 : 156;
    M.pad = mob ? 28 : 56;
    document.documentElement.style.setProperty("--label-w", M.labelW + "px");
    const avail = mapScroll.clientHeight - M.axis - 14;
    M.laneH = Math.max(mob ? 50 : 48, avail / LANES.length);
    M.W = Math.round(nodeX(2025) + 200);
    M.H = Math.round(M.axis + M.laneH * LANES.length + 14);
    mapInner.style.width = M.W + "px";
    mapInner.style.height = M.H + "px";
    labelsEl.style.height = M.H + "px";

    lanesEl.innerHTML = LANES.map((l, i) =>
      `<div class="lane" style="top:${M.axis + i * M.laneH}px;height:${M.laneH}px"></div>`).join("") +
      YEARLINES.map(y => `<i class="yearline" style="left:${nodeX(y)}px"></i><span class="yearlabel" style="left:${nodeX(y)}px">${y}</span>`).join("");

    $$(".lane-label", labelsEl).forEach((el, i) => {
      el.style.top = (M.axis + i * M.laneH) + "px";
      el.style.height = M.laneH + "px";
    });

    GENRES.forEach(g => { g.x = nodeX(g.y); g.el.style.left = g.x + "px"; });
    placeRows();
    GENRES.forEach(g => {
      g.cy = nodeY(g);
      g.el.style.top = g.cy + "px";
      g.el.style.animationDelay = (g.x / M.W * 0.9).toFixed(2) + "s";
    });

    edgesEl.setAttribute("width", M.W);
    edgesEl.setAttribute("height", M.H);
    edgesEl.setAttribute("viewBox", `0 0 ${M.W} ${M.H}`);
    let paths = "";
    GENRES.forEach(g => g.parents.forEach(pid => {
      const P = G[pid];
      const x1 = P.x, y1 = P.cy, x2 = g.x, y2 = g.cy;
      const dx = Math.max(36, (x2 - x1) * 0.5);
      paths += `<path ${mapInner.classList.contains("intro") ? 'pathLength="1" ' : ""}data-f="${pid}" data-t="${g.id}" style="${cv(laneC(P))};animation-delay:${(x1 / M.W * 0.9).toFixed(2)}s" d="M${x1.toFixed(1)} ${y1.toFixed(1)} C${(x1 + dx).toFixed(1)} ${y1.toFixed(1)} ${(x2 - dx).toFixed(1)} ${y2.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}"/>`;
    }));
    edgesEl.innerHTML = paths;
    if (activeGenre) focusGenre(activeGenre);
  }

  function focusGenre(id) {
    if (!id) { mapInner.classList.remove("focus"); return; }
    /* direct links only, and their direction is visible (as in D3 edge-bundling and Musicmap):
       links from parents are solid in the parent's colour, links to children are flowing dashes */
    const g0 = G[id];
    const near = new Set([id, ...g0.parents, ...g0.children]);
    mapInner.classList.add("focus");
    GENRES.forEach(g => {
      g.el.classList.toggle("lit", near.has(g.id));
      g.el.classList.toggle("src", g0.parents.includes(g.id));
      g.el.classList.toggle("dst", g0.children.includes(g.id));
    });
    $$("path", edgesEl).forEach(p => {
      const inc = p.dataset.t === id, out = p.dataset.f === id;
      p.classList.toggle("lit", inc || out);
      p.classList.toggle("in", inc);
      p.classList.toggle("out", out);
      if (inc || out) edgesEl.appendChild(p); /* draw highlighted links on top */
    });
  }
  let activeGenre = null;
  function setActive(id) {
    activeGenre = id;
    GENRES.forEach(g => g.el.classList.toggle("active", g.id === id));
    $$(".lane-label", labelsEl).forEach((el, i) => el.classList.toggle("on", !!id && G[id].lane === i));
    focusGenre(id);
  }

  nodesEl.addEventListener("mouseover", e => {
    const n = e.target.closest(".node");
    if (n) focusGenre(n.dataset.g);
  });
  nodesEl.addEventListener("mouseout", e => {
    const n = e.target.closest(".node");
    if (n && !n.contains(e.relatedTarget)) focusGenre(activeGenre);
  });
  nodesEl.addEventListener("click", e => {
    const n = e.target.closest(".node");
    if (!n || justDragged) return;
    go({ type: "genre", id: n.dataset.g }, { reset: true });
  });

  /* pan: drag with mouse, vertical wheel → horizontal */
  let drag = null, justDragged = false;
  mapScroll.addEventListener("pointerdown", e => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, sl: mapScroll.scrollLeft, st: mapScroll.scrollTop, moved: false };
  });
  window.addEventListener("pointermove", e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; mapScroll.classList.add("dragging"); }
    if (drag.moved) { mapScroll.scrollLeft = drag.sl - dx; mapScroll.scrollTop = drag.st - dy; }
  });
  window.addEventListener("pointerup", () => {
    if (drag && drag.moved) { justDragged = true; setTimeout(() => { justDragged = false; }, 0); }
    mapScroll.classList.remove("dragging");
    drag = null;
  });
  mapScroll.addEventListener("wheel", e => {
    if (e.ctrlKey) return;
    const canV = mapScroll.scrollHeight > mapScroll.clientHeight + 2;
    if (!canV && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      mapScroll.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, { passive: false });

  /* the panel now shrinks the content area itself, so the map's own width is what is visible */
  const visibleW = () => mapScroll.clientWidth;

  function scrollToGenre(id, smooth = true) {
    const g = G[id];
    const left = g.x - Math.max(M.labelW + 40, visibleW() * 0.42);
    const vh = isMobile() && sheetOpen() ? Math.max(80, mapScroll.clientHeight - sheetVisible()) : mapScroll.clientHeight;
    const top = g.cy - vh / 2;
    mapScroll.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }


  /* ───────── text effects ───────── */
  const roll = (txt) => `<span class="r"><span><b>${esc(txt)}</b><b>${esc(txt)}</b></span></span>`;
  const genreLink = id => {
    const g = G[id];
    return `<button class="rl" data-go-genre="${id}" style="${cv(laneC(g))}"><i></i>${roll(g.ja)}</button>`;
  };

  /* ───────── favorites ───────── */
  let favs = new Set(store.get("mh-fav", []));
  function likeBtn(a) {
    const on = favs.has(a.id);
    const dots = Array.from({ length: 8 }, (_, i) =>
      `<i style="--a:${i * 45}deg;--bc:${i % 2 ? "var(--c)" : "var(--accent)"}"></i>`).join("");
    return `<button class="like${on ? " on" : ""}" data-like="${a.id}" aria-pressed="${on}" aria-label="お気に入り">${ICON.heart}<span class="burst">${dots}</span></button>`;
  }
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-like]");
    if (!b) return;
    const id = b.dataset.like;
    if (favs.has(id)) { favs.delete(id); b.classList.remove("on", "pop"); }
    else { favs.add(id); b.classList.remove("pop"); b.offsetWidth; b.classList.add("on", "pop"); }
    b.setAttribute("aria-pressed", favs.has(id));
    store.set("mh-fav", [...favs]);
    renderFav();
  });

  /* ───────── sheet (stack panel) ───────── */
  const sheet = $(".sheet"), sheetBody = $(".sheet-body"), crumbs = $(".sheet-crumbs");
  let stack = [];
  const sheetOpen = () => sheet.classList.contains("open");

  /* origin map: dot-matrix world with the genre's birthplaces */
  const LAND = window.MH_LAND;
  const MAP_U = 4;
  let landPath = null;
  const mapXY = (lat, lon) => [((lon - LAND.lon0) / LAND.step + 0.5) * MAP_U, ((LAND.lat0 - lat) / LAND.step + 0.5) * MAP_U];
  function originMap(g) {
    const pins = ORIGINS && ORIGINS[g.id];
    if (!LAND || !pins) return "";
    const W = LAND.rows[0].length * MAP_U, H = LAND.rows.length * MAP_U;
    if (!landPath) {
      let d = "";
      LAND.rows.forEach((row, r) => {
        for (let c = 0; c < row.length; c++) if (row[c] === "1") {
          const x = (c + 0.5) * MAP_U, y = (r + 0.5) * MAP_U;
          d += `M${x - 1.3} ${y}a1.3 1.3 0 1 0 2.6 0a1.3 1.3 0 1 0-2.6 0`;
        }
      });
      landPath = d;
    }
    /* frame: this genre's own places, padded, at a fixed aspect ratio */
    const pts = pins.map(p => mapXY(p[0], p[1]));
    const ar = W / H;
    let x0 = Math.min(...pts.map(p => p[0])) - 50, x1 = Math.max(...pts.map(p => p[0])) + 50;
    let y0 = Math.min(...pts.map(p => p[1])) - 40, y1 = Math.max(...pts.map(p => p[1])) + 40;
    let vw = Math.max(x1 - x0, (y1 - y0) * ar, 230), vh = vw / ar;
    let vx = (x0 + x1) / 2 - vw / 2, vy = (y0 + y1) / 2 - vh / 2;
    if (vw > W) { vw = W; vh = H; }
    vx = Math.max(0, Math.min(W - vw, vx)); vy = Math.max(0, Math.min(H - vh, vy));
    const k = vw / 340; /* keep pins the same size on screen */
    const P = pins.map((p, i) => {
      const [x, y] = mapXY(p[0], p[1]);
      return { x, y, r: (i === 0 ? 4.2 : 3.2) * k, name: p[2] };
    });
    const marks = P.map((p, i) => `<circle class="om-pulse" cx="${p.x}" cy="${p.y}" r="${p.r.toFixed(2)}" style="animation-delay:${i * 0.4}s"/>
        <circle class="om-pin" cx="${p.x}" cy="${p.y}" r="${p.r.toFixed(2)}" stroke-width="${(1.6 * k).toFixed(2)}"/>`).join("");

    /* direct labels: try spots around each pin (adjacent first, then farther out with a leader line),
       skipping any that overlap another pin, an earlier label, or the map edge */
    const fs = 10.5 * k, gap = 7 * k, padX = 5 * k;
    const textW = s => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 0xff ? 1 : 0.6) * fs, 0);
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const placed = [];
    const pinBoxes = P.map(p => ({ x: p.x - p.r - k, y: p.y - p.r - k, w: 2 * (p.r + k), h: 2 * (p.r + k) }));
    const labels = P.map(p => {
      const w = textW(p.name) + padX * 2, h = fs + 7 * k;
      const spots = [];
      for (let d = 1; d <= 4; d++) {
        const o = gap * (d === 1 ? 1 : d * 1.8), dy = d === 1 ? 0 : gap * d * 1.3;
        spots.push(
          { x: p.x + o, y: p.y - h / 2 - dy }, { x: p.x + o, y: p.y - h / 2 + dy },
          { x: p.x - o - w, y: p.y - h / 2 - dy }, { x: p.x - o - w, y: p.y - h / 2 + dy },
          { x: p.x - w / 2, y: p.y - o - h - dy * .4 }, { x: p.x - w / 2, y: p.y + o + dy * .4 }
        );
      }
      const inside = b => b.x > vx + 2 * k && b.y > vy + 2 * k && b.x + b.w < vx + vw - 2 * k && b.y + b.h < vy + vh - 2 * k;
      let box = spots.map(s => ({ ...s, w, h })).find(b => inside(b) && !placed.some(q => hit(b, q)) && !pinBoxes.some(q => hit(b, q)));
      if (!box) box = { x: p.x + gap, y: p.y - h / 2, w, h };
      placed.push(box);
      /* leader line when the label had to move away from its pin */
      const cx = Math.max(box.x, Math.min(p.x, box.x + w)), cy = Math.max(box.y, Math.min(p.y, box.y + h));
      const far = Math.hypot(cx - p.x, cy - p.y) > gap * 1.1;
      return { ...box, p, far, cx, cy };
    });
    const leaders = labels.filter(l => l.far).map(l =>
      `<line class="om-lead" x1="${l.p.x}" y1="${l.p.y}" x2="${l.cx.toFixed(1)}" y2="${l.cy.toFixed(1)}" stroke-width="${(1 * k).toFixed(2)}"/>`).join("");
    const tags = labels.map((l, i) => `<g class="om-tag${i === 0 ? " main" : ""}">
        <rect x="${l.x.toFixed(1)}" y="${l.y.toFixed(1)}" width="${l.w.toFixed(1)}" height="${l.h.toFixed(1)}" rx="${(l.h / 2).toFixed(1)}" stroke-width="${(1 * k).toFixed(2)}"/>
        <text x="${(l.x + l.w / 2).toFixed(1)}" y="${(l.y + l.h / 2).toFixed(1)}" font-size="${fs.toFixed(2)}">${esc(l.p.name)}</text>
      </g>`).join("");
    return `<figure class="omap">
      <svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vh.toFixed(1)}" role="img" aria-label="発祥地: ${esc(P.map(p => p.name).join("、"))}">
        <path class="om-land" d="${landPath}"/>${marks}${leaders}${tags}
      </svg>
    </figure>`;
  }

  /* top playable track of an artist (registered ID, cached search result, or anything when an API key is set) */
  const topTrack = a => {
    const i = a.tracks.findIndex((t, ti) => ytOf(a, ti));
    return i >= 0 ? i : 0;
  };
  const canPlay = (a, ti) => !!ytOf(a, ti) || HAS_KEY;
  const KATA = /^[\u30A0-\u30FF\u30FC・&＆\s]+$/;
  const reading = a => {
    const r = a.kana || a.ja;
    return KATA.test(a.name) || !KATA.test(r) ? "" : r;
  };
  const lifeYears = a => /^\d{4}/.test(a.life) ? a.life.replace(/頃/g, "") : "";

  function genrePage(g) {
    const arts = g.artists.map(id => A[id]);
    const list = ids => ids.length ? `<ul>${ids.map(id => `<li>${genreLink(id)}</li>`).join("")}</ul>` : `<ul><li class="mono" style="color:var(--mute)">—</li></ul>`;
    const rows = arts.map((a, i) => {
      return `<li class="al" data-a="${a.id}">
        <button class="al-row" data-artist="${a.id}">
          <span class="al-no">${i + 1}</span>
          <span class="al-art">${sleeve(a)}</span>
          <span class="al-txt"><b>${esc(a.name)}</b></span>
          <span class="al-life">${esc(lifeYears(a))}</span>
          <span class="al-go">${ICON.to}</span>
        </button>
      </li>`;
    }).join("");
    return h(`<div class="pg" style="${cv(laneC(g))}">
      <div class="g-head">
        <div class="g-meta"><span class="g-side">${g.code}</span><span>${esc(g.era)}</span></div>
        <h2 class="g-title">${esc(g.ja)}</h2>
        <div class="g-en">${esc(g.en)}</div>
      </div>
      ${originMap(g)}
      <p class="g-desc">${esc(g.desc)}</p>
      ${arts.length ? `<div class="al-head"><h3>アーティスト</h3><span>${arts.length}</span></div><ol class="al-list">${rows}</ol>` : ""}
      <div class="lineage">
        <div><h4>${ICON.from}</h4>${list(g.parents)}</div>
        <div><h4>${ICON.to}</h4>${list(g.children)}</div>
      </div>
    </div>`);
  }

  function artistPage(a) {
    const g = G[a.g];
    const tracks = a.tracks.map((t, i) => { const id = ytOf(a, i), ok = canPlay(a, i); return `<li><button class="trk${ok ? "" : " ext"}" data-a="${a.id}" data-t="${i}">
        <span class="trk-thumb">${id ? `<img loading="lazy" alt="" src="https://i.ytimg.com/vi/${id}/mqdefault.jpg">` : `<span class="vinyl" style="${cv(laneC(g))}"></span>`}</span>
        <span><span class="trk-t">${esc(t.t)}</span><br><span class="trk-y">${t.y}</span></span>
        <span class="trk-ic">${ok ? ICON.play : ICON.ext}<span class="eq"><i></i><i></i><i></i></span></span>
      </button></li>`; }).join("");
    return h(`<div class="pg" style="${cv(laneC(g))}">
      <div class="a-hero${cur && cur.a.id === a.id && playing ? " spinning" : ""}" data-hero="${a.id}">
        <div class="vpos"><div class="vinyl"></div></div>
        <div class="slv-wrap">${sleeve(a)}</div>
      </div>
      ${reading(a) ? `<div class="a-kana">${esc(reading(a))}</div>` : ""}
      <h2 class="a-name">${esc(a.name)}</h2>
      ${a.ja !== reading(a) && a.ja !== a.name && !KATA.test(a.ja) ? `<div class="a-ja">${esc(a.ja)}</div>` : ""}
      <div class="a-row"><div class="a-meta">${esc(a.life)} · ${esc(a.from)}</div>${likeBtn(a)}</div>
      <p class="a-bio">${esc(a.bio)}</p>
      <ol class="tracks">${tracks}</ol>
      <div class="a-genre">${genreLink(a.g)}</div>
    </div>`);
  }

  /* ── phone bottom sheet: half / full detents, drag the handle to switch or to dismiss ── */
  const halfOff = () => Math.max(0, sheet.offsetHeight - Math.round(innerHeight * 0.52));
  const sheetVisible = () => sheet.dataset.detent === "full" ? sheet.offsetHeight : sheet.offsetHeight - halfOff();
  function setDetent(d) {
    sheet.dataset.detent = d;
    sheet.style.setProperty("--half", halfOff() + "px");
    sheet.style.transform = "";
    if (d === "half" && currentView === "map" && activeGenre) setTimeout(() => scrollToGenre(activeGenre), 60);
  }
  let sd = null;
  sheet.addEventListener("pointerdown", e => {
    if (!isMobile() || !sheetOpen()) return;
    if (!e.target.closest(".sheet-grab, .sheet-bar") || e.target.closest("button")) return;
    sd = { y0: e.clientY, base: sheet.dataset.detent === "half" ? halfOff() : 0, moved: false, off: 0 };
    sheet.setPointerCapture(e.pointerId);
  });
  sheet.addEventListener("pointermove", e => {
    if (!sd) return;
    const dy = e.clientY - sd.y0;
    if (!sd.moved && Math.abs(dy) < 5) return;
    sd.moved = true;
    sheet.classList.add("dragging");
    sd.off = Math.max(0, sd.base + dy);
    sheet.style.transform = `translateY(${sd.off}px)`;
  });
  const endSheetDrag = () => {
    if (!sd) return;
    const d = sd; sd = null;
    sheet.classList.remove("dragging");
    if (!d.moved) { setDetent(sheet.dataset.detent === "half" ? "full" : "half"); return; }
    const h = halfOff();
    if (d.off > h + 90) { sheet.style.transform = ""; closeSheet(); return; }
    setDetent(d.off < h / 2 ? "full" : "half");
  };
  sheet.addEventListener("pointerup", endSheetDrag);
  sheet.addEventListener("pointercancel", endSheetDrag);

  function render(entry, dir) {
    const pg = entry.type === "genre" ? genrePage(G[entry.id]) : artistPage(A[entry.id]);
    $$(".pg", sheetBody).forEach(old => {
      if (old.classList.contains("out-l") || old.classList.contains("out-r")) return;
      old.classList.add(dir === "back" ? "out-r" : "out-l");
      setTimeout(() => old.remove(), 420);
    });
    if (sheetOpen()) pg.classList.add(dir === "back" ? "in-l" : "in-r");
    else if (isMobile()) setDetent(currentView === "map" && entry.type === "genre" ? "half" : "full");
    sheetBody.append(pg);

    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("sheet-open");
    sheet.classList.toggle("deep", stack.length > 1);
    crumbs.textContent = stack.length < 2 ? "" : stack.map(e => e.type === "genre" ? (G[e.id].short || G[e.id].ja) : A[e.id].name).join("  /  ");

    const gid = entry.type === "genre" ? entry.id : A[entry.id].g;
    setActive(gid);
    markPlaying();
    history.replaceState(null, "", `#${entry.type === "genre" ? "g" : "a"}/${entry.id}`);
  }

  function go(entry, { reset = false } = {}) {
    const top = stack[stack.length - 1];
    if (top && top.type === entry.type && top.id === entry.id) return;
    if (reset || !sheetOpen()) stack = [entry]; else stack.push(entry);
    render(entry, "push");
    if (entry.type === "genre" && currentView === "map") {
      scrollToGenre(entry.id);
      /* the map narrows while the panel docks in; centre again once that has finished */
      setTimeout(() => scrollToGenre(entry.id), 480);
    }
  }
  function back() {
    if (stack.length < 2) return;
    stack.pop();
    render(stack[stack.length - 1], "back");
  }
  function closeSheet() {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sheet-open");
    stack = [];
    setActive(null);
    history.replaceState(null, "", location.pathname + location.search);
    setTimeout(() => { if (!sheetOpen()) sheetBody.innerHTML = ""; }, 600);
  }
  $(".sheet-back").addEventListener("click", back);
  $(".sheet-close").addEventListener("click", closeSheet);

  sheetBody.addEventListener("click", e => {
    const gl = e.target.closest("[data-go-genre]");
    if (gl) { go({ type: "genre", id: gl.dataset.goGenre }); if (currentView === "map") scrollToGenre(gl.dataset.goGenre); return; }
    const ar = e.target.closest("[data-artist]");
    if (ar) { go({ type: "artist", id: ar.dataset.artist }); return; }
    const tr = e.target.closest(".trk");
    if (tr) {
      const a = A[tr.dataset.a], ti = +tr.dataset.t;
      if (cur && cur.a.id === a.id && cur.ti === ti) togglePlay();
      else playOne(a, ti);
    }
  });
  /* ───────── crate view ───────── */
  const crateGrid = $(".crate-grid"), crateFilterEl = $(".crate-filter");
  let crateFilter = "all";
  function buildCrate() {
    const chips = [`<button class="chip" role="tab" data-f="all" aria-selected="true">すべて</button>`]
      .concat(LANES.map((l, i) => `<button class="chip" role="tab" data-f="${i}" aria-selected="false" style="${cv(l.c)}"><i></i>${esc(l.ja)}</button>`))
      .concat(`<button class="chip" role="tab" data-f="fav" aria-selected="false" aria-label="お気に入り"><svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" fill="var(--accent)"/></svg></button>`);
    crateFilterEl.innerHTML = chips.join("");
    crateGrid.innerHTML = [...ARTISTS].sort((x, y) => x.y - y.y).map(a => {
      const g = G[a.g];
      return `<button class="ci" data-artist="${a.id}" data-lane="${g.lane}" style="${cv(laneC(g))}">
        <div class="ci-art"><span class="vinyl"></span>${sleeve(a)}</div>
        <div class="ci-n">${esc(a.name)}</div>
        <div class="ci-m"><i></i>${esc(g.short || g.ja)} · ${a.y}</div>
      </button>`;
    }).join("");
  }
  function applyCrateFilter() {
    $$(".chip", crateFilterEl).forEach(c => c.setAttribute("aria-selected", c.dataset.f === String(crateFilter)));
    $$(".ci", crateGrid).forEach(ci => {
      const show = crateFilter === "all" || (crateFilter === "fav" ? favs.has(ci.dataset.artist) : ci.dataset.lane === String(crateFilter));
      ci.classList.toggle("hide", !show);
    });
  }
  crateFilterEl.addEventListener("click", e => {
    const c = e.target.closest(".chip");
    if (!c) return;
    crateFilter = c.dataset.f;
    applyCrateFilter();
  });
  crateGrid.addEventListener("click", e => {
    const ci = e.target.closest(".ci");
    if (ci) go({ type: "artist", id: ci.dataset.artist }, { reset: true });
  });

  /* ───────── table of contents (LP tracklist) ───────── */
  const tocView = $(".view-toc"), tocMain = $(".toc-main"), tocSide = $(".toc-side"), tocInd = $(".toc-ind");
  const repTrack = g => {
    for (const id of g.artists) {
      const ti = A[id].tracks.findIndex((t, i) => ytOf(A[id], i));
      if (ti >= 0) return { a: A[id], ti };
    }
    return HAS_KEY && g.artists.length ? { a: A[g.artists[0]], ti: 0 } : null;
  };
  function buildToc() {
    tocMain.innerHTML = `<header class="toc-cover"><h2>Tracklist</h2><div class="mono">${GENRES.length} genres · ${ARTISTS.length} artists<br>9世紀 — 2020年代</div></header>` +
      CHAPTERS.map(ch => {
        const gs = ch.genres.map(id => G[id]);
        const arts = gs.flatMap(g => g.artists);
        const pick = [...new Set([arts[0], arts[Math.floor(arts.length / 2)], arts[arts.length - 1]])];
        const rows = gs.map(g => {
          const rep = repTrack(g);
          const from = g.parents.map(pid => `<span><i style="${cv(laneC(G[pid]))}"></i>${esc(G[pid].short || G[pid].ja)}</span>`).join("");
          const names = g.artists.map(id => esc(A[id].name)).join(", ");
          return `<li data-g="${g.id}">
            <button class="tl-row" data-open="${g.id}">
              <span class="tl-no">${g.code}</span>
              <span><span class="tl-name"><b>${esc(g.ja)}</b></span>${from ? `<span class="tl-from">${ICON.from}${from}</span>` : ""}</span>
              <span class="tl-art">${names}</span>
              <span class="tl-era">${esc(g.era)}</span>
            </button>
          </li>`;
        }).join("");
        return `<section class="side" id="side-${ch.side}" style="${cv(LANES[ch.lane].c)}">
          <div class="side-head">
            <div class="side-letter">${ch.side}</div>
            <div class="side-titles">
              <h3>${esc(ch.ja)}</h3>
              <p lang="en">${esc(ch.en)}</p>
            </div>
            <div class="side-stack">${pick.map(id => `<span class="s">${sleeve(A[id])}</span>`).join("")}</div>
          </div>
          <ol class="tl">${rows}</ol>
          <div class="tl-total"><span>${gs.length} genres · ${arts.length} artists</span></div>
        </section>`;
      }).join("");
    tocSide.insertAdjacentHTML("beforeend", CHAPTERS.map(ch =>
      `<a class="lg" href="#side-${ch.side}" data-side="${ch.side}" style="${cv(LANES[ch.lane].c)}"><i></i><b>${ch.side}</b><span>${esc(ch.ja)}</span></a>`).join(""));
  }
  function tocSpy() {
    const top = tocView.scrollTop + 140;
    let cur = CHAPTERS[0].side;
    CHAPTERS.forEach(ch => { if ($("#side-" + ch.side).offsetTop <= top) cur = ch.side; });
    $$("a[data-side]", tocSide).forEach(a => {
      const on = a.dataset.side === cur;
      a.classList.toggle("on", on);
      if (on) {
        tocInd.style.transform = `translateY(${a.offsetTop}px)`;
        tocInd.style.height = a.offsetHeight + "px";
        if (isMobile()) a.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    });
  }
  tocView.addEventListener("scroll", () => requestAnimationFrame(tocSpy), { passive: true });
  tocSide.addEventListener("click", e => {
    const a = e.target.closest("a[data-side]");
    if (!a) return;
    e.preventDefault();
    const sec = $("#side-" + a.dataset.side);
    tocView.scrollTo({ top: sec.offsetTop - (isMobile() ? 64 : 24), behavior: "smooth" });
  });
  tocMain.addEventListener("click", e => {
    const row = e.target.closest("[data-open]");
    if (row) go({ type: "genre", id: row.dataset.open }, { reset: true });
  });

  /* ───────── favorites (library) ───────── */
  const favView = $(".view-fav"), favItems = $(".lib-items");
  let favSort = store.get("mh-fav-sort", "recent"), favMode = store.get("mh-fav-mode", "list");
  const kanaKey = a => (a.kana || a.ja || a.name);
  function favList() {
    const list = [...favs].map(id => A[id]).filter(Boolean);
    if (favSort === "recent") list.reverse();
    else if (favSort === "name") list.sort((x, y) => kanaKey(x).localeCompare(kanaKey(y), "ja"));
    else list.sort((x, y) => x.y - y.y);
    return list;
  }
  /* artists have no photos here, so the library uses monogram avatars (as music/contacts apps do without a picture) */
  function monogram(a) {
    const name = a.name.replace(/^The /, "").replace(/\(.*?\)/g, "").trim();
    const latin = /^[A-Za-z0-9]/.test(name);
    let t;
    if (latin) {
      const words = name.split(/[\s&\-]+/).filter(w => /^[A-Za-z0-9]/.test(w));
      t = words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2);
      t = t.toUpperCase();
    } else t = [...name][0];
    return `<span class="mono-av${latin ? "" : " jp"}" style="${cv(laneC(G[a.g]))}"><b>${esc(t)}</b></span>`;
  }
  function renderFav() {
    const list = favList();
    const n = list.length;
    $(".tab-n").textContent = n ? String(n) : "";
    $(".lib-count").textContent = n + " アーティスト";
    favView.classList.toggle("empty", !n);
    favView.dataset.mode = favMode;
    $$(".lib-sort .chip").forEach(c => c.setAttribute("aria-selected", c.dataset.sort === favSort));
    $$(".lib-mode button").forEach(b => b.classList.toggle("on", b.dataset.mode === favMode));
    favItems.innerHTML = list.map(a => {
      const g = G[a.g];
      return `<li class="al lib-item" data-a="${a.id}" style="${cv(laneC(g))}">
        <button class="lib-row" data-artist="${a.id}">
          <span class="lib-av">${monogram(a)}</span>
          <span class="lib-txt"><b>${esc(a.name)}</b><span><i></i>${esc(g.short || g.ja)}</span></span>
          <span class="lib-life">${esc(lifeYears(a))}</span>
        </button>
        ${likeBtn(a)}
      </li>`;
    }).join("");
    markPlaying();
    requestAnimationFrame(movePill);
  }
  favView.addEventListener("click", e => {
    const so = e.target.closest("[data-sort]");
    if (so) { favSort = so.dataset.sort; store.set("mh-fav-sort", favSort); renderFav(); return; }
    const mo = e.target.closest("[data-mode]");
    if (mo) { favMode = mo.dataset.mode; store.set("mh-fav-mode", favMode); renderFav(); return; }
    if (e.target.closest("[data-like]")) return;
    const ar = e.target.closest("[data-artist]");
    if (ar) go({ type: "artist", id: ar.dataset.artist }, { reset: true });
  });

  /* ───────── views / tab pill ───────── */
  let currentView = "map";
  const pillBg = $(".tabpill-bg");
  function movePill() {
    const btn = $(`.tabpill button[data-view="${currentView}"]`);
    pillBg.style.width = btn.offsetWidth + "px";
    pillBg.style.transform = `translateX(${btn.offsetLeft}px)`;
  }
  function setView(v) {
    currentView = v;
    $$(".tabpill button, .tabbar button[data-view]").forEach(b => b.setAttribute("aria-selected", b.dataset.view === v));
    $$(".view").forEach(el => el.classList.toggle("is-active", el.dataset.viewPanel === v));
    movePill();
    if (!sheetOpen()) history.replaceState(null, "", v === "map" ? location.pathname + location.search : "#" + v);
    if (v === "toc") requestAnimationFrame(tocSpy);
  }
  $(".tabpill").addEventListener("click", e => {
    const b = e.target.closest("button[data-view]");
    if (b) setView(b.dataset.view);
  });
  $(".tabbar").addEventListener("click", e => {
    const b = e.target.closest("button[data-view]");
    if (!b) return;
    if (b.dataset.view === currentView) {
      /* tapping the active tab again scrolls back to the top, as in streaming apps */
      const v = $(`.view[data-view-panel="${currentView}"]`);
      if (currentView === "map") mapScroll.scrollTo({ left: 0, top: 0, behavior: "smooth" });
      else v.scrollTo({ top: 0, behavior: "smooth" });
      if (sheetOpen()) closeSheet();
    } else {
      if (sheetOpen() && isMobile()) closeSheet();
      setView(b.dataset.view);
    }
  });
  $("[data-home]").addEventListener("click", e => {
    e.preventDefault();
    closeSheet();
    setView("map");
    mapScroll.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  });

  /* ───────── player (morph island + YouTube) ───────── */
  const isl = $(".island");
  let ytp = null, ytReady = false, pending = null, cur = null, playing = false, apiLoading = false;

  /* video IDs: registered in data.js → cached search result → YouTube Data API search (needs a key in config.js) */
  const API_KEY = ((window.MH_CONFIG || {}).youtubeApiKey || "").trim();
  const HAS_KEY = !!API_KEY;
  const ytCache = store.get("mh-ytcache", {});
  const tkey = (a, ti) => a.id + "#" + ti;
  function ytOf(a, ti) { return a.tracks[ti].yt || ytCache[tkey(a, ti)] || null; }
  async function resolveYt(a, ti) {
    const known = ytOf(a, ti);
    if (known || !HAS_KEY) return known;
    const q = `${a.name} ${a.tracks[ti].t}`;
    const url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&videoEmbeddable=true" +
      "&q=" + encodeURIComponent(q) + "&key=" + encodeURIComponent(API_KEY);
    try {
      const res = await fetch(url);
      const j = await res.json();
      const id = j.items && j.items[0] && j.items[0].id && j.items[0].id.videoId;
      if (id) { ytCache[tkey(a, ti)] = id; store.set("mh-ytcache", ytCache); }
      return id || null;
    } catch { return null; }
  }

  let queue = [];
  function playOne(a, ti) { queue = []; play(a, ti); }
  function next() {
    if (!queue.length) return false;
    const n = queue.shift();
    play(n.a, n.ti);
    return true;
  }

  function loadAPI() {
    if (window.YT && window.YT.Player) return;
    if (apiLoading) return;
    apiLoading = true;
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.append(s);
  }
  window.onYouTubeIframeAPIReady = () => {
    const vars = { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 };
    if (location.protocol.startsWith("http")) vars.origin = location.origin;
    ytp = new YT.Player("yt", {
      width: "100%", height: "100%",
      playerVars: vars,
      events: {
        onReady: () => { ytReady = true; if (pending) { ytp.loadVideoById(pending); pending = null; } },
        onStateChange: e => {
          if (e.data === 1) setPlaying(true);
          else if (e.data === 2) setPlaying(false);
          else if (e.data === 0 && !next()) setPlaying(false);
        },
        onError: () => { if (queue.length) { next(); return; } isl.classList.add("err"); setPlaying(false); }
      }
    });
  };

  let playToken = 0;
  async function play(a, ti) {
    const t = a.tracks[ti];
    let id = ytOf(a, ti);
    if (!id && !HAS_KEY) { window.open(ytSearch(a, t), "_blank", "noopener"); return; }
    const token = ++playToken;
    cur = { a, ti, t };
    isl.classList.remove("err");
    $(".isl-fallback-link").href = ytSearch(a, t);
    $(".isl-title").textContent = t.t;
    $(".isl-artist").textContent = a.name;
    isl.style.setProperty("--c", laneC(G[a.g]));
    $(".isl-prog i").style.width = "0";
    if (isl.dataset.state === "hidden") isl.dataset.state = "open";
    setPlaying(true);
    if (!id) {
      isl.classList.add("loading");
      id = await resolveYt(a, ti);
      isl.classList.remove("loading");
      if (token !== playToken) return;
      if (!id) { if (!next()) { isl.classList.add("err"); setPlaying(false); } return; }
      refreshThumbs(a);
    }
    if (ytReady) ytp.loadVideoById(id);
    else { pending = id; loadAPI(); }
  }
  /* once a search finds a video, show its thumbnail and play icon where that track is listed */
  function refreshThumbs(a) {
    $$(`.trk[data-a="${a.id}"]`).forEach(el => {
      const id = ytOf(a, +el.dataset.t);
      const th = $(".trk-thumb", el);
      if (id && th && !$("img", th)) th.innerHTML = `<img loading="lazy" alt="" src="https://i.ytimg.com/vi/${id}/mqdefault.jpg">`;
    });
  }
  function togglePlay() {
    if (!cur || !ytReady) return;
    if (playing) ytp.pauseVideo(); else ytp.playVideo();
  }
  function stop() {
    if (ytReady) ytp.stopVideo();
    queue = [];
    cur = null;
    isl.dataset.state = "hidden";
    setPlaying(false);
  }
  function setPlaying(v) {
    playing = v;
    isl.classList.toggle("is-playing", v);
    markPlaying();
  }
  function markPlaying() {
    $$(".al").forEach(li => li.classList.toggle("playing", !!cur && li.dataset.a === cur.a.id));
    $$(".trk").forEach(el => {
      const on = !!cur && el.dataset.a === cur.a.id && +el.dataset.t === cur.ti;
      el.classList.toggle("playing", on);
      el.classList.toggle("paused", on && !playing);
    });
    $$("[data-hero]").forEach(el => el.classList.toggle("spinning", !!cur && playing && el.dataset.hero === cur.a.id));
    GENRES.forEach(g => g.el.classList.toggle("playing", !!cur && playing && cur.a.g === g.id));
  }
  const toggleExpand = () => { if (cur) isl.dataset.state = isl.dataset.state === "open" ? "mini" : "open"; };
  $(".isl-play").addEventListener("click", togglePlay);
  $(".isl-close").addEventListener("click", stop);
  $(".isl-exp").addEventListener("click", toggleExpand);
  $(".isl-txt").addEventListener("click", toggleExpand);
  $(".isl-disc").addEventListener("click", () => { if (cur) go({ type: "artist", id: cur.a.id }); });
  $(".isl-prog").addEventListener("click", e => {
    if (!ytReady || !cur) return;
    const r = e.currentTarget.getBoundingClientRect();
    const d = ytp.getDuration();
    if (d) ytp.seekTo(d * (e.clientX - r.left) / r.width, true);
  });
  setInterval(() => {
    if (!ytReady || !cur || !ytp.getDuration) return;
    const d = ytp.getDuration(), t = ytp.getCurrentTime();
    if (d) $(".isl-prog i").style.width = (t / d * 100).toFixed(2) + "%";
  }, 500);

  /* ───────── picture-in-picture player ─────────
     open state on desktop = floating window: drag the bar to move (snaps to the nearest corner
     of the free area, beside the panel), drag the corner grip to resize. size & corner persist. */
  const PIP_MIN = 320, PIP_BAR = 56, PIP_M = 16;
  const pipState = store.get("mh-pip", { corner: "bl", w: 640 });
  function pipArea() {
    const top = $(".top").offsetHeight + PIP_M;
    const right = innerWidth - PIP_M - (sheetOpen() ? sheet.offsetWidth + 12 : 0);
    return { l: PIP_M, t: top, r: right, b: innerHeight - PIP_M };
  }
  function pipWidth(w) {
    const A = pipArea();
    const max = Math.max(PIP_MIN, Math.min(1120, A.r - A.l, (A.b - A.t - PIP_BAR) * 16 / 9));
    return Math.round(Math.max(PIP_MIN, Math.min(max, w)));
  }
  function placePip(animate = true) {
    const on = isl.dataset.state === "open" && !isMobile();
    isl.classList.toggle("pip", on);
    if (!on) return;
    const A = pipArea(), w = pipWidth(pipState.w), h = w * 9 / 16 + PIP_BAR;
    const x = pipState.corner[1] === "l" ? A.l : A.r - w;
    const y = pipState.corner[0] === "t" ? A.t : A.b - h;
    isl.classList.toggle("snap", animate);
    isl.dataset.corner = pipState.corner;
    isl.style.setProperty("--iw", w + "px");
    isl.style.setProperty("--ix", x + "px");
    isl.style.setProperty("--iy", y + "px");
  }
  let pipDrag = null;
  isl.addEventListener("pointerdown", e => {
    if (!isl.classList.contains("pip") || e.button !== 0) return;
    const onGrip = e.target.closest(".isl-grip");
    if (!onGrip && (!e.target.closest(".isl-bar") || e.target.closest("button:not(.isl-txt)"))) return;
    const r = isl.getBoundingClientRect();
    pipDrag = { mode: onGrip ? "size" : "move", x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w0: r.width, moved: false };
    isl.setPointerCapture(e.pointerId);
  });
  isl.addEventListener("pointermove", e => {
    if (!pipDrag) return;
    if (!pipDrag.moved && Math.hypot(e.clientX - pipDrag.x0, e.clientY - pipDrag.y0) < 4) return;
    pipDrag.moved = true;
    isl.classList.add("moving");
    isl.classList.remove("snap");
    if (pipDrag.mode === "move") {
      isl.style.setProperty("--ix", (e.clientX - pipDrag.dx) + "px");
      isl.style.setProperty("--iy", (e.clientY - pipDrag.dy) + "px");
    } else {
      const dir = pipState.corner[1] === "r" ? -1 : 1;
      pipState.w = pipWidth(pipDrag.w0 + dir * (e.clientX - pipDrag.x0));
      placePip(false);
    }
  });
  const endPip = e => {
    if (!pipDrag) return;
    const d = pipDrag; pipDrag = null;
    isl.classList.remove("moving");
    if (!d.moved) return;
    e.preventDefault();
    isl.dataset.justMoved = "1";
    setTimeout(() => { delete isl.dataset.justMoved; }, 0);
    if (d.mode === "move") {
      const r = isl.getBoundingClientRect(), A = pipArea();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      pipState.corner = (cy < (A.t + A.b) / 2 ? "t" : "b") + (cx < (A.l + A.r) / 2 ? "l" : "r");
    }
    store.set("mh-pip", pipState);
    placePip(true);
  };
  isl.addEventListener("pointerup", endPip);
  isl.addEventListener("pointercancel", endPip);
  /* a drag on the title must not also toggle the video */
  isl.addEventListener("click", e => { if (isl.dataset.justMoved) e.stopPropagation(); }, true);
  new MutationObserver(() => {
    placePip(true);
    document.body.classList.toggle("has-player", isl.dataset.state !== "hidden");
    document.body.classList.toggle("player-bar", isl.dataset.state === "mini" || (isl.dataset.state === "open" && isMobile()));
    document.body.classList.toggle("player-full", isl.dataset.state === "open" && isMobile());
  }).observe(isl, { attributes: true, attributeFilter: ["data-state"] });
  let fsDrag = null;
  isl.addEventListener("pointerdown", e => {
    if (!isMobile() || isl.dataset.state !== "open" || e.target.closest("button:not(.isl-txt), .isl-prog")) return;
    fsDrag = { y0: e.clientY, dy: 0 };
  });
  isl.addEventListener("pointermove", e => {
    if (!fsDrag) return;
    fsDrag.dy = Math.max(0, e.clientY - fsDrag.y0);
    if (fsDrag.dy > 6) { isl.classList.add("fs-drag"); isl.style.setProperty("--fs-dy", fsDrag.dy + "px"); }
  });
  const endFs = () => {
    if (!fsDrag) return;
    const dy = fsDrag.dy; fsDrag = null;
    isl.classList.remove("fs-drag");
    isl.style.removeProperty("--fs-dy");
    if (dy > 90) { isl.dataset.justMoved = "1"; setTimeout(() => { delete isl.dataset.justMoved; }, 0); isl.dataset.state = "mini"; }
  };
  isl.addEventListener("pointerup", endFs);
  isl.addEventListener("pointercancel", endFs);
  new MutationObserver(() => placePip(true)).observe(document.body, { attributes: true, attributeFilter: ["class"] });
  window.addEventListener("resize", () => {
    placePip(false);
    if (sheetOpen()) sheet.style.setProperty("--half", halfOff() + "px");
    document.body.classList.toggle("player-full", isl.dataset.state === "open" && isMobile());
  });

  /* ───────── command palette ───────── */
  const pal = $(".palette"), palIn = $(".palette input"), palList = $(".palette-list");
  let palItems = [], palSel = 0;
  const norm = s => String(s).toLowerCase()
    .replace(/[ぁ-ゖ]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .replace(/[\s・\-_.,'’"!?()/&]/g, "");
  const INDEX = [
    ...GENRES.map(g => ({ kind: "g", id: g.id, keys: norm([g.ja, g.short, g.en, ...g.tags].join("|")) })),
    ...ARTISTS.map(a => ({ kind: "a", id: a.id, keys: norm([a.name, a.ja].join("|")) })),
    ...ARTISTS.flatMap(a => a.tracks.map((t, i) => ({ kind: "t", id: a.id, ti: i, keys: norm(t.t) })))
  ];
  function search(q) {
    const n = norm(q);
    if (!n) return GENRES.map(g => ({ kind: "g", id: g.id }));
    const scored = [];
    INDEX.forEach(it => {
      const i = it.keys.indexOf(n);
      if (i < 0) return;
      const score = (it.kind === "g" ? 0 : it.kind === "a" ? 1 : 2) * 10 + (i === 0 || it.keys[i - 1] === "|" ? 0 : 5);
      scored.push({ ...it, score });
    });
    return scored.sort((x, y) => x.score - y.score).slice(0, 24);
  }
  function renderPalette() {
    palItems = search(palIn.value);
    palSel = Math.min(palSel, Math.max(0, palItems.length - 1));
    let lastKind = null;
    const SEC_LABEL = { g: "GENRE", a: "ARTIST", t: "TRACK" };
    palList.innerHTML = palItems.map((it, i) => {
      let sec = "";
      if (it.kind !== lastKind && palIn.value) { sec = `<li class="pi-sec">${SEC_LABEL[it.kind]}</li>`; lastKind = it.kind; }
      if (it.kind === "g") {
        const g = G[it.id];
        return sec + `<li><button data-i="${i}" class="${i === palSel ? "sel" : ""}"><span class="pi-ic g" style="${cv(laneC(g))}"></span><span class="pi-t">${esc(g.ja)}</span><span class="pi-s">${esc(g.era)}</span></button></li>`;
      }
      const a = A[it.id];
      const sub = it.kind === "t" ? a.tracks[it.ti].t : (G[a.g].short || G[a.g].ja);
      const title = it.kind === "t" ? `${a.tracks[it.ti].t}` : a.name;
      const s2 = it.kind === "t" ? a.name : sub;
      return sec + `<li><button data-i="${i}" class="${i === palSel ? "sel" : ""}"><span class="pi-ic">${sleeve(a)}</span><span class="pi-t">${esc(title)}</span><span class="pi-s">${esc(s2)}</span></button></li>`;
    }).join("");
    const sel = $(".sel", palList);
    if (sel) sel.scrollIntoView({ block: "nearest" });
  }
  function openPalette() {
    pal.classList.add("open");
    pal.setAttribute("aria-hidden", "false");
    palIn.value = ""; palSel = 0;
    renderPalette();
    setTimeout(() => palIn.focus(), 30);
  }
  function closePalette() {
    pal.classList.remove("open");
    pal.setAttribute("aria-hidden", "true");
    palIn.blur();
  }
  function choose(it) {
    if (!it) return;
    closePalette();
    if (it.kind === "g") {
      setView("map");
      go({ type: "genre", id: it.id }, { reset: true });
    } else {
      go({ type: "artist", id: it.id }, { reset: true });
      if (it.kind === "t") playOne(A[it.id], it.ti);
    }
  }
  palIn.addEventListener("input", () => { palSel = 0; renderPalette(); });
  palIn.addEventListener("keydown", e => {
    if (e.key === "ArrowDown") { palSel = Math.min(palItems.length - 1, palSel + 1); renderPalette(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { palSel = Math.max(0, palSel - 1); renderPalette(); e.preventDefault(); }
    else if (e.key === "Enter") { choose(palItems[palSel]); e.preventDefault(); }
  });
  palList.addEventListener("click", e => {
    const b = e.target.closest("button[data-i]");
    if (b) choose(palItems[+b.dataset.i]);
  });
  palList.addEventListener("mousemove", e => {
    const b = e.target.closest("button[data-i]");
    if (b && +b.dataset.i !== palSel) {
      $$(".sel", palList).forEach(x => x.classList.remove("sel"));
      b.classList.add("sel"); palSel = +b.dataset.i;
    }
  });
  pal.addEventListener("click", e => { if (e.target === pal) closePalette(); });
  $$("[data-open-palette]").forEach(b => b.addEventListener("click", openPalette));

  /* ───────── keyboard ───────── */
  document.addEventListener("keydown", e => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement.tagName);
    if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); openPalette(); return; }
    if (e.key === "Escape") {
      if (pal.classList.contains("open")) closePalette();
      else if (stack.length > 1) back();
      else if (sheetOpen()) closeSheet();
      return;
    }
    if (typing) return;
    if (e.key === " " && cur) { e.preventDefault(); togglePlay(); }
  });

  /* ───────── boot ───────── */
  buildMap();
  mapInner.classList.add("intro");
  buildCrate();
  buildToc();
  const relayout = () => { layoutMap(); movePill(); };
  relayout();
  setTimeout(() => {
    mapInner.classList.remove("intro");
    $$("path", edgesEl).forEach(p => p.removeAttribute("pathLength"));
  }, 2400);
  let rt;
  const onResize = () => { clearTimeout(rt); rt = setTimeout(relayout, 120); };
  window.addEventListener("resize", onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(mapScroll);
  /* label widths change once the web fonts arrive, so lay the map out again */
  if (document.fonts) document.fonts.ready.then(() => { relayout(); });

  renderFav();
  if (location.hash === "#fav" || location.hash === "#toc") setView(location.hash.slice(1));
  const m = location.hash.match(/^#([ga])\/([\w-]+)$/);
  if (m) {
    const entry = { type: m[1] === "g" ? "genre" : "artist", id: m[2] };
    if ((entry.type === "genre" && G[entry.id]) || (entry.type === "artist" && A[entry.id])) {
      go(entry, { reset: true });
      const gid = entry.type === "genre" ? entry.id : A[entry.id].g;
      requestAnimationFrame(() => scrollToGenre(gid, false));
    }
  }
  (window.requestIdleCallback || setTimeout)(loadAPI, 1500);
})();
