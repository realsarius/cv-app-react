import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetTranslations = vi.hoisted(() => vi.fn());

vi.mock('next-intl/server', () => ({
  getTranslations: mockGetTranslations,
}));

vi.mock('@/components/landing/Navbar', () => ({
  default: () => null,
}));
vi.mock('@/components/landing/HeroSection', () => ({
  default: () => null,
}));
vi.mock('@/components/landing/FeaturesSection', () => ({
  default: () => null,
}));
vi.mock('@/components/landing/TemplatesSection', () => ({
  default: () => null,
}));
vi.mock('@/components/landing/PricingSection', () => ({
  default: () => null,
}));
vi.mock('@/components/landing/Footer', () => ({
  default: () => null,
}));

describe('landing metadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tr locale icin landing metadata degerleri olusturulur', async () => {
    const translations: Record<string, string> = {
      title: 'CV App — ATS Uyumlu Özgeçmiş Oluşturucu',
      description: 'ATS sistemlerini geçen, profesyonel özgeçmişler oluşturun.',
    };

    mockGetTranslations.mockResolvedValue((key: string) => translations[key]);

    const { generateMetadata } = await import('./page');
    const metadata = await generateMetadata({
      params: {
        locale: 'tr',
      },
    });

    expect(metadata.title).toBe(translations.title);
    expect(metadata.description).toBe(translations.description);
    expect(metadata.openGraph?.locale).toBe('tr_TR');
  });

  it('en locale icin landing metadata degerleri olusturulur', async () => {
    const translations: Record<string, string> = {
      title: 'CV App — ATS-Friendly Resume Builder',
      description: 'Build professional resumes that pass ATS filters.',
    };

    mockGetTranslations.mockResolvedValue((key: string) => translations[key]);

    const { generateMetadata } = await import('./page');
    const metadata = await generateMetadata({
      params: {
        locale: 'en',
      },
    });

    expect(metadata.title).toBe(translations.title);
    expect(metadata.description).toBe(translations.description);
    expect(metadata.openGraph?.locale).toBe('en_US');
  });
});
