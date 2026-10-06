(function(){ try {
  var u=sessionStorage.getItem('bprepSignedPdf'), n=sessionStorage.getItem('bprepSignedName'); if(!u) return;
  var b64=u.split(',')[1], bin=atob(b64), arr=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
  var url=URL.createObjectURL(new Blob([arr],{type:'application/pdf'}));
  var a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; a.download=n||'Signed Agreement.pdf'; a.textContent='Download My Signed Agreement (PDF)';
  a.setAttribute('style','display:block;background:#fff;color:#072b19;font-weight:800;padding:14px;border-radius:999px;text-decoration:none;margin:14px 0 6px');
  var note=document.createElement('p'); note.textContent=window.SIGNED_NOTE||'On iPhone, the PDF opens in a new tab. Tap the Share button to save it. Your fully signed copy will also be in your portal once {{SHORT_NAME}} approves it.';
  note.setAttribute('style','font-size:.8rem;opacity:.8;margin:0 0 10px');
  var box=document.querySelector('.box')||document.body, h=box.querySelector('h1,h2');
  if(h){ h.insertAdjacentElement('afterend', note); h.insertAdjacentElement('afterend', a); } else { box.appendChild(a); box.appendChild(note); }
} catch(e){} })();
