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

3. `.env.local` dosyasinda Supabase degerlerini doldurun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

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
```

## Sonraki Isler

- Drizzle ORM kurulumu ve migration dosyalari
- `profiles/resumes/resume_versions` tablolari
- Editor + autosave ozellikleri
- ATS skor endpoint iskeleti
