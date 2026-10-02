const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
const $ = s => document.querySelector(s);
const peso = n => '₱' + Number(n || 0).toLocaleString('en-PH');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2600);
}
const WASH = [
  'radial-gradient(circle at 30% 30%,#f6cfcc,#e7a8ab 70%,#d98f97)',
  'radial-gradient(circle at 70% 30%,#e3ecd4,#bfd0a8 70%,#a8be92)',
  'radial-gradient(circle at 30% 70%,#fbefc4,#f3d98c 70%,#e8c36f)',
  'radial-gradient(circle at 50% 30%,#f1e4da,#dcc9ba 75%)'
];
const wash = id => WASH[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 4];
function icon(cat) {
  const c = (cat || '').toLowerCase();
  if (/bag|tote|pouch/.test(c)) return 'ti-shopping-bag';
  if (/flower|bouquet/.test(c)) return 'ti-flower';
  if (/ami|plush|toy|doll/.test(c)) return 'ti-paw';
  if (/hat|cap|wear|top/.test(c)) return 'ti-hanger';
  return 'ti-sparkles';
}
