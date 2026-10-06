/* Shared helpers and the sidebar for all portal pages. */
// Hide links to parts of the kit you didn't pick (window.FEATURES is added on deploy).
(function(){ var F = window.FEATURES; if (!F) return;
  var css = ['academy', 'software', 'referrals', 'eros', 'preparers', 'preparers eros', 'eros software', 'preparers eros software']
    .filter(function(v){ return !v.split(' ').some(function(k){ return F[k]; }); })
    .map(function(v){ return '[data-f="' + v + '"]{display:none!important}'; }).join('');
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
})();
window.Portal = (function(){
  var AS = (new URLSearchParams(location.search).get('as') || '').replace(/[^A-Za-z0-9]/g, '');
  function api(url, body){
    if (AS && !body) url += (url.indexOf('?') > -1 ? '&' : '?') + 'as=' + AS;
    var opt = { credentials: 'same-origin', headers: {} };
    if (body) { opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch(url, opt).then(function(res){
      return res.json().catch(function(){ return { ok: false, message: 'Unexpected response.' }; }).then(function(j){
        j.status = res.status;
        if (res.status === 401 && location.pathname !== '/portal/' && location.pathname !== '/portal/index.html') location.replace('/portal/');
        return j;
      });
    });
  }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]; }); }
  function money(n, cents){ n = Number(n) || 0; return '$' + n.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 }); }
  function initials(s){ s = String(s || '').replace(/[^A-Za-z .]/g, ' ').trim(); var p = s.split(/[\s.]+/).filter(Boolean); return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase(); }
  function logout(){ api('/api/portal/logout', {}).finally(function(){ location.replace('/portal/'); }); }
  function day(iso, opts){ if (!iso) return ''; var d = new Date(String(iso).length === 10 ? iso + 'T12:00:00' : iso); return d.toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric', year: 'numeric' }); }
  var PILL = { 'Funded': 'p-funded', 'Paid Out': 'p-paid', 'Accepted': 'p-accepted', 'Filed': 'p-filed', 'In Progress': 'p-progress', 'Rejected': 'p-rejected',
    'New': 'p-filed', 'Fixed': 'p-funded', 'Declined': 'p-rejected', 'Resolved': 'p-funded', 'Waiting on ERO': 'p-progress',
    'Pending Review': 'p-progress', 'Interview': 'p-filed', 'Approved - Onboarding': 'p-accepted', 'Active': 'p-funded', 'Inactive': 'p-rejected', 'Onboarding': 'p-progress',
    'Not contacted': 'p-progress', 'Contacted': 'p-filed', 'Booked': 'p-accepted', 'Filed this season': 'p-funded', 'Not returning': 'p-rejected' };
  function pill(s){ return '<span class="pill ' + (PILL[s] || 'p-progress') + '">' + esc(s) + '</span>'; }

  var I = {
    home: '<path d="M3 10.5 12 3l9 7.5V21H3z"/>',
    file: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/>',
    money: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    people: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/>',
    chat: '<path d="M4 4h16v12H5l-1 4z"/>',
    doc: '<path d="M6 2h9l5 5v15H6z"/><path d="M9 13h7M9 17h5"/>',
    team: '<circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6M17 3a4 4 0 0 1 0 8M22 21c0-3-2-5-4-6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01"/>'
  };
  function icon(n){ return '<svg class="i" viewBox="0 0 24 24">' + I[n] + '</svg>'; }

  // Builds the sidebar, checks sign-in, and resolves with { name, email, roles }.
  function shell(active, need){
    var side = document.getElementById('side');
    return api('/api/portal/whoami').then(function(w){
      if (!w.ok) { location.replace('/portal/'); return new Promise(function(){}); }
      var viewing = Boolean(AS && w.roles.admin);
      if (!viewing) {
        if (need === 'preparer' && !w.roles.preparer) { location.replace(w.roles.admin ? '/portal/admin.html' : '/portal/ero.html'); return new Promise(function(){}); }
        if (need === 'ero' && !w.roles.ero) { location.replace('/portal/home.html'); return new Promise(function(){}); }
        if (need === 'admin' && !w.roles.admin) { location.replace('/portal/home.html'); return new Promise(function(){}); }
      }
      var q = viewing ? '?as=' + AS : '';
      var links = [];
      if (w.roles.admin && !viewing) links.push(['grid', 'admin.html', 'Admin Dashboard']);
      if (viewing ? need === 'preparer' : w.roles.preparer) {
        links.push(['home', 'home.html' + q, 'Home'], ['file', 'returns.html' + q, 'My Returns'], ['money', 'earnings.html' + q, 'My Earnings'],
          ['people', 'clients.html' + q, 'Past Clients'], ['chat', 'corrections.html' + q, 'Corrections'], ['doc', 'agreement.html' + q, 'My Agreement']);
      }
      if (viewing ? need === 'ero' : w.roles.ero) links.push(['team', 'ero.html' + q, w.roles.preparer && !viewing ? 'My ERO Team' : 'Team Dashboard']);
      links.push(['book', 'resources.html' + q, 'Resources']);
      if (viewing) {
        var bn = document.createElement('div'); bn.className = 'viewbar';
        bn.innerHTML = 'Admin view: you\'re seeing someone else\'s portal. Changes are turned off, except onboarding check-offs. <a href="/portal/admin.html">Back to Admin</a>';
        document.body.insertBefore(bn, document.body.firstChild);
      }
      side.innerHTML = '<div class="brand"><img src="/img/logo-services-dark-v2.webp" alt="{{BUSINESS_NAME}}"></div><nav>' +
        links.map(function(l){ return '<a href="/portal/' + l[1] + '"' + (l[1].split('?')[0] === active ? ' class="on"' : '') + '>' + icon(l[0]) + l[2] + '</a>'; }).join('') +
        (w.roles.ero && !viewing ? '<a href="/support.html" data-f="eros software" target="_blank" rel="noopener">' + icon('help') + 'Get Support</a>' : '') +
        '</nav><div class="side-help"><b>Need help?</b>' + (w.roles.preparer && !w.roles.ero ? 'Your ERO is your first stop for questions. ' : '') + 'Call or text {{SHORT_NAME}} at {{PHONE}}.</div>' +
        '<button class="side-out" type="button" id="outBtn">Sign Out</button>';
      document.getElementById('outBtn').onclick = logout;
      var mb = document.getElementById('menuBtn');
      if (mb) mb.onclick = function(){ side.classList.toggle('open'); };
      document.addEventListener('click', function(e){ if (side.classList.contains('open') && !side.contains(e.target) && e.target !== mb) side.classList.remove('open'); });
      w.viewing = viewing;
      return w;
    });
  }

  function ready(){ var l = document.getElementById('loading'), p = document.getElementById('page'); if (l) l.classList.add('hide'); if (p) p.classList.remove('hide'); }
  function failPage(msg){ var l = document.getElementById('loading'); if (l) l.innerHTML = '<div style="text-align:center"><b>We couldn\'t load this page.</b><br>' + esc(msg || 'Please refresh in a minute.') + '</div>'; }

  function toast(msg, bad){
    var t = document.getElementById('toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.className = 'toast show' + (bad ? ' bad' : ''); t.textContent = msg;
    clearTimeout(t._h); t._h = setTimeout(function(){ t.className = 'toast'; }, 3200);
  }

  function modal(html){
    var m = document.createElement('div'); m.className = 'modal-bg';
    m.innerHTML = '<div class="modal" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(m);
    function close(){ m.remove(); }
    m.addEventListener('click', function(e){ if (e.target === m || e.target.hasAttribute('data-close')) close(); });
    document.addEventListener('keydown', function k(e){ if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    return { el: m, close: close };
  }

  function copy(text, btn){
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function(){
      if (btn) { var o = btn.textContent; btn.textContent = 'Copied!'; setTimeout(function(){ btn.textContent = o; }, 1500); }
    }).catch(function(){ prompt('Copy this:', text); });
  }

  return { api: api, esc: esc, money: money, initials: initials, logout: logout, day: day, pill: pill, icon: icon, shell: shell, ready: ready, failPage: failPage, toast: toast, modal: modal, copy: copy };
})();
