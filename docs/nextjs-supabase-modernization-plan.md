# CV App React -> Next.js Modernizasyon Plani

Tarih: 2026-03-08
Proje: `resume-builder` (eski React + Vite uygulamasi)

## Revizyon Gecmisi

- 2026-03-08 (r1): Ilk modernizasyon plani olusturuldu.
- 2026-03-08 (r2): Mimari kararlar netlestirildi (`Drizzle ORM`, Docker kapsam ayrimi, ATS algoritma tanimi, takvim revizyonu, JSONB limitleri).

## 1) Kesin Karar (Bu Dokumanin Ana Karari)

Bu proje asagidaki yapiya tasinacak:

- Frontend + Backend: `Next.js (App Router + Route Handlers)`, `TypeScript`
- Kimlik dogrulama: `Supabase Auth`
- Veritabani: `PostgreSQL (Supabase)` + `RLS (Row Level Security)`
- ORM/Migration: `Drizzle ORM` + `drizzle-kit`
- Form/validasyon: `react-hook-form` + `zod`
- UI: `Tailwind CSS`
- Lokal gelistirme: `Docker zorunlu` (Supabase local stack Docker konteynerleri ile)
- Production: `Vercel (web)` + `Supabase Cloud (Auth/DB/Storage)` (Docker zorunlu degil)

Not: Bilgisayara Postgres native kurulum yapilmadan, lokal veritabani Docker ile calisacak.

## 2) Neden Bu Karar?

- Mevcut projede backend ve kalici veri yok; kullanici cikis yaptiginda state kayboluyor.
- CV verisi kullaniciya ozeldir; RLS ile satir bazli izolasyon guvenlikte kritik avantaj saglar.
- Next.js ile tek repo icinde UI + API akislari yonetilir.
- Supabase Auth ile sifre, session, refresh-token, email akisi gibi guvenlik kritik katmanlar hizli ve daha az custom kodla kurulur.
- `Drizzle` secildi: TypeScript-first, hafif, SQL'e yakin, Next.js App Router ile sade migration akisi.
- Docker zorunlulugu local ortam icin karsilanir (native Postgres kurulmadan calisma).

## 3) Hedef Urun Kapsami (V1)

- Kullanici kayit/giris/cikis
- Kullaniciya ait CV olusturma, duzenleme, silme
- Otomatik kaydetme (autosave)
- Giris sonrasi kaldigi yerden devam
- PDF export (ATS-uyumlu sade template)
- Basit ATS yardimcilari
- Zorunlu alan kontrolu
- Is ilanina gore anahtar kelime kapsami (heuristic skor)
- Bolum bazli okunabilirlik sinyalleri

V1 disi (sonraki faz):

- Coklu tema sistemi (ATS disi yaratici tasarimlar)
- Gelismis AI rewrite/oneri modulu
- Takim/organizasyon coklu kullanici yapisi

## 3.1) ATS Skor Algoritmasi (V1 Tanimi)

V1'de ATS skoru "heuristic/rule-based" olacak. Embedding veya LLM tabanli semantik skor V2'ye birakilir.

- Girdi:
- `resume content` (normalize edilmis metin)
- `job_description` (normalize edilmis metin)
- Adimlar:
- Tokenizasyon + lowercase + stopword temizligi
- Is ilanindan aday anahtar kelime cikarma (unigram + bigram)
- CV metninde keyword gecis ve bolum dagilimi kontrolu
- Skor bilesenleri (100 puan):
- Keyword coverage: 50
- Zorunlu bolum tamamliligi: 25
- Format/okunabilirlik kurallari: 15
- Baslik/rol uyumu: 10
- Cikti:
- `overall_score`
- `matched_keywords[]`
- `missing_keywords[]`
- `suggestions[]`
- `algorithm_version` (ornek: `v1.0-rule-based`)

## 4) ATS mi Tema mi? Nihai Oncelik

Ilk urun cikisinda `ATS-first` yaklasim secilmistir.

- Faz 1: ATS-uyumlu tek ana template + guclu veri modeli
- Faz 2: Ayni veri modeli uzerinden 2-3 farkli tema

Gerekce:

- Ise alim surecinde kullanicinin en hizli deger aldigi alan ATS uyumlulugudur.
- Tema sistemini erken acmak, veri/model karmasini ve bakim yukunu gereksiz buyutur.

## 5) Hedef Mimari

```text
Browser (Next.js UI)
   -> Next.js Route Handlers (server-only islemler)
   -> Supabase Auth (session)
   -> Supabase Postgres (RLS)
   -> Supabase Storage (opsiyonel: avatar/pdf saklama)
```

