/* Prassi CCT — micro-runtime per i template delle pagine (nessuna dipendenza esterna). */
(function () {
  'use strict';

  function DCLogic() { this.props = {}; this.state = {}; }
  DCLogic.prototype.setState = function (partial) {
    var next = typeof partial === 'function' ? partial(this.state) : partial;
    this.state = Object.assign({}, this.state, next);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__schedule) this.__schedule(); };
  window.DCLogic = DCLogic;

  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  var WHOLE = /^\{\{\s*([^}]+?)\s*\}\}$/;

  function lookup(scope, path) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    var parts = path.split('.');
    var v = scope[parts[0]];
    for (var i = 1; i < parts.length && v != null; i++) v = v[parts[i]];
    return v;
  }
  function interp(str, scope) {
    return str.replace(HOLE, function (_, p) { var v = lookup(scope, p); return v == null ? '' : String(v); });
  }

  /* Compila il template in descrittori riutilizzabili. */
  function compile(node) {
    if (node.nodeType === 3) return { t: 'text', v: node.nodeValue };
    if (node.nodeType !== 1) return null;
    var tag = node.tagName.toLowerCase();
    if (node.hasAttribute && node.hasAttribute('data-for-list')) {
      /* Ciclo su <tr> o <option>: forma sicura dentro tabelle e select, dove il parser HTML sposta gli elementi sconosciuti. */
      var fl = node.getAttribute('data-for-list'), fa = node.getAttribute('data-for-as') || 'item';
      var cl = node.cloneNode(true); cl.removeAttribute('data-for-list'); cl.removeAttribute('data-for-as');
      return { t: 'sc-for', a: [{ n: 'list', v: fl }, { n: 'as', v: fa }], c: [compile(cl)] };
    }
    var attrs = [];
    for (var i = 0; i < node.attributes.length; i++) {
      var a = node.attributes[i];
      if (a.name.indexOf('hint-') === 0) continue;
      attrs.push({ n: a.name, v: a.value });
    }
    var kids = [];
    var src = tag === 'template' ? node.content.childNodes : node.childNodes;
    for (var j = 0; j < src.length; j++) { var c = compile(src[j]); if (c) kids.push(c); }
    return { t: tag, a: attrs, c: kids };
  }

  var EVENT_NAMES = {}; // camelCase originale per attributo minuscolo
  function render(desc, scope, out) {
    if (desc.t === 'text') { out.push(interp(desc.v, scope)); return; }
    if (desc.t === 'sc-for') {
      var listAttr = attr(desc, 'list'), as = attr(desc, 'as') || 'item';
      var list = resolve(listAttr, scope) || [];
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope); s[as] = list[i]; s.$index = i;
        renderKids(desc.c, s, out);
      }
      return;
    }
    if (desc.t === 'sc-if') {
      if (resolve(attr(desc, 'value'), scope)) renderKids(desc.c, scope, out);
      return;
    }
    var v = { tag: desc.t, attrs: {}, props: {}, ev: {}, kids: [] };
    for (var k = 0; k < desc.a.length; k++) {
      var a = desc.a[k], name = a.n, raw = a.v, m = raw.match(WHOLE);
      var val = m ? lookup(scope, m[1]) : interp(raw, scope);
      if (/^on[a-z]+$/.test(name)) { if (typeof val === 'function') v.ev[eventType(name, desc)] = val; continue; }
      if (name === 'value' || name === 'checked') { v.props[name] = val; continue; }
      if (val === false || val == null) continue;
      if (val === true) val = name.indexOf('aria-') === 0 ? 'true' : '';
      v.attrs[name] = String(val);
    }
    renderKids(desc.c, scope, v.kids);
    out.push(v);
  }
  function renderKids(kids, scope, out) { for (var i = 0; i < kids.length; i++) render(kids[i], scope, out); }
  function attr(desc, n) { for (var i = 0; i < desc.a.length; i++) if (desc.a[i].n === n) return desc.a[i].v; return null; }
  function resolve(raw, scope) { if (raw == null) return undefined; var m = raw.match(WHOLE); return m ? lookup(scope, m[1]) : raw; }
  function eventType(name, desc) {
    var t = name.slice(2);
    if (t === 'change') {
      var type = (attr(desc, 'type') || '').toLowerCase();
      if (desc.t === 'textarea' || (desc.t === 'input' && ['checkbox', 'radio', 'date'].indexOf(type) === -1)) return 'input';
      return 'change';
    }
    if (t === 'mouseenter' || t === 'mouseleave') return t;
    return t;
  }

  var SVG_TAGS = { svg: 1, path: 1, rect: 1, circle: 1, line: 1, polyline: 1, polygon: 1, g: 1, ellipse: 1 };
  /* Crea e aggiorna il DOM. */
  function create(v) {
    if (typeof v === 'string') return document.createTextNode(v);
    var el = SVG_TAGS[v.tag] ? document.createElementNS('http://www.w3.org/2000/svg', v.tag) : document.createElement(v.tag);
    el.__h = {};
    update(el, null, v);
    return el;
  }
  function update(el, old, v) {
    var oa = old ? old.attrs : {}, k;
    for (k in oa) if (!(k in v.attrs)) el.removeAttribute(k);
    for (k in v.attrs) if (oa[k] !== v.attrs[k]) el.setAttribute(k, v.attrs[k]);
    var oe = old ? old.ev : {};
    for (k in oe) if (!(k in v.ev)) { el.removeEventListener(k, listener); delete el.__h[k]; }
    for (k in v.ev) { if (!el.__h[k]) el.addEventListener(k, listener); el.__h[k] = v.ev[k]; }
    patchKids(el, old ? old.kids : [], v.kids);
    if ('checked' in v.props) el.checked = !!v.props.checked;
    if ('value' in v.props) { var nv = v.props.value == null ? '' : String(v.props.value); if (el.value !== nv) el.value = nv; }
  }
  function listener(e) { var h = this.__h && this.__h[e.type]; if (h) h(e); }
  function patchKids(parent, oldKids, newKids) {
    var nodes = parent.childNodes, i;
    for (i = 0; i < newKids.length; i++) {
      var nv = newKids[i], ov = oldKids[i], node = nodes[i];
      if (ov === undefined || !node) { parent.appendChild(create(nv)); continue; }
      if (typeof nv === 'string' && typeof ov === 'string') { if (nv !== ov) node.nodeValue = nv; continue; }
      if (typeof nv !== 'string' && typeof ov !== 'string' && nv.tag === ov.tag) { update(node, ov, nv); continue; }
      parent.replaceChild(create(nv), node);
    }
    while (parent.childNodes.length > newKids.length) parent.removeChild(parent.lastChild);
  }


  /* Riquadri delle fonti: si aprono dopo 1,5 secondi di cursore fermo sul riferimento, oppure con un clic. */
  var HOVER_MS = 1500;
  function placePop(rif) {
    var pop = rif.querySelector('.pop');
    if (!pop || window.innerWidth <= 700) return;
    var r = rif.getBoundingClientRect();
    var w = Math.min(460, window.innerWidth * 0.86);
    pop.style.left = ''; pop.style.right = '';
    if (r.left + w > window.innerWidth - 16) {
      var shift = Math.max(16, window.innerWidth - 16 - w) - r.left;
      pop.style.left = shift + 'px';
    }
  }
  var canHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  if (canHover) {
    document.addEventListener('mouseover', function (e) {
      var rif = e.target.closest && e.target.closest('.rif');
      if (!rif || rif.__t || rif.classList.contains('hov')) return;
      rif.__t = setTimeout(function () { rif.__t = null; placePop(rif); rif.classList.add('hov'); }, HOVER_MS);
    });
    document.addEventListener('mouseout', function (e) {
      var rif = e.target.closest && e.target.closest('.rif');
      if (!rif || (e.relatedTarget && rif.contains(e.relatedTarget))) return;
      if (rif.__t) { clearTimeout(rif.__t); rif.__t = null; }
      rif.classList.remove('hov');
    });
  }
  document.addEventListener('click', function (e) {
    var rif = e.target.closest && e.target.closest('.rif');
    if (!rif) return;
    placePop(rif);
    if (e.target.closest('.rif-b') || e.target.closest('.pop-c')) {
      if (rif.__t) { clearTimeout(rif.__t); rif.__t = null; }
      rif.classList.remove('hov');
    }
  }, true);

  window.DC = {
    mount: function (Component) {
      var tpl = document.getElementById('tpl');
      var app = document.getElementById('app');
      var desc = compile(tpl);
      var inst = new Component();
      var prev = null, queued = false;
      function draw() {
        queued = false;
        var vals = inst.renderVals ? inst.renderVals() : {};
        var out = [];
        renderKids(desc.c, vals, out);
        var root = { tag: 'div', attrs: {}, props: {}, ev: {}, kids: out };
        if (!prev) { app.innerHTML = ''; app.__h = {}; patchKids(app, [], out); }
        else patchKids(app, prev.kids, out);
        prev = root;
        document.documentElement.setAttribute('data-ready', '1');
      }
      inst.__schedule = function () { if (!queued) { queued = true; Promise.resolve().then(draw); } };
      draw();
      if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
      if (inst.componentDidMount) inst.componentDidMount();
    }
  };
})();
