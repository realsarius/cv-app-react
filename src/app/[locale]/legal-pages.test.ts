import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTranslations = vi.hoisted(() => vi.fn());

vi.mock('next-intl/server', () => ({
  getTranslations: mockGetTranslations,
}));

describe('legal pages metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('privacy metadata locale bazli olusturulur', async () => {
    const values: Record<string, string> = {
      title: 'CV App Privacy Policy',
      description: 'Privacy policy and data handling principles for CV App.',
    };

    mockGetTranslations.mockResolvedValue((key: string) => values[key]);

    const { generateMetadata } = await import('./privacy/page');
    const metadata = await generateMetadata({
      params: {
        locale: 'en',
      },
    });

    expect(metadata.title).toBe(values.title);
    expect(metadata.description).toBe(values.description);
  });

  it('terms metadata locale bazli olusturulur', async () => {
    const values: Record<string, string> = {
      title: 'CV App Kullanım Koşulları',
      description: 'CV App kullanım koşulları ve hizmet şartları.',
    };

    mockGetTranslations.mockResolvedValue((key: string) => values[key]);

    const { generateMetadata } = await import('./terms/page');
    const metadata = await generateMetadata({
      params: {
        locale: 'tr',
      },
    });

    expect(metadata.title).toBe(values.title);
    expect(metadata.description).toBe(values.description);
  });

  it('faq metadata locale bazli olusturulur', async () => {
    const values: Record<string, string> = {
      title: 'CV App Frequently Asked Questions',
      description: 'Frequently asked questions and answers about CV App.',
    };

    mockGetTranslations.mockResolvedValue((key: string) => values[key]);

    const { generateMetadata } = await import('./faq/page');
    const metadata = await generateMetadata({
      params: {
        locale: 'en',
      },
    });

    expect(metadata.title).toBe(values.title);
    expect(metadata.description).toBe(values.description);
  });
});
