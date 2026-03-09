export const AUDIT_ACTIONS = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REGISTER: 'auth.register',
  AUTH_EMAIL_VERIFIED: 'auth.email_verified',
  AUTH_PASSWORD_RESET: 'auth.password_reset',
  RESUME_CREATED: 'resume.created',
  RESUME_UPDATED: 'resume.updated',
  RESUME_DELETED: 'resume.deleted',
  RESUME_EXPORTED: 'resume.exported',
  RESUME_AUTOSAVED: 'resume.autosaved',
  SETTINGS_UPDATED: 'settings.updated',
  PROFILE_UPDATED: 'profile.updated',
  SHARE_CREATED: 'share.created',
  SHARE_DISABLED: 'share.disabled',
  SHARE_VIEWED: 'share.viewed',
  ATS_ANALYZED: 'ats.analyzed',
  DATA_EXPORT_REQUESTED: 'kvkk.data_export_requested',
  DATA_DELETE_REQUESTED: 'kvkk.data_delete_requested',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

