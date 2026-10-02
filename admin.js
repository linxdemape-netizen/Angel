let tab = 'products', products = [], orders = [], reviews = [], settings = {}, form = null, oq = '';
const STATUS = ['New', 'Confirmed', 'Paid', 'Making', 'Shipped', 'Done', 'Cancelled'];
const dt = d => new Date(d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const ck = (id, label, v) => `<label class="ck"><input type="checkbox" id="${id}" ${v ? 'checked' : ''}> ${label}</label>`;
const val = id => $('#' + id).value.trim();

async function boot() {
  const { data } = await sb.auth.getSession();
  data.session ? show() : ($('#login').hidden = false);
}
async function show() {
  $('#login').hidden = true; $('#app').hidden = false; $('#out').hidden = false;
  await load(); render();
}
async function load() {
  const [p, o, r, s] = await Promise.all([
    sb.from('products').select('*').order('sort').order('created_at', { ascending: false }),
    sb.from('orders').select('*').order('created_at', { ascending: false }),
    sb.from('reviews').select('*').order('created_at', { ascending: false }),
    sb.from('settings').select('*')
  ]);
  if (p.error || o.error) toast('Couldn\'t load data. Check your admin email in the SQL setup.');
  products = p.data || []; orders = o.data || []; reviews = r.data || [];
  settings = Object.fromEntries((s.data || []).map(x => [x.key, x.value]));
}
function render() {
  document.querySelectorAll('#tabs .pill').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('#view').innerHTML = { products: vProducts, orders: vOrders, reviews: vReviews, settings: vSettings }[tab]();
}

function vProducts() {
  return `<button class="btn" data-pform="new"><i class="ti ti-plus"></i> Add product</button>` +
    (products.map((p, i) => `<div class="a-card"><div class="a-row">
      ${p.photos && p.photos[0] ? `<img class="a-th" src="${esc(p.photos[0])}" alt="">` : `<div class="a-th" style="background:${wash(p.id)}"></div>`}
      <div style="flex:1;min-width:120px"><b>${esc(p.name)}</b><div class="meta">${peso(p.price)} · ${esc(p.category || 'No category')}${p.sold_out ? ' · Sold out' : ''}${p.hidden ? ' · Hidden' : ''}</div></div></div>
      <div class="a-row" style="margin-top:8px">
      <button class="btn soft sm" data-pt="${p.id}|sold_out">${p.sold_out ? 'Mark available' : 'Mark sold out'}</button>
      <button class="btn soft sm" data-pt="${p.id}|hidden">${p.hidden ? 'Show' : 'Hide'}</button>
      <button class="btn soft sm" data-mv="${i}|-1" aria-label="Move up"><i class="ti ti-arrow-up"></i></button>
      <button class="btn soft sm" data-mv="${i}|1" aria-label="Move down"><i class="ti ti-arrow-down"></i></button>
      <button class="btn sm" data-pform="${p.id}">Edit</button>
      <button class="btn danger sm" data-del="products|${p.id}">Delete</button></div></div>`).join('') || '<p class="meta">No products yet. Add your first one.</p>');
}
function pForm(id) {
  const p = id === 'new' ? { photos: [], colors: [] } : products.find(x => x.id === id);
  form = { id: id === 'new' ? null : id, photos: [...(p.photos || [])] };
  const cats = [...new Set(products.map(x => x.category).filter(Boolean))];
  open_(`<h2 style="margin-top:0">${form.id ? 'Edit' : 'Add'} product</h2>
    <span class="lbl">Name</span><input id="f_name" value="${esc(p.name)}">
    <span class="lbl">Price (₱)</span><input id="f_price" type="number" min="0" value="${p.price ?? ''}">
    <span class="lbl">Category</span><input id="f_cat" list="cl" value="${esc(p.category)}"><datalist id="cl">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
    <span class="lbl">Description</span><textarea id="f_desc" rows="3">${esc(p.description)}</textarea>
    <span class="lbl">Material</span><input id="f_mat" value="${esc(p.material)}" placeholder="Milk cotton yarn">
    <span class="lbl">Size</span><input id="f_size" value="${esc(p.size)}" placeholder="20 cm tall">
    <span class="lbl">Options (separate with commas)</span><input id="f_colors" value="${esc((p.colors || []).join(', '))}" placeholder="Blush, Sage, Butter">
    <span class="lbl">Lead time</span><input id="f_lead" value="${esc(p.lead_time)}" placeholder="3 to 5 days">
    <div style="margin:12px 0">${ck('f_mto', 'Made to order', p.made_to_order)}${ck('f_new', 'New', p.is_new)}${ck('f_best', 'Best seller', p.is_best)}${ck('f_sold', 'Sold out', p.sold_out)}${ck('f_hid', 'Hidden', p.hidden)}</div>
    <span class="lbl">Photos (the first one is the cover)</span><div class="ph" id="phs"></div>
    <input id="f_files" type="file" accept="image/*" multiple style="margin-top:8px">
    <div class="acts" style="margin-top:16px"><button class="btn" data-psave>Save product</button></div>`);
  drawPhotos();
}
function drawPhotos() {
  $('#phs').innerHTML = form.photos.map((u, i) => `<div><img src="${esc(u)}" alt=""><button data-rmph="${i}" aria-label="Remove photo">×</button></div>`).join('');
}
async function compress(file) {
  const img = await createImageBitmap(file), s = Math.min(1, 1000 / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return new Promise(r => c.toBlob(r, 'image/jpeg', .8));
}
async function upload(file) {
  const b = await compress(file), path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await sb.storage.from('photos').upload(path, b, { contentType: 'image/jpeg' });
  if (error) throw error;
  return sb.storage.from('photos').getPublicUrl(path).data.publicUrl;
}
async function pSave() {
  if (!val('f_name')) return toast('Add a product name');
  const row = {
    name: val('f_name'), price: Number(val('f_price')) || 0, category: val('f_cat'), description: $('#f_desc').value.trim(),
    material: val('f_mat'), size: val('f_size'), lead_time: val('f_lead'), photos: form.photos,
    colors: val('f_colors').split(',').map(s => s.trim()).filter(Boolean),
    made_to_order: $('#f_mto').checked, is_new: $('#f_new').checked, is_best: $('#f_best').checked, sold_out: $('#f_sold').checked, hidden: $('#f_hid').checked
  };
  const { error } = form.id ? await sb.from('products').update(row).eq('id', form.id) : await sb.from('products').insert({ ...row, sort: -1 });
  if (error) return toast('Couldn\'t save: ' + error.message);
  close_(); toast('Saved'); await load(); render();
}

function vOrders() {
  const now = new Date(), m = orders.filter(o => { const d = new Date(o.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const sales = m.filter(o => !['Cancelled', 'New'].includes(o.status)).reduce((s, o) => s + Number(o.total), 0);
  const t = oq.toLowerCase();
  const list = orders.filter(o => !t || ((o.customer || '') + (o.order_no || '') + (o.status || '')).toLowerCase().includes(t));
  const top = {}; orders.filter(o => o.status !== 'Cancelled').forEach(o => (o.items || []).forEach(i => top[i.name] = (top[i.name] || 0) + i.qty));
  const best = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => `${esc(x[0])} (${x[1]})`).join(', ') || 'None yet';
  return `<div class="stat"><div><b>${m.length}</b>Orders this month</div><div><b>${peso(sales)}</b>Confirmed sales</div><div><b>${orders.filter(o => o.status === 'New').length}</b>New orders</div></div>
    <p class="meta">Top sellers: ${best}. Sales count orders marked Confirmed or later.</p>
    <div class="a-row"><input id="oq" placeholder="Search name, order number, status" value="${esc(oq)}" style="flex:1"><button class="btn soft sm" data-csv>Export CSV</button></div>` +
    (list.map(o => `<div class="a-card"><div class="row"><b>${esc(o.customer || 'No name')}</b><span class="pr">${peso(o.total)}</span></div>
      <div class="meta">#${esc(o.order_no)} · ${dt(o.created_at)}</div>
      <div style="margin:6px 0;font-size:14px">${(o.items || []).map(i => `${i.qty} × ${esc(i.name)}${i.color ? ' (' + esc(i.color) + ')' : ''}${i.note ? ' [' + esc(i.note) + ']' : ''}`).join('<br>')}${o.note ? `<br><i>Note: ${esc(o.note)}</i>` : ''}</div>
      <div class="a-row"><select data-st="${o.id}" style="width:auto">${STATUS.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
      <button class="btn danger sm" data-del="orders|${o.id}">Delete</button></div></div>`).join('') || '<p class="meta">No orders yet. They appear here when customers tap Send order.</p>');
}
function csv() {
  const rows = [['Order', 'Date', 'Customer', 'Items', 'Total', 'Status', 'Note']].concat(orders.map(o => [o.order_no, dt(o.created_at), o.customer, (o.items || []).map(i => `${i.qty}x ${i.name}${i.color ? ' (' + i.color + ')' : ''}`).join('; '), o.total, o.status, o.note || '']));
  const t = rows.map(r => r.map(c => '"' + String(c ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/csv' })); a.download = 'axkn07-orders.csv'; a.click();
}

function vReviews() {
  return `<button class="btn" data-rform="new"><i class="ti ti-plus"></i> Add review</button>` +
    (reviews.map(r => `<div class="a-card"><div class="row"><b>${esc(r.name)}</b><span style="color:#d9a13b">${'★'.repeat(r.rating)}</span></div>
      <div style="font-size:14px;margin:4px 0">${esc(r.comment)}</div><div class="meta">${r.pinned ? 'Pinned · ' : ''}${r.hidden ? 'Hidden' : 'Visible'}</div>
      <div class="a-row" style="margin-top:6px"><button class="btn soft sm" data-rt="${r.id}|pinned">${r.pinned ? 'Unpin' : 'Pin'}</button><button class="btn soft sm" data-rt="${r.id}|hidden">${r.hidden ? 'Show' : 'Hide'}</button>
      <button class="btn sm" data-rform="${r.id}">Edit</button><button class="btn danger sm" data-del="reviews|${r.id}">Delete</button></div></div>`).join('') || '<p class="meta">No reviews yet. Add real ones from your happy customers.</p>');
}
function rForm(id) {
  const r = id === 'new' ? { rating: 5 } : reviews.find(x => x.id === id);
  form = { id: id === 'new' ? null : id, photo: r.photo || '' };
  open_(`<h2 style="margin-top:0">${form.id ? 'Edit' : 'Add'} review</h2>
    <span class="lbl">Customer name (first name is fine)</span><input id="r_name" value="${esc(r.name)}">
    <span class="lbl">Rating</span><select id="r_rate">${[5, 4, 3, 2, 1].map(n => `<option value="${n}" ${n === r.rating ? 'selected' : ''}>${n} stars</option>`).join('')}</select>
    <span class="lbl">Comment</span><textarea id="r_com" rows="3">${esc(r.comment)}</textarea>
    <span class="lbl">Product (optional)</span><select id="r_prod"><option value="">None, show on home page only</option>${products.map(p => `<option value="${p.id}" ${p.id === r.product_id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
    <span class="lbl">Photo (optional, hide private details first)</span><div class="ph" id="rph"></div><input id="r_file" type="file" accept="image/*" style="margin-top:8px">
    <div style="margin:12px 0">${ck('r_pin', 'Pinned', r.pinned)}${ck('r_hid', 'Hidden', r.hidden)}</div>
    <div class="acts"><button class="btn" data-rsave>Save review</button></div>`);
  drawRph();
}
const drawRph = () => $('#rph').innerHTML = form.photo ? `<div><img src="${esc(form.photo)}" alt=""><button data-rmr aria-label="Remove photo">×</button></div>` : '';
async function rSave() {
  if (!val('r_name') || !val('r_com')) return toast('Add a name and a comment');
  const row = { name: val('r_name'), rating: Number($('#r_rate').value), comment: val('r_com'), photo: form.photo || null, product_id: $('#r_prod').value || null, pinned: $('#r_pin').checked, hidden: $('#r_hid').checked };
  const { error } = form.id ? await sb.from('reviews').update(row).eq('id', form.id) : await sb.from('reviews').insert(row);
  if (error) return toast('Couldn\'t save: ' + error.message);
  close_(); toast('Saved'); await load(); render();
}

function vSettings() {
  const s = settings, f = (k, l, ph, area) => `<span class="lbl">${l}</span>${area ? `<textarea id="s_${k}" rows="3">${esc(s[k])}</textarea>` : `<input id="s_${k}" value="${esc(s[k])}" placeholder="${ph || ''}">`}`;
  return `<div class="a-card">${f('messenger', 'Messenger username or link', 'your.facebook.username')}${f('banner', 'Small banner text on the home page', 'new drop')}
    ${f('payment', 'Payment info', '', 1)}${f('shipping', 'Shipping info', '', 1)}${f('faq', 'FAQ', '', 1)}
    <div style="margin:12px 0">${ck('s_closed', 'Shop on a break (customers can browse but not order)', s.closed === '1')}</div>
    ${f('closed_msg', 'Message shown while on a break', 'Back on Monday')}
    <div class="acts" style="margin-top:14px"><button class="btn" data-ssave>Save settings</button></div></div>`;
}
async function sSave() {
  const rows = ['messenger', 'banner', 'payment', 'shipping', 'faq', 'closed_msg'].map(k => ({ key: k, value: val('s_' + k) })).concat({ key: 'closed', value: $('#s_closed').checked ? '1' : '0' });
  const { error } = await sb.from('settings').upsert(rows);
  if (error) return toast('Couldn\'t save: ' + error.message);
  toast('Saved'); await load();
}

function open_(h) { $('#panel').innerHTML = `<button class="x" data-close aria-label="Close"><i class="ti ti-x"></i></button>` + h; $('#ov').hidden = false; document.body.style.overflow = 'hidden'; }
function close_() { $('#ov').hidden = true; document.body.style.overflow = ''; }

document.addEventListener('click', async e => {
  const t = e.target, g = a => t.closest('[' + a + ']'); let el;
  if (t.id === 'go') {
    const { error } = await sb.auth.signInWithPassword({ email: val('em'), password: $('#pw').value });
    return error ? $('#lerr').textContent = 'Wrong email or password. Try again.' : show();
  }
  if (t.id === 'out') { await sb.auth.signOut(); return location.reload(); }
  if ((el = g('data-tab'))) { tab = el.dataset.tab; return render(); }
  if (g('data-close') || t.id === 'ov') return close_();
  if ((el = g('data-pform'))) return pForm(el.dataset.pform);
  if (g('data-psave')) return pSave();
  if ((el = g('data-rmph'))) { form.photos.splice(el.dataset.rmph, 1); return drawPhotos(); }
  if ((el = g('data-pt'))) { const [id, k] = el.dataset.pt.split('|'), p = products.find(x => x.id === id); await sb.from('products').update({ [k]: !p[k] }).eq('id', id); await load(); return render(); }
  if ((el = g('data-mv'))) {
    const [i, d] = el.dataset.mv.split('|').map(Number), j = i + d; if (j < 0 || j >= products.length) return;
    [products[i], products[j]] = [products[j], products[i]];
    await Promise.all(products.map((p, n) => sb.from('products').update({ sort: n }).eq('id', p.id)));
    await load(); return render();
  }
  if ((el = g('data-del'))) {
    const [tb, id] = el.dataset.del.split('|'); if (!confirm('Delete this for good?')) return;
    await sb.from(tb).delete().eq('id', id); await load(); return render();
  }
  if ((el = g('data-rform'))) return rForm(el.dataset.rform);
  if (g('data-rsave')) return rSave();
  if (g('data-rmr')) { form.photo = ''; return drawRph(); }
  if ((el = g('data-rt'))) { const [id, k] = el.dataset.rt.split('|'), r = reviews.find(x => x.id === id); await sb.from('reviews').update({ [k]: !r[k] }).eq('id', id); await load(); return render(); }
  if (g('data-ssave')) return sSave();
  if (g('data-csv')) return csv();
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset.st) { await sb.from('orders').update({ status: t.value }).eq('id', t.dataset.st); await load(); toast('Status updated'); render(); }
  if (t.id === 'f_files' || t.id === 'r_file') {
    toast('Uploading…');
    try {
      for (const f of t.files) { const u = await upload(f); if (t.id === 'f_files') form.photos.push(u); else form.photo = u; }
      t.id === 'f_files' ? drawPhotos() : drawRph(); toast('Photo added'); t.value = '';
    } catch (err) { toast('Upload failed: ' + err.message); }
  }
});
document.addEventListener('input', e => { if (e.target.id === 'oq') { oq = e.target.value; const pos = e.target.selectionStart; render(); const n = $('#oq'); n.focus(); n.setSelectionRange(pos, pos); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pw') $('#go').click(); });
boot();
