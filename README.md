# Resume Builder (Next.js + Supabase)

Bu repo, eski React + Vite CV uygulamasinin Next.js App Router tabanli yapiya modernizasyonunu icerir.

## Mevcut Durum

- Next.js App Router iskeleti eklendi.
- Public auth sayfalari eklendi: `/login`, `/register`.
- Korumali alan iskeleti eklendi: `/dashboard`.
- Supabase session middleware akisi eklendi.

## Kurulum

1. Bagimliliklari yukleyin:

```bash
npm install
```

2. Ortam degiskenlerini hazirlayin:

```bash
cp .env.example .env.local
```

3. `.env.local` dosyasinda gerekli degerleri doldurun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

4. Gelistirme sunucusunu baslatin:

```bash
npm run dev
```

Uygulama varsayilan olarak `http://localhost:3000` adresinde calisir.

## Komutlar

```bash
npm run dev
npm run lint
npm run build
npm run start
npm run db:generate
npm run db:migrate
npm run db:studio
```

## Veritabani

- Drizzle schema dosyasi: `src/db/schema.ts`
- Ilk tablolar: `profiles`, `resumes`, `resume_versions`
- Migration klasoru: `drizzle/`

## Sonraki Isler

- Resume editor ve autosave akisi
- RLS policy migrationlari
- ATS skor endpoint iskeleti
