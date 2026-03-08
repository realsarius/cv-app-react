import trMessages from '@/messages/tr.json';

function trimTrailingDot(value: string) {
  return value.endsWith('.') ? value.slice(0, -1) : value;
}

// Geçiş sürecinde mevcut importları bozmamak için eski "messages" API'si korunur.
export const messages = {
  common: {
    supabaseEnvMissing: trimTrailingDot(trMessages.common.supabaseEnvMissing),
    databaseUrlMissing: trimTrailingDot(trMessages.common.databaseUrlMissing),
    unauthorizedRequest: trMessages.common.unauthorizedRequest,
    invalidPayload: trMessages.common.invalidPayload,
  },
  auth: {
    invalidLoginCredentials: trimTrailingDot(
      trMessages.auth.errors.invalidLoginCredentials
    ),
    loginRateLimited: trimTrailingDot(trMessages.auth.errors.loginRateLimited),
    registerInvalidInput: trimTrailingDot(trMessages.auth.errors.registerInvalidInput),
    registerRateLimited: trimTrailingDot(trMessages.auth.errors.registerRateLimited),
    emailNotConfirmed: trMessages.auth.errors.emailNotConfirmed,
    verifyLinkInvalidOrExpired: trMessages.auth.errors.verifyLinkInvalidOrExpired,
    verificationCodeRequired: trMessages.auth.errors.verificationCodeRequired,
    verificationCodeInvalidOrExpired:
      trMessages.auth.errors.verificationCodeInvalidOrExpired,
  },
  profile: {
    fullNameTooLong: trimTrailingDot(trMessages.profile.errors.fullNameTooLong),
    profileUpdated: trimTrailingDot(trMessages.profile.success.profileUpdated),
  },
  resume: {
    idInvalid: trimTrailingDot(trMessages.resume.errors.idInvalid),
    notFound: trimTrailingDot(trMessages.resume.errors.notFound),
    createFailed: trMessages.resume.errors.createFailed,
    titleTooLong: trimTrailingDot(trMessages.resume.errors.titleTooLong),
    autosaveFailed: trMessages.resume.errors.autosaveFailed,
    autosaveRateLimited: trMessages.resume.errors.autosaveRateLimited,
    updatedInAnotherSession: trMessages.resume.errors.updatedInAnotherSession,
    updatedInAnotherSessionDetailed:
      trMessages.resume.errors.updatedInAnotherSessionDetailed,
    exportRateLimited: trMessages.resume.errors.exportRateLimited,
    exportIdInvalid: trMessages.resume.errors.exportIdInvalid,
  },
  ats: {
    analysisFailed: trMessages.ats.errors.analysisFailed,
    rateLimited: trMessages.ats.errors.rateLimited,
  },
} as const;

