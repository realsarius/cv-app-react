import { routing } from '@/i18n/routing';
import trMessages from '@/messages/tr.json';

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof trMessages;
  }
}
