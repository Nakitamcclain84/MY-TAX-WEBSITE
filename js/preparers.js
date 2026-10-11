/* Fills every <select data-preparers> with the current preparer list.
   If the list can't load, the form still works with "Not sure, pick for me". */
(function(){
  var sels = document.querySelectorAll('select[data-preparers]');
  if (!sels.length) return;
  fetch('/api/preparers').then(function(r){ return r.json(); }).then(function(d){
    var list = (d && d.preparers) || [];
    sels.forEach(function(sel){
      list.forEach(function(p){
        var o = document.createElement('option'); o.value = p.id; o.textContent = p.name;
        sel.appendChild(o);
      });
      var nameBox = sel.form && sel.form.querySelector('input[name="preparer-name"]');
      if (nameBox) { var sync = function(){ nameBox.value = sel.value ? sel.options[sel.selectedIndex].textContent : ''; }; sel.addEventListener('change', sync); sync(); }
    });
  }).catch(function(){});
})();
