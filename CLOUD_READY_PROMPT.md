# AdoraPay Mini App — Cloud Migration Prompt

Bu loyihani boshqa Lovable proyektga remix qilib, quyidagi promptni yuboring:

---

## PROMPT (Keyingi Lovable ga yuboring):

```
Bu loyiha Telegram mini app — AdoraPay. Hozirda barcha ma'lumotlar session-based mock holatda ishlaydi (src/lib/store.ts). Endi Lovable Cloud (Supabase) ulash kerak. Quyidagi ishlarni qiling:

### 1. Lovable Cloud ni yoqing va quyidagi jadvallarni yarating:

**users** jadvali:
- id (text, primary key) — Telegram user ID
- name (text)
- username (text)
- balance (integer, default 0)
- referral_count (integer, default 0)
- referral_earnings (integer, default 0)
- referred_by (text, nullable, references users.id)
- level (integer, default 1)
- ads_watched_total (integer, default 0)
- auction_wins (integer, default 0)
- is_admin (boolean, default false)
- created_at (timestamptz, default now())

**withdraw_requests** jadvali:
- id (uuid, primary key, default gen_random_uuid())
- user_id (text, references users.id)
- tanga (integer)
- som (integer)
- card (text)
- status (text, default 'pending') — 'pending' | 'processing' | 'success' | 'rejected'
- reason (text, nullable)
- created_at (timestamptz, default now())

**channel_tasks** jadvali:
- id (uuid, primary key)
- name (text)
- username (text)
- reward (integer)
- is_active (boolean, default true)

**user_channel_completions** jadvali:
- id (uuid, primary key)
- user_id (text, references users.id)
- channel_task_id (uuid, references channel_tasks.id)
- completed_at (timestamptz, default now())
- UNIQUE(user_id, channel_task_id)

**ad_watch_log** jadvali:
- id (uuid, primary key)
- user_id (text, references users.id)
- type (text) — 'vazifa' | 'reklama'
- slot_key (text) — vaqt sloti kaliti
- watched_at (timestamptz, default now())

**auction_entries** jadvali:
- id (uuid, primary key)
- user_id (text, references users.id)
- tickets (integer)
- hour_key (text) — soat kaliti
- created_at (timestamptz, default now())

**auction_results** jadvali:
- id (uuid, primary key)
- user_id (text, references users.id)
- hour_key (text)
- tickets_used (integer)
- won (boolean)
- prize (integer, default 0)
- created_at (timestamptz, default now())

### 2. RLS Policies:
- Har bir foydalanuvchi faqat o'z ma'lumotlarini ko'rishi/o'zgartirishi mumkin
- Admin (is_admin = true) barcha ma'lumotlarga kirish huquqiga ega
- withdraw_requests: foydalanuvchi faqat o'zinikini ko'radi, admin hammasini
- channel_tasks: hamma o'qishi mumkin, faqat admin yozishi mumkin

### 3. Edge Functions:
- **telegram-auth**: Telegram WebApp initData ni tekshiradi, userni yaratadi/topadi
- **watch-ad**: Reklama ko'rish logikasi — slot tekshirish, chipta berish
- **enter-auction**: Chiptalarni auksionga qo'yish
- **run-auction**: Har soatda cron bilan ishlaydigan auksion natijasi
- **withdraw**: Pul yechish so'rovi yaratish
- **admin-actions**: Admin amallar (approve/reject/balance o'zgartirish)

### 4. Telegram Bot Token:
- BOT_TOKEN secretga qo'shing — Telegram WebApp autentifikatsiya uchun
- ADMIN_IDS secretga qo'shing — admin Telegram ID lari (comma-separated)

### 5. src/lib/store.ts ni o'chirib, uning o'rniga Supabase client ishlatish:
- Har bir sahifa Supabase dan ma'lumot oladi
- Real-time subscriptions withdraw_requests uchun
- Telegram WebApp SDK orqali foydalanuvchini aniqlash

### 6. Telegram WebApp SDK ulash:
- index.html ga <script src="https://telegram.org/js/telegram-web-app.js"></script> qo'shing
- window.Telegram.WebApp.initData orqali auth qiling
- Theme ni Telegram ranglariga moslashtiring

### MUHIM: 
- Hozirgi UI/UX dizaynni o'zgartirmang
- Faqat data source ni mock dan real database ga o'tkazing
- store.ts dagi barcha logikani saqlang, faqat Supabase bilan almashtiring
```

---

## Fayl tuzilishi hozirda:
- `src/lib/store.ts` — Barcha mock logika (users, withdraw, ads, auction, referral)
- `src/components/pages/` — Barcha sahifalar (Vazifalar, Reklama, Referal, Top, Profil, Admin)
- `src/components/Header.tsx` — Dinamik header (balans ko'rsatadi)
- `src/components/BottomNav.tsx` — Pastki navigatsiya

## Logika qisqacha:
- **Vazifalar**: 10 ta reklama ko'rish (har 6 soatda yangilanadi: 00, 06, 12, 18) = 250 tanga + kanal vazifalari
- **Reklama**: Har 10 daqiqada 5 ta reklama = 10 chipta, chiptalar soatlik auksionga qo'yiladi
- **Auksion**: Har soatda, ko'p chipta = yuqori yutish ehtimoli (max 80%), sovrin 100-220 tanga
- **Referal**: 5 daraja (5%, 7%, 15%, 20%, 25%), do'stlar ishlaganidan foiz
- **Profil**: Pul yechish (min 10000 tanga, 1 tanga = 1.1764 so'm), to'lovlar tarixi
- **Admin**: Statistika, ID orqali user qidirish, so'rovlar boshqarish, kanal qo'shish
- **Top**: 30 ta eng ko'p tangali foydalanuvchilar
