-- AXKN07 crochet: run this once in Supabase > SQL Editor.
-- STEP 1: replace YOUR_ADMIN_EMAIL below with the email you will log in with.

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price numeric not null default 0,
  category text,
  description text,
  material text,
  size text,
  colors text[] default '{}',
  photos text[] default '{}',
  lead_time text,
  made_to_order boolean default false,
  is_new boolean default false,
  is_best boolean default false,
  sold_out boolean default false,
  hidden boolean default false,
  sort int default 0,
  created_at timestamptz default now()
);
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating int default 5,
  comment text not null,
  photo text,
  product_id uuid references products(id) on delete set null,
  pinned boolean default false,
  hidden boolean default false,
  created_at timestamptz default now()
);
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no text,
  customer text,
  items jsonb,
  total numeric default 0,
  note text,
  status text default 'New',
  created_at timestamptz default now()
);
create table if not exists settings (key text primary key, value text);

create or replace function is_admin() returns boolean
language sql stable as $$ select coalesce(auth.jwt() ->> 'email', '') = 'YOUR_ADMIN_EMAIL' $$;

alter table products enable row level security;
alter table reviews enable row level security;
alter table orders enable row level security;
alter table settings enable row level security;

-- Customers: read only visible products, reviews and settings. They can send an order, nothing else.
create policy "public read products" on products for select using (hidden = false);
create policy "public read reviews" on reviews for select using (hidden = false);
create policy "public read settings" on settings for select using (true);
create policy "public send order" on orders for insert with check (status = 'New' and total >= 0);

-- Admin: full access, only for your email.
create policy "admin products" on products for all using (is_admin()) with check (is_admin());
create policy "admin reviews" on reviews for all using (is_admin()) with check (is_admin());
create policy "admin orders" on orders for all using (is_admin()) with check (is_admin());
create policy "admin settings" on settings for all using (is_admin()) with check (is_admin());

-- Photo storage
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do nothing;
create policy "public read photos" on storage.objects for select using (bucket_id = 'photos');
create policy "admin upload photos" on storage.objects for insert with check (bucket_id = 'photos' and is_admin());
create policy "admin update photos" on storage.objects for update using (bucket_id = 'photos' and is_admin());
create policy "admin delete photos" on storage.objects for delete using (bucket_id = 'photos' and is_admin());

insert into settings (key, value) values
  ('banner', 'new drop'),
  ('payment', 'GCash or bank transfer. Details are sent in the chat after your order is confirmed.'),
  ('shipping', 'Shipping fee is added after we confirm your address in the chat.'),
  ('faq', 'How long does it take? Ready stock ships in 1 to 3 days. Made to order takes longer, see each item.'),
  ('closed', '0')
on conflict (key) do nothing;
