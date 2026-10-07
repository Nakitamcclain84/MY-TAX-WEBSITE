/* Parts of the site you didn't pick in the customizer are removed here (and hidden by css/features.css). */
(function(){ var F = window.FEATURES; if (!F) return;
  document.querySelectorAll('[data-f]').forEach(function(el){ var fs = el.getAttribute('data-f').split(/\s+/).filter(Boolean); if (fs.length && !fs.some(function(k){ return F[k]; })) el.remove(); });
})();
/* Shared behavior for every layout. Settings live in /js/settings.js. */
(function(){
  var S = window.SETTINGS || {}, $ = function(s, r){ return (r || document).querySelector(s); }, $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var Q = new URLSearchParams(location.search);
  function ext(a, url){ if (!a || !url || url.indexOf('{{') === 0) return; a.href = url; if (url.charAt(0) !== '/') { a.target = '_blank'; a.rel = 'noopener'; } }

  // Mobile menu
  $$('[data-menu]').forEach(function(b){ b.addEventListener('click', function(){ document.body.classList.toggle('menu-open'); }); });
  // Current page in nav
  var here = location.pathname.split('/').pop() || 'index.html';
  $$('.nav a').forEach(function(a){ if (a.getAttribute('href') === here || (here === '' && a.getAttribute('href') === 'index.html')) a.classList.add('active'); });

  // Team links: /?ero=code sends outside ERO teams to their own page
  var eroCode = Q.get('ero');
  if (eroCode && window.findEro) { var em = window.findEro(eroCode); if (em && !em.bprep && here !== 'team.html') { location.replace('/team.html?ero=' + encodeURIComponent(em.code)); return; } }

  // Links from settings
  $$('.js-book').forEach(function(a){ ext(a, S.bookingUrl); });
  $$('.js-demo').forEach(function(a){ ext(a, S.demoUrl); });
  $$('.js-intake').forEach(function(a){ ext(a, S.intakeUrl); });
  $$('.js-portal').forEach(function(a){ ext(a, S.portalUrl); });
  $$('[data-plan]').forEach(function(a){
    var link = (S.buyLinks || {})[a.dataset.plan];
    if (link) ext(a, link); else a.href = '/contact.html?topic=' + encodeURIComponent(a.dataset.plan) + '#contact-form';
  });
  $$('[data-opp]').forEach(function(a){ a.href = '/join.html?opp=' + encodeURIComponent(a.dataset.opp) + '#apply'; });

  // Prices
  function money(n){ return '$' + Number(n).toLocaleString('en-US'); }
  var phases = S.pricePhases || [{ name: 'regular' }], phase = phases[phases.length - 1];
  for (var i = 0; i < phases.length; i++) { if (!phases[i].until || Date.now() <= new Date(phases[i].until).getTime()) { phase = phases[i]; break; } }
  function priceOf(k){ var p = (S.prices || {})[k]; if (!p) return null; return p[phase.name] != null ? p[phase.name] : (p.regular != null ? p.regular : p.early); }
  $$('[data-p]').forEach(function(el){ var v = priceOf(el.dataset.p); if (v != null) el.textContent = money(v); });
  $$('[data-s]').forEach(function(el){ var p = (S.prices || {})[el.dataset.s]; if (p && p.direct) { var sv = p.direct - priceOf(el.dataset.s); el.textContent = 'Save ' + money(sv); el.hidden = sv <= 0; } else el.hidden = true; });
  $$('option[data-opt]').forEach(function(el){ var v = priceOf(el.dataset.opt); if (v != null) el.textContent = el.value.replace(/\(\$[\d,]+\)/, '(' + money(v) + ')'); });
  $$('.js-sale').forEach(function(el){ if (phase.tag) { el.textContent = phase.tag; el.hidden = false; } else el.hidden = true; });
  $$('.js-retainer').forEach(function(el){ el.textContent = money(S.newPreparerRetainer || 0); });

  // Countdown: extension deadline first, then Tax Day
  var cd = $('#countdown');
  if (cd) {
    var ext1 = S.extensionDeadline && Date.now() < new Date(S.extensionDeadline).getTime();
    var end = new Date(ext1 ? S.extensionDeadline : S.taxDay).getTime();
    $$('.js-cd-label').forEach(function(el){ el.textContent = ext1 ? 'Extension deadline' : 'Tax Day'; });
    var pad = function(n){ return (n < 10 ? '0' : '') + n; };
    (function tick(){
      var t = end - Date.now(); if (isNaN(t) || t <= 0) { cd.hidden = true; return; }
      $('#cd-d').textContent = pad(Math.floor(t / 864e5)); $('#cd-h').textContent = pad(Math.floor(t / 36e5) % 24);
      $('#cd-m').textContent = pad(Math.floor(t / 6e4) % 60); $('#cd-s').textContent = pad(Math.floor(t / 1e3) % 60);
      setTimeout(tick, 1000);
    })();
  }

  // Academy: next class everywhere
  var tz = { timeZone: S.timeZone || 'America/Chicago' };
  var up = (S.trainings || []).filter(function(t){ return new Date(t.end).getTime() > Date.now(); }).sort(function(a, b){ return new Date(a.start) - new Date(b.start); });
  function when(t){ var s = new Date(t.start), e = new Date(t.end);
    var tmz = function(d, z){ return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: z }).replace(':00', ''); };
    return s.toLocaleDateString('en-US', Object.assign({ weekday: 'long', month: 'short', day: 'numeric' }, tz)) + ', ' + tmz(s, 'America/New_York') + ' to ' + tmz(e, 'America/New_York') + ' ET (' +
      tmz(s, 'America/Chicago') + ' CT · ' + tmz(s, 'America/Denver') + ' MT · ' + tmz(s, 'America/Los_Angeles') + ' PT)'; }
  var nx = up[0];
  $$('.js-next-title').forEach(function(el){ el.textContent = nx ? nx.title : 'New dates coming soon'; });
  $$('.js-next-when').forEach(function(el){ el.textContent = nx ? when(nx) : 'Join the list and we’ll tell you first.'; });
  $$('.js-next-price').forEach(function(el){ el.textContent = nx ? money(nx.price) : ''; });
  var ac = $('#ac-class');
  if (ac) { var o = document.createElement('option'); o.textContent = 'Full Tax Academy: all courses | ' + money(nx ? nx.price : 99) + (nx ? ' | Next class: ' + nx.title + ', ' + when(nx) : ''); ac.appendChild(o); }

  // Contact form: preselect topic
  var topic = Q.get('topic'), ip = $('#i-plan');
  if (topic && ip) { Array.prototype.forEach.call(ip.options, function(o){ if (o.value === topic) ip.value = topic; }); }

  // Save a form: Netlify Forms (emails the owner) + Airtable copy for applications and Academy sign-ups.
  function sendForm(form, fd, kind){
    var body = new URLSearchParams(fd).toString();
    var net = fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body }).catch(function(){});
    var at = kind ? fetch('/api/form-capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: kind, data: Object.fromEntries(fd.entries()) }) }).catch(function(){}) : Promise.resolve();
    return Promise.all([net, at]);
  }
  var acf = document.querySelector('form[name="academy-registration"]');
  if (acf) acf.addEventListener('submit', function(e){
    e.preventDefault(); var b = acf.querySelector('[type=submit]'); if (b) { b.disabled = true; b.textContent = 'Registering...'; }
    sendForm(acf, new FormData(acf), 'academy').then(function(){ location.href = '/thank-you.html?academy=1'; });
  });
  var tsf = document.querySelector('form[name="training-signup"]');
  if (tsf) tsf.addEventListener('submit', function(e){
    e.preventDefault(); var b = tsf.querySelector('[type=submit]'); if (b) { b.disabled = true; b.textContent = 'Opening scheduler...'; }
    sendForm(tsf, new FormData(tsf)).then(function(){ location.href = S.bookingUrl || '/thank-you.html'; });
  });

  // Application form
  var af = $('#applyForm');
  if (af) {
    var st = $('#a-state');
    'AL AK AZ AR CA CO CT DE DC FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ').forEach(function(s){ var o = document.createElement('option'); o.textContent = s; st.appendChild(o); });
    var EROS = window.EROS || [], ref = $('#a-ref'), other = ref.querySelector('option:last-child'), opp = $('#a-opp');
    EROS.forEach(function(x){ var o = document.createElement('option'); o.textContent = x.name; ref.insertBefore(o, other); });
    var byName = function(v){ return EROS.filter(function(x){ return x.name === v; })[0]; };
    var outside = function(){ var v = ref.value; if (v === 'Other (not listed)') return v; var m = byName(v); return (m && !m.bprep) ? m.name : ''; };
    if (Q.get('opp')) Array.prototype.forEach.call(opp.options, function(o){ if (o.value === Q.get('opp')) opp.value = o.value; });
    if (eroCode && window.findEro) { var me = window.findEro(eroCode); if (me) { ref.value = me.name; opp.value = 'PTIN Partner'; } }
    var notes = {
      'PTIN Partner': 'Next: sign your agreement, then pay the ' + money(S.newPreparerRetainer || 0) + ' new preparer retainer.',
      'ERO / Software Partner': 'Next: sign your ERO agreement for the software you pick, then check out.',
      'Service Bureau, BPrep Branding': 'We’ll contact you within 2 business days to go over the program.',
      'Service Bureau, Custom Branding': 'We’ll contact you within 2 business days to go over the program.'
    };
    function upd(){
      var oe = outside();
      $('#oppNote').textContent = (opp.value === 'PTIN Partner' && oe) ? (oe === 'Other (not listed)' ? 'Next: we’ll confirm with your ERO and reach out.' : 'Next: sign ' + ((byName(oe) || {}).business || oe) + '’s team agreement.') : (notes[opp.value] || '');
      var isEro = opp.value === 'ERO / Software Partner'; $('#swWrap').hidden = !isEro; $('#a-sw').required = isEro;
      $('#a-ref-other-wrap').hidden = ref.value !== 'Other (not listed)';
    }
    opp.addEventListener('change', upd); ref.addEventListener('change', upd); upd();
    var reqs = $$('.req', af), btn = $('#applyBtn');
    reqs.forEach(function(c){ c.addEventListener('change', function(){ btn.disabled = !reqs.every(function(x){ return x.checked; }); }); });
    af.addEventListener('submit', function(e){
      // Applications just save the info: Netlify emails the owner, and it's added to Airtable (Applications).
      var fd = new FormData(af), dest = '/thank-you.html?apply=1';
      e.preventDefault(); btn.disabled = true; btn.textContent = 'Submitting...';
      sendForm(af, fd, 'application').then(function(){ location.href = dest; });
    });
  }

  // Tax checkup calculator
  var cf = $('#calcForm');
  if (cf) {
    var TD = {
      2026: { ctc: 2200, std: { single: 16100, mfj: 32200, hoh: 24150 }, br: { single: [12400, 50400, 105700, 201775, 256225, 640600], mfj: [24800, 100800, 211400, 403550, 512450, 768700], hoh: [17700, 67450, 105700, 201775, 256200, 640600] } },
      2025: { ctc: 2200, std: { single: 15750, mfj: 31500, hoh: 23625 }, br: { single: [11925, 48475, 103350, 197300, 250525, 626350], mfj: [23850, 96950, 206700, 394600, 501050, 751600], hoh: [17000, 64850, 103350, 197300, 250500, 626350] } },
      2024: { ctc: 2000, std: { single: 14600, mfj: 29200, hoh: 21900 }, br: { single: [11600, 47150, 100525, 191950, 243725, 609350], mfj: [23200, 94300, 201050, 383900, 487450, 731200], hoh: [16550, 63100, 100500, 191950, 243700, 609350] } },
      2023: { ctc: 2000, std: { single: 13850, mfj: 27700, hoh: 20800 }, br: { single: [11000, 44725, 95375, 182100, 231250, 578125], mfj: [22000, 89450, 190750, 364200, 462500, 693750], hoh: [15700, 59850, 95350, 182100, 231250, 578100] } }
    };
    var R = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
    var fed = function(x, tops){ var t = 0, p = 0; for (var i = 0; i < R.length; i++) { var top = i < tops.length ? tops[i] : Infinity; if (x > p) t += (Math.min(x, top) - p) * R[i]; p = top; } return Math.round(t); };
    var usd = function(n){ return (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); };
    cf.addEventListener('submit', function(ev){
      ev.preventDefault();
      var y = $('#c-year').value, s = $('#c-status').value, d = TD[y], w = Math.max(0, +$('#c-wages').value || 0), k = Math.max(0, Math.floor(+$('#c-kids').value || 0)), wh = Math.max(0, +$('#c-wh').value || 0);
      var std = d.std[s], tx = Math.max(0, w - std), tax = fed(tx, d.br[s]), mx = k * d.ctc, lim = s === 'mfj' ? 400000 : 200000;
      if (w > lim) mx = Math.max(0, mx - Math.ceil((w - lim) / 1000) * 50);
      var ctc = Math.min(mx, tax), after = tax - ctc, diff = wh - after;
      $('#o-wages').textContent = usd(w); $('#o-std').textContent = '-' + usd(std); $('#o-taxable').textContent = usd(tx); $('#o-tax').textContent = usd(tax);
      $('#o-ctc').textContent = ctc ? '-' + usd(ctc) : '$0'; $('#o-after').textContent = usd(after); $('#o-wh').textContent = usd(wh);
      $('#calcLabel').textContent = diff >= 0 ? 'Estimated federal refund (' + y + ')' : 'Estimated amount you may owe (' + y + ')';
      $('#calcBig').textContent = usd(Math.abs(diff)); $('#calcOut').classList.toggle('owe', diff < 0);
      var un = mx - ctc;
      $('#o-note').textContent = un > 0 ? 'You may qualify for up to ' + usd(Math.min(un, k * 1700)) + ' more through refundable credits. A tax pro can check.' : 'A tax pro can check for credits and deductions this estimate doesn’t include.';
      $('#calcResultField').value = (diff >= 0 ? 'Refund ' : 'Owe ') + usd(Math.abs(diff)) + ' | TY' + y + ' ' + s + ' | wages ' + usd(w) + ' | kids ' + k + ' | withheld ' + usd(wh);
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(cf)).toString() }).catch(function(){});
      cf.hidden = true; $('#calcOut').hidden = false; $('#calcOut').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('#calcAgain').addEventListener('click', function(){ $('#calcOut').hidden = true; cf.hidden = false; });
  }

  // FAQ accordions (only one open at a time in a group)
  $$('.faq details').forEach(function(d){ d.addEventListener('toggle', function(){ if (d.open) $$('details', d.parentNode).forEach(function(x){ if (x !== d) x.open = false; }); }); });

  // Year + reveal on scroll
  $$('.js-year').forEach(function(el){ el.textContent = new Date().getFullYear(); });
  document.documentElement.classList.add('js');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function(es){ es.forEach(function(en){ if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }); }, { threshold: 0.1 });
    $$('.rv').forEach(function(el){ io.observe(el); });
  } else $$('.rv').forEach(function(el){ el.classList.add('in'); });
})();
