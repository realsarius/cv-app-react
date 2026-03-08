# CV App React (Next.js + Supabase + Drizzle)

## İçindekiler

- [0. Hızlı Kurulum](#0-hızlı-kurulum)
- [1. Proje Kapsamı](#1-proje-kapsamı)
- [2. Teknoloji Yığını](#2-teknoloji-yığını-technology-stack)
- [3. Veritabanı Tasarımı](#3-veritabanı-tasarımı-database-design)
- [4. API Tasarımı ve Standartlar](#4-api-tasarımı-ve-standartlar-api-design)
- [5. Kimlik Doğrulama, Güvenlik ve Hata Yönetimi](#5-kimlik-doğrulama-güvenlik-ve-hata-yönetimi)
- [6. Test Stratejisi](#6-test-stratejisi-testing)
- [7. Kurulum ve Çalıştırma](#7-kurulum-ve-çalıştırma)
- [8. Frontend](#8-frontend)
- [9. Production Notes](#9-production-notes)
- [10. Lisans ve Kullanım Notu](#10-lisans-ve-kullanım-notu)
- [Ek Dokümanlar](#ek-dokümanlar)

## 0. Hızlı Kurulum

### Docker ile (Önerilen)

```bash
# 1) Ortam değişkenlerini hazırlayın
cp .env.example .env
cp .env.example .env.local

# 2) Supabase bilgilerini girin (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)

# 3) Development servislerini başlatın (app + postgres + pgAdmin)
npm run docker:dev:up

# 4) Migration'ları uygulayın
npm run db:migrate:dev

# 5) Uygulamayı açın
# http://localhost:3010
```

### Erişim Adresleri (Dev)

- Frontend: <http://localhost:3010>
- Sağlık kontrolü: <http://localhost:3010/api/health>
- pgAdmin: <http://localhost:5060>
- PostgreSQL (dev): `localhost:5450`

---

## 1. Proje Kapsamı

Bu proje, eski CV uygulamasının Next.js App Router mimarisine taşınmış ve üretime yakın bir geliştirici deneyimi ile modernize edilmiş sürümüdür.

Öne çıkan kapsam:

- **Kimlik doğrulama (Supabase Auth)**
  - Kayıt ol, giriş yap, çıkış yap, e-posta doğrulama (link + OTP kodu).
  - `/auth/callback` ile `code`, `token_hash` veya `token + email` senaryoları desteklenir.

- **Korumalı uygulama alanı**
  - `/dashboard`, `/resumes/*`, `/settings` sayfaları oturum kontrolü ile korunur.
  - Kullanıcı girişliyken public auth sayfalarından (`/login`, `/register`) panele yönlendirme yapılır.

- **Özgeçmiş yönetimi**
  - Taslak oluşturma, listeleme, düzenleme.
  - `resume_versions` üzerinde versiyonlu içerik saklama.
  - 1.5 sn gecikmeli autosave + manuel kaydet.
  - Oturumlar arası eşzamanlı yazma çakışması koruması (`write_conflict`).

- **Editör deneyimi**
  - Masaüstünde **yan yana**: sol tarafta form editörü, sağ tarafta canlı önizleme.
  - Tablet/mobilde **alt alta** düzen.
  - Deneyim, eğitim, proje blokları dinamik olarak eklenip silinebilir.

- **ATS analiz akışı**
  - İş ilanı metnine göre rule-based ATS skor hesaplama (`v1.0-rule-based`).
  - Anahtar kelime kapsamı, bölüm bütünlüğü, okunabilirlik, pozisyon uyumu kırılımları.
  - ATS geçmişinin `job_targets` tablosuna kaydedilmesi ve editörde gösterimi.

- **Önizleme ve export**
  - Yazdırılabilir ATS önizleme sayfası.
  - Sunucu tarafında PDF üretimi ve indirme (`/api/resumes/{resumeId}/export`).
  - Görünüm ayarları: şablon, renk düzeni, font ve boşluk ölçekleri.

- **Profil alanı**
  - Kullanıcı profil bootstrap (`profiles`) ve ad-soyad güncelleme.
  - Hesap özeti: provider, doğrulama durumu, hesap oluşturma/son giriş zamanları.

## 2. Teknoloji Yığını (Technology Stack)

| Kategori | Teknoloji / Kütüphane | Kullanım Amacı |
|---|---|---|
| **Core** | Next.js 14 (App Router), React 18, TypeScript | SSR/Server Actions + modern web app mimarisi |
| **Auth** | Supabase Auth, `@supabase/ssr` | Oturum yönetimi, e-posta doğrulama, callback akışı |
| **ORM & DB** | Drizzle ORM, PostgreSQL 16, `pg` | Veri modeli, migration ve sorgu yönetimi |
| **Validation** | Zod | API payload ve form doğrulama |
| **Styling** | Tailwind CSS | UI bileşenleri ve responsive düzen |
| **PDF** | `pdf-lib` | ATS uyumlu özgeçmiş PDF export |
| **Testing** | Vitest, `@vitest/coverage-v8` | Unit ve route-level testler |
| **DevOps** | Docker, Docker Compose | Dev/Test/Prod profil bazlı servis orkestrasyonu |

## 3. Veritabanı Tasarımı (Database Design)

### 3.1 Entity Listesi

1. **profiles**: Kullanıcı profil bilgileri (`id`, `email`, `full_name`).
2. **resumes**: Özgeçmiş üst kaydı (`title`, `status`, `current_version_no`).
3. **resume_versions**: Özgeçmiş içerik versiyonları (`content` JSONB, versiyon no).
4. **job_targets**: ATS analizi geçmişi (ilan metni, skor, matched/missing keyword listeleri).
5. **resume_settings**: Görsel ayarlar (template, font/spacing scale, color scheme).

### 3.2 RLS ve Çok Kullanıcılı Erişim

- `profiles`, `resumes`, `resume_versions`, `job_targets`, `resume_settings` tablolarında RLS aktif.
- Politikalar yalnızca **kendi verisini** okuma/yazma kuralıyla tanımlıdır (`auth.uid()`).
- Uygulama tarafında `withUserRls()` içinde `request.jwt.claim.sub` set edilerek transaction bazında kullanıcı bağlamı uygulanır.

### 3.3 Migration ve Şema Yönetimi

- Drizzle code-first yaklaşımı kullanılır.
- Migration dosyaları `drizzle/` altında versiyonlanır.
- Temel komutlar:

```bash
npm run db:generate
npm run db:migrate
```

Hedef ortam seçimi için:

```bash
npm run db:migrate:dev
npm run db:migrate:test
npm run db:migrate:prod
```

## 4. API Tasarımı ve Standartlar (API Design)

### 4.1 Endpoint Listesi

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | `/api/health` | Servis sağlık kontrolü |
| POST | `/api/ats/score` | ATS skor hesaplama ve opsiyonel geçmiş kaydı |
| POST | `/api/resumes/{resumeId}/autosave` | Özgeçmiş autosave (optimistic concurrency destekli) |
| POST | `/api/resumes/{resumeId}/settings` | Görünüm ayarlarını kaydetme |
| GET | `/api/resumes/{resumeId}/export` | PDF export |
| GET | `/auth/callback` | Supabase auth callback / OTP doğrulama |

> Not: `/login`, `/register`, `/register/check-email`, `/dashboard`, `/settings` akışları App Router + Server Actions ile çalışır; klasik REST controller yüzeyi değildir.

### 4.2 Hata ve Cevap Semantiği

Başarılı cevaplar endpoint’e göre değişir; hata tarafında standart olarak `error` alanı döndürülür.

Örnek (`autosave` çakışması):

```json
{
  "error": "Özgeçmiş başka bir oturumda güncellendi. Lütfen sayfayı yenileyip değişiklikleri tekrar uygulayın.",
  "code": "write_conflict",
  "currentVersionNo": 2,
  "currentUpdatedAt": "2026-03-08T12:36:01.049Z"
}
```

Yaygın status kodları:

- `200`: Başarılı işlem
- `400`: Payload/parametre doğrulama hatası
- `401`: Yetkisiz istek
- `404`: Kaynak bulunamadı
- `409`: Yazma çakışması (autosave)
- `429`: Rate limit aşıldı
- `503`: Zorunlu env eksik (Supabase/DB)

### 4.3 ATS Skorlama Modeli

Ağırlıklar:

- Anahtar kelime kapsamı: **50 puan**
- Bölüm bütünlüğü: **25 puan**
- Okunabilirlik: **15 puan**
- Pozisyon uyumu: **10 puan**

Toplam skor 0-100 aralığına clamp edilir.

## 5. Kimlik Doğrulama, Güvenlik ve Hata Yönetimi

### 5.1 Oturum ve Route Koruması

- Middleware seviyesinde Supabase session güncelleme ve route guard uygulanır.
- Korumalı alanlar: `/dashboard`, `/resumes/*`, `/settings`.
- Public alanlar: `/login`, `/register`.

### 5.2 Rate Limit Politikaları

Uygulama içi in-memory rate limit store kullanılır (`Map` tabanlı):

| Bucket | Kural |
|---|---|
| `auth-register` | 10 dakikada 4 istek |
| `auth-login` | 5 dakikada 6 istek |
| `ats-score` | 1 dakikada 20 istek |
| `resume-autosave` | 1 dakikada 45 istek |
| `resume-settings` | 1 dakikada 20 istek |
| `resume-export` | 1 dakikada 12 istek |

Rate limit header’ları:

- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`
- `retry-after` (engellenen isteklerde)

### 5.3 Doğrulama ve Güvenlik

- Tüm kritik payload’larda Zod doğrulaması yapılır.
- DB işlemleri kullanıcı bağlamında transaction + RLS ile sınırlandırılır.
- Supabase env veya DB env eksikliğinde kullanıcıya kontrollü hata mesajı döndürülür.

### 5.4 Internationalization (i18n)

- Uygulama `next-intl` ile EN/TR locale desteği kullanır.
- Desteklenen locale’ler: `tr`, `en`; varsayılan locale: `tr`.
- URL stratejisi `localePrefix: 'as-needed'` şeklindedir:
  - TR: prefixsiz (`/dashboard`, `/login`)
  - EN: prefiksli (`/en/dashboard`, `/en/login`)
- App Router sayfaları `src/app/[locale]/` altında konumlandırılmıştır.
- Locale-aware gezinti için `@/i18n/navigation` kullanılmalıdır (`Link`, `redirect`, `useRouter`, `usePathname`).
- Mesaj katalogları `src/messages/tr.json` ve `src/messages/en.json` dosyalarında tutulur.
- API ve `auth/callback` tarafında istek başlığındaki `Accept-Language` değerine göre mesaj kataloğu seçilir.

## 6. Test Stratejisi (Testing)

Vitest ile route-level ve birim test yaklaşımı uygulanır.

### 6.1 Kapsanan Alanlar

- Auth server actions (`login`, `register`, `check-email`)
- Auth callback route (`/auth/callback`)
- Resume API route’ları (`autosave`, `settings`, `export`)
- ATS score route
- ATS scoring utility
- PDF export utility
- Rate limit utility
- Resume content schema/parsing

### 6.2 Test Komutları

```bash
npm run test
npm run test:watch
npm run test:coverage
```

### 6.3 Son Doğrulama

2026-03-08 tarihinde local çalıştırma sonucu:

- **12 test dosyası geçti**
- **37 test geçti**

## 7. Kurulum ve Çalıştırma

### 7.1 Gereksinimler

- Node.js 20+
- npm 10+
- Docker & Docker Compose
- Supabase projesi (URL + anon key)

### 7.2 Environment Değişkenleri

```bash
cp .env.example .env
cp .env.example .env.local
```

Minimum zorunlu alanlar:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# En az bir DB URL
DATABASE_URL=
# veya
DATABASE_DEV_URL=
```

Ortam bazlı örnek DB değişkenleri (`.env.example` içinde tanımlıdır):

- `DATABASE_DEV_*` (`5450`)
- `DATABASE_TEST_*` (`5451`)
- `DATABASE_PROD_*` (`5452`)

### 7.3 Docker Profilleri

```bash
# Development (app-dev + postgres-dev + pgadmin)
npm run docker:dev:up
npm run docker:dev:down

# Test (postgres-test)
npm run docker:test:up
npm run docker:test:down

# Production benzeri lokal profil (app-prod + postgres-prod)
npm run docker:prod:up
npm run docker:prod:down
```

### 7.4 Port Haritası

| Servis | Port | URL |
|---|---|---|
| Frontend (dev) | 3010 | <http://localhost:3010> |
| Frontend (prod profile) | 3011 | <http://localhost:3011> |
| PostgreSQL (dev) | 5450 | - |
| PostgreSQL (test) | 5451 | - |
| PostgreSQL (prod profile) | 5452 | - |
| pgAdmin | 5060 | <http://localhost:5060> |

### 7.5 Manuel Çalıştırma

```bash
# 1) Bağımlılıklar
npm install

# 2) Migration
npm run db:migrate:dev

# 3) Geliştirme sunucusu
npm run dev
```

## 8. Frontend

### 8.1 Sayfa Yapısı

- Public:
  - `/` (landing)
  - `/login`
  - `/register`
  - `/register/check-email`
- Protected:
  - `/dashboard`
  - `/resumes/[resumeId]`
  - `/resumes/[resumeId]/preview`
  - `/settings`

### 8.2 Editör Deneyimi

- Sol panel: başlık, kişisel bilgiler, profil özeti, deneyim/eğitim/proje blokları, ATS analizi.
- Sağ panel: canlı önizleme.
- Masaüstünde iki kolon, mobil/tablette tek kolon akış.
- Önizleme sayfasında yazdırma + PDF indirme aksiyonları.

### 8.3 UI ve Metin Yönetimi

- Türkçe kullanıcı mesajları `src/constants/messages.ts` altında merkezileştirilmiştir.
- Ortak UI sınıfları `src/app/globals.css` içinde token tabanlı tanımlanır (`app-card`, `btn-primary`, `form-input`, `message-*`).

## 9. Production Notes

### 9.1 Supabase + Local DB Ayrımı

- Auth ve session yönetimi Supabase tarafında.
- Özgeçmiş/ATS verileri PostgreSQL tarafında Drizzle ile yönetilir.
- Migration `0003_drop_auth_user_fks.sql` ile `auth.users` FK bağımlılığı kaldırılmıştır; böylece local DB ile geliştirme kolaylaştırılmıştır.

### 9.2 Lokal RLS Uyumluluğu

`docker/postgres/init/001_extensions_auth.sql` dosyası lokal PostgreSQL içinde:

- `auth` şeması
- `auth.users` tablosu (stub)
- `auth.uid()` fonksiyonu

oluşturarak Supabase benzeri RLS davranışını development ortamında taklit eder.

### 9.3 Operasyonel Kontroller

```bash
# Uygulama sağlık kontrolü
curl -fsS http://localhost:3010/api/health

# Çalışan container'ları kontrol
docker compose --profile dev ps

# Testleri doğrula
npm run test
```

### 9.4 Bilinen Sınırlar

- Rate limit store proses içi bellektedir; çoklu instance dağıtımında merkezi bir store (örn. Redis) önerilir.
- PDF tarafında Türkçe karakterler PDF standard font uyumluluğu için normalize edilerek işlenir.

## 10. Lisans ve Kullanım Notu

Bu repo açık kaynak olarak lisanslanmamıştır.

- Kaynak kod ve ilişkili materyaller `All Rights Reserved` kapsamında korunur.
- Yazılı izin olmadan kopyalama, dağıtım, türev üretim ve production kullanım yasaktır.
- Üçüncü parti paketler kendi lisans koşullarına tabidir.

Detay için kök dizindeki [`LICENSE`](LICENSE) dosyasına bakabilirsiniz.
