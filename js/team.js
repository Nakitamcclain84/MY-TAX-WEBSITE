/* Shared helpers for ERO team pages (team.html, team-agreement.html, team-signed.html, team-training.html) */
(function(){
  var q = new URLSearchParams(location.search);
  var ero = window.findEro && window.findEro(q.get('ero'));
  window.TEAM = ero || null;
  function esc(s){ return String(s == null ? '' : s).replace(/[<>&"]/g, function(c){ return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]; }); }
  window.teamEsc = esc;
  document.addEventListener('DOMContentLoaded', function(){
    if (!ero || ero.bprep) {
      var main = document.querySelector('main') || document.body;
      main.innerHTML = '<div class="wrap"><div class="card center"><h2>Link not found</h2><p>This team link is missing or out of date. Please ask the person who sent it to you for a new link.</p></div></div>';
      document.querySelectorAll('header .biz').forEach(function(el){ el.textContent = 'Team Link'; });
      return;
    }
    document.querySelectorAll('[data-biz]').forEach(function(el){ el.textContent = ero.business; });
    document.querySelectorAll('[data-owner]').forEach(function(el){ el.textContent = ero.owner; });
    document.querySelectorAll('[data-phone]').forEach(function(el){ el.textContent = ero.phone; });
    document.querySelectorAll('[data-email]').forEach(function(el){ el.textContent = ero.email; if (el.tagName === 'A') el.href = 'mailto:' + ero.email; });
    document.querySelectorAll('[data-link]').forEach(function(el){ el.href = el.getAttribute('data-link') + '?ero=' + encodeURIComponent(ero.code); });
    document.title = document.title.replace('{biz}', ero.business);
    document.dispatchEvent(new CustomEvent('team-ready', { detail: ero }));
  });
})();
