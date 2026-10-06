/* Builds a fully signed PDF copy of the agreement (preparer + {{SHORT_NAME}} signatures),
   attaches it to the Netlify form submission, and saves it for download on the next page. */
(function(){
  var form = document.getElementById('agForm');
  if (!form || !window.jspdf) return;

  function loadImg(src){ return new Promise(function(res){ var i=new Image(); i.onload=function(){res(i)}; i.onerror=function(){res(null)}; i.src=src; }); }
  function labelFor(el){
    if (el.id){ var l=form.querySelector('label[for="'+el.id+'"]'); if(l) return l.textContent.replace(/\(.*?\)/g,'').trim(); }
    return el.name;
  }

  form.addEventListener('submit', function(e){
    if (e.defaultPrevented || form.dataset.ready) return;
    e.preventDefault();
    var sa = document.getElementById('signedAt');
    if (sa){ if (form.dataset.signedAt) sa.value = form.dataset.signedAt; else form.dataset.signedAt = sa.value; }
    var big = Array.prototype.some.call(form.querySelectorAll('input[type=file]'), function(f){ return f.files && f.files[0] && f.files[0].size > 7*1024*1024; });
    if (big){ showMsg('That file is too large. Please upload a file under 7 MB (a PDF or a smaller photo works).', true); return; }
    var btn = form.querySelector('button[type=submit]'); if (btn){ btn.disabled = true; btn.textContent = 'Preparing your signed copy...'; }
    if (form.dataset.nocounter) { build(null).then(function(){ return build('approved'); }).then(finish).catch(finish); return; }
    loadImg('/img/owner-signature.png').then(function(csig){ return build(null).then(function(){ return build(csig); }); }).then(finish).catch(finish);
  });

  function showMsg(t, isErr){
    var btn = form.querySelector('button[type=submit]');
    var n = document.getElementById('submitNote');
    if (!n){ n = document.createElement('p'); n.id='submitNote'; n.style.cssText='margin:10px 0 0;font-weight:700;text-align:center';
      if (btn && btn.parentNode) btn.parentNode.insertBefore(n, btn.nextSibling); }
    n.style.color = isErr ? '#b42318' : '#8a5a00'; n.textContent = t;
  }
  function finish(){
    var btn = form.querySelector('button[type=submit]');
    if (btn){ btn.disabled = true; btn.textContent = 'Submitting... please wait'; }
    showMsg('Uploading your signed agreement. This can take up to a minute. Please do not refresh, tap back or submit again.');
    var next = form.getAttribute('action') || '/thank-you.html';
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function(){ if (ctrl) ctrl.abort(); }, 120000);
    fetch('/', { method:'POST', body:new FormData(form), signal: ctrl ? ctrl.signal : undefined })
      .then(function(r){ clearTimeout(timer); if (!r.ok) throw new Error('bad'); location.href = next; })
      .catch(function(){
        clearTimeout(timer);
        if (btn){ btn.disabled = false; btn.textContent = 'Try Again'; }
        showMsg('We could not confirm your submission. Check your internet connection and tap Try Again. If it keeps happening, call or text {{PHONE}}.', true);
      });
  }

  function build(csig){
    return Promise.resolve().then(function(){
      var J = window.jspdf.jsPDF, pdf = new J({unit:'pt', format:'letter'});
      var W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 54, y = M, maxW = W - M*2;
      function need(h){ if (y + h > H - M){ pdf.addPage(); y = M; } }
      function text(t, o){ o=o||{}; pdf.setFont('helvetica', o.bold?'bold':(o.italic?'italic':'normal')); pdf.setFontSize(o.size||10);
        var lines = pdf.splitTextToSize(t, maxW - (o.indent||0)); var lh=(o.size||10)*1.35;
        lines.forEach(function(ln){ need(lh); pdf.text(ln, M+(o.indent||0), y, o.center?{align:'center'}:undefined); y+=lh; }); y += (o.after||4); }
      var doc = document.getElementById('doc');
      Array.prototype.forEach.call(doc.children, function(n){
        var t = n.textContent.replace(/\s+/g,' ').trim(); if(!t) return;
        if (n.tagName==='H2') text(t,{bold:true,size:14,after:2});
        else if (n.tagName==='H3') { y+=4; text(t,{bold:true,size:11}); }
        else if (n.tagName==='TABLE') Array.prototype.forEach.call(n.rows,function(r){ text(Array.prototype.map.call(r.cells,function(c){return c.textContent.trim()}).join('  |  '),{size:9,indent:10,after:1}); });
        else text(t,{indent:n.classList.contains('ind')?14:0, italic:n.classList.contains('sub')});
      });
      pdf.addPage(); y = M;
      text('SIGNER INFORMATION',{bold:true,size:12});
      Array.prototype.forEach.call(form.querySelectorAll('input,select'), function(el){
        if (['hidden','file','checkbox','radio','submit','button'].indexOf(el.type)>=0) return;
        if (el.name==='bot-field' || el.name==='ssn-last-4' || el.name==='ack-initials' || !el.value) return;
        text(labelFor(el)+': '+el.value,{after:1});
      });
      y+=6; text('ACKNOWLEDGMENTS',{bold:true,size:12});
      Array.prototype.forEach.call(form.querySelectorAll('input[type=checkbox]:checked'), function(cb){
        var s = cb.parentNode.querySelector('span'); if (s) text('[X] '+s.textContent.replace(/\s+/g,' ').trim(),{indent:6,after:1});
      });
      var ini = form.querySelector('[name="ack-initials"]'); if (ini && ini.value) text('Initials: '+ini.value.toUpperCase(),{bold:true});
      var when = document.getElementById('signedAt').value || new Date().toString();
      y+=10; need(170);
      text('SIGNATURES',{bold:true,size:12});
      var sig = document.getElementById('sigData').value, nm = (document.getElementById('nm')||{}).value || '';
      var role = /ERO|Service Bureau|Customer/.test(document.title) ? 'Customer / ERO' : 'Preparer';
      text(role+': '+nm,{bold:true,after:2});
      if (sig) { try { pdf.addImage(sig,'JPEG',M,y,210,60); } catch(x){} y+=66; }
      text('Signed electronically: '+when,{size:9});
      y+=8;
      text('Company: '+(form.dataset.company||'{{BUSINESS_NAME}}, by {{OWNER_NAME}}, Owner'),{bold:true,after:2});
      if (csig === 'approved') { text(form.dataset.approvedText || 'Approved by Company.',{bold:true}); }
      else if (csig) { need(70); try { pdf.addImage(csig,'PNG',M,y,190,72,undefined,'FAST'); } catch(x){} y+=78; text('Countersigned by {{BUSINESS_NAME}} upon approval.',{size:9}); }
      else text(form.dataset.pendingText||'Signature: PENDING {{SHORT_NAME_UPPER}} APPROVAL. {{SHORT_NAME}} will countersign after reviewing and approving this agreement.',{italic:true});
      var name = (nm||'Signer').replace(/[^A-Za-z0-9 ]/g,'').trim();
      var fname = (csig === 'approved' ? 'Approved Agreement - ' : csig ? 'Countersigned Agreement - ' : 'Signed Agreement - ')+name+'.pdf';
      var blob = pdf.output('blob');
      try {
        var f = new File([blob], fname, {type:'application/pdf'}), dt = new DataTransfer(); dt.items.add(f);
        var inp = form.querySelector('input[name="'+(csig?'countersigned-copy':'signed-copy')+'"]'); if (inp) inp.files = dt.files;
      } catch(x){}
      if (!csig) { try { var uri = pdf.output('datauristring'); if (uri.length < 4000000){ sessionStorage.setItem('bprepSignedPdf', uri); sessionStorage.setItem('bprepSignedName', fname); } } catch(x){} }
    });
  }
})();
