/**
 * Split a briefing into an above-the-fold preview and the rest (F21).
 * Prefers the first paragraph (the server prompt makes it ≤45 words and
 * self-contained); older briefings without paragraph breaks fall back to a
 * word cap ending at a sentence boundary when possible.
 */

const PREVIEW_WORD_CAP = 45;

export interface BriefingPreview {
  preview: string;
  rest: string;
}

export function splitBriefingPreview(content: string): BriefingPreview {
  const text = content.trim();
  if (!text) {
    return { preview: '', rest: '' };
  }

  const paragraphs = text.split(/\n\s*\n/);
  const first = paragraphs[0]?.trim() ?? '';
  const firstWords = first.split(/\s+/);

  if (paragraphs.length > 1 && firstWords.length <= PREVIEW_WORD_CAP * 1.5) {
    return { preview: first, rest: paragraphs.slice(1).join('\n\n').trim() };
  }

  const words = text.split(/\s+/);
  if (words.length <= PREVIEW_WORD_CAP) {
    return { preview: text, rest: '' };
  }

  let cut = PREVIEW_WORD_CAP;
  for (let i = PREVIEW_WORD_CAP; i >= Math.floor(PREVIEW_WORD_CAP / 2); i--) {
    if (/[.!?]$/.test(words[i - 1] ?? '')) {
      cut = i;
      break;
    }
  }

  return {
    preview: words.slice(0, cut).join(' '),
    rest: words.slice(cut).join(' '),
  };
}
