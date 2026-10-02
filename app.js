let products = [], reviews = [], settings = {}, cat = 'All', q = '', cur = null, orderNo = null, custName = '', orderNote = '';
let cart = JSON.parse(localStorage.getItem('ax_cart') || '[]');
let fav = JSON.parse(localStorage.getItem('ax_fav') || '[]');
const saveCart = () => { localStorage.setItem('ax_cart', JSON.stringify(cart)); badge(); };
const total = () => cart.reduce((s, i) => s + i.price * i.qty, 0);
const count = () => cart.reduce((s, i) => s + i.qty, 0);
function badge(bump) {
  const b = $('#cnt'); b.hidden = !count(); b.textContent = count();
  if (bump) { const e = $('#bCart'); e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
}
const isClosed = () => settings.closed === '1';

async function init() {
  badge();
  const [p, r, s] = await Promise.all([
    sb.from('products').select('*').eq('hidden', false).order('sort').order('created_at', { ascending: false }),
    sb.from('reviews').select('*').eq('hidden', false).order('pinned', { ascending: false }).order('created_at', { ascending: false }),
    sb.from('settings').select('*')
  ]);
  if (p.error) { $('#grid').innerHTML = '<div class="empty">Couldn\'t load the shop. Check config.js and refresh.</div>'; return; }
  products = p.data || []; reviews = r.data || [];
  settings = Object.fromEntries((s.data || []).map(x => [x.key, x.value]));
  if (settings.banner) $('#banner').textContent = settings.banner;
  if (isClosed()) { $('#closed').hidden = false; $('#closed').textContent = settings.closed_msg || 'The shop is on a short break. You can still browse.'; }
  renderCats(); renderGrid(); renderReviews(); renderInfo();
  const pid = new URLSearchParams(location.search).get('p');
  if (pid && products.find(x => x.id === pid)) openProduct(pid);
}

function renderCats() {
  const cats = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];
  $('#cats').innerHTML = cats.map(c => `<button class="pill ${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
}
function tagOf(p) {
  if (p.sold_out) return '<span class="tag dark">Sold out</span>';
  if (p.is_best) return '<span class="tag">Best seller</span>';
  if (p.is_new) return '<span class="tag">New</span>';
  if (p.made_to_order) return '<span class="tag">Made to order</span>';
  return '';
}
function card(p) {
  const ph = p.photos && p.photos[0];
  return `<div class="card" data-open="${p.id}"><div class="img" ${ph ? '' : `style="background:${wash(p.id)}"`}>
    ${ph ? `<img src="${esc(ph)}" loading="lazy" alt="${esc(p.name)}">` : `<i class="ti ${icon(p.category)}"></i>`}
    ${tagOf(p)}<button class="heart ${fav.includes(p.id) ? 'on' : ''}" data-fav="${p.id}" aria-label="Favorite"><i class="ti ti-heart"></i></button></div>
    <div class="nm">${esc(p.name)}</div>
    <div class="row"><span class="pr" ${p.sold_out ? 'style="color:#9a8478"' : ''}>${peso(p.price)}</span>
    ${p.sold_out ? '' : `<button class="add" data-add="${p.id}" aria-label="Add ${esc(p.name)} to basket"><i class="ti ti-plus"></i></button>`}</div></div>`;
}
function renderGrid() {
  const t = q.trim().toLowerCase();
  const list = products.filter(p => (cat === 'All' || p.category === cat) && (!t || (p.name + ' ' + (p.description || '') + ' ' + (p.category || '')).toLowerCase().includes(t)));
  $('#grid').innerHTML = list.length ? list.map(card).join('') : '<div class="empty">Nothing here yet. Try another category.</div>';
}
function stars(n) { return '★'.repeat(n) + '☆'.repeat(5 - n); }
function revCard(r) {
  return `<div class="rev"><span class="st">${stars(r.rating || 5)}</span><q>${esc(r.comment)}</q><div class="by">${esc(r.name)}</div>${r.photo ? `<img src="${esc(r.photo)}" loading="lazy" alt="Review from ${esc(r.name)}">` : ''}</div>`;
}
function renderReviews() {
  $('#reviews').hidden = !reviews.length;
  $('#revs').innerHTML = reviews.map(revCard).join('');
}
function renderInfo() {
  const parts = [];
  if (settings.payment) parts.push(`<h3>Payment</h3>${esc(settings.payment)}`);
  if (settings.shipping) parts.push(`<h3>Shipping</h3>${esc(settings.shipping)}`);
  if (settings.faq) parts.push(`<h3>FAQ</h3>${esc(settings.faq)}`);
  $('#info').innerHTML = parts.join('') || 'Message us on Messenger for any questions.';
}

function open_(html) { $('#panel').innerHTML = `<button class="x" data-close aria-label="Close"><i class="ti ti-x"></i></button>` + html; $('#ov').hidden = false; document.body.style.overflow = 'hidden'; $('#panel').scrollTop = 0; }
function close_() { $('#ov').hidden = true; document.body.style.overflow = ''; cur = null; }

function openProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  cur = { p, color: (p.colors || [])[0] || '', qty: 1 };
  const photos = p.photos && p.photos.length ? p.photos.map(u => `<img src="${esc(u)}" alt="${esc(p.name)}">`).join('') : `<div style="background:${wash(p.id)}"><i class="ti ${icon(p.category)}"></i></div>`;
  const pr = reviews.filter(r => r.product_id === p.id);
  open_(`<div class="gal">${photos}</div>
    <div class="row" style="margin-top:12px"><h2 style="margin:0">${esc(p.name)}</h2><span class="pr" style="font-size:22px">${peso(p.price)}</span></div>
    <div class="meta">${p.made_to_order ? 'Made to order' : 'Ready stock'}${p.lead_time ? ' · ' + esc(p.lead_time) : ''}${p.material ? ' · ' + esc(p.material) : ''}${p.size ? ' · ' + esc(p.size) : ''}</div>
    <p style="white-space:pre-line">${esc(p.description || '')}</p>
    ${(p.colors || []).length ? `<span class="lbl">Color</span><div class="chips" id="chips">${p.colors.map((c, i) => `<button class="chip ${i ? '' : 'on'}" data-color="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
    <span class="lbl">Custom request (optional)</span><input id="pnote" placeholder="Name on item, size, special color" maxlength="120">
    <div class="row" style="margin-top:14px"><div class="qty"><button data-q="-1" aria-label="Less">−</button><b id="qv">1</b><button data-q="1" aria-label="More">+</button></div>
    ${p.sold_out || isClosed() ? '<span class="btn soft">Not available right now</span>' : '<button class="btn" data-addcur>Add to basket</button>'}</div>
    <div class="acts"><button class="btn soft sm" data-share="${p.id}"><i class="ti ti-share"></i> Share</button></div>
    ${pr.length ? `<h2>Reviews</h2><div class="revs">${pr.map(revCard).join('')}</div>` : ''}`);
}
function addToCart(p, color, qty, note) {
  const key = p.id + '|' + color + '|' + (note || '');
  const ex = cart.find(i => i.key === key);
  if (ex) ex.qty += qty; else cart.push({ key, id: p.id, name: p.name, price: Number(p.price), color, qty, note: note || '' });
  saveCart(); badge(true); toast('Added to your basket');
}

function text() {
  const d = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  const lines = cart.map(i => `${i.qty} x ${i.name}${i.color ? ' (' + i.color + ')' : ''}${i.note ? ' [' + i.note + ']' : ''} - ${peso(i.price * i.qty)}`);
  return `AXKN07 crochet\nOrder #${orderNo}\nDate: ${d}\nFor: ${custName || '(your name)'}\n\n${lines.join('\n')}\n${orderNote ? '\nNote: ' + orderNote + '\n' : ''}\nTotal: ${peso(total())}`;
}
function receipt() {
  const d = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
  return `<div class="receipt" id="receipt"><div class="rc"><div class="lg"><b>AXKN07</b><i>crochet</i></div>
    <div class="mt"><span>Order #${orderNo}</span><span>${d}</span></div>
    <div style="font-size:14px;margin-bottom:8px">For: <b>${esc(custName) || '(your name)'}</b></div>
    <div class="it">${cart.map(i => `<div><span>${i.qty} × ${esc(i.name)}${i.color ? ` <span style="color:#9a7a7c">(${esc(i.color)})</span>` : ''}</span><span>${peso(i.price * i.qty)}</span></div>${i.note ? `<div style="font-size:12px;color:#9a7a7c">${esc(i.note)}</div>` : ''}`).join('')}
    ${orderNote ? `<div style="font-size:12px;color:#9a7a7c">Note: ${esc(orderNote)}</div>` : ''}</div>
    <div class="tot"><span>Total</span><b>${peso(total())}</b></div>
    <div class="ty">thank you for supporting my little shop</div></div></div>`;
}
function openCart() {
  if (!orderNo) orderNo = 'AX-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 5).toUpperCase();
  if (!cart.length) { open_('<h2 style="margin-top:0">Your basket</h2><div class="empty">Your basket is empty. Pick something you love.</div><div class="acts"><button class="btn" data-close>Keep shopping</button></div>'); return; }
  open_(`<h2 style="margin-top:0">Your basket</h2>
    ${cart.map((i, n) => `<div class="line"><div class="t"><div>${esc(i.name)}</div><div class="meta">${i.color ? esc(i.color) + ' · ' : ''}${peso(i.price)}${i.note ? ' · ' + esc(i.note) : ''}</div></div>
      <div class="qty"><button data-cq="${n}|-1" aria-label="Less">−</button><b>${i.qty}</b><button data-cq="${n}|1" aria-label="More">+</button></div></div>`).join('')}
    <span class="lbl">Your name</span><input id="cname" value="${esc(custName)}" placeholder="Maria Santos" maxlength="60">
    <span class="lbl">Note for the order (optional)</span><input id="cnote" value="${esc(orderNote)}" placeholder="Gift wrap, pickup, deadline" maxlength="160">
    <div id="rwrap">${receipt()}</div>
    <div class="acts"><button class="btn soft" data-dl><i class="ti ti-download"></i> Save image</button><button class="btn soft" data-copy><i class="ti ti-copy"></i> Copy text</button></div>
    <div class="acts"><button class="btn pink" data-send ${isClosed() ? 'disabled' : ''}><i class="ti ti-brand-messenger"></i> Send order on Messenger</button></div>
    <div class="step">Step 1: save or copy. Step 2: paste it in the chat.</div>`);
}
const needName = () => { if (!custName.trim()) { toast('Add your name first'); $('#cname')?.focus(); return true; } };
async function copyText(t) {
  try { await navigator.clipboard.writeText(t); } catch (e) {
    const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove();
  }
}
async function download() {
  if (needName()) return;
  toast('Making your image…');
  const c = await html2canvas($('#receipt'), { scale: 2, backgroundColor: null, useCORS: true });
  const a = document.createElement('a'); a.download = `AXKN07-${orderNo}.png`; a.href = c.toDataURL('image/png'); a.click();
}
function send() {
  if (needName()) return;
  const t = text();
  copyText(t);
  const user = (settings.messenger || CONFIG.MESSENGER_USERNAME || '').replace(/^.*(facebook\.com|m\.me)\//, '').replace(/\/$/, '');
  window.open('https://m.me/' + user, '_blank');
  sb.from('orders').insert({ order_no: orderNo, customer: custName.trim(), items: cart, total: total(), note: orderNote }).then(() => { });
  toast('Order copied. Paste it in the chat.');
  cart = []; saveCart(); orderNo = null; orderNote = '';
  setTimeout(close_, 1200);
}

document.addEventListener('click', e => {
  const t = e.target, g = a => t.closest('[' + a + ']');
  let el;
  if ((el = g('data-fav'))) { e.stopPropagation(); const id = el.dataset.fav; fav = fav.includes(id) ? fav.filter(x => x !== id) : [...fav, id]; localStorage.setItem('ax_fav', JSON.stringify(fav)); el.classList.toggle('on'); return; }
  if ((el = g('data-add'))) {
    e.stopPropagation(); const p = products.find(x => x.id === el.dataset.add);
    if (isClosed()) return toast('The shop is on a break right now');
    if ((p.colors || []).length) return openProduct(p.id);
    return addToCart(p, '', 1, '');
  }
  if ((el = g('data-open'))) return openProduct(el.dataset.open);
  if ((el = g('data-cat'))) { cat = el.dataset.cat; renderCats(); renderGrid(); return; }
  if (g('data-close') || t.id === 'ov') return close_();
  if ((el = g('data-color'))) { cur.color = el.dataset.color; document.querySelectorAll('#chips .chip').forEach(c => c.classList.toggle('on', c === el)); return; }
  if ((el = g('data-q'))) { cur.qty = Math.max(1, cur.qty + Number(el.dataset.q)); $('#qv').textContent = cur.qty; return; }
  if (g('data-addcur')) { addToCart(cur.p, cur.color, cur.qty, $('#pnote').value.trim()); return close_(); }
  if ((el = g('data-share'))) {
    const url = location.origin + location.pathname + '?p=' + el.dataset.share, p = products.find(x => x.id === el.dataset.share);
    if (navigator.share) navigator.share({ title: p.name + ' · AXKN07 crochet', url }).catch(() => { });
    else copyText(url).then(() => toast('Link copied'));
    return;
  }
  if ((el = g('data-cq'))) { const [n, d] = el.dataset.cq.split('|'); cart[n].qty += Number(d); if (cart[n].qty < 1) cart.splice(n, 1); saveCart(); return openCart(); }
  if (g('data-dl')) return download();
  if (g('data-copy')) { if (needName()) return; return copyText(text()).then(() => toast('Order copied')); }
  if (g('data-send')) return send();
  if (t.closest('#bCart') || t.closest('#nCart')) return openCart();
  if (t.closest('#bSearch')) { $('#q').scrollIntoView({ block: 'center' }); $('#q').focus(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { q = e.target.value; renderGrid(); }
  if (e.target.id === 'cname') { custName = e.target.value; $('#rwrap').innerHTML = receipt(); }
  if (e.target.id === 'cnote') { orderNote = e.target.value; $('#rwrap').innerHTML = receipt(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#ov').hidden) close_(); });
init();
