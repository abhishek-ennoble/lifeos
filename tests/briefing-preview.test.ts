import { describe, expect, it } from 'vitest';

import { splitBriefingPreview } from '@/lib/briefing-preview';

describe('splitBriefingPreview', () => {
  it('returns empty parts for empty content', () => {
    expect(splitBriefingPreview('')).toEqual({ preview: '', rest: '' });
  });

  it('uses the first paragraph as preview when paragraphs exist', () => {
    const content = 'Two things matter today.\n\nHere is the longer context that follows.';
    expect(splitBriefingPreview(content)).toEqual({
      preview: 'Two things matter today.',
      rest: 'Here is the longer context that follows.',
    });
  });

  it('keeps short single-paragraph briefings whole', () => {
    const content = 'Nothing pressing. Enjoy the space.';
    expect(splitBriefingPreview(content)).toEqual({ preview: content, rest: '' });
  });

  it('cuts long single-paragraph briefings at a sentence boundary under the cap', () => {
    const sentence = 'This sentence has exactly seven words in it.';
    const content = Array.from({ length: 12 }, () => sentence).join(' ');
    const { preview, rest } = splitBriefingPreview(content);
    expect(preview.endsWith('.')).toBe(true);
    expect(preview.split(/\s+/).length).toBeLessThanOrEqual(45);
    expect(rest.length).toBeGreaterThan(0);
    expect(`${preview} ${rest}`).toBe(content);
  });
});
