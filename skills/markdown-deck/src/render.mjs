// SPDX-License-Identifier: Apache-2.0
/**
 * Markdown to slide HTML.
 *
 * Emits a self-contained deck: one HTML file carrying every slide, a PowerPoint-style
 * slide index, previous and next controls, keyboard navigation and a print stylesheet,
 * so the output needs no host chrome and no server.
 * Individual slide partials are also written for hosts that want to embed them.
 */

import { Marked } from 'marked';

export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * marked instance that passes mermaid fences through as <pre class="mermaid"> with RAW
 * text. Mermaid must parse `->>` and `:` un-escaped, so this cannot use the default
 * code renderer. Written to survive marked's renderer API changes across majors.
 */
export function makeMarked() {
  const inst = new Marked({ gfm: true, breaks: false });
  inst.use({
    renderer: {
      code(tokenOrCode, maybeLang) {
        const isToken = tokenOrCode && typeof tokenOrCode === 'object';
        const text = isToken ? tokenOrCode.text : tokenOrCode;
        const lang = (isToken ? tokenOrCode.lang : maybeLang) || '';
        if (lang.trim().split(/\s+/)[0] === 'mermaid') {
          return `<pre class="mermaid">\n${text}\n</pre>\n`;
        }
        return `<pre class="code"><code>${esc(text)}</code></pre>\n`;
      },
    },
  });
  return inst;
}

/** Body HTML for one content slide. */
export function renderSlideBody(md, mdInst) {
  return mdInst.parse(md);
}

function coverSlide({ id, title, subtitle, date, footnote, logo }) {
  return `<section class="slide cover" data-slide="${esc(id || 'cover')}">
  <div class="cover-wrap">
    ${logo ? `<img class="cover-logo" src="${esc(logo)}" alt="">` : ''}
    <div class="grow"></div>
    <h1 class="cover-title">${esc(title)}</h1>
    ${subtitle ? `<p class="cover-sub">${esc(subtitle)}</p>` : ''}
    ${date ? `<p class="cover-date">${esc(date)}</p>` : ''}
    ${footnote ? `<p class="cover-foot">${esc(footnote)}</p>` : ''}
    <div class="grow"></div>
  </div>
</section>`;
}

/**
 * A finished 16:9 image as the whole slide, such as one exported from another deck. The
 * title is for the index, comments and address; the image carries its own heading, so it
 * is not drawn unless `header` asks for the deck's own header above the image.
 */
function imageSlide({ id, eyebrow, title, src, header, caption }) {
  if (header) {
    return contentSlide({
      id, eyebrow, title, notes: [],
      bodyHtml: `<p><img src="${esc(src)}" alt="${esc(title)}"></p>`,
    });
  }
  // The whole canvas is the image. A caption, such as where an included slide came from,
  // is a small tag in the corner rather than a header that would take space from it.
  return `<section class="slide image-slide" data-slide="${esc(id)}" aria-label="${esc(title)}">
  <img class="slide-image" src="${esc(src)}" alt="${esc(title)}">
  ${caption ? `<span class="image-caption">${esc(caption)}</span>` : ''}
</section>`;
}

function contentSlide({ id, eyebrow, title, bodyHtml, notes }) {
  return `<section class="slide"${id ? ` data-slide="${esc(id)}"` : ''}>
  <header class="slide-header">
    ${eyebrow ? `<div class="eyebrow">${esc(eyebrow)}</div>` : ''}
    <h1>${esc(title)}</h1>
  </header>
  <div class="slide-body"><div class="fit">${bodyHtml}</div></div>
  ${notes && notes.length ? `<aside class="notes">${esc(notes.join('\n\n'))}</aside>` : ''}
</section>`;
}