## 6) Veri Modeli (Ilk Taslak)

### 6.1 Tablolar

1. `profiles`
- `id uuid pk` (auth kullanici id ile ayni)
- `email text unique`
- `full_name text`
- `created_at timestamptz`
- `updated_at timestamptz`

2. `resumes`
- `id uuid pk`
- `user_id uuid not null` (auth.users.id)
- `title text not null default 'Untitled Resume'`
- `status text` (`draft`, `published`, `archived`)
- `current_version_no int not null default 1`
- `created_at timestamptz`
- `updated_at timestamptz`

3. `resume_versions`
- `id uuid pk`
- `resume_id uuid not null`
- `version_no int not null`
- `content jsonb not null` (tum CV icerigi)
- `ats_score numeric(5,2) null`
- `algorithm_version text null`
- `created_at timestamptz`
- unique: `(resume_id, version_no)`
- check: `octet_length(content::text) <= 262144` (256 KB)

4. `resume_settings`
- `id uuid pk`
- `resume_id uuid not null unique`
- `template_key text not null default 'ats-classic'`
- `font_scale numeric(4,2) default 1.00`
- `spacing_scale numeric(4,2) default 1.00`
- `color_scheme text default 'neutral'`
- `updated_at timestamptz`

5. `job_targets` (ATS karsilastirma)
- `id uuid pk`
- `resume_id uuid not null`
- `job_title text`
- `company text`
- `job_description text`
- `last_score numeric(5,2)`
- `matched_keywords jsonb`
- `missing_keywords jsonb`
- `algorithm_version text`
- `updated_at timestamptz`

### 6.2 RLS Politikasi

- `resumes.user_id = auth.uid()` olan satirlar okunur/yazilir.
- `resume_versions` erisimi `resumes` sahipligi uzerinden kontrol edilir.
- `resume_settings` ve `job_targets` da ayni sahiplik kuralini izler.

## 7) Auth ve Session Stratejisi

- Supabase email/password ile baslangic
- Opsiyonel: Magic link ve Google OAuth sonraki faz
- Next.js middleware ile korumali rotalar:
- `/app/*` oturum zorunlu
- `/login`, `/register` acik
- Session cookie secure ve httpOnly
- Rate limiting (login endpointleri icin)

## 8) Docker ve Lokal Gelistirme Stratejisi

### 8.1 Prensip

- Lokal Postgres native kurulmaz.
- Docker local gelistirme icin zorunlu.
- Production deploy icin Docker zorunlu degil (managed Supabase + Vercel).

### 8.2 Lokal Akis

1. Docker Desktop acik
2. Supabase local stack baslatilir (Docker konteynerleri)
3. Next.js app lokal calisir (`npm run dev`)
4. Migration ve seed islemleri local stack uzerinde uygulanir

### 8.3 Ornek Komut Akisi

```bash
# 1) Proje bagimliliklari
npm install

# 2) Supabase local stack (Docker)
supabase start

# 3) Migration uygula
supabase db reset

# 4) Next.js dev
npm run dev
```

Not: `supabase` CLI local binary olarak gereklidir; DB sunucusu Docker'da calisir.

## 9) Uygulama Mimarisi (Next.js)

### 9.1 Klasorleme

```text
src/
  app/
    (public)/
      login/
      register/
    (app)/
      dashboard/
      resumes/[resumeId]/
      settings/
    api/
      ats/score/route.ts
      resumes/export/route.ts
  components/
  features/
    resume-editor/
    ats/
    auth/
  lib/
    supabase/
    validation/
    utils/
  types/
```

### 9.2 Veri Aksiyonu

- CRUD islemleri icin Server Actions veya Route Handlers
- Client tarafinda optimistic UI + debounce autosave
- Form dogrulama: Zod schema (shared)
- Runtime prensibi: varsayilan `nodejs` runtime (Edge zorunlu degil)

## 10) Asamali Gecis Plani

### Faz 0 - Hazirlik ve Stabilizasyon

- Eski projeden mevcut alanlarin envanteri
- README ve script duzeltmeleri
- Lint ve build green hale getirme
- Guvenlik aciklari icin bagimlilik guncelleme plani

Tamamlanma kriteri:
- Eski repo referans alinabilecek temiz durumda

### Faz 1 - Next.js Iskeleti

- Yeni Next.js app kurulumu (TypeScript + Tailwind)
- Temel layout ve route yapisi
- Auth sayfalari (login/register/forgot)

