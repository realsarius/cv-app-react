import type { ResumeContent } from '@/features/resume-editor/content';

export type AtsScoreBreakdown = {
  keywordCoverage: number;
  sectionCompleteness: number;
  readability: number;
  roleAlignment: number;
};

export type AtsScoreResult = {
  overallScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: string[];
  algorithmVersion: 'v1.0-rule-based';
  breakdown: AtsScoreBreakdown;
};

const STOPWORDS = new Set([
  've',
  'ile',
  'icin',
  'gibi',
  'bir',
  'bu',
  'de',
  'da',
  'the',
  'and',
  'for',
  'with',
  'you',
  'your',
  'our',
  'we',
  'to',
  'of',
  'in',
  'on',
  'a',
  'an',
  'is',
  'are',
  'will',
  'be',
  'as',
  'at',
  'or',
  'by',
  'from',
  'using',
]);

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/\u0131/g, 'i')
    .replace(/\u011f/g, 'g')
    .replace(/\u00fc/g, 'u')
    .replace(/\u015f/g, 's')
    .replace(/\u00f6/g, 'o')
    .replace(/\u00e7/g, 'c')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return [] as string[];
  }

  return normalized
    .split(' ')
    .filter((token) => token.length >= 2 && !STOPWORDS.has(token));
}

function buildKeywordSet(jobDescription: string) {
  const tokens = tokenize(jobDescription);
  const unigramFrequency = new Map<string, number>();
  const bigramFrequency = new Map<string, number>();

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    unigramFrequency.set(token, (unigramFrequency.get(token) || 0) + 1);

    const nextToken = tokens[i + 1];
    if (nextToken && token.length >= 3 && nextToken.length >= 3) {
      const bigram = `${token} ${nextToken}`;
      bigramFrequency.set(bigram, (bigramFrequency.get(bigram) || 0) + 1);
    }
  }

  const sortedUnigrams = [...unigramFrequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
    .slice(0, 40);

  const sortedBigrams = [...bigramFrequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([token]) => token)
    .slice(0, 20);

  return [...new Set([...sortedUnigrams, ...sortedBigrams])].slice(0, 50);
}

