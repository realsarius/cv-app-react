import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
  type Color,
  type PDFFont,
  type PDFPage,
} from 'pdf-lib';
import type { ResumeContent } from '@/features/resume-editor/content';
import type { ResumeVisualSettings } from '@/lib/db/resume-settings';

type ResumePdfInput = {
  title: string;
  content: ResumeContent;
  settings: ResumeVisualSettings;
};

type Palette = {
  heading: Color;
  body: Color;
  muted: Color;
  divider: Color;
};

type DrawContext = {
  doc: PDFDocument;
  page: PDFPage;
  margin: number;
  y: number;
  width: number;
};

const LATIN_CHAR_MAP: Record<string, string> = {
  '\u00e7': 'c',
  '\u00c7': 'C',
  '\u011f': 'g',
  '\u011e': 'G',
  '\u0131': 'i',
  '\u0130': 'I',
  '\u00f6': 'o',
  '\u00d6': 'O',
  '\u015f': 's',
  '\u015e': 'S',
  '\u00fc': 'u',
  '\u00dc': 'U',
};

const EMPTY_LINE = '';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function toPdfSafeText(value: string) {
  const mapped = value
    .split('')
    .map((char) => LATIN_CHAR_MAP[char] ?? char)
    .join('');

  return mapped
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatRange(startDate: string, endDate: string) {
  const start = startDate.trim();
  const end = endDate.trim();

  if (start && end) {
    return `${start} - ${end}`;
  }

  if (start) {
    return `${start} - Present`;
  }

  if (end) {
    return end;
  }

  return EMPTY_LINE;
}

function buildPalette(colorScheme: ResumeVisualSettings['colorScheme']): Palette {
  if (colorScheme === 'mono') {
    return {
      heading: rgb(0.08, 0.08, 0.08),
      body: rgb(0.16, 0.16, 0.16),
      muted: rgb(0.33, 0.33, 0.33),
      divider: rgb(0.75, 0.75, 0.75),
    };
  }

  if (colorScheme === 'slate') {
    return {
      heading: rgb(0.07, 0.1, 0.15),
      body: rgb(0.16, 0.2, 0.26),
      muted: rgb(0.34, 0.41, 0.49),
      divider: rgb(0.72, 0.77, 0.82),
    };
  }

  return {
    heading: rgb(0.1, 0.13, 0.18),
    body: rgb(0.17, 0.2, 0.25),
    muted: rgb(0.4, 0.46, 0.53),
    divider: rgb(0.86, 0.89, 0.92),
  };
}

function createPage(doc: PDFDocument) {
  return doc.addPage(PageSizes.A4);
}

function ensureSpace(ctx: DrawContext, requiredHeight: number) {
  if (ctx.y - requiredHeight >= ctx.margin) {
    return;
  }

  ctx.page = createPage(ctx.doc);
  ctx.width = ctx.page.getWidth() - ctx.margin * 2;
  ctx.y = ctx.page.getHeight() - ctx.margin;
}

function wrapLine(text: string, font: PDFFont, size: number, maxWidth: number) {
  const normalizedText = toPdfSafeText(text);
  if (!normalizedText) {
    return [EMPTY_LINE];
  }

  const words = normalizedText.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [EMPTY_LINE];
  }

  const lines: string[] = [];
  let currentLine = words[0]!;

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`;

    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = words[index]!;
  }

  lines.push(currentLine);
  return lines;
}

function drawWrappedText(
  ctx: DrawContext,
  text: string,
  options: {
    font: PDFFont;
    size: number;
    color: Color;
    lineHeight: number;
    gapAfterParagraph?: number;
    indent?: number;
  }
) {
  const paragraphs = toPdfSafeText(text).split('\n');
  const indent = options.indent ?? 0;
  const width = ctx.width - indent;

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const lines = wrapLine(paragraph, options.font, options.size, width);

    lines.forEach((line) => {
      ensureSpace(ctx, options.lineHeight);
      ctx.page.drawText(line, {
        x: ctx.margin + indent,
        y: ctx.y,
        size: options.size,
        font: options.font,
        color: options.color,
      });
      ctx.y -= options.lineHeight;
    });

    if (paragraphIndex < paragraphs.length - 1) {
      ctx.y -= options.gapAfterParagraph ?? options.lineHeight * 0.35;
    }
  });
}

function drawSectionTitle(
  ctx: DrawContext,
  label: string,
  font: PDFFont,
  size: number,
  lineHeight: number,
  palette: Palette
) {
  ensureSpace(ctx, lineHeight * 2);
  drawWrappedText(ctx, label.toUpperCase(), {
    font,
    size,
    color: palette.muted,
    lineHeight,
  });

  ensureSpace(ctx, lineHeight * 0.8);
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.margin + ctx.width, y: ctx.y },
    thickness: 0.7,
    color: palette.divider,
  });
  ctx.y -= lineHeight * 0.7;
}

function drawLabeledEntry(
  ctx: DrawContext,
  title: string,
  subtitle: string,
  body: string,
  options: {
    headingFont: PDFFont;
    bodyFont: PDFFont;
    headingSize: number;
    bodySize: number;
    lineHeight: number;
    palette: Palette;
  }
) {
  drawWrappedText(ctx, title, {
    font: options.headingFont,
    size: options.headingSize,
    color: options.palette.heading,
    lineHeight: options.lineHeight,
  });

  if (subtitle) {
    drawWrappedText(ctx, subtitle, {
      font: options.bodyFont,
      size: options.bodySize,
      color: options.palette.muted,
      lineHeight: options.lineHeight,
    });
  }

  if (body) {
    drawWrappedText(ctx, body, {
      font: options.bodyFont,
      size: options.bodySize,
      color: options.palette.body,
      lineHeight: options.lineHeight,
      gapAfterParagraph: options.lineHeight * 0.25,
    });
  }

  ctx.y -= options.lineHeight * 0.35;
}

function formatContactLine(content: ResumeContent) {
  return [
    content.personalDetails.email,
    content.personalDetails.phone,
    content.personalDetails.address,
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' | ');
}

export async function createResumePdf(input: ResumePdfInput) {
  const doc = await PDFDocument.create();
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);
  const headingFont = await doc.embedFont(StandardFonts.HelveticaBold);

  const palette = buildPalette(input.settings.colorScheme);
  const scale = clamp(input.settings.fontScale, 0.85, 1.3);
  const spacingScale = clamp(input.settings.spacingScale, 0.8, 1.4);
  const compact = input.settings.templateKey === 'ats-compact';

  const baseSize = compact ? 10.5 * scale : 11 * scale;
  const headingSize = compact ? 11.5 * scale : 12.5 * scale;
  const heroNameSize = compact ? 24 * scale : 27 * scale;
  const heroTitleSize = compact ? 12 * scale : 13 * scale;
  const lineHeight = baseSize * (compact ? 1.35 : 1.45) * spacingScale;
  const sectionGap = compact ? lineHeight * 0.65 : lineHeight * 0.9;

  const firstPage = createPage(doc);
  const ctx: DrawContext = {
    doc,
    page: firstPage,
    margin: 40,
    y: firstPage.getHeight() - 40,
    width: firstPage.getWidth() - 80,
  };

  drawWrappedText(
    ctx,
    input.content.personalDetails.fullName || input.title || 'Resume',
    {
      font: headingFont,
      size: heroNameSize,
      color: palette.heading,
      lineHeight: heroNameSize * 1.08,
    }
  );

  if (input.content.personalDetails.jobTitle) {
    drawWrappedText(ctx, input.content.personalDetails.jobTitle, {
      font: bodyFont,
      size: heroTitleSize,
      color: palette.body,
      lineHeight: heroTitleSize * 1.25,
    });
  }

  const contactLine = formatContactLine(input.content);
  if (contactLine) {
    drawWrappedText(ctx, contactLine, {
      font: bodyFont,
      size: baseSize,
      color: palette.muted,
      lineHeight,
    });
  }

  ctx.y -= lineHeight * 0.4;
  ensureSpace(ctx, 10);
  ctx.page.drawLine({
    start: { x: ctx.margin, y: ctx.y },
    end: { x: ctx.margin + ctx.width, y: ctx.y },
    thickness: 0.8,
    color: palette.divider,
  });
  ctx.y -= sectionGap;

  if (input.content.profile.trim()) {
    drawSectionTitle(
      ctx,
      'Profile',
      headingFont,
      baseSize * 0.95,
      lineHeight,
      palette
    );

    drawWrappedText(ctx, input.content.profile, {
      font: bodyFont,
      size: baseSize,
      color: palette.body,
      lineHeight,
      gapAfterParagraph: lineHeight * 0.25,
    });

    ctx.y -= sectionGap;
  }

  if (input.content.experiences.length > 0) {
    drawSectionTitle(
      ctx,
      'Experience',
      headingFont,
      baseSize * 0.95,
      lineHeight,
      palette
    );

    input.content.experiences.forEach((item) => {
      const title =
        `${item.title.trim() || 'Role'}${
          item.company.trim() ? ` - ${item.company.trim()}` : EMPTY_LINE
        }`;
      const range = formatRange(item.startDate, item.endDate);
      const location = [item.city.trim(), item.country.trim()]
        .filter(Boolean)
        .join(', ');
      const subtitle = [range, location].filter(Boolean).join(' | ');

      drawLabeledEntry(ctx, title, subtitle, item.description, {
        headingFont,
        bodyFont,
        headingSize,
        bodySize: baseSize,
        lineHeight,
        palette,
      });
    });

    ctx.y -= sectionGap * 0.4;
  }

  if (input.content.educations.length > 0) {
    drawSectionTitle(
      ctx,
      'Education',
      headingFont,
      baseSize * 0.95,
      lineHeight,
      palette
    );

    input.content.educations.forEach((item) => {
      const title =
        `${item.school.trim() || 'School'}${
          item.degree.trim() ? ` - ${item.degree.trim()}` : EMPTY_LINE
        }`;
      const range = formatRange(item.startDate, item.endDate);
      const location = [item.city.trim(), item.country.trim()]
        .filter(Boolean)
        .join(', ');
      const subtitle = [range, location].filter(Boolean).join(' | ');

      drawLabeledEntry(ctx, title, subtitle, item.description, {
        headingFont,
        bodyFont,
        headingSize,
        bodySize: baseSize,
        lineHeight,
        palette,
      });
    });

    ctx.y -= sectionGap * 0.4;
  }

  if (input.content.projects.length > 0) {
    drawSectionTitle(
      ctx,
      'Projects',
      headingFont,
      baseSize * 0.95,
      lineHeight,
      palette
    );

    input.content.projects.forEach((item) => {
      const title = `${item.title.trim() || 'Project'}${
        item.subtitle.trim() ? ` - ${item.subtitle.trim()}` : EMPTY_LINE
      }`;
      const location = [item.city.trim(), item.country.trim()]
        .filter(Boolean)
        .join(', ');
      const subtitle = [item.stack.trim(), location].filter(Boolean).join(' | ');

      drawLabeledEntry(ctx, title, subtitle, item.description, {
        headingFont,
        bodyFont,
        headingSize,
        bodySize: baseSize,
        lineHeight,
        palette,
      });
    });
  }

  return doc.save();
}
