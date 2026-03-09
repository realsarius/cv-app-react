import { describe, expect, it } from 'vitest';
import type { ResumeContent } from '@/features/resume-editor/content';
import type { ResumeVisualSettings } from '@/lib/db/resume-settings';
import { createResumePdf, toPdfSafeText } from './resume-export';

const sampleContent: ResumeContent = {
  personalDetails: {
    fullName: 'Merve Ozturk',
    jobTitle: 'Frontend Developer',
    email: 'merve@example.com',
    phone: '+90 555 000 00 00',
    address: 'Istanbul, Turkiye',
  },
  profile:
    'Next.js ve TypeScript projelerinde performans ve test odakli gelistirme deneyimi.',
  experiences: [
    {
      id: 'exp-1',
      title: 'Frontend Developer',
      company: 'Acme',
      city: 'Istanbul',
      country: 'Turkiye',
      startDate: '2022',
      endDate: '2026',
      description: 'App Router migration, ATS skor araci ve dashboard gelistirmeleri.',
    },
  ],
  educations: [
    {
      id: 'edu-1',
      school: 'ITU',
      degree: 'Computer Engineering',
      city: 'Istanbul',
      country: 'Turkiye',
      startDate: '2016',
      endDate: '2020',
      description: 'Yazilim muhendisligi ve veri tabani temelleri.',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'Resume Builder',
      subtitle: 'ATS-first',
      city: 'Remote',
      country: 'Turkiye',
      stack: 'Next.js, Supabase, Drizzle',
      description: 'Resume duzenleme, ATS analizi ve PDF export akislari.',
    },
  ],
  skills: [
    {
      id: 'skill-1',
      name: 'React',
      level: 'expert',
    },
  ],
  languages: [
    {
      id: 'language-1',
      name: 'English',
      proficiency: 'fluent',
    },
  ],
  certificates: [
    {
      id: 'certificate-1',
      name: 'AWS Certified Cloud Practitioner',
      issuer: 'Amazon Web Services',
      date: '2025-10',
      url: '',
      credentialId: 'AWS-CCP-001',
    },
  ],
};

const sampleSettings: ResumeVisualSettings = {
  templateKey: 'ats-classic',
  fontScale: 1,
  spacingScale: 1,
  colorScheme: 'neutral',
  updatedAt: new Date('2026-03-08T10:00:00.000Z'),
};

describe('toPdfSafeText', () => {
  it('turkce karakterleri ascii karsiliklari ile normalize eder', () => {
    const value = '\u00e7\u011f\u0131\u00f6\u015f\u00fc \u00c7\u011e\u0130\u00d6\u015e\u00dc';
    expect(toPdfSafeText(value)).toBe('cgiosu CGIOSU');
  });
});

describe('createResumePdf', () => {
  it('gecerli bir pdf byte dizisi uretir', async () => {
    const pdfBytes = await createResumePdf({
      title: 'Frontend Resume',
      content: sampleContent,
      settings: sampleSettings,
    });

    const header = Buffer.from(pdfBytes).subarray(0, 4).toString('utf-8');

    expect(header).toBe('%PDF');
    expect(pdfBytes.length).toBeGreaterThan(1500);
  });

  it('yeni template anahtarlari ile pdf olusturulur', async () => {
    const templateKeys: ResumeVisualSettings['templateKey'][] = [
      'atlantic-blue',
      'two-column',
    ];

    for (const templateKey of templateKeys) {
      const pdfBytes = await createResumePdf({
        title: 'Template Resume',
        content: sampleContent,
        settings: {
          ...sampleSettings,
          templateKey,
        },
      });

      const header = Buffer.from(pdfBytes).subarray(0, 4).toString('utf-8');

      expect(header).toBe('%PDF');
      expect(pdfBytes.length).toBeGreaterThan(1500);
    }
  });
});