const NAV_SCRIPT = `
(function () {
  var W = 1920, H = 1080;
  var slides = Array.prototype.slice.call(document.querySelectorAll('.deck > .slide'));
  var deck = document.querySelector('.deck');
  var viewport = document.querySelector('.viewport');
  var stage = document.querySelector('.stage');
  var thumbs = [];
  var i = 0;

  function px(v) { return parseFloat(v) || 0; }

  // Shrink a slide's body to its content box, and when it must shrink, widen it first so
  // the scaled result still spans the slide. A uniform shrink alone turns a long table
  // into a narrow column in the middle of a wide slide.
  function fitSlide(s) {
    var box = s.querySelector('.fit');
    if (!box) return 1;
    var body = box.parentElement;
    var cs = getComputedStyle(body);
    var availH = body.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
    var availW = body.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
    box.style.transform = 'none';
    box.style.width = '';
    if (availH <= 0 || availW <= 0) return 1;
    var k = 1;
    if (box.scrollHeight > availH + 1) {
      // Widening reflows the content shorter, so the fitting scale is not availH/height.
      // Search for the largest scale at which the widened content still fits.
      var lo = 0.2, hi = 1;
      for (var n = 0; n < 10; n++) {
        var mid = (lo + hi) / 2;
        box.style.width = (availW / mid) + 'px';
        if (box.scrollHeight * mid <= availH) lo = mid; else hi = mid;
      }
      k = lo;
      box.style.width = (availW / k) + 'px';
    }
    if (k < 1) {
      box.style.transform = 'scale(' + k + ')';
      box.style.transformOrigin = 'top left';
    } else {
      box.style.width = '';
    }
    s.setAttribute('data-fit', k.toFixed(3));
    return k;
  }

  // Every slide, not just the visible one. A hidden slide measures as zero height, which
  // is how slides used to reach the PDF unfitted and run off the page.
  function fitAll() {
    slides.forEach(function (s) {
      var hidden = getComputedStyle(s).display === 'none';
      if (hidden) s.classList.add('measuring');
      fitSlide(s);
      if (hidden) s.classList.remove('measuring');
    });
    buildThumbs();
    place();
  }

  // Scale the fixed canvas into whatever the stage leaves, keeping 16:9 exactly.
  function place() {
    if (!viewport || !stage) return;
    var cs = getComputedStyle(stage);
    var bar = document.querySelector('.toolbar');
    var barH = bar && getComputedStyle(bar).display !== 'none' ? bar.offsetHeight : 0;
    var aw = stage.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
    var ah = stage.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom) - barH;
    var k = Math.max(0.05, Math.min(aw / W, ah / H));
    viewport.style.width = Math.floor(W * k) + 'px';
    viewport.style.height = Math.floor(H * k) + 'px';
    deck.style.transform = 'scale(' + k + ')';
  }

  // PowerPoint-style thumbnails: a scaled live copy of each fitted slide.
  function buildThumbs() {
    thumbs = Array.prototype.slice.call(document.querySelectorAll('.thumb'));
    var on = document.body.classList.contains('index-thumbs');
    thumbs.forEach(function (t, k) {
      var mini = t.querySelector('.mini');
      if (!on) { if (mini) mini.innerHTML = ''; return; }
      if (!mini || !slides[k] || !mini.clientWidth) return;
      var scale = mini.clientWidth / W;
      var copy = slides[k].cloneNode(true);
      copy.classList.remove('active');
      copy.classList.add('thumb-slide');
      copy.removeAttribute('id');
      copy.style.transform = 'scale(' + scale + ')';
      mini.innerHTML = '';
      mini.appendChild(copy);
    });
    mark();
  }

  function mark() {
    thumbs.forEach(function (t, k) {
      var on = k === i;
      t.classList.toggle('current', on);
      t.setAttribute('aria-current', on ? 'true' : 'false');
      if (on && document.body.classList.contains('index-open')) {
        var list = t.closest('.index-list');
        if (list) {
          var top = t.offsetTop, bottom = top + t.offsetHeight;
          if (top < list.scrollTop || bottom > list.scrollTop + list.clientHeight) {
            list.scrollTop = top - list.clientHeight / 2 + t.offsetHeight / 2;
          }
        }
      }
    });
  }

  function show(n) {
    i = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach(function (s, k) { s.classList.toggle('active', k === i); });
    var c = document.getElementById('counter');
    if (c) c.textContent = (i + 1) + ' / ' + slides.length;
    var prev = document.getElementById('prev'), next = document.getElementById('next');
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === slides.length - 1;
    var h = '#' + (slides[i].getAttribute('data-slide') || (i + 1));
    if (location.hash !== h) history.replaceState(null, '', h);
    mark();
    window.dispatchEvent(new CustomEvent('deck:slide', { detail: { index: i } }));
  }

  // A slide's address is its id, so a link survives slides being added or reordered.
  // A plain number is still honoured, for links made before ids existed.
  function fromHash() {
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (!h) return 0;
    for (var k = 0; k < slides.length; k++) if (slides[k].getAttribute('data-slide') === h) return k;
    var n = parseInt(h, 10);
    return isNaN(n) ? 0 : n - 1;
  }

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function recall(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function setIndex(open) {
    document.body.classList.toggle('index-open', open);
    var b = document.getElementById('toggle-index');
    if (b) b.setAttribute('aria-expanded', open ? 'true' : 'false');
    store('markdown-deck:index', open ? '1' : '0');
    // The stage width changes with the panel, so the canvas must be re-placed. Thumbnails
    // built while the panel was hidden measured zero wide, so rebuild them on opening.
    // Synchronous on purpose: reading sizes forces layout, and animation frames are
    // throttled in background tabs, which left the panel empty when deferred.
    place();
    if (open) buildThumbs(); else mark();
  }

  // Titles only, or thumbnails too. The build sets the default; a viewer's choice sticks.
  function setThumbs(on) {
    document.body.classList.toggle('index-thumbs', on);
    var b = document.getElementById('index-view');
    if (b) {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.textContent = on ? 'Titles' : 'Thumbnails';
      b.title = on ? 'Show slide titles only' : 'Show slide thumbnails';
    }
    store('markdown-deck:thumbs', on ? '1' : '0');
    buildThumbs();
  }

  function fullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.thumb');
    if (t) { show(parseInt(t.getAttribute('data-i'), 10)); return; }
    var id = e.target.closest && e.target.closest('button') && e.target.closest('button').id;
    if (id === 'prev') show(i - 1);
    if (id === 'next') show(i + 1);
    if (id === 'toggle-index') setIndex(!document.body.classList.contains('index-open'));
    if (id === 'index-collapse') setIndex(false);
    if (id === 'index-view') setThumbs(!document.body.classList.contains('index-thumbs'));
    if (id === 'fullscreen') fullscreen();
  });

  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); show(i + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); show(i - 1); }
    if (e.key === 'Home') show(0);
    if (e.key === 'End') show(slides.length - 1);
    if (e.key === 'i' || e.key === 'I') setIndex(!document.body.classList.contains('index-open'));
    if (e.key === 't' || e.key === 'T') setThumbs(!document.body.classList.contains('index-thumbs'));
    if (e.key === 'f' || e.key === 'F') fullscreen();
  });

  document.addEventListener('fullscreenchange', function () {
    document.body.classList.toggle('presenting', !!document.fullscreenElement);
    place();
  });
  window.addEventListener('resize', place);
  window.addEventListener('hashchange', function () { show(fromHash()); });

  // Content that loads late changes the height to fit: images, web fonts, mermaid.
  Array.prototype.forEach.call(document.querySelectorAll('.deck img'), function (img) {
    if (!img.complete) img.addEventListener('load', fitAll);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  window.addEventListener('load', fitAll);
  window.addEventListener('deck:refit', fitAll);

  var saved = recall('markdown-deck:index');
  setIndex(saved === null ? window.innerWidth >= 900 : saved === '1');
  var savedThumbs = recall('markdown-deck:thumbs');
  setThumbs(savedThumbs === null ? document.body.classList.contains('index-thumbs') : savedThumbs === '1');
  window.__deck = {
    show: show,
    fitAll: fitAll,
    place: place,
    current: function () { return i; },
    fits: function () {
      return slides.map(function (s, k) {
        var h = s.querySelector('.slide-header h1, .cover-title');
        var t = h ? h.textContent : (s.getAttribute('aria-label') || '');
        return { slide: k + 1, title: t, fit: parseFloat(s.getAttribute('data-fit') || '1') };
      });
    },
  };
  window.__deckShow = show;
  fitAll();
  show(fromHash());
})();`;

