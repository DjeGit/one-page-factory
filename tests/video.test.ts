import { describe, it, expect } from 'vitest';
import { getYouTubeId } from '@/lib/video';

describe('getYouTubeId', () => {
  it('lit les formats YouTube courants', () => {
    expect(getYouTubeId('https://www.youtube.com/watch?v=wTMF-VeU54s')).toBe('wTMF-VeU54s');
    expect(getYouTubeId('https://youtu.be/cJTrCAScbxI?t=3')).toBe('cJTrCAScbxI');
    expect(getYouTubeId('https://www.youtube.com/embed/cJTrCAScbxI')).toBe('cJTrCAScbxI');
    expect(getYouTubeId('https://m.youtube.com/shorts/cJTrCAScbxI')).toBe('cJTrCAScbxI');
  });
  it('refuse tout ce qui n’est pas une vidéo YouTube', () => {
    expect(getYouTubeId(null)).toBeNull();
    expect(getYouTubeId('')).toBeNull();
    expect(getYouTubeId('https://vimeo.com/123456789')).toBeNull();
    expect(getYouTubeId('https://www.youtube.com/watch?v=court')).toBeNull();
    expect(getYouTubeId('pas une url')).toBeNull();
  });
});
