/* Сайт «Публикации A* 2025»: навигация, графики (SVG из данных) с подсветкой при наведении, таблица работ.
   Без библиотек. Данные — window.A_DATA из assets/js/data.js. */
(function () {
  "use strict";
  var D = window.A_DATA || { charts: {}, works: [] };
  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // цвета графиков — токены темы; перечитываются при смене светлой/тёмной темы
  var C = {};
  function tok(n) { return getComputedStyle(root).getPropertyValue(n).trim(); }
  function tc(name) { return name ? tok("--" + name) || name : C.cian; }
  function readTokens() {
    C = {
      cian: tok("--cian"), ink: tok("--ink"), ink2: tok("--ink-2"), muted: tok("--muted"), line: tok("--line"), hair: tok("--hair"),
      track: tok("--track"), peach: tok("--peach"), bg: tok("--surface"), sapphire: tok("--sapphire"),
      o4: [tok("--o4-1"), tok("--o4-2"), tok("--o4-3"), tok("--o4-4")],
      o5: [tok("--o5-1"), tok("--o5-2"), tok("--o5-3"), tok("--o5-4"), tok("--o5-5")]
    };
  }
  readTokens();

  /* ───────── утилиты ───────── */
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(tag, cls, parent, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  var cv = document.createElement("canvas").getContext("2d");
  function tw(s, size, weight) { cv.font = (weight || 400) + " " + size + "px Inter, system-ui, sans-serif"; return cv.measureText(s).width; }
  function wrap(s, max, size, weight) {
    // подпись не обрезается, а переносится по словам
    var words = String(s).split(" "), lines = [], cur = "";
    words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (cur && tw(t, size, weight) > max) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    return lines;
  }
  function barPath(x, y, w, hgt, r, dir) {
    // прямоугольник со скруглённым концом данных (dir: "r" — вправо, "t" — вверх)
    r = Math.max(0, Math.min(r, dir === "r" ? w / 2 : hgt / 2, dir === "r" ? hgt / 2 : w / 2));
    if (w <= 0 || hgt <= 0) return "";
    if (dir === "r") return "M" + x + "," + y + "h" + (w - r) + "a" + r + "," + r + " 0 0 1 " + r + "," + r + "v" + (hgt - 2 * r) + "a" + r + "," + r + " 0 0 1 -" + r + "," + r + "h-" + (w - r) + "z";
    return "M" + x + "," + (y + hgt) + "v-" + (hgt - r) + "a" + r + "," + r + " 0 0 1 " + r + ",-" + r + "h" + (w - 2 * r) + "a" + r + "," + r + " 0 0 1 " + r + "," + r + "v" + (hgt - r) + "z";
  }
  function svgRoot(host, w, hgt, label) {
    host.textContent = "";
    var s = el("svg", { width: w, height: hgt, viewBox: "0 0 " + w + " " + hgt, role: "img", "aria-label": label || "" }, host);
    return s;
  }

  /* ───────── подсветка при наведении (без всплывающих подсказок) ───────── */
  function hover(node, onEnter, onLeave) {
    if (onEnter) node.addEventListener("pointerenter", onEnter);
    if (onLeave) node.addEventListener("pointerleave", onLeave);
  }

  /* ───────── графики ───────── */
  var R = {};

  R.hbar = function (host, d) {
    var W = host.clientWidth; if (!W) return;
    var fs = W < 480 ? 12.5 : 13.5, lh = fs + 3, barH = 16, pad = 8;
    var labW = 0, valW = 0;
    var wordW = 0;  // колонка подписей не уже самого длинного слова: перенос идёт по словам
    d.rows.forEach(function (r) {
      labW = Math.max(labW, tw(r.l, fs, 500)); valW = Math.max(valW, tw(r.t, fs, 600));
      String(r.l).split(" ").forEach(function (w) { wordW = Math.max(wordW, tw(w, fs, 500)); });
    });
    labW = Math.min(labW + 14, Math.min(W * 0.6, Math.max(W * 0.44, wordW + 14)));
    var plotW = W - labW - valW - 16;
    var max = d.max || Math.max.apply(null, d.rows.map(function (r) { return r.v; }));
    var rows = d.rows.map(function (r) { var ls = wrap(r.l, labW - 12, fs, 500); return { r: r, ls: ls, h: Math.max(30, ls.length * lh + 10) }; });
    var H = rows.reduce(function (a, x) { return a + x.h; }, 0) + pad;
    var s = svgRoot(host, W, H, d.title), y = pad / 2;
    rows.forEach(function (x) {
      var r = x.r, rowH = x.h, g = el("g", { class: "row" }, s);
      var t = el("text", { x: labW - 12, y: y + rowH / 2 + fs * 0.35 - (x.ls.length - 1) * lh / 2, "text-anchor": "end", "font-size": fs, "font-weight": 500 }, g);
      x.ls.forEach(function (line, k) { el("tspan", { x: labW - 12, dy: k ? lh : 0 }, t, line); });
      var bw = Math.max(2, plotW * r.v / max);
      el("rect", { x: labW, y: y + (rowH - barH) / 2, width: plotW, height: barH, rx: 4, fill: C.track }, g);
      el("path", { class: "mark", d: barPath(labW, y + (rowH - barH) / 2, bw, barH, 4, "r"), fill: r.c ? tc(r.c) : (r.hl === false ? C.o4[0] : C.cian) }, g);
      el("text", { class: "val", x: labW + bw + 8, y: y + rowH / 2 + fs * 0.35, "font-size": fs }, g, r.t);
      var hit = el("rect", { class: "hit", x: 0, y: y, width: W, height: rowH }, g);
      hover(hit, function () { g.classList.add("hov"); s.parentNode.classList.add("dim"); }, function () { g.classList.remove("hov"); s.parentNode.classList.remove("dim"); });
      y += rowH;
    });
  };

  R.vbar = function (host, d) {
    var W = host.clientWidth; if (!W) return;
    var H = d.height || 260, top = 26, bottom = 30, fs = 13;
    var n = d.cats.length, slot = W / n, bw = Math.min(56, slot * 0.56);
    var max = d.max || Math.max.apply(null, d.vals) * 1.08;
    var s = svgRoot(host, W, H, d.title), ph = H - top - bottom;
    el("line", { class: "axis", x1: 0, x2: W, y1: top + ph + 0.5, y2: top + ph + 0.5 }, s);
    d.vals.forEach(function (v, i) {
      var x = i * slot + (slot - bw) / 2, bh = Math.max(2, ph * v / max), y = top + ph - bh;
      var g = el("g", {}, s);
      var col = d.colors ? tc(d.colors[Math.min(i, d.colors.length - 1)]) : (i === n - 1 ? C.cian : C.o4[0]);
      el("path", { class: "mark", d: barPath(x, y, bw, bh, 4, "t"), fill: col }, g);
      if (d.labels[i]) el("text", { class: "val", x: x + bw / 2, y: y - 8, "text-anchor": "middle", "font-size": fs + 1 }, g, d.labels[i]);
      el("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle", "font-size": fs, "font-weight": 500 }, g, d.cats[i]);
      var hit = el("rect", { class: "hit", x: i * slot, y: top - 20, width: slot, height: ph + 20 }, g);
      hover(hit, function () { g.classList.add("hov"); host.classList.add("dim"); }, function () { g.classList.remove("hov"); host.classList.remove("dim"); });
    });
  };

  R.grouped = function (host, d) {
    var W = host.clientWidth; if (!W) return;
    var narrow = W < 620, top = 26, fs = 12.5, ang = 40 * Math.PI / 180;
    var ng = d.groups.length, ns = d.series.length;
    // на узком экране подписи групп наклонены; слева оставляем поле под первую подпись
    var lw = narrow ? Math.max.apply(null, d.groups.map(function (g) { return tw(g, 11.5, 500); })) : 0;
    var x0p = narrow ? Math.max(0, tw(d.groups[0], 11.5, 500) * Math.cos(ang) - W / ng / 2 + 6) : 0;
    var bottom = narrow ? Math.ceil(lw * Math.sin(ang)) + 22 : 30, H = 270 + bottom;
    var slot = (W - x0p) / ng;
    var inner = slot * 0.84, bw = Math.min(14, (inner - (ns - 1) * 2) / ns), gw = bw * ns + (ns - 1) * 2;
    var max = d.max;
    var s = svgRoot(host, W, H, d.title), ph = H - top - bottom;
    [0.25, 0.5, 0.75, 1].forEach(function (f) { el("line", { class: "grid", x1: 0, x2: W, y1: top + ph * (1 - f) + 0.5, y2: top + ph * (1 - f) + 0.5 }, s); });
    el("line", { class: "axis", x1: 0, x2: W, y1: top + ph + 0.5, y2: top + ph + 0.5 }, s);
    d.groups.forEach(function (gName, gi) {
      var x0 = x0p + gi * slot + (slot - gw) / 2, g = el("g", {}, s);
      d.vals[gi].forEach(function (v, si) {
        if (v === null) return;
        var x = x0 + si * (bw + 2), bh = Math.max(v === 0 ? 0 : 2, ph * v / max), y = top + ph - bh;
        var b = el("g", {}, g);
        if (bh > 0) el("path", { class: "mark", d: barPath(x, y, bw, bh, 3, "t"), fill: C.o5[si] }, b);
        else el("rect", { class: "mark", x: x, y: top + ph - 1.5, width: bw, height: 1.5, fill: C.o5[si] }, b);
        if (si === ns - 1) el("text", { class: "val", x: x + bw / 2, y: y - 7, "text-anchor": "middle", "font-size": fs }, b, d.text[gi][si]);
        var hit = el("rect", { class: "hit", x: x - 1, y: top - 16, width: bw + 2, height: ph + 16 }, b);
        hover(hit, function () { b.classList.add("hov"); host.classList.add("dim"); }, function () { b.classList.remove("hov"); host.classList.remove("dim"); });
      });
      var lx = x0p + gi * slot + slot / 2, ly = top + ph + 14;
      if (narrow) {
        el("text", { x: lx, y: ly, "text-anchor": "end", "font-size": 11.5, "font-weight": 500, transform: "rotate(-40 " + lx + " " + ly + ")" }, g, gName);
      } else el("text", { x: lx, y: H - 8, "text-anchor": "middle", "font-size": fs, "font-weight": 500 }, g, gName);
    });
  };

  R.combo = function (host, d) {
    // два окна с общей осью лет: столбцы мировых публикаций и линия доли (без второй оси)
    var W = host.clientWidth; if (!W) return;
    var H1 = 230, H2 = 120, gap = 18, fs = 13, top = 26;
    var H = H1 + gap + H2 + 26, n = d.years.length, slot = W / n, bw = Math.min(64, slot * 0.58);
    var s = svgRoot(host, W, H, d.title);
    var max = Math.max.apply(null, d.world) * 1.12, ph = H1 - top;
    el("line", { class: "axis", x1: 0, x2: W, y1: H1 + 0.5, y2: H1 + 0.5 }, s);
    d.years.forEach(function (yr, i) {
      var x = i * slot + (slot - bw) / 2, bh = ph * d.world[i] / max, y = H1 - bh, g = el("g", {}, s);
      el("path", { class: "mark", d: barPath(x, y, bw, bh, 4, "t"), fill: i === n - 1 ? C.cian : C.o5[i] }, g);
      el("text", { class: "val", x: x + bw / 2, y: y - 8, "text-anchor": "middle", "font-size": fs }, g, d.worldT[i]);
      var chipW = tw(d.ru[i], 12, 600) + 14;
      el("rect", { x: x + bw / 2 - chipW / 2, y: H1 - 30, width: chipW, height: 20, rx: 6, fill: C.bg, stroke: C.cian, "stroke-width": 1 }, g);
      el("text", { x: x + bw / 2, y: H1 - 16, "text-anchor": "middle", "font-size": 12, "font-weight": 600, fill: C.ink }, g, d.ru[i]);
      var hit = el("rect", { class: "hit", x: i * slot, y: 0, width: slot, height: H1 }, g);
      hover(hit, function () { g.classList.add("hov"); host.classList.add("dim"); }, function () { g.classList.remove("hov"); host.classList.remove("dim"); });
    });
    // окно доли
    var y0 = H1 + gap, lo = 0.3, hi = 0.56, lh = H2 - 24;
    el("text", { x: 0, y: y0 + 10, "font-size": 12, "font-weight": 600, fill: C.muted }, s, d.legend[2]);
    var pts = d.share.map(function (v, i) { return [i * slot + slot / 2, y0 + 20 + lh * (1 - (v - lo) / (hi - lo))]; });
    el("path", { d: "M" + pts.map(function (p) { return p.join(","); }).join("L"), fill: "none", stroke: C.cian, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, s);
    pts.forEach(function (p, i) {
      var g = el("g", {}, s);
      el("circle", { class: "mark", cx: p[0], cy: p[1], r: 5, fill: C.cian, stroke: C.bg, "stroke-width": 2 }, g);
      el("text", { class: "val", x: p[0], y: p[1] - 10, "text-anchor": "middle", "font-size": 12.5 }, g, d.shareT[i]);
      var hit = el("rect", { class: "hit", x: p[0] - slot / 2, y: y0, width: slot, height: H2 }, g);
      hover(hit, function () { g.classList.add("hov"); }, function () { g.classList.remove("hov"); });
    });
    d.years.forEach(function (yr, i) { el("text", { x: i * slot + slot / 2, y: H - 4, "text-anchor": "middle", "font-size": fs, "font-weight": 500 }, s, yr); });
  };

  R.lines = function (host, d) {
    // малые графики: отдельная панель на страну
    if (host.dataset.done === String(host.clientWidth)) return;
    host.dataset.done = String(host.clientWidth);
    host.textContent = "";
    var grid = h("div", "grid-4", host);
    d.series.forEach(function (sr) {
      var card = h("div", "card", grid); card.style.padding = "14px 14px 8px";
      var head = h("div", null, card); head.style.cssText = "display:flex;justify-content:space-between;align-items:baseline;gap:8px";
      h("b", null, head, sr.name).style.fontSize = "14.5px";
      var last = h("b", null, head, sr.t[sr.t.length - 1]); last.style.cssText = "font-size:24px;color:" + C.cian;
      var plot = h("div", "plot", card);
      var W = Math.max(160, plot.clientWidth || 220), H = 118, top = 22, bot = 22;
      var max = d.max, n = sr.v.length, stepX = (W - 24) / (n - 1);
      var s = svgRoot(plot, W, H, sr.name);
      var pts = sr.v.map(function (v, i) { return [12 + i * stepX, top + (H - top - bot) * (1 - v / max)]; });
      el("path", { d: "M" + pts[0][0] + "," + (H - bot) + "L" + pts.map(function (p) { return p.join(","); }).join("L") + "L" + pts[n - 1][0] + "," + (H - bot) + "Z", fill: C.cian, opacity: 0.08 }, s);
      el("path", { d: "M" + pts.map(function (p) { return p.join(","); }).join("L"), fill: "none", stroke: C.cian, "stroke-width": 2, "stroke-linejoin": "round" }, s);
      pts.forEach(function (p, i) {
        var g = el("g", {}, s);
        el("circle", { class: "mark", cx: p[0], cy: p[1], r: i === n - 1 ? 5 : 4, fill: i === n - 1 ? C.cian : C.bg, stroke: C.cian, "stroke-width": 2 }, g);
        if (i < n - 1) el("text", { x: p[0], y: p[1] - 8, "text-anchor": "middle", "font-size": 11.5, "font-weight": 600, fill: C.ink2 }, g, sr.t[i]);
        el("text", { x: p[0], y: H - 4, "text-anchor": "middle", "font-size": 11, fill: C.muted }, g, d.years[i]);
        var hit = el("rect", { class: "hit", x: p[0] - stepX / 2, y: 0, width: stepX, height: H }, g);
        hover(hit, function () { g.classList.add("hov"); }, function () { g.classList.remove("hov"); });
      });
    });
  };

  R.donut = function (host, d) {
    var W = 200, r = 92, ir = 64, cx = 100, cy = 100;
    var s = svgRoot(host, W, W, d.title);
    var total = d.slices.reduce(function (a, b) { return a + b.v; }, 0), a0 = -Math.PI / 2;
    var legend = host.parentNode.querySelector(".dleg");
    d.slices.forEach(function (sl, i) {
      if (!sl.v) return;
      var a1 = a0 + 2 * Math.PI * sl.v / total, gapA = d.slices.filter(function (x) { return x.v; }).length > 1 ? 0.012 : 0;
      var s0 = a0 + gapA, s1 = a1 - gapA, big = s1 - s0 > Math.PI ? 1 : 0;
      var p = "M" + (cx + r * Math.cos(s0)) + "," + (cy + r * Math.sin(s0)) + "A" + r + "," + r + " 0 " + big + " 1 " + (cx + r * Math.cos(s1)) + "," + (cy + r * Math.sin(s1)) +
        "L" + (cx + ir * Math.cos(s1)) + "," + (cy + ir * Math.sin(s1)) + "A" + ir + "," + ir + " 0 " + big + " 0 " + (cx + ir * Math.cos(s0)) + "," + (cy + ir * Math.sin(s0)) + "Z";
      if (sl.v === total) p = "M" + (cx + r) + "," + cy + "A" + r + "," + r + " 0 1 1 " + (cx - r) + "," + cy + "A" + r + "," + r + " 0 1 1 " + (cx + r) + "," + cy +
        "M" + (cx + ir) + "," + cy + "A" + ir + "," + ir + " 0 1 0 " + (cx - ir) + "," + cy + "A" + ir + "," + ir + " 0 1 0 " + (cx + ir) + "," + cy + "Z";
      var seg = el("path", { class: "mark", d: p, fill: tc(sl.c), "fill-rule": "evenodd" }, s);
      var li = legend && legend.querySelector('[data-i="' + i + '"]');
      hover(seg, function () { if (li) li.classList.add("hov"); host.classList.add("dim"); seg.classList.add("hov"); },
        function () { if (li) li.classList.remove("hov"); host.classList.remove("dim"); seg.classList.remove("hov"); });
      if (li) {
        li.addEventListener("pointerenter", function () { host.classList.add("dim"); seg.classList.add("hov"); });
        li.addEventListener("pointerleave", function () { host.classList.remove("dim"); seg.classList.remove("hov"); });
      }
      a0 = a1;
    });
    el("text", { x: cx, y: cy - 6, "text-anchor": "middle", "font-size": 26, "font-weight": 600, fill: C.ink }, s, d.center[0]);
    el("text", { x: cx, y: cy + 14, "text-anchor": "middle", "font-size": 12, fill: C.ink2 }, s, d.center[1]);
    el("text", { x: cx, y: cy + 30, "text-anchor": "middle", "font-size": 11.5, fill: C.muted }, s, d.center[2]);
  };

  R.ranges = function (host, d) {
    var W = host.clientWidth; if (!W) return;
    var narrow = W < 600, labW = narrow ? 118 : 210, rowH = narrow ? 52 : 46, top = 26, fs = 13.5;
    var x0 = labW, x1 = W - 12, lo = d.domain[0], hi = d.domain[1];
    function X(v) { return x0 + (x1 - x0) * (v - lo) / (hi - lo); }
    var H = top + d.rows.length * rowH + 8, s = svgRoot(host, W, H, d.title);
    for (var t = lo; t <= hi; t += 10) {
      el("line", { class: "grid", x1: X(t), x2: X(t), y1: top - 4, y2: H - 4 }, s);
      el("text", { x: X(t), y: 12, "text-anchor": "middle", "font-size": 11.5, fill: C.muted }, s, String(t));
    }
    d.rows.forEach(function (r, i) {
      var y = top + i * rowH, g = el("g", {}, s), cy = y + rowH / 2 + (narrow ? 6 : 0);
      el("text", { x: 0, y: y + (narrow ? 16 : rowH / 2 - 2), "font-size": fs, "font-weight": 600, fill: C.ink }, g, (r.p ? r.p + ". " : "") + r.l);
      el("text", { x: 0, y: y + (narrow ? 32 : rowH / 2 + 15), "font-size": 12, fill: C.muted }, g, r.n);
      el("rect", { x: x0, y: cy - 7, width: x1 - x0, height: 14, rx: 7, fill: C.track }, g);
      el("rect", { class: "mark", x: X(r.min), y: cy - 7, width: X(r.max) - X(r.min), height: 14, rx: 7, fill: C.o4[0] }, g);
      el("rect", { class: "mark", x: X(r.mean) - 2, y: cy - 11, width: 4, height: 22, rx: 2, fill: C.ink }, g);
      if (!narrow) {
        el("text", { x: X(r.min) - 6, y: cy + 4.5, "text-anchor": "end", "font-size": 12, fill: C.muted }, g, r.minT);
        el("text", { x: X(r.max) + 6, y: cy + 4.5, "font-size": 12, fill: C.muted }, g, r.maxT);
      }
      el("text", { class: "val", x: X(r.mean), y: cy - 15, "text-anchor": "middle", "font-size": 12.5 }, g, r.meanT);
      var hit = el("rect", { class: "hit", x: 0, y: y, width: W, height: rowH }, g);
      hover(hit, function () { g.classList.add("hov"); host.classList.add("dim"); }, function () { g.classList.remove("hov"); host.classList.remove("dim"); });
    });
    var ax = X(d.avg);
    el("line", { x1: ax, x2: ax, y1: top - 6, y2: H - 4, stroke: C.peach, "stroke-width": 1.5, "stroke-dasharray": "4 4" }, s);
    var at = el("text", { x: ax + 6, y: H - 8, "font-size": 12, "font-weight": 600, fill: C.ink }, s, d.avgT);
  };

  R.hist = function (host, d) {
    var W = host.clientWidth; if (!W) return;
    var narrowH = W / d.bins.length < 52, padL = narrowH ? 22 : 0;
    var H = 250, top = 26, bottom = 46, n = d.bins.length, slot = (W - padL) / n, bw = Math.min(56, slot * 0.7), fs = 12.5;
    var max = Math.max.apply(null, d.counts) * 1.1, ph = H - top - bottom;
    var s = svgRoot(host, W, H, d.title);
    el("line", { class: "axis", x1: 0, x2: W, y1: top + ph + 0.5, y2: top + ph + 0.5 }, s);
    d.bins.forEach(function (b, i) {
      var x = padL + i * slot + (slot - bw) / 2, v = d.counts[i], bh = v ? Math.max(2, ph * v / max) : 0, y = top + ph - bh, g = el("g", {}, s);
      if (bh) el("path", { class: "mark", d: barPath(x, y, bw, bh, 4, "t"), fill: C.cian }, g);
      if (d.labels[i]) el("text", { class: "val", x: x + bw / 2, y: y - 7, "text-anchor": "middle", "font-size": 13 }, g, d.labels[i]);
      if (slot >= 52) {
        el("text", { x: x + bw / 2, y: H - 24, "text-anchor": "middle", "font-size": fs, "font-weight": 500 }, g, b);
        el("text", { x: x + bw / 2, y: H - 6, "text-anchor": "middle", "font-size": 12, fill: C.muted }, g, d.pcts[i]);
      } else {
        // узкий экран: подпись интервала наклонена, доля — в таблице данных под графиком
        var lx = x + bw / 2, ly = top + ph + 12;
        el("text", { x: lx, y: ly, "text-anchor": "end", "font-size": 10.5, "font-weight": 500, transform: "rotate(-55 " + lx + " " + ly + ")" }, g, b);
      }
      var hit = el("rect", { class: "hit", x: padL + i * slot, y: 0, width: slot, height: H }, g);
      hover(hit, function () { g.classList.add("hov"); host.classList.add("dim"); }, function () { g.classList.remove("hov"); host.classList.remove("dim"); });
    });
  };

  function render(fig) {
    var id = fig.getAttribute("data-id"), kind = fig.getAttribute("data-chart"), host = fig.querySelector(".plot");
    var d = D.charts[id];
    if (!d || !R[kind] || !host) return;
    if (!host.clientWidth) return;
    if (host.dataset.w === String(host.clientWidth) && kind !== "lines") return;
    host.dataset.w = String(host.clientWidth);
    try { R[kind](host, d); } catch (e) { if (window.console) console.error("график", id, e); }
  }
  var figs = [].slice.call(document.querySelectorAll("[data-chart]"));
  function renderAll() { figs.forEach(render); }
  var ro = window.ResizeObserver ? new ResizeObserver(function (es) { es.forEach(function (e) { var f = e.target.closest("[data-chart]"); if (f) render(f); }); }) : null;
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
    renderAll();
    if (ro) figs.forEach(function (f) { var p = f.querySelector(".plot"); if (p) ro.observe(p); });
  });
  window.addEventListener("resize", function () { clearTimeout(renderAll._t); renderAll._t = setTimeout(renderAll, 120); });
  document.querySelectorAll("details").forEach(function (dt) { dt.addEventListener("toggle", function () { if (dt.open) setTimeout(renderAll, 0); }); });
  function retheme() {
    readTokens();
    figs.forEach(function (f) { var p = f.querySelector(".plot"); if (p) { delete p.dataset.w; delete p.dataset.done; } });
    renderAll();
  }
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  if (mq.addEventListener) mq.addEventListener("change", retheme);
  if (window.MutationObserver) new MutationObserver(retheme).observe(root, { attributes: true, attributeFilter: ["data-theme"] });

  // «Таблица данных» под графиком
  document.querySelectorAll(".data-toggle").forEach(function (b) {
    b.addEventListener("click", function () {
      var v = document.getElementById(b.getAttribute("aria-controls"));
      var on = !v.classList.contains("on"); v.classList.toggle("on", on); b.setAttribute("aria-expanded", on ? "true" : "false");
    });
  });

  /* ───────── навигация ───────── */
  var header = document.querySelector(".site-header");
  var sections = [].slice.call(document.querySelectorAll("main > .section"));
  var links = {};
  document.querySelectorAll(".nav a").forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
  var bar = document.querySelector(".progress");
  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
    var probe = window.innerHeight * 0.33, cur = sections[0];
    sections.forEach(function (s) { if (s.getBoundingClientRect().top <= probe) cur = s; });
    for (var k in links) links[k].setAttribute("aria-current", cur && k === cur.id ? "true" : "false");
  }
  var ticking = false;
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(function () { onScroll(); ticking = false; }); } }, { passive: true });
  onScroll();

  var toggle = document.querySelector(".menu-toggle");
  if (toggle) toggle.addEventListener("click", function () {
    var open = !header.classList.contains("open");
    header.classList.toggle("open", open); toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  });
  document.querySelectorAll(".nav a").forEach(function (a) {
    a.addEventListener("click", function () { if (header.classList.contains("open")) { header.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; } });
  });

  function go(delta) {
    var probe = window.innerHeight * 0.33, idx = 0;
    sections.forEach(function (s, i) { if (s.getBoundingClientRect().top <= probe) idx = i; });
    var t = sections[Math.max(0, Math.min(sections.length - 1, idx + delta))];
    if (t) t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }
  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    var t = e.target, tag = t && t.tagName;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag) || (t && t.isContentEditable) || document.querySelector("dialog[open]")) return;
    if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); go(1); }
    else if (e.key === "ArrowUp" || e.key === "PageUp") { e.preventDefault(); go(-1); }
    else if (e.key === "Home") { e.preventDefault(); sections[0].scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }
    else if (e.key === "End") { e.preventDefault(); sections[sections.length - 1].scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); }
  });

  /* ───────── плавное появление ───────── */
  // блоки видны всегда; те, что ниже первого экрана, коротко «поднимаются», когда к ним подходит прокрутка
  var rv = [].slice.call(document.querySelectorAll(".reveal"));
  if (!reduce && "IntersectionObserver" in window) {
    var first = true;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { if (!first) e.target.classList.add("in-view"); io.unobserve(e.target); } });
      first = false;
    }, { rootMargin: "0px 0px 10% 0px" });
    rv.forEach(function (n) { io.observe(n); });
  }

  /* ───────── вкладки ───────── */
  document.querySelectorAll('[role="tablist"]').forEach(function (tl) {
    var tabs = [].slice.call(tl.querySelectorAll('[role="tab"]'));
    function sel(tab) {
      tabs.forEach(function (t) {
        var on = t === tab; t.setAttribute("aria-selected", on ? "true" : "false"); t.tabIndex = on ? 0 : -1;
        var p = document.getElementById(t.getAttribute("aria-controls")); if (p) p.hidden = !on;
      });
      setTimeout(renderAll, 0);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { sel(t); });
      t.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); var n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); sel(n); }
      });
    });
  });

  /* ───────── сортируемые таблицы ───────── */
  function sortable(table) {
    var ths = [].slice.call(table.querySelectorAll("th[aria-sort]"));
    ths.forEach(function (th) {
      th.tabIndex = 0;
      function act() {
        var dir = th.getAttribute("aria-sort") === "descending" ? "ascending" : "descending";
        if (th.getAttribute("aria-sort") === "none" && th.dataset.first) dir = th.dataset.first;
        ths.forEach(function (o) { o.setAttribute("aria-sort", "none"); });
        th.setAttribute("aria-sort", dir);
        var key = th.dataset.key, tb = table.tBodies[0], rows = [].slice.call(tb.rows);
        rows.sort(function (a, b) {
          var x = a.dataset[key], y = b.dataset[key], nx = parseFloat(x), ny = parseFloat(y), r;
          if (!isNaN(nx) && !isNaN(ny)) r = nx - ny; else r = String(x).localeCompare(String(y), "ru");
          return dir === "ascending" ? r : -r;
        });
        rows.forEach(function (r) { tb.appendChild(r); });
      }
      th.addEventListener("click", act);
      th.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); act(); } });
    });
  }
  document.querySelectorAll("table.sortable").forEach(sortable);

  // поиск по таблице приложения 1
  document.querySelectorAll("[data-filter-table]").forEach(function (inp) {
    var t = document.getElementById(inp.getAttribute("data-filter-table"));
    var only = document.querySelector('[data-only-table="' + t.id + '"]');
    function apply() {
      var q = inp.value.trim().toLowerCase(), o = only && only.checked;
      [].slice.call(t.tBodies[0].rows).forEach(function (r) {
        var ok = (!q || r.dataset.q.indexOf(q) >= 0) && (!o || parseFloat(r.dataset.n) > 0);
        r.hidden = !ok;
      });
    }
    inp.addEventListener("input", apply); if (only) only.addEventListener("change", apply);
  });

  /* ───────── работы ───────── */
  var W = {};
  (D.works || []).forEach(function (w) { W[w.n] = w; });
  var wt = document.getElementById("works-table");
  var dlg = document.getElementById("work-dialog");
  if (wt) {
    var fq = document.getElementById("wf-q"), fsel = [].slice.call(document.querySelectorAll("[data-wf]"));
    var cnt = document.getElementById("works-count"), total = wt.tBodies[0].rows.length;
    function applyW() {
      var q = (fq.value || "").trim().toLowerCase(), shown = 0;
      [].slice.call(wt.tBodies[0].rows).forEach(function (r) {
        var ok = !q || r.dataset.q.indexOf(q) >= 0;
        fsel.forEach(function (s) {
          var v = s.value; if (!v) return;
          var have = (r.dataset[s.dataset.wf] || "").split("|");
          if (have.indexOf(v) < 0) ok = false;
        });
        r.hidden = !ok; if (ok) shown++;
      });
      cnt.textContent = "Показано " + shown + " из " + total;
    }
    fq.addEventListener("input", applyW);
    fsel.forEach(function (s) { s.addEventListener("change", applyW); });
    document.getElementById("wf-reset").addEventListener("click", function () { fq.value = ""; fsel.forEach(function (s) { s.value = ""; }); applyW(); });
    window.__worksFilter = function (field, value) {
      fq.value = ""; fsel.forEach(function (s) { s.value = s.dataset.wf === field ? value : ""; }); applyW();
      document.getElementById("works").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    };
    [].slice.call(wt.tBodies[0].rows).forEach(function (r) {
      r.tabIndex = 0;
      r.addEventListener("click", function (e) { if (e.target.closest("a")) return; openWork(+r.dataset.n); });
      r.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openWork(+r.dataset.n); } });
    });
    applyW();
  }

  var ICON = D.icons || {};
  function iconNode(name) { var s = document.createElement("span"); s.className = "wc-emo"; s.setAttribute("aria-hidden", "true"); s.textContent = ICON[name] || ""; return s; }
  function meter(parent, label, valueT, max, value, note) {
    var m = h("div", "meter", parent), top = h("div", "top", m);
    h("span", null, top, label);
    var b = h("b", null, top, valueT); h("small", null, b, " из " + max);
    var trk = h("div", "trk", m), i = h("i", null, trk); i.style.width = Math.max(0, Math.min(100, 100 * value / max)) + "%";
    if (note) h("div", "cmp", m, note);
  }
  var lastFocus = null;
  function openWork(n) {
    var w = W[n]; if (!w || !dlg) return;
    lastFocus = document.activeElement;
    var box = dlg.querySelector(".wrap"); box.textContent = "";
    var close = h("button", "close", box, "×"); close.setAttribute("aria-label", "Закрыть"); close.addEventListener("click", function () { dlg.close(); });
    var head = h("div", "wc-head", box);
    h("span", "wc-no", head, w.n + " из 163");
    if (w.award) h("span", "wc-award", head, w.award);
    (w.marks || []).forEach(function (m) { if (m.k !== "award") h("span", "chip", head, m.t); });
    h("h3", null, box, w.ru).id = "wc-title";
    if (w.en) h("div", "wc-en", box, w.en);
    var au = h("div", "wc-authors", box); h("small", null, au, D.labels.authors); h("div", null, au, w.authors);
    var grid = h("div", "wc-grid", box), left = h("div", null, grid), right = h("div", "wc-side", grid);
    var dl = h("dl", "wc-fields", left);
    (w.order || []).forEach(function (k) {
      var f = w.f[k]; if (!f) return;
      var row = h("div", "wc-f" + (k === "что_следует" ? " hl" : ""), dl);
      row.appendChild(iconNode(k));
      var wrap = h("div", null, row); h("dt", null, wrap, D.fieldNames[k]); h("dd", null, wrap, f);
    });
    var tags = h("div", "wc-tags", left); (w.tags || []).forEach(function (t) { h("span", "chip grey", tags, t); });
    var sc = h("div", "wc-score", right); h("b", null, sc, w.S); h("small", null, sc, D.labels.score);
    var ms = h("div", "wc-meters", right);
    w.p.forEach(function (p, i) { meter(ms, D.labels.parts[i], p.t, 25, p.v, p.note); });
    var meta = h("div", "wc-meta", right);
    [[D.labels.conf, w.conf], [D.labels.format, w.fmt], [D.labels.track, w.track], [D.labels.counts, w.counts]].forEach(function (r) {
      if (!r[1]) return; var d0 = h("div", null, meta); h("b", null, d0, r[0] + ": "); d0.appendChild(document.createTextNode(r[1]));
    });
    if (w.link) { var a = h("a", "btn primary", right, D.labels.open); a.href = w.link; a.target = "_blank"; a.rel = "noopener noreferrer"; }
    dlg.setAttribute("aria-labelledby", "wc-title");
    if (!dlg.open) dlg.showModal();
    if (location.hash !== "#work-" + n) history.replaceState(null, "", "#work-" + n);
    close.focus();
  }
  window.__openWork = openWork;
  if (dlg) {
    dlg.addEventListener("close", function () {
      if (/^#work-/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='#work-']");
    if (!a) return; e.preventDefault();
    openWork(parseInt(a.getAttribute("href").split("-")[1], 10));
  });
  function fromHash() {
    var m = location.hash.match(/^#work-(\d+)$/);
    if (m) openWork(+m[1]);
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();

  // шахматка → таблица работ
  document.querySelectorAll(".venue[data-conf]").forEach(function (b) {
    b.addEventListener("click", function () { if (window.__worksFilter) window.__worksFilter("conf", b.dataset.conf); });
  });

  /* ───────── печать: раскрыть всё ───────── */
  if (/[?&]print\b/.test(location.search)) {
    document.querySelectorAll("details").forEach(function (d) { d.open = true; });
    document.querySelectorAll(".reveal").forEach(function (n) { n.classList.add("in-view"); });
  }
  var opened = [];
  window.addEventListener("beforeprint", function () {
    opened = [];
    document.querySelectorAll("details:not([open])").forEach(function (d) { d.open = true; opened.push(d); });
    renderAll();
  });
  window.addEventListener("afterprint", function () { opened.forEach(function (d) { d.open = false; }); });
})();