const MERMAID_SCRIPT = `
(function () {
  if (!window.mermaid) return;
  mermaid.initialize({ startOnLoad: false, theme: 'neutral', securityLevel: 'loose' });
  var run = mermaid.run ? mermaid.run() : Promise.resolve();
  Promise.resolve(run).then(function () { window.dispatchEvent(new Event('deck:refit')); });
})();`;

// Per-slide review comments. Held in the reviewer's browser until they send them; nothing
// leaves the page except through a send action the reviewer chooses.
const COMMENTS_SCRIPT = `
(function () {
  var cfgEl = document.getElementById('deck-config');
  if (!cfgEl || !window.__deck) return;
  var cfg = JSON.parse(cfgEl.textContent);
  var KEY = 'markdown-deck:review:' + cfg.id;
  var MAILTO_LIMIT = 1900;
  var persistent = true;
  var state = load();

  function $(id) { return document.getElementById(id); }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { persistent = false; }
    return { reviewer: '', comments: [] };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); persistent = true; }
    catch (e) { persistent = false; }
    render();
  }
  function note(msg) { var n = $('comments-note'); if (n) n.textContent = msg || ''; }
  function slideAt(k) { return cfg.slides[k]; }
  function current() { return slideAt(window.__deck.current()); }
  function forSlide(id) { return state.comments.filter(function (c) { return c.slide === id; }); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function when(iso) {
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); }
    catch (e) { return iso; }
  }

  function render() {
    var s = current();
    $('comments-slide').textContent = 'Slide ' + (s.n) + ': ' + s.title;
    var list = $('comment-list');
    list.innerHTML = '';
    forSlide(s.id).forEach(function (c) {
      var li = document.createElement('li');
      li.className = 'comment';
      li.setAttribute('data-id', c.id);
      var text = document.createElement('div');
      text.className = 'comment-text';
      text.textContent = c.text;
      var meta = document.createElement('div');
      meta.className = 'comment-meta';
      meta.textContent = when(c.updated || c.created);
      var edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'comment-edit'; edit.textContent = 'Edit';
      var del = document.createElement('button');
      del.type = 'button'; del.className = 'comment-delete'; del.textContent = 'Delete';
      meta.appendChild(edit); meta.appendChild(del);
      li.appendChild(text); li.appendChild(meta);
      list.appendChild(li);
    });
    if (!list.children.length) {
      var empty = document.createElement('li');
      empty.className = 'comment-empty';
      empty.textContent = 'No comments on this slide yet.';
      list.appendChild(empty);
    }
    var total = state.comments.length;
    var slidesWith = cfg.slides.filter(function (s) { return forSlide(s.id).length; }).length;
    // Nothing to send until something has been said. Then one clear action.
    $('review-total').textContent = total
      ? plural(total, 'comment') + ' on ' + plural(slidesWith, 'slide') + ', not yet sent.'
      : 'Add comments to any slide. When you are done, send them as one review.';
    $('send-review').hidden = !total;
    $('send-review').textContent = 'Send review (' + total + ')';
    $('clear-review').hidden = !total;
    var count = $('comment-count');
    if (count) count.textContent = total ? String(total) : '';
    Array.prototype.forEach.call(document.querySelectorAll('.thumb'), function (t, k) {
      var b = t.querySelector('.badge');
      var n = forSlide(slideAt(k).id).length;
      if (b) { b.textContent = n ? String(n) : ''; b.hidden = !n; }
    });
    if (!persistent) note('Your browser is not keeping these comments. Send them before closing the page.');
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function add(text) {
    var s = current();
    state.comments.push({
      id: uid(), slide: s.id, slideNo: s.n, slideTitle: s.title, text: text,
      created: new Date().toISOString(), version: cfg.version || '',
    });
    save();
  }

  function edit(li) {
    var c = state.comments.filter(function (x) { return x.id === li.getAttribute('data-id'); })[0];
    if (!c) return;
    var box = document.createElement('textarea');
    box.className = 'comment-edit-box'; box.value = c.text; box.rows = 4;
    var ok = document.createElement('button'); ok.type = 'button'; ok.textContent = 'Save';
    var no = document.createElement('button'); no.type = 'button'; no.textContent = 'Cancel';
    li.innerHTML = ''; li.appendChild(box); li.appendChild(ok); li.appendChild(no);
    box.focus();
    ok.addEventListener('click', function () {
      var v = box.value.trim();
      if (v) { c.text = v; c.updated = new Date().toISOString(); }
      save();
    });
    no.addEventListener('click', render);
  }

  function pageUrl() { return location.href.split('#')[0]; }

  // The review as plain text, grouped by slide in deck order, then a machine-readable copy.
  function reviewText(withJson) {
    var lines = ['Review of ' + cfg.title + (cfg.version ? ' (version ' + cfg.version + ')' : ''),
      'Reviewer: ' + (state.reviewer || '(not given)'),
      'Deck: ' + pageUrl(),
      'Sent: ' + new Date().toLocaleString(), ''];
    cfg.slides.forEach(function (s) {
      var cs = forSlide(s.id);
      if (!cs.length) return;
      lines.push('Slide ' + s.n + ': ' + s.title);
      lines.push(pageUrl() + '#' + s.id);
      cs.forEach(function (c) { lines.push('- ' + c.text.replace(/\\n/g, '\\n  ')); });
      lines.push('');
    });
    if (withJson) {
      lines.push('Machine-readable copy:', '', '\`\`\`json', JSON.stringify(reviewJson(), null, 2), '\`\`\`', '');
    }
    return lines.join('\\n');
  }
  function reviewJson() {
    return {
      deck: { id: cfg.id, title: cfg.title, version: cfg.version || '', url: pageUrl() },
      reviewer: state.reviewer || '',
      sent: new Date().toISOString(),
      comments: state.comments,
    };
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, fallback);
    }
    return Promise.resolve(fallback());
    function fallback() {
      var t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      document.body.removeChild(t);
      return ok;
    }
  }

  function download() {
    var blob = new Blob([reviewText(true)], { type: 'text/markdown' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'review-' + cfg.id + '-' + new Date().toISOString().slice(0, 10) + '.md';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function mailto(body) {
    var subject = (cfg.feedback && cfg.feedback.subject) || ('Review: ' + cfg.title);
    var to = (cfg.feedback && cfg.feedback.to) || '';
    return 'mailto:' + encodeURIComponent(to).replace(/%40/g, '@').replace(/%2C/gi, ',') +
      '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  // Mail links are cut off at roughly 2,000 characters in some clients. A review that fits
  // goes in the body; one that does not is copied to the clipboard, or downloaded, and the
  // email says where to find it.
  function email() {
    var text = reviewText(false);
    var href = mailto(text);
    if (href.length <= MAILTO_LIMIT) {
      open(href);
      return Promise.resolve('Your email app should have opened with the review in it. Send the email to finish.');
    }
    return copy(reviewText(true)).then(function (ok) {
      if (ok) {
        open(mailto('The review is too long to send in the body of an email, so it has been copied to your clipboard. Paste it here.\\n'));
        return 'The review was too long for the body of an email, so it is on your clipboard. Paste it into the email that has opened, then send it.';
      }
      download();
      open(mailto('The review is too long to send in the body of an email. Please attach the review file that has just been downloaded.\\n'));
      return 'The review was too long for the body of an email, so it was downloaded. Attach the file to the email that has opened, then send it.';
    });
  }

  // How a review leaves the page. The interface only ever says "Send review" and asks the
  // configured sender to do it, so another backend, a flow or a form, is one more entry
  // here and a different feedback.method, with no change to the panel or the dialog.
  var SENDERS = {
    email: { label: 'Send by email', run: email },
  };
  function sender() {
    var m = (cfg.feedback && cfg.feedback.method) || 'email';
    return SENDERS[m] || SENDERS.email;
  }

  function dialog() { return $('review-dialog'); }
  function openReview() {
    var d = dialog();
    $('review-name').value = state.reviewer || '';
    $('review-summary').textContent = plural(state.comments.length, 'comment') + ' on ' +
      plural(cfg.slides.filter(function (s) { return forSlide(s.id).length; }).length, 'slide') +
      ' of ' + cfg.title + '.';
    $('review-submit').textContent = sender().label;
    $('review-compose').hidden = false;
    $('review-done').hidden = true;
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    $('review-name').focus();
  }
  function closeReview() {
    var d = dialog();
    if (d.close) d.close(); else d.removeAttribute('open');
  }
  function takeName() {
    var v = $('review-name').value.trim();
    if (v !== state.reviewer) { state.reviewer = v; save(); }
  }
  // After any send, the reviewer decides whether the comments have gone and can be cleared.
  // The page cannot know that an email was actually sent.
  function done(message) {
    $('review-compose').hidden = true;
    $('review-done').hidden = false;
    $('review-done-message').textContent = message;
    $('review-clear-sent').textContent = 'Clear the ' + plural(state.comments.length, 'comment');
  }
  function open(href) {
    var a = document.createElement('a'); a.href = href;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function setOpen(on) {
    document.body.classList.toggle('comments-open', on);
    var b = $('toggle-comments');
    if (b) b.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (window.__deck.place) window.__deck.place();
    if (on) render();
  }

  $('comment-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var t = $('comment-text');
    var v = t.value.trim();
    if (!v) return;
    add(v); t.value = ''; t.focus();
  });
  $('comment-text').addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); $('comment-form').requestSubmit(); }
  });
  $('comment-list').addEventListener('click', function (e) {
    var li = e.target.closest('.comment');
    if (!li) return;
    if (e.target.classList.contains('comment-edit')) edit(li);
    if (e.target.classList.contains('comment-delete') && confirm('Delete this comment?')) {
      var id = li.getAttribute('data-id');
      state.comments = state.comments.filter(function (c) { return c.id !== id; });
      save();
    }
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button');
    if (!b) return;
    if (b.id === 'toggle-comments') setOpen(!document.body.classList.contains('comments-open'));
    if (b.id === 'comments-close') setOpen(false);
    if (b.id === 'send-review') openReview();
    if (b.id === 'review-cancel' || b.id === 'review-keep') closeReview();
    if (b.id === 'review-submit') { takeName(); sender().run().then(done); }
    if (b.id === 'review-copy') {
      takeName();
      copy(reviewText(true)).then(function (ok) {
        done(ok ? 'The review is on your clipboard. Paste it wherever it needs to go.'
          : 'Copying was blocked by the browser. Use Download instead.');
      });
    }
    if (b.id === 'review-download') {
      takeName(); download();
      done('The review was downloaded as a file. Send it to ' + ((cfg.feedback && cfg.feedback.to) || 'the author') + '.');
    }
    if (b.id === 'review-clear-sent') {
      state.comments = []; state.lastSent = new Date().toISOString(); save(); closeReview();
      note('Review sent and cleared from this browser.');
    }
    if (b.id === 'clear-review' && confirm('Discard all ' + plural(state.comments.length, 'comment') + '? They have not been sent.')) {
      state.comments = []; save(); note('All comments discarded.');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'c' || e.key === 'C') setOpen(!document.body.classList.contains('comments-open'));
  });
  window.addEventListener('deck:slide', render);
  window.__deckReview = {
    state: function () { return state; }, text: reviewText, json: reviewJson, mailto: mailto,
    senders: SENDERS,
  };
  render();
})();`;

