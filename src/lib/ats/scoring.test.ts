import { describe, expect, it } from 'vitest';
import type { ResumeContent } from '@/features/resume-editor/content';
import { calculateAtsScore } from './scoring';

const fullContent: ResumeContent = {
  personalDetails: {
    fullName: 'Ayse Yilmaz',
    jobTitle: 'Senior Frontend Developer',
    email: 'ayse@example.com',
    phone: '+90 555 123 45 67',
    address: 'Istanbul, Turkiye',
  },
  profile:
    'React ve Next.js projelerinde performans optimizasyonu, tasarim sistemi ve test stratejileri uzerinde calisan bir frontend gelistiriciyim. Olculebilir iyilestirmelerle urun kalitesini artiririm.',
  experiences: [
    {
      id: 'exp-1',
      title: 'Senior Frontend Developer',
      company: 'Acme',
      city: 'Istanbul',
      country: 'Turkiye',
      startDate: '2021',
      endDate: '2025',
      description:
        'Next.js, React, TypeScript ve performance optimization calismalari yaptim.',
    },
  ],
  educations: [
    {
      id: 'edu-1',
      school: 'Bogazici University',
      degree: 'Computer Engineering',
      city: 'Istanbul',
      country: 'Turkiye',
      startDate: '2013',
      endDate: '2018',
      description: '',
    },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'ATS Friendly CV Builder',
      subtitle: 'Next.js App Router',
      city: 'Remote',
      country: 'Turkiye',
      stack: 'Next.js, React, TypeScript, PostgreSQL',
      description: 'Keyword coverage ve scoring modulu eklendi.',
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
      id: 'lang-1',
      name: 'English',
      proficiency: 'fluent',
    },
  ],
  certificates: [
    {
      id: 'cert-1',
      name: 'Professional Scrum Master',
      issuer: 'Scrum.org',
      date: '2025-04',
      url: '',
      credentialId: 'PSM-I-001',
    },
  ],
};

describe('calculateAtsScore', () => {
  it('uyumlu icerik icin yuksek skor uretir', () => {
    const jobDescription = `
      We are looking for a Senior Frontend Developer with strong React, Next.js,
      TypeScript and performance optimization experience. You will build reusable
      components, collaborate with product and design, and improve readability.
    `;

    const result = calculateAtsScore(fullContent, jobDescription);

    expect(result.algorithmVersion).toBe('v1.0-rule-based');
    expect(result.overallScore).toBeGreaterThan(60);
    expect(result.breakdown.keywordCoverage).toBeGreaterThan(10);
    expect(result.matchedKeywords.length).toBeGreaterThan(2);
  });

  it('zayif icerik icin dusuk skor ve oneriler dondurur', () => {
    const weakContent: ResumeContent = {
      ...fullContent,
      personalDetails: {
        fullName: '',
        jobTitle: '',
        email: 'invalid',
        phone: '',
        address: '',
      },
      profile: 'Kisa ozet',
      experiences: [],
      educations: [],
      projects: [],
      skills: [],
      languages: [],
      certificates: [],
    };

    const result = calculateAtsScore(
      weakContent,
      'Data engineer, python, airflow, bigquery, etl pipelines, cloud analytics.'
    );

    expect(result.overallScore).toBeLessThan(40);
    expect(result.missingKeywords.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });
});
