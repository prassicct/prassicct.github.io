/* Prassi CCT — riquadri dei riferimenti normativi (.rifa[data-k]): testo della norma al passaggio del cursore o al clic. */
(function () {
  'use strict';
  var DATA = null, LOADING = null, pop = null, cur = null, timer = null, HOVER_MS = 1500;
  var css = '.rifa{color:#561622;font-weight:600;text-decoration:underline dotted;text-decoration-thickness:1px;text-underline-offset:3px;cursor:pointer;border-radius:3px}' +
    '.rifa:hover,.rifa:focus-visible,.rifa.on{background:#F3E4E1;outline:0}' +
    '.rifa-pop{position:absolute;z-index:80;width:min(480px,92vw);max-height:420px;display:flex;flex-direction:column;background:#FFFDF9;border:1px solid #E5DBCB;border-top:3px solid #6E1E2B;border-radius:10px;box-shadow:0 16px 40px rgba(42,35,36,.22);font-family:"Instrument Sans",system-ui,sans-serif;font-size:14px;line-height:1.5;color:#2A2324;text-align:left;font-weight:400;font-style:normal;letter-spacing:0;text-transform:none}' +
    '.rifa-pop[hidden]{display:none}' +
    '.rifa-h{padding:14px 18px 8px;border-bottom:1px solid #EFE6D8}' +
    '.rifa-t{display:block;font-weight:700;font-size:14.5px}' +
    '.rifa-r{display:block;font-family:Lora,Georgia,serif;font-style:italic;font-size:14px;color:#4A4042;margin-top:2px}' +
    '.rifa-b{padding:10px 18px;overflow:auto;flex:1}' +
    '.rifa-c{display:flex;gap:8px;padding:5px 6px;margin:0 -6px;border-radius:6px}' +
    '.rifa-c.hl{background:#F3E4E1;box-shadow:inset 3px 0 0 #6E1E2B}' +
    '.rifa-n{flex:none;min-width:28px;font:500 12px "IBM Plex Mono",monospace;color:#6E1E2B;padding-top:2px}' +
    '.rifa-x{white-space:pre-line}' +
    '.rifa-d{white-space:pre-line;margin:0}' +
    '.rifa-f{display:flex;flex-direction:column;gap:6px;padding:10px 18px 12px;border-top:1px solid #EFE6D8;background:#FAF6EF;border-radius:0 0 10px 10px}' +
    '.rifa-s{font-size:11.5px;color:#6A5F59}' +
    '.rifa-a{display:flex;justify-content:space-between;align-items:center;gap:12px}' +
    '.rifa-l{font-weight:600;color:#561622}' +
    '.rifa-x-b{font:inherit;font-size:13px;font-weight:600;background:#F2EADD;color:#2A2324;border:0;border-radius:6px;padding:7px 12px;cursor:pointer}' +
    '@media (max-width:700px){.rifa-pop{position:fixed;left:10px!important;right:10px;top:auto!important;bottom:10px;width:auto;max-height:70vh}}';
  function addCss() { var s = document.createElement('style'); s.textContent = css; document.head.appendChild(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function base(k) {
    var p = k.split(':');
    if (/^(c36|cpc|cc|dl76|dm2016|lg22)$/.test(p[0])) return p.slice(0, 2).join(':');
    if (p[0] === 'a36' || p[0] === 'atto') return p.slice(0, 3).join(':');
    return k;
  }
  function commaOf(k) {
    var p = k.split(':'), c = null;
    if (/^(c36|cpc|cc|dl76|dm2016)$/.test(p[0])) c = p[2]; else if (p[0] === 'a36' || p[0] === 'atto') c = p[3];
    if (!c) return [];
    var m = c.match(/^(\d+)-(\d+)$/);
    if (m) { var out = []; for (var i = +m[1]; i <= +m[2]; i++) out.push(String(i)); return out; }
    return [c];
  }
  function load() {
    if (DATA) return Promise.resolve(DATA);
    if (!LOADING) LOADING = fetch('/assets/testi-norme.json').then(function (r) { return r.json(); }).then(function (j) { DATA = j; return j; }).catch(function () { DATA = {}; return DATA; });
    return LOADING;
  }
  function ensurePop() {
    if (pop) return pop;
    pop = document.createElement('div'); pop.className = 'rifa-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog');
    pop.addEventListener('mouseenter', function () { clearTimeout(timer); });
    pop.addEventListener('click', function (e) { if (e.target.closest('.rifa-x-b')) chiudi(true); });
    document.body.appendChild(pop);
    return pop;
  }
  function html(k, el) {
    var v = (DATA || {})[base(k)];
    if (!v) return '<div class="rifa-h"><span class="rifa-t">' + esc(el.textContent) + '</span></div><div class="rifa-b"><p class="rifa-d">Scheda della fonte non ancora disponibile.</p></div>';
    var hl = commaOf(k), body = '';
    if (v.c) body = v.c.map(function (c) { return '<div class="rifa-c' + (c.n && hl.indexOf(c.n) >= 0 ? ' hl' : '') + '">' + (c.n ? '<span class="rifa-n">' + esc(c.n) + '.</span>' : '') + '<span class="rifa-x">' + esc(c.x) + '</span></div>'; }).join('');
    else body = '<p class="rifa-d">' + esc(v.d || '') + '</p>';
    var sub = hl.length && v.c && v.c.some(function (c) { return hl.indexOf(c.n) >= 0; }) ? ' · comma ' + hl.join('-') + ' evidenziato' : '';
    return '<div class="rifa-h"><span class="rifa-t">' + esc(v.t) + esc(sub) + '</span>' + (v.r ? '<span class="rifa-r">' + esc(v.r) + '</span>' : '') + '</div>' +
      '<div class="rifa-b">' + body + '</div>' +
      '<div class="rifa-f"><span class="rifa-s">' + esc(v.s || '') + '</span><span class="rifa-a">' + (v.u ? '<a class="rifa-l" href="' + esc(v.u) + '" target="_blank" rel="noopener">Apri la fonte ufficiale ↗</a>' : '<span></span>') + '<button type="button" class="rifa-x-b">Chiudi</button></span></div>';
  }
  function place(el) {
    var r = el.getBoundingClientRect(), w = Math.min(480, window.innerWidth * 0.92);
    if (window.innerWidth <= 700) return;
    var left = r.left + window.scrollX; if (left + w > window.scrollX + window.innerWidth - 12) left = window.scrollX + window.innerWidth - 12 - w; if (left < window.scrollX + 12) left = window.scrollX + 12;
    var below = window.innerHeight - r.bottom, h = Math.min(420, pop.offsetHeight || 420);
    var top = below > h + 16 || below > r.top ? r.bottom + window.scrollY + 8 : r.top + window.scrollY - h - 8;
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }
  function apri(el) {
    clearTimeout(timer);
    load().then(function () {
      ensurePop();
      if (cur && cur !== el) cur.classList.remove('on');
      cur = el; el.classList.add('on'); el.setAttribute('aria-expanded', 'true');
      pop.innerHTML = html(el.getAttribute('data-k'), el); pop.hidden = false; place(el);
      var h = pop.querySelector('.rifa-c.hl'); var b = pop.querySelector('.rifa-b');
      if (h && b) b.scrollTop = Math.max(0, h.offsetTop - b.offsetTop - 8);
    });
  }
  function chiudi(focus) {
    clearTimeout(timer);
    if (pop) pop.hidden = true;
    if (cur) { cur.classList.remove('on'); cur.setAttribute('aria-expanded', 'false'); if (focus) cur.focus(); }
    cur = null;
  }
  function prep(root) {
    (root || document).querySelectorAll('.rifa:not([tabindex])').forEach(function (el) { el.setAttribute('tabindex', '0'); el.setAttribute('role', 'button'); el.setAttribute('aria-expanded', 'false'); el.setAttribute('aria-label', el.textContent + ' — apri il testo della norma'); });
  }
  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('.rifa');
    if (el) { e.preventDefault(); if (cur === el && pop && !pop.hidden) chiudi(); else apri(el); return; }
    if (pop && !pop.hidden && !pop.contains(e.target)) chiudi();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pop && !pop.hidden) { chiudi(true); return; }
    var el = e.target.closest && e.target.closest('.rifa');
    if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); apri(el); }
  });
  if (canHover) {
    document.addEventListener('mouseover', function (e) {
      var el = e.target.closest && e.target.closest('.rifa');
      if (!el || el === cur) return;
      clearTimeout(timer); load();
      timer = setTimeout(function () { apri(el); }, HOVER_MS);
    });
    document.addEventListener('mouseout', function (e) {
      var el = e.target.closest && e.target.closest('.rifa');
      if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;
      if (el !== cur) clearTimeout(timer);
    });
  }
  window.addEventListener('resize', function () { if (cur && pop && !pop.hidden) place(cur); });
  /* Segmenta un testo in parti semplici e riferimenti, per i testi generati dagli script delle pagine. */
  var PATS = [
    [/D\.L\. 76\/2020, art\. 6, c(?:omma|\.) ?([\w-]+)/g, function (m) { return 'dl76:6:' + m[1]; }],
    [/All(?:egato|\.) V\.2(?: \(testo orig\.\))?, art\. (\d+)(?:, c(?:omma|\.) ?([\w-]+))?/g, function (m) { return m[0].indexOf('orig') > 0 ? null : 'a36:V.2:' + m[1] + (m[2] ? ':' + m[2] : ''); }],
    [/D\.M\. (?:Giustizia )?17(?:\/6\/| giugno )2016(?:, artt?\. (\d+))?/g, function (m) { return 'dm2016' + (m[1] ? ':' + m[1] : ''); }],
    [/(?:LG|Linee guida,? punto|Linee guida) (\d+(?:\.\d+){0,2})/g, function (m) { return 'lg22:' + m[1]; }],
    [/\bd\.lgs\.? (?:n\. )?209\/2024/gi, function () { return 'atto:dlgs209-2024'; }],
    [/\bd\.lgs\.? (?:n\. )?36\/2023/gi, function () { return 'atto:dlgs36-2023'; }],
    [/\bd\.l\.? (?:n\. )?76\/2020/gi, function () { return 'dl76'; }],
    [/\bartt?\. (\d+(?:-[a-z]+)?) c\.p\.c\./g, function (m) { return 'cpc:' + m[1]; }],
    [/\bart\. (\d+), comma (\d+(?:-[a-z]+)?),? All(?:egato|\.) V\.2/g, function (m) { return 'a36:V.2:' + m[1] + ':' + m[2]; }],
    [/\b(?:d\.m\.|D\.M\.) (?:MIMS )?(?:17 gennaio 2022,? n\. 12|n\. 12\/2022|12\/2022)/g, function () { return 'lg22'; }],
    [/\bart\. (\d+)[^;]{0,30}?TUIR/g, function (m) { return 'atto:dpr917-1986:' + m[1]; }]
  ];
  function segs(text) {
    text = String(text || '');
    var hits = [];
    PATS.forEach(function (p) { var re = new RegExp(p[0].source, p[0].flags), m; while ((m = re.exec(text))) { var k = p[1](m); if (k) hits.push({ a: m.index, b: m.index + m[0].length, k: k }); } });
    hits.sort(function (x, y) { return x.a - y.a || (y.b - y.a) - (x.b - x.a); });
    var out = [], pos = 0;
    hits.forEach(function (h) { if (h.a < pos) return; if (h.a > pos) out.push({ t: text.slice(pos, h.a), r: false, n: true, k: '' }); out.push({ t: text.slice(h.a, h.b), r: true, n: false, k: h.k }); pos = h.b; });
    if (pos < text.length) out.push({ t: text.slice(pos), r: false, n: true, k: '' });
    return out;
  }
  window.RIFA = { segs: segs, prep: prep };
  function init() { addCss(); prep(); if (window.MutationObserver) new MutationObserver(function () { prep(); }).observe(document.body, { childList: true, subtree: true }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