Tamamlanma kriteri:
- Kullanici kayit/giris/cikis akisi calisiyor

### Faz 2 - DB + RLS + Migration

- Tablolarin olusturulmasi
- RLS politikalarinin yazilmasi
- Drizzle migration dosyalarinin versiyonlanmasi

Tamamlanma kriteri:
- Her kullanici sadece kendi verisini gorebiliyor/yazabiliyor

### Faz 3 - CV Editor (Core)

- Personal details, profile, education, projects bolumleri
- Kaydet/guncelle/sil
- Autosave (debounce)

Tamamlanma kriteri:
- Kullanici cikis-giris sonrasi son CV'sine kaldigi yerden doner

### Faz 4 - ATS Ozellikleri (V1)

- ATS sade template
- Zorunlu alan ve format kontrolleri
- Is ilani metnine gore rule-based anahtar kelime kapsama skoru
- `algorithm_version` ile versiyonlu skor kaydi

Tamamlanma kriteri:
- Kullaniciya net skor + gelistirme oneri listesi sunulur

### Faz 5 - Export ve Paylasim

- PDF export
- Print stylesheet optimizasyonu
- (Opsiyonel) paylasilabilir read-only link

Tamamlanma kriteri:
- PDF ciktisi stabil ve ATS uyumlu

### Faz 6 - Test, Guvenlik, Gozlemleme

- Unit test (validation, util)
- Integration test (auth + CRUD)
- E2E kritik akislar (login, resume create, update, export)
- Audit log temel olaylari (create/update/delete/login)

Tamamlanma kriteri:
- Cikis oncesi test ve guvenlik checklist'i green

## 11) Guvenlik Checklist'i

- RLS tum user-content tablolarda aktif
- Service role key sadece server tarafinda
- Env dosyalari CI/CD secret store'da
- Input validation zorunlu (server side)
- Rate limit: login, register, ats-score endpointleri
- CORS ve CSP kurallari net
- Dependency scanning (haftalik)

## 12) Performans ve Maliyet Kontrolu

- JSONB content boyut siniri: `256 KB` (DB check constraint)
- Versiyon buyumesi kontrolu: her resume icin aktifte son `100` versiyon; eski versiyonlar icin arsiv/sikistirma stratejisi
- Autosave frekansi limit: `1.5sn debounce` + blur/on-exit aninda zorunlu flush
- ATS skor endpointi icin request kotasi
- Buyuk islemler icin queue/async pattern (faz 2+)

## 13) Proje Yonetimi ve Takvim (Tahmini)

- Faz 0-1: 1-1.5 hafta
- Faz 2-3: 2-3 hafta
- Faz 4: 1-2 hafta
- Faz 5-6: 1.5-2 hafta

Toplam MVP: yaklasik 6-8 hafta (tek gelistirici, full-time varsayimi ile).

## 14) Acik Riskler ve Onleyici Aksiyonlar

1. RLS yanlis yazilirsa veri sizintisi riski
- Aksiyon: RLS policy testleri + peer review zorunlu

2. Autosave conflict riski
- Aksiyon: `updated_at` bazli conflict algilama ve kullanici uyarisi

3. PDF farkli tarayicilarda tutarsiz olabilir
- Aksiyon: print CSS standartlastirma + regression screenshot test

4. ATS skoru kullanici tarafinda "kesin sonuc" algilanabilir
- Aksiyon: UI'da "heuristic score" oldugu acik belirtilmeli

5. Takvim kaymasi (ozellikle PDF export + browser farkliliklari)
- Aksiyon: Faz 5 icin buffer sprint ve erken regresyon testleri

## 15) Hemen Baslanacak Is Listesi (Sprint-1)

1. Next.js projesini olustur (App Router + TS + Tailwind)
2. Supabase project + local Docker stack kur
3. `Drizzle` setup + `profiles`, `resumes`, `resume_versions` migration'larini yaz
4. Login/Register/Logout akisini tamamla
5. Ilk editor ekraninda personal details + autosave'i devreye al
6. Dashboard'da kullanicinin resume listesini goster

---

## Son Soz

Bu plan ile proje:

- eski tek sayfa demo yapidan,
- guvenli, oturumlu, bulutta kalici veriye sahip,
- ATS odakli ve uretime cikabilecek bir urune donusecektir.

Bu dokuman "uygulama plani" olarak baz alinacaktir; yeni teknik kararlar bu dosyada revizyon gecmisi ile islenecektir.
