# Resume Builder (Next.js + Supabase + Drizzle)

Bu repo, eski React + Vite CV uygulamasinin Next.js App Router tabanli yapiya modernizasyonunu icerir.

## Mevcut Durum

- Next.js App Router iskeleti eklendi.
- Public auth sayfalari eklendi: `/login`, `/register`.
- Korumali alan iskeleti eklendi: `/dashboard`.
- Supabase session middleware akisi eklendi.
- Drizzle ORM ile `profiles`, `resumes`, `resume_versions` tablolari eklendi.
- RLS policy kurallari migration dosyasina eklendi.
- Resume editor sayfasi eklendi: `/resumes/[resumeId]`.
- Kisisel bilgiler ve profil ozeti icin 1.5 sn debounce autosave akisi eklendi.
- Profil ayarlari sayfasi eklendi: `/settings`.
- Auth kullanicisi icin `profiles` tablosunda otomatik profil bootstrap akisi eklendi.
- Rule-based ATS skor endpointi eklendi: `/api/ats/score`.
- Editor kapsaminda `experience`, `education` ve `projects` bolumleri dinamik olarak eklendi.
- ATS analizleri `job_targets` tablosuna kaydedilerek editorde gecmis listesi gosterildi.
- Yazdirilabilir ATS-uyumlu onizleme sayfasi eklendi: `/resumes/[resumeId]/preview`.
- Server tarafinda PDF export endpointi eklendi: `/api/resumes/[resumeId]/export`.
- Login/register islemleri ve ATS skor endpointi icin temel rate limit korumasi eklendi.
- Resume editor autosave akisina oturumlar arasi yazma cakismasi korumasi eklendi.
- ATS score ve autosave endpointleri icin API seviye test senaryolari eklendi.
- Resume settings ve export endpointleri icin API seviye test senaryolari eklendi.

## Kurulum

1. Bagimliliklari yukleyin:

```bash
npm install
```

2. Ortam dosyalarini olusturun:

```bash
cp .env.example .env
cp .env.example .env.local
```

3. `.env.local` icinde en az su degerleri doldurun:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` veya `DATABASE_DEV_URL`

4. Uygulamayi baslatin:

```bash
npm run dev
```

## Docker Profilleri

`docker-compose.yml` dosyasi dev/test/prod ayri profile mantigi ile calisir.

- `dev`
  - `postgres-dev` -> host port: `5440`
  - `app-dev` -> host port: `3000`
  - `pgadmin` -> host port: `5050`
- `test`
  - `postgres-test` -> host port: `5441`
- `prod`
  - `postgres-prod` -> host port: `5442`
  - `app-prod` -> host port: `3001`

Komutlar:

```bash
npm run docker:dev:up
npm run docker:dev:down

npm run docker:test:up
npm run docker:test:down

npm run docker:prod:up
npm run docker:prod:down
```

## Veritabani Komutlari

```bash
npm run db:generate
npm run db:migrate
npm run db:studio

npm run db:migrate:dev
npm run db:migrate:test
npm run db:migrate:prod
```

## Test Komutlari

```bash
npm run test
npm run test:watch
npm run test:coverage
```

## Notlar

- Varsayilan lokal PostgreSQL portu `5440` olarak ayarlandi.
- Test veritabani portu `5441`, prod veritabani portu `5442` olarak ayrildi.
- `docker/postgres/init/001_extensions_auth.sql` dosyasi, lokal Postgres icin `auth` semasi ve `auth.uid()` fonksiyonu uyumlulugunu saglar.
