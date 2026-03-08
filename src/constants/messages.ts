export const messages = {
  common: {
    supabaseEnvMissing: 'Supabase ortam değişkenleri eksik',
    databaseUrlMissing: 'DATABASE_URL veya DATABASE_DEV_URL eksik',
    unauthorizedRequest: 'Yetkisiz istek.',
    invalidPayload: 'Gönderilen veri formatı geçersiz.',
  },
  auth: {
    invalidLoginCredentials: 'Giriş bilgileri geçersiz',
    loginRateLimited:
      'Çok fazla giriş denemesi algılandı. Lütfen biraz sonra tekrar deneyin',
    registerInvalidInput: 'Kayıt bilgileri geçersiz',
    registerRateLimited:
      'Çok fazla kayıt denemesi algılandı. Lütfen daha sonra tekrar deneyin',
    emailNotConfirmed:
      'E-posta adresi doğrulanmadı. Lütfen e-posta kutunuzu kontrol edin.',
    verifyLinkInvalidOrExpired: 'Doğrulama bağlantısı geçersiz veya süresi dolmuş.',
    verificationCodeRequired: 'E-posta ve doğrulama kodu zorunludur.',
    verificationCodeInvalidOrExpired: 'Doğrulama kodu geçersiz veya süresi dolmuş.',
  },
  profile: {
    fullNameTooLong: 'Ad soyad 120 karakterden uzun olamaz',
    profileUpdated: 'Profil güncellendi',
  },
  resume: {
    idInvalid: 'Özgeçmiş kimliği geçersiz',
    notFound: 'Özgeçmiş bulunamadı',
    createFailed: 'Özgeçmiş oluşturulamadı.',
    titleTooLong: 'Başlık 120 karakterden uzun olamaz',
    autosaveFailed: 'Otomatik kayıt başarısız oldu.',
    autosaveRateLimited:
      'Çok fazla otomatik kaydetme isteği gönderildi. Lütfen kısa bir süre bekleyip tekrar deneyin.',
    updatedInAnotherSession:
      'Özgeçmiş başka bir oturumda güncellendi. Lütfen sayfayı yenileyin.',
    updatedInAnotherSessionDetailed:
      'Özgeçmiş başka bir oturumda güncellendi. Lütfen sayfayı yenileyip değişiklikleri tekrar uygulayın.',
    exportRateLimited:
      'Çok fazla PDF export isteği gönderildi. Lütfen kısa bir süre sonra tekrar deneyin.',
    exportIdInvalid: 'resumeId formatı geçersiz.',
  },
  ats: {
    analysisFailed: 'ATS analizi başarısız oldu.',
    rateLimited:
      'Çok fazla ATS analizi isteği gönderildi. Lütfen biraz sonra tekrar deneyin.',
  },
} as const;
