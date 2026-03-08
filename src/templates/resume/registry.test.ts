import { describe, expect, it } from 'vitest';
import {
  RESUME_TEMPLATES,
  isResumeTemplateKey,
  normalizeResumeTemplateKey,
} from './registry';

describe('resume template registry', () => {
  it('beklenen template kayitlarini sirali olarak icerir', () => {
    expect(RESUME_TEMPLATES.map((item) => item.id)).toEqual([
      'ats-classic',
      'ats-compact',
      'atlantic-blue',
      'two-column',
    ]);
  });

  it('template key dogrulamasini dogru yapar', () => {
    expect(isResumeTemplateKey('atlantic-blue')).toBe(true);
    expect(isResumeTemplateKey('minimal')).toBe(false);
  });

  it('gecersiz degerlerde classic fallback doner', () => {
    expect(normalizeResumeTemplateKey('unknown-key')).toBe('ats-classic');
    expect(normalizeResumeTemplateKey(null)).toBe('ats-classic');
    expect(normalizeResumeTemplateKey(undefined)).toBe('ats-classic');
  });
});
