/* Roto Tanks: quantity, live totals, cart and direct WhatsApp ordering */
(function () {
  'use strict';

  var PHONE = '254733355444';
  var STORAGE_KEY = 'roto_cart_v1';
  var MAX_QTY = 999;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(n) { return 'KSh ' + Number(n).toLocaleString('en-US'); }
  function clampQty(v) {
    var n = parseInt(v, 10);
    if (!n || n < 1) return 1;
    return n > MAX_QTY ? MAX_QTY : n;
  }
  function waLink(text) { return 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(text); }
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { node.appendChild(c); });
    return node;
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = $('.menu-toggle');
  var nav = $('#mainNav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Category filter and search ---------- */
  var filters = $('#filters');
  var searchBar = $('#searchBar');
  var searchInput = $('#searchInput');
  var noResults = $('#noResults');
  var orderForm = $('#order-form');
  var activeCat = 'all';

  function applyView() {
    var term = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var anyVisible = false;
    $$('.product-group').forEach(function (group) {
      var inCategory = term || activeCat === 'all' || group.getAttribute('data-cat') === activeCat;
      var shown = 0;
      $$('.product-card', group).forEach(function (card) {
        var match = !term || card.getAttribute('data-search').indexOf(term) !== -1;
        card.hidden = !match;
        if (match) shown++;
      });
      group.hidden = !inCategory || shown === 0;
      if (!group.hidden) anyVisible = true;
    });
    if (orderForm) orderForm.hidden = !!term || !(activeCat === 'all' || activeCat === 'water-tanks');
    if (noResults) noResults.hidden = anyVisible;
  }

  function setCategory(cat) {
    activeCat = cat;
    if (filters) {
      $$('.filter', filters).forEach(function (b) {
        var on = b.getAttribute('data-cat') === cat;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
    applyView();
  }

  if (filters) {
    filters.addEventListener('click', function (e) {
      var btn = e.target.closest('.filter');
      if (!btn) return;
      if (searchInput) searchInput.value = '';
      setCategory(btn.getAttribute('data-cat'));
    });
  }

  function closeSearch() {
    if (!searchBar) return;
    searchBar.classList.remove('open');
    searchInput.value = '';
    applyView();
  }
  var searchToggle = $('#searchToggle');
  if (searchToggle && searchBar && searchInput) {
    searchToggle.addEventListener('click', function () {
      if (searchBar.classList.contains('open')) { closeSearch(); return; }
      searchBar.classList.add('open');
      searchInput.focus();
      var shop = $('#shop');
      if (shop) shop.scrollIntoView();
    });
    $('#searchClose').addEventListener('click', closeSearch);
    searchInput.addEventListener('input', function () {
      if (searchInput.value.trim() && activeCat !== 'all') setCategory('all');
      else applyView();
    });
    searchInput.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSearch(); });
  }

  /* ---------- Product cards: quantity stepper, live total, Order now ---------- */
  function cardData(card) {
    return {
      id: card.getAttribute('data-id'),
      name: card.getAttribute('data-name'),
      price: Number(card.getAttribute('data-price')),
      image: card.getAttribute('data-image')
    };
  }
  function cardQty(card) { return clampQty($('.step-input', card).value); }

  function updateCard(card) {
    var d = cardData(card);
    var q = cardQty(card);
    var total = d.price * q;
    $('.line-total strong', card).textContent = money(total);
    $('.step-dec', card).disabled = q <= 1;
    $('.step-inc', card).disabled = q >= MAX_QTY;
    $('.order-btn', card).setAttribute('href', waLink(
      'Hello Roto Tanks, I would like to order:\n\n' +
      q + ' x ' + d.name + ' (' + money(d.price) + ' each)\n' +
      'Total: ' + money(total) + '\n\n' +
      'Please confirm availability and delivery. Thank you.'
    ));
  }
  function setCardQty(card, q) {
    $('.step-input', card).value = clampQty(q);
    updateCard(card);
  }

  $$('.product-card').forEach(updateCard);

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.product-card');
    if (!card) return;
    if (e.target.closest('.step-dec')) setCardQty(card, cardQty(card) - 1);
    else if (e.target.closest('.step-inc')) setCardQty(card, cardQty(card) + 1);
    else if (e.target.closest('.btn-cart')) {
      var d = cardData(card);
      var q = cardQty(card);
      addToCart(d, q);
      toast(q + ' x ' + d.name + ' added to cart');
    }
  });

  /* Quantity typing (cards and cart share the same rules) */
  document.addEventListener('input', function (e) {
    var input = e.target.closest('.step-input');
    if (!input) return;
    input.value = input.value.replace(/\D/g, '').slice(0, 3);
    var card = input.closest('.product-card');
    if (card) updateCard(card);
  });
  document.addEventListener('focusout', function (e) {
    var input = e.target.closest ? e.target.closest('.step-input') : null;
    if (!input) return;
    var card = input.closest('.product-card');
    if (card) setCardQty(card, input.value);
  });
  document.addEventListener('keydown', function (e) {
    var input = e.target.closest ? e.target.closest('.step-input') : null;
    if (!input) return;
    if (e.key === 'Enter') { input.blur(); return; }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    var next = clampQty(input.value) + (e.key === 'ArrowUp' ? 1 : -1);
    var card = input.closest('.product-card');
    if (card) setCardQty(card, next);
    else {
      var item = input.closest('.cart-item');
      if (item) changeQty(item.getAttribute('data-id'), clampQty(next));
    }
  });

  /* ---------- Cart ---------- */
  var cart = loadCart();
  var drawer = $('#cartDrawer');
  var backdrop = $('#cartBackdrop');
  var cartBody = $('#cartBody');
  var cartFoot = $('#cartFoot');
  var cartBadge = $('#cartBadge');
  var cartToggle = $('#cartToggle');
  var lastFocus = null;

  function loadCart() {
    try {
      var raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!Array.isArray(raw)) return [];
      return raw.filter(function (i) {
        return i && typeof i.id === 'string' && typeof i.name === 'string' && Number(i.price) > 0;
      }).map(function (i) {
        return { id: i.id, name: i.name, price: Number(i.price), image: String(i.image || ''), qty: clampQty(i.qty) };
      });
    } catch (err) { return []; }
  }
  function saveCart() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (err) { /* storage blocked */ }
  }
  function cartCount() { return cart.reduce(function (s, i) { return s + i.qty; }, 0); }
  function cartTotal() { return cart.reduce(function (s, i) { return s + i.qty * i.price; }, 0); }

  function addToCart(d, q) {
    var found = cart.filter(function (i) { return i.id === d.id; })[0];
    if (found) found.qty = clampQty(found.qty + q);
    else cart.push({ id: d.id, name: d.name, price: d.price, image: d.image, qty: clampQty(q) });
    saveCart();
    renderCart();
  }
  function changeQty(id, q) {
    cart.forEach(function (i) { if (i.id === id) i.qty = clampQty(q); });
    saveCart();
    renderCart();
  }
  function removeItem(id) {
    cart = cart.filter(function (i) { return i.id !== id; });
    saveCart();
    renderCart();
  }

  function cartMessage() {
    var lines = cart.map(function (i, n) {
      return (n + 1) + '. ' + i.qty + ' x ' + i.name + ' - ' + money(i.qty * i.price);
    });
    return 'Hello Roto Tanks, I would like to order:\n\n' + lines.join('\n') +
      '\n\nTotal: ' + money(cartTotal()) + '\n\nPlease confirm availability and delivery. Thank you.';
  }

  function renderCart() {
    if (!drawer) return;
    var count = cartCount();
    if (cartBadge) {
      cartBadge.textContent = count > 99 ? '99+' : String(count);
      cartBadge.hidden = count === 0;
    }
    if (cartToggle) {
      cartToggle.setAttribute('aria-label', count ? 'Open cart, ' + count + (count === 1 ? ' item' : ' items') : 'Open cart');
    }
    $('#cartCountLabel').textContent = count ? '(' + count + (count === 1 ? ' item)' : ' items)') : '';

    cartBody.textContent = '';
    if (!cart.length) {
      cartFoot.hidden = true;
      var browse = el('button', { type: 'button', 'class': 'btn btn-primary', 'data-close': '1', text: 'Browse products' });
      cartBody.appendChild(el('div', { 'class': 'cart-empty' }, [
        el('strong', { text: 'Your cart is empty' }),
        el('p', { text: 'Add products and send them all in one WhatsApp message.' }),
        browse
      ]));
      return;
    }
    cartFoot.hidden = false;
    cart.forEach(function (i) {
      var img = el('img', { 'class': 'ci-img', src: i.image, alt: i.name, width: '68', height: '68', loading: 'lazy' });
      var stepper = el('div', { 'class': 'stepper', role: 'group', 'aria-label': 'Quantity for ' + i.name }, [
        el('button', { type: 'button', 'data-act': 'dec', 'aria-label': 'Decrease quantity', text: '\u2212' }),
        el('input', { 'class': 'step-input', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: '3', value: String(i.qty), 'aria-label': 'Quantity' }),
        el('button', { type: 'button', 'data-act': 'inc', 'aria-label': 'Increase quantity', text: '+' })
      ]);
      $('button[data-act="dec"]', stepper).disabled = i.qty <= 1;
      $('button[data-act="inc"]', stepper).disabled = i.qty >= MAX_QTY;
      var info = el('div', {}, [
        el('div', { 'class': 'ci-name', text: i.name }),
        el('div', { 'class': 'ci-unit', text: money(i.price) + ' each' }),
        el('div', { 'class': 'ci-row' }, [stepper, el('div', { 'class': 'ci-total', text: money(i.qty * i.price) })]),
        el('button', { type: 'button', 'class': 'ci-remove', 'data-act': 'remove', text: 'Remove' })
      ]);
      cartBody.appendChild(el('div', { 'class': 'cart-item', 'data-id': i.id }, [img, info]));
    });
    $('#cartTotal').textContent = money(cartTotal());
    $('#cartOrder').setAttribute('href', waLink(cartMessage()));
  }

  function focusables() {
    return $$('button, a[href], input', drawer).filter(function (n) { return !n.disabled && n.offsetParent !== null; });
  }
  function openCart() {
    if (!drawer) return;
    lastFocus = document.activeElement;
    drawer.classList.add('open');
    backdrop.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    hideToast();
    $('#cartClose').focus();
  }
  function closeCart() {
    if (!drawer || !drawer.classList.contains('open')) return;
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (drawer) {
    cartToggle.addEventListener('click', openCart);
    $('#cartClose').addEventListener('click', closeCart);
    backdrop.addEventListener('click', closeCart);
    $('#cartClear').addEventListener('click', function () {
      cart = [];
      saveCart();
      renderCart();
    });
    cartBody.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) {
        closeCart();
        var shop = $('#shop');
        if (shop) shop.scrollIntoView();
        return;
      }
      var item = e.target.closest('.cart-item');
      var btn = e.target.closest('[data-act]');
      if (!item || !btn) return;
      var id = item.getAttribute('data-id');
      var current = cart.filter(function (i) { return i.id === id; })[0];
      if (!current) return;
      var act = btn.getAttribute('data-act');
      if (act === 'inc') changeQty(id, current.qty + 1);
      else if (act === 'dec') changeQty(id, current.qty - 1);
      else if (act === 'remove') removeItem(id);
    });
    cartBody.addEventListener('change', function (e) {
      var input = e.target.closest('.step-input');
      var item = input && input.closest('.cart-item');
      if (item) changeQty(item.getAttribute('data-id'), clampQty(input.value));
    });
    document.addEventListener('keydown', function (e) {
      if (!drawer.classList.contains('open')) return;
      if (e.key === 'Escape') { closeCart(); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    window.addEventListener('storage', function (e) {
      if (e.key === STORAGE_KEY) { cart = loadCart(); renderCart(); }
    });
  }

  /* ---------- Toast ---------- */
  var toastEl = $('#toast');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    $('#toastMsg').textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 3800);
  }
  function hideToast() {
    if (toastEl) toastEl.classList.remove('show');
  }
  var toastView = $('#toastView');
  if (toastView) toastView.addEventListener('click', openCart);

  renderCart();
  applyView();
})();