function buildResumeText(content: ResumeContent) {
  const experiencesText = content.experiences
    .map((item) =>
      [
        item.title,
        item.company,
        item.city,
        item.country,
        item.startDate,
        item.endDate,
        item.description,
      ].join(' ')
    )
    .join(' ');

  const educationsText = content.educations
    .map((item) =>
      [
        item.school,
        item.degree,
        item.city,
        item.country,
        item.startDate,
        item.endDate,
        item.description,
      ].join(' ')
    )
    .join(' ');

  const projectsText = content.projects
    .map((item) =>
      [
        item.title,
        item.subtitle,
        item.city,
        item.country,
        item.stack,
        item.description,
      ].join(' ')
    )
    .join(' ');

  const skillsText = content.skills
    .map((item) => [item.name, item.level].join(' '))
    .join(' ');

  const languagesText = content.languages
    .map((item) => [item.name, item.proficiency].join(' '))
    .join(' ');

  const certificatesText = content.certificates
    .map((item) =>
      [item.name, item.issuer, item.date, item.credentialId, item.url].join(' ')
    )
    .join(' ');

  const awardsText = content.awards
    .map((item) => [item.title, item.issuer, item.date, item.description].join(' '))
    .join(' ');

  const interestsText = content.interests.map((item) => item.name).join(' ');

  const coursesText = content.courses
    .map((item) => [item.name, item.institution, item.date, item.url].join(' '))
    .join(' ');

  const referencesText = content.references
    .map((item) =>
      [
        item.name,
        item.title,
        item.company,
        item.relationship,
        item.email,
        item.phone,
      ].join(' ')
    )
    .join(' ');

  const organisationsText = content.organisations
    .map((item) =>
      [item.name, item.role, item.startDate, item.endDate, item.description].join(' ')
    )
    .join(' ');

  return normalizeText(
    [
      content.personalDetails.fullName,
      content.personalDetails.jobTitle,
      content.personalDetails.email,
      content.personalDetails.phone,
      content.personalDetails.address,
      content.profile,
      experiencesText,
      educationsText,
      projectsText,
      skillsText,
      languagesText,
      certificatesText,
      awardsText,
      interestsText,
      coursesText,
      referencesText,
      organisationsText,
    ].join(' ')
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toScore(value: number) {
  return Number(value.toFixed(2));
}

export function calculateAtsScore(
  content: ResumeContent,
  jobDescription: string
): AtsScoreResult {
  const normalizedJobDescription = normalizeText(jobDescription);
  const resumeText = buildResumeText(content);

  const keywords = buildKeywordSet(normalizedJobDescription);
  const resumeTokens = new Set(tokenize(resumeText));

  const matchedKeywords = keywords.filter((keyword) => {
    if (keyword.includes(' ')) {
      return resumeText.includes(keyword);
    }

    return resumeTokens.has(keyword);
  });

  const missingKeywords = keywords.filter(
    (keyword) => !matchedKeywords.includes(keyword)
  );

  const coverageRatio =
    keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
  const keywordCoverageScore = coverageRatio * 50;

  const sectionChecks = [
    content.personalDetails.fullName.trim().length >= 3,
    content.personalDetails.jobTitle.trim().length >= 2,
    /@/.test(content.personalDetails.email),
    content.personalDetails.phone.replace(/\D/g, '').length >= 7,
    content.personalDetails.address.trim().length >= 4,
    content.profile.trim().length >= 60,
    content.experiences.length > 0,
    content.educations.length > 0,
    content.projects.length > 0,
    content.skills.length > 0,
    content.languages.length > 0,
    content.certificates.length > 0,
  ];
  const sectionCompletenessRatio =
    sectionChecks.filter(Boolean).length / sectionChecks.length;
  const sectionCompletenessScore = sectionCompletenessRatio * 25;

  const profileLength = content.profile.trim().length;
  const sentenceCount = content.profile
    .split(/[.!?]+/)
    .map((segment) => segment.trim())
    .filter(Boolean).length;
  const readabilityChecks = [
    profileLength >= 120,
    profileLength <= 1200,
    sentenceCount >= 2,
    /@/.test(content.personalDetails.email) && /\./.test(content.personalDetails.email),
    content.personalDetails.phone.replace(/\D/g, '').length >= 10,
  ];
  const readabilityRatio =
    readabilityChecks.filter(Boolean).length / readabilityChecks.length;
  const readabilityScore = readabilityRatio * 15;

  const jobTitleTokens = tokenize(content.personalDetails.jobTitle);
  const roleMatches = jobTitleTokens.filter((token) =>
    tokenize(normalizedJobDescription).includes(token)
  );
  const roleAlignmentRatio =
    jobTitleTokens.length > 0
      ? roleMatches.length / Math.max(1, Math.min(jobTitleTokens.length, 4))
      : 0;
  const roleAlignmentScore = clamp(roleAlignmentRatio, 0, 1) * 10;

  const overallScore = clamp(
    keywordCoverageScore +
      sectionCompletenessScore +
      readabilityScore +
      roleAlignmentScore,
    0,
    100
  );

  const suggestions: string[] = [];

  if (coverageRatio < 0.45) {
    suggestions.push(
      'Is ilanindaki anahtar kelimeler profil ozetine ve deneyim maddelerine dagitilmali.'
    );
  }

  if (sectionCompletenessRatio < 0.8) {
    suggestions.push('Zorunlu alanlar (isim, e-posta, telefon, profil) tamamlanmali.');
  }

  if (content.skills.length === 0) {
    suggestions.push(
      'Beceriler bolumu eklenerek ilandaki teknik yetkinlikler acik sekilde listelenmeli.'
    );
  }

  if (readabilityRatio < 0.8) {
    suggestions.push(
      'Profil ozeti daha net cumlelerle ve olculebilir etkilerle guclendirilmeli.'
    );
  }

  if (roleAlignmentRatio < 0.4) {
    suggestions.push(
      'Hedef rol adi, ilandaki rol ve teknoloji terimleriyle daha uyumlu yazilmali.'
    );
  }

  if (missingKeywords.length > 0) {
    suggestions.push(
      `Eksik gorunen anahtar kelimelerden uygun olanlar eklenmeli: ${missingKeywords
        .slice(0, 8)
        .join(', ')}`
    );
  }

  return {
    overallScore: toScore(overallScore),
    matchedKeywords: matchedKeywords.slice(0, 20),
    missingKeywords: missingKeywords.slice(0, 20),
    suggestions: suggestions.slice(0, 6),
    algorithmVersion: 'v1.0-rule-based',
    breakdown: {
      keywordCoverage: toScore(keywordCoverageScore),
      sectionCompleteness: toScore(sectionCompletenessScore),
      readability: toScore(readabilityScore),
      roleAlignment: toScore(roleAlignmentScore),
    },
  };
}