function commentsPanel() {
  return `<aside class="comments" aria-label="Comments">
  <div class="comments-head">
    <span class="comments-title">Comments</span>
    <button id="comments-close" type="button" title="Close comments (C)" aria-label="Close comments"><span aria-hidden="true">&#187;</span></button>
  </div>
  <div class="comments-slide" id="comments-slide"></div>
  <ol class="comment-list" id="comment-list"></ol>
  <form id="comment-form" class="comment-form">
    <textarea id="comment-text" rows="4" placeholder="Comment on this slide" aria-label="Comment on this slide"></textarea>
    <button type="submit">Add comment</button>
  </form>
  <div class="comments-foot">
    <p class="review-total" id="review-total"></p>
    <button id="send-review" class="primary" type="button" hidden>Send review</button>
    <button id="clear-review" class="link" type="button" hidden title="Remove every comment from this browser without sending">Discard all</button>
    <p class="comments-note" id="comments-note" role="status"></p>
  </div>
  <dialog id="review-dialog" class="review-dialog" aria-labelledby="review-heading">
    <h2 id="review-heading">Send your review</h2>
    <div id="review-compose">
      <p id="review-summary" class="review-summary"></p>
      <label class="review-name">Your name
        <input id="review-name" type="text" autocomplete="name" placeholder="So the author knows who to ask">
      </label>
      <div class="review-buttons">
        <button id="review-submit" class="primary" type="button">Send</button>
        <button id="review-cancel" type="button">Cancel</button>
      </div>
      <p class="review-alternatives">Or <button id="review-copy" class="link" type="button">copy the review</button> or <button id="review-download" class="link" type="button">download it</button> to send another way.</p>
    </div>
    <div id="review-done" hidden>
      <p id="review-done-message" role="status"></p>
      <p>Once it has gone, clear these comments from this browser so they are not sent twice.</p>
      <div class="review-buttons">
        <button id="review-clear-sent" class="primary" type="button">Clear comments</button>
        <button id="review-keep" type="button">Keep them for now</button>
      </div>
    </div>
  </dialog>
</aside>`;
}

