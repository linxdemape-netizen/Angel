# AXKN07 crochet: setup guide

Plain HTML, CSS and JavaScript. No build step. Files: `index.html` (shop), `admin.html` (your admin), `style.css`, `app.js`, `admin.js`, `common.js`, `config.js`, `supabase-setup.sql`.

## 1. Supabase (free)
1. Create a project at supabase.com.
2. Go to Authentication > Users > Add user. Enter your email and a strong password. Tick "Auto confirm".
3. Go to Authentication > Sign In / Providers and turn OFF "Allow new users to sign up".
4. Open `supabase-setup.sql`, replace `YOUR_ADMIN_EMAIL` with that same email, paste it into SQL Editor, and press Run.
5. Go to Project Settings > API. Copy the Project URL and the anon public key.

## 2. Edit config.js
Paste the URL and anon key. Set `MESSENGER_USERNAME` to your Facebook username (the part after facebook.com/ or m.me/). You can also change it later in admin > Shop settings.

## 3. GitHub and Netlify
1. Upload all files to a GitHub repository (keep them in the main folder, not a subfolder).
2. On Netlify: Add new site > Import from Git > pick the repo. Leave build command empty, publish directory `.`
3. Shop: `https://your-site.netlify.app`  Admin: `https://your-site.netlify.app/admin.html`

The anon key is meant to be public. Safety comes from the database rules in the SQL file: customers can only read visible items and send an order. Only your email can edit.

## Using it
Admin > Products to add items and photos (photos are shrunk automatically). Orders show up when a customer taps Send order. Change the status as you chat with them. Reviews are added by you only.
