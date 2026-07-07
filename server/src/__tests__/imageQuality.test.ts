import jpeg from 'jpeg-js';
import { analyzeImageQuality } from '../imageQuality';

// Build a WxH RGBA buffer, then JPEG-encode it the way the app would.
function makeJpeg(width: number, height: number, fill: (x: number, y: number) => [number, number, number]): Buffer {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = fill(x, y);
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return jpeg.encode({ data, width, height }, 90).data;
}

describe('analyzeImageQuality', () => {
  it('rejects a plain black frame', () => {
    const buf = makeJpeg(64, 64, () => [0, 0, 0]);
    const q = analyzeImageQuality(buf);
    expect(q.ok).toBe(false);
    expect(['image_too_dark', 'image_blank']).toContain(q.reason);
  });

  it('rejects a flat solid colour (blank) of any hue', () => {
    const white = analyzeImageQuality(makeJpeg(64, 64, () => [255, 255, 255]));
    const grey = analyzeImageQuality(makeJpeg(64, 64, () => [120, 120, 120]));
    expect(white.ok).toBe(false);
    expect(white.reason).toBe('image_blank');
    expect(grey.ok).toBe(false);
  });

  it('accepts a real, detailed image', () => {
    // High-variance pseudo-random content across the full brightness range.
    let seed = 7;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % 256;
    };
    const q = analyzeImageQuality(makeJpeg(64, 64, () => [rand(), rand(), rand()]));
    expect(q.ok).toBe(true);
  });

  it('fails open on an undecodable buffer', () => {
    const q = analyzeImageQuality(Buffer.from('not a jpeg'));
    expect(q.ok).toBe(true);
  });
});