/** JSON inside a script tag: `</` would end the tag early. */
function scriptJson(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function indexPanel(title, entries) {
  const items = entries.map((e, k) => `    <li><button class="thumb" type="button" data-i="${k}" aria-label="Slide ${k + 1}: ${esc(e)}">
      <span class="num">${k + 1}</span>
      <span class="mini" aria-hidden="true"></span>
      <span class="cap">${esc(e)}</span>
      <span class="badge" hidden></span>
    </button></li>`).join('\n');
  return `<aside class="index" aria-label="Slide index">
  <div class="index-head">
    <span class="index-title">${esc(title)}</span>
    <button id="index-collapse" type="button" title="Collapse the slide index (I)" aria-label="Collapse slide index"><span aria-hidden="true">&#171;</span></button>
  </div>
  <div class="index-tools">
    <span class="index-count">${entries.length} slides</span>
    <button id="index-view" type="button" aria-pressed="false" title="Show slide thumbnails (T)">Thumbnails</button>
  </div>
  <ol class="index-list">
${items}
  </ol>
</aside>`;
}

const toolbar = (comments) => `<nav class="toolbar" aria-label="Slide navigation">
    <button id="toggle-index" type="button" title="Slide index (I)" aria-label="Toggle slide index" aria-expanded="true"><span aria-hidden="true">&#9776;</span></button>
    <span class="spacer"></span>
    <button id="prev" type="button" title="Previous (Left arrow)" aria-label="Previous slide"><span aria-hidden="true">&#8249;</span> Previous</button>
    <span id="counter" aria-live="polite"></span>
    <button id="next" type="button" title="Next (Right arrow)" aria-label="Next slide">Next <span aria-hidden="true">&#8250;</span></button>
    <span class="spacer"></span>
    ${comments ? '<button id="toggle-comments" type="button" title="Comments on this slide (C)" aria-label="Comments" aria-expanded="false">Comments <span id="comment-count" class="count"></span></button>' : ''}
    <button id="fullscreen" type="button" title="Present full screen (F)" aria-label="Present full screen"><span aria-hidden="true">&#x26F6;</span></button>
  </nav>`;

/**
 * Assemble the whole deck as one self-contained HTML document.
 *
 * Layout: a slide index on the left, PowerPoint style, and a stage holding one 1920x1080
 * canvas scaled to fit with previous and next controls beneath it. Printing drops the
 * chrome and emits every slide as its own 16:9 page.
 *
 * With `comments`, a panel on the right collects comments per slide, held in the
 * reviewer's browser, and packages them for email or download.
 *
 * @param {{title: string, eyebrow?: string, css: string, cover?: object,
 *          slides: {file?: string, title: string, bodyHtml: string, notes: string[]}[],
 *          mermaidSrc?: string, thumbnails?: boolean, comments?: boolean,
 *          id?: string, version?: string, feedback?: {to?: string, subject?: string}}} deck
 */
export function renderDeck(deck) {
  const body = [];
  const captions = [];
  const ids = [];
  if (deck.cover) {
    body.push(coverSlide({ id: 'cover', title: deck.title, ...deck.cover }));
    captions.push(deck.title);
    ids.push('cover');
  }
  for (const s of deck.slides) {
    body.push(s.kind === 'image'
      ? imageSlide({ id: s.file, eyebrow: deck.eyebrow, title: s.title, src: s.src, header: s.header, caption: s.caption })
      : contentSlide({ id: s.file, eyebrow: s.eyebrow ?? deck.eyebrow, title: s.title, bodyHtml: s.bodyHtml, notes: s.notes }));
    captions.push(s.title);
    ids.push(s.file || String(ids.length + 1));
  }
  const classes = [deck.thumbnails && 'index-thumbs', deck.comments && 'has-comments'].filter(Boolean);
  const config = deck.comments ? scriptJson({
    id: deck.id || 'deck',
    title: deck.title,
    version: deck.version || '',
    feedback: {
      to: deck.feedback?.to || '', subject: deck.feedback?.subject || '',
      method: deck.feedback?.method || 'email',
    },
    slides: ids.map((id, k) => ({ id, n: k + 1, title: captions[k] })),
  }) : '';
  const needsMermaid = body.some((s) => s.includes('class="mermaid"'));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(deck.title)}</title>
<style>
${deck.css}
</style>
</head>
<body${classes.length ? ` class="${classes.join(' ')}"` : ''}>
${indexPanel(deck.title, captions)}
<main class="stage">
  <div class="viewport">
<div class="deck">
${body.join('\n')}
</div>
  </div>
  ${toolbar(deck.comments)}
</main>
${deck.comments ? commentsPanel() : ''}
${needsMermaid && deck.mermaidSrc ? `<script src="${esc(deck.mermaidSrc)}"></script>\n<script>${MERMAID_SCRIPT}</script>` : ''}
<script>${NAV_SCRIPT}</script>
${deck.comments ? `<script type="application/json" id="deck-config">${config}</script>\n<script>${COMMENTS_SCRIPT}</script>` : ''}
</body>
</html>
`;
}

/** One slide as a standalone fragment, for hosts that embed partials. */
export function renderPartial(slide, { css, eyebrow }) {
  return `<style>${css}</style>
<div class="deck single">
${contentSlide({ eyebrow, title: slide.title, bodyHtml: slide.bodyHtml, notes: slide.notes })}
</div>
`;
}
