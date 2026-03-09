import { describe, expect, it } from 'vitest';
import {
  createEmptyResumeContent,
  parseResumeContent,
  resumeContentSchema,
} from './content';

describe('resume content schema', () => {
  it('bos icerik olusturur ve diziler bagimsizdir', () => {
    const first = createEmptyResumeContent();
    const second = createEmptyResumeContent();

    first.experiences.push({
      id: 'x',
      title: '',
      company: '',
      city: '',
      country: '',
      startDate: '',
      endDate: '',
      description: '',
    });

    expect(second.experiences).toHaveLength(0);
    expect(first.projects).toHaveLength(0);
    expect(second.skills).toHaveLength(0);
  });

  it('gecersiz icerik icin guvenli default dondurur', () => {
    const parsed = parseResumeContent({
      profile: 123,
      personalDetails: null,
    });

    expect(parsed.personalDetails.fullName).toBe('');
    expect(parsed.profile).toBe('');
    expect(parsed.educations).toEqual([]);
    expect(parsed.certificates).toEqual([]);
  });

  it('gelen alanlari trimleyerek parse eder', () => {
    const parsed = resumeContentSchema.parse({
      personalDetails: {
        fullName: '  Berk  ',
        jobTitle: ' Frontend Developer ',
        email: '  berk@example.com ',
        phone: ' 555 ',
        address: ' Istanbul ',
      },
      profile: '  Merhaba dunya  ',
      experiences: [],
      educations: [],
      projects: [],
    });

    expect(parsed.personalDetails.fullName).toBe('Berk');
    expect(parsed.personalDetails.jobTitle).toBe('Frontend Developer');
    expect(parsed.personalDetails.email).toBe('berk@example.com');
    expect(parsed.profile).toBe('Merhaba dunya');
    expect(parsed.languages).toEqual([]);
  });
});
