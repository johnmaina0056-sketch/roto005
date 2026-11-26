(function () {
  var form = document.getElementById('orderForm');
  if (!form) return;

  var WHATSAPP_NUMBER = '254733355444';

  // [litres, gallons, "diameter x height (cm)", price KSh incl. 16% VAT, isShortVersion]
  var TANKS = [
    [100,22,'46 x 68',750],[140,33,'71 x 44',920],[150,33,'52 x 69',1250],[200,44,'64 x 80',1460],
    [230,50,'74 x 86',1560],[250,55,'69 x 71',1900],[460,100,'91 x 79',2265],[500,118,'90 x 93',3450],
    [690,150,'112 x 112',4230],[690,150,'118 x 75',4230,1],[750,163,'99 x 112',4945],
    [990,200,'108 x 112',5600],[990,200,'120 x 82',5730,1],[1000,217,'117 x 110',6500],
    [1350,300,'119 x 137',6800],[1500,326,'126 x 133',7420],[1800,400,'129 x 163',8000],[2000,434,'134 x 145',10500],
    [2500,500,'138 x 170',11300],[2500,500,'160 x 117',11300,1],[2500,542,'155 x 150',12000],
    [3000,652,'160 x 133',14500],[3200,700,'157 x 153',15300],[3500,760,'168 x 160',16000],
    [4000,880,'165 x 200',18500],[4000,880,'174 x 170',18500,1],[4600,null,'178 x 203',21500],[4600,null,'195 x 160',21500,1],
    [5000,1087,'180 x 211',24500],[5000,1087,'206 x 158',24500,1],[6000,1322,'203 x 209',27000],
    [8000,1739,'219 x 238',32500],[10000,2200,'221 x 284',45500],[10000,2200,'255 x 208',46200,1]
  ];

  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return n.toLocaleString('en-US'); };
  var qty = {}; // index -> quantity
  var btn = $('ofTankBtn'), panel = $('ofPanel'), options = $('ofOptions'), selected = $('ofSelected');

  function detail(t) { return (t[1] ? fmt(t[1]) + ' gal \u00b7 ' : '') + t[2] + ' cm (dia x ht)'; }
  function title(t) { return fmt(t[0]) + ' litres' + (t[4] ? '<span class="of-tag">Short</span>' : ''); }
  function keys() { return Object.keys(qty).map(Number).sort(function (a, b) { return a - b; }); }

  function setOpen(open) { panel.hidden = !open; btn.setAttribute('aria-expanded', String(open)); }
  btn.addEventListener('click', function () { setOpen(panel.hidden); });
  $('ofDone').addEventListener('click', function () { setOpen(false); btn.focus(); });
  document.addEventListener('click', function (e) { if (!$('ofDd').contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setOpen(false); });

  TANKS.forEach(function (t, i) {
    var row = document.createElement('label');
    row.className = 'of-opt';
    row.innerHTML = '<input type="checkbox">' +
      '<span class="of-info"><b>' + title(t) + '</b><span class="of-meta">' + detail(t) + '</span></span>' +
      '<span class="of-price">KSh ' + fmt(t[3]) + '</span>';
    row.querySelector('input').addEventListener('change', function (e) {
      if (e.target.checked) qty[i] = 1; else delete qty[i];
      render();
    });
    options.appendChild(row);
  });

  function render() {
    var total = 0, ks = keys();
    selected.innerHTML = '';
    ks.forEach(function (i) {
      var t = TANKS[i], q = qty[i];
      total += t[3] * q;
      var el = document.createElement('div');
      el.className = 'of-sel';
      el.innerHTML = '<span class="of-info"><b>' + title(t) + '</b><span class="of-meta">' + detail(t) +
        '<br>KSh ' + fmt(t[3]) + ' each = KSh ' + fmt(t[3] * q) + '</span></span>' +
        '<span class="of-step"><button type="button" aria-label="Decrease quantity">\u2212</button><span>' + q +
        '</span><button type="button" aria-label="Increase quantity">+</button></span>' +
        '<button type="button" class="of-rm" aria-label="Remove ' + fmt(t[0]) + ' litres">\u00d7</button>';
      var b = el.querySelectorAll('.of-step button');
      b[0].onclick = function () { if (q > 1) { qty[i] = q - 1; render(); } };
      b[1].onclick = function () { if (q < 99) { qty[i] = q + 1; render(); } };
      el.querySelector('.of-rm').onclick = function () { delete qty[i]; render(); };
      selected.appendChild(el);
    });
    if (ks.length) {
      selected.insertAdjacentHTML('beforeend',
        '<div class="of-total"><span>Estimated total</span><span>KSh ' + fmt(total) + '</span></div>' +
        '<div class="of-vat">Prices include 16% VAT. Delivery is confirmed separately.</div>');
      $('ofTankError').hidden = true;
    }
    Array.prototype.forEach.call(options.querySelectorAll('.of-opt'), function (r, i) {
      r.classList.toggle('on', i in qty);
      r.querySelector('input').checked = i in qty;
    });
    $('ofTankText').textContent = ks.length ? ks.length + (ks.length > 1 ? ' sizes' : ' size') + ' selected' : 'Select tank size(s)';
  }

  // earliest delivery = now
  var dt = $('ofDate');
  dt.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true, v = function (id) { return $(id).value.trim(); };

    ['ofColor', 'ofName', 'ofPhone', 'ofAddress', 'ofDate', 'ofPayment', 'ofInstall', 'ofFlood'].forEach(function (id) {
      var bad = !v(id);
      $(id).classList.toggle('of-invalid', bad);
      if (bad) ok = false;
    });
    var phoneBad = !/^(\+?254|0)?[17]\d{8}$/.test($('ofPhone').value.replace(/[\s-]/g, ''));
    $('ofPhone').classList.toggle('of-invalid', phoneBad);
    if (phoneBad) ok = false;

    var ks = keys();
    $('ofTankError').hidden = ks.length > 0;
    if (!ks.length) ok = false;
    $('ofFormError').hidden = ok;
    if (!ok) {
      (form.querySelector('.of-invalid') || btn).scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    var total = 0;
    var lines = ks.map(function (i) {
      var t = TANKS[i], q = qty[i];
      total += t[3] * q;
      return '\u2022 ' + fmt(t[0]) + ' L' + (t[4] ? ' (short)' : '') + ' - ' + t[2] + ' cm x ' + q +
        ' @ KSh ' + fmt(t[3]) + ' = KSh ' + fmt(t[3] * q);
    });
    var when = new Date($('ofDate').value).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
    var msg = ['*NEW TANK ORDER*', '', '*Tanks:*'].concat(lines, [
      '*Estimated total:* KSh ' + fmt(total) + ' (incl. 16% VAT, excl. delivery)',
      '*Color:* ' + v('ofColor'), '',
      '*Name:* ' + v('ofName'),
      '*Phone:* ' + v('ofPhone')
    ], v('ofEmail') ? ['*Email:* ' + v('ofEmail')] : [], [
      '*Address:* ' + v('ofAddress'),
      '*Delivery:* ' + when,
      '*Payment:* ' + $('ofPayment').value,
      '*Installation:* ' + $('ofInstall').value,
      '*Flood tap:* ' + $('ofFlood').value
    ], v('ofNotes') ? ['*Notes:* ' + v('ofNotes')] : []).join('\n');
    window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
  });
})();
