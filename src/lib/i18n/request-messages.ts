import enMessages from '@/messages/en.json';
import trMessages from '@/messages/tr.json';

export type RequestLocale = 'tr' | 'en';

const messagesByLocale = {
  tr: trMessages,
  en: enMessages,
} as const;

export function resolveRequestLocale(
  acceptLanguage: string | null | undefined
): RequestLocale {
  if (typeof acceptLanguage !== 'string') {
    return 'tr';
  }

  return acceptLanguage.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

export function getRequestMessages(request: Request) {
  const locale = resolveRequestLocale(request.headers.get('accept-language'));
  return messagesByLocale[locale];
}
