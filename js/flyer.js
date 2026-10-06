/* Draws the referral flyer (1080x1350) on a canvas. Needs /js/qrcode.js loaded first.
   drawFlyer(canvas, { link: "https://...", first: "Jane" }) -> Promise */
(function(){
  function loadImg(src){ return new Promise(function(res){ var i = new Image(); i.onload = function(){ res(i); }; i.onerror = function(){ res(null); }; i.src = src; }); }
  function round(x, X, Y, W, H, r){ x.beginPath(); x.moveTo(X+r, Y); x.arcTo(X+W, Y, X+W, Y+H, r); x.arcTo(X+W, Y+H, X, Y+H, r); x.arcTo(X, Y+H, X, Y, r); x.arcTo(X, Y, X+W, Y, r); x.closePath(); }
  function wrap(x, text, X, Y, maxW, lh){ var words = text.split(' '), line = ''; for (var i = 0; i < words.length; i++){ var t = line ? line + ' ' + words[i] : words[i]; if (x.measureText(t).width > maxW && line){ x.fillText(line, X, Y); line = words[i]; Y += lh; } else line = t; } x.fillText(line, X, Y); return Y + lh; }
  window.drawFlyer = function(canvas, opt){
    opt = opt || {};
    var W = 1080, H = 1350; canvas.width = W; canvas.height = H;
    var x = canvas.getContext('2d');
    var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#062414'); g.addColorStop(1, '#0f4d2d');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(201,161,59,0.10)'; x.beginPath(); x.arc(W - 60, 120, 260, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(40, H - 160, 200, 0, Math.PI * 2); x.fill();
    return loadImg('/img/logo-services-dark-v2.webp').then(function(logo){
      if (logo){ var lh = 150, lw = logo.width * (lh / logo.height); x.drawImage(logo, (W - lw) / 2, 60, lw, lh); }
      x.textAlign = 'center'; x.fillStyle = '#e6c46a'; x.font = '700 34px Inter, Arial, sans-serif';
      x.fillText(opt.first ? (opt.first.toUpperCase() + ' RECOMMENDS') : 'TAX SEASON IS HERE', W / 2, 270);
      x.fillStyle = '#ffffff'; x.font = '800 92px Inter, Arial, sans-serif';
      x.fillText('Get Your Taxes', W / 2, 375); x.fillText('Done Right', W / 2, 475);
      x.fillStyle = '#cfe0d6'; x.font = '500 36px Inter, Arial, sans-serif';
      x.fillText('Friendly, professional tax preparation', W / 2, 540);
      var items = ['Start from your phone, no office visit', 'Fees can come out of your refund', 'Direct deposit for a faster refund', 'Real people who answer your questions'];
      var y = 625; x.textAlign = 'left';
      items.forEach(function(t){
        x.fillStyle = '#c9a13b'; x.beginPath(); x.arc(150, y - 12, 18, 0, Math.PI * 2); x.fill();
        x.strokeStyle = '#072b19'; x.lineWidth = 5; x.beginPath(); x.moveTo(141, y - 12); x.lineTo(148, y - 4); x.lineTo(160, y - 20); x.stroke();
        x.fillStyle = '#ffffff'; x.font = '600 38px Inter, Arial, sans-serif'; x.fillText(t, 190, y); y += 72;
      });
      round(x, 90, 930, W - 180, 340, 28); x.fillStyle = '#ffffff'; x.fill();
      var link = opt.link || 'https://{{DOMAIN}}';
      if (window.qrcode){
        var q = qrcode(0, 'M'); q.addData(link); q.make();
        var n = q.getModuleCount(), size = 280, cell = size / n, qx = 125, qy = 960;
        x.fillStyle = '#072b19';
        for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect(qx + c * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
      }
      x.textAlign = 'left'; x.fillStyle = '#072b19'; x.font = '800 44px Inter, Arial, sans-serif';
      x.fillText('Scan to get started', 445, 1030);
      x.fillStyle = '#3b4a42'; x.font = '500 30px Inter, Arial, sans-serif';
      var ny = wrap(x, 'or tap the link sent with this flyer.', 445, 1080, 540, 40);
      x.fillStyle = '#0f4d2d'; x.font = '700 32px Inter, Arial, sans-serif';
      x.fillText('Call or text {{PHONE}}', 445, ny + 30);
      x.textAlign = 'center'; x.fillStyle = '#e6c46a'; x.font = '600 30px Inter, Arial, sans-serif';
      x.fillText('{{BUSINESS_NAME}} · {{DOMAIN}}', W / 2, 1315);
    });
  };
})();
