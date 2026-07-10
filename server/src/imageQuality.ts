// Basic image-quality gate: rejects plain black / blank / near-uniform frames
// (lens-cap shots, accidental captures, all-one-color images) before they are
// moderated and stored. This is a content-quality check, not a safety check —
// safety lives in moderation.ts.
//
// We decode the JPEG to raw pixels with the pure-JS `jpeg-js` decoder (no native
// deps), downsample to keep it cheap, and look at two signals:
//   - mean luminance  → too dark / black
//   - luminance variance → too uniform (a single flat colour, incl. black/white)
// An image is rejected if it is BOTH dark AND flat, or extremely flat on its own.

import jpeg from 'jpeg-js';

export interface ImageQuality {
  ok: boolean;
  reason?: 'image_too_dark' | 'image_blank';
  meanLuma: number;
  variance: number;
}

// Tunable via env so thresholds can be adjusted without a redeploy.
const MIN_BRIGHTNESS = parseFloat(process.env.IMAGE_MIN_BRIGHTNESS ?? '16'); // 0-255
const MIN_VARIANCE = parseFloat(process.env.IMAGE_MIN_VARIANCE ?? '12'); // luma variance

// Decode is bounded so a giant image can't hog CPU; jpeg-js caps memory itself.
export function analyzeImageQuality(buffer: Buffer): ImageQuality {
  let decoded: { width: number; height: number; data: Uint8Array };
  try {
    // maxMemoryUsageInMB guards against decompression bombs.
    decoded = jpeg.decode(buffer, { useTArray: true, maxMemoryUsageInMB: 512 }) as any;
  } catch {
    // Undecodable here → don't block on the quality gate; let moderation/storage
    // deal with it. Fail open.
    return { ok: true, meanLuma: -1, variance: -1 };
  }

  const { width, height, data } = decoded;
  if (!width || !height || !data?.length) {
    return { ok: true, meanLuma: -1, variance: -1 };
  }

  // Sample at most ~4096 pixels evenly across the image for speed.
  const totalPixels = width * height;
  const step = Math.max(1, Math.floor(totalPixels / 4096));

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let p = 0; p < totalPixels; p += step) {
    const i = p * 4; // RGBA
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += luma;
    sumSq += luma * luma;
    count++;
  }

  const meanLuma = sum / count;
  const variance = sumSq / count - meanLuma * meanLuma;

  // Flat colour of any hue (variance ~0) → blank. Covers black, white, grey,
  // and any solid fill.
  if (variance < MIN_VARIANCE) {
    return { ok: false, reason: 'image_blank', meanLuma, variance };
  }
  // Very dark overall AND low-detail → treat as a black/lens-cap frame.
  if (meanLuma < MIN_BRIGHTNESS && variance < MIN_VARIANCE * 6) {
    return { ok: false, reason: 'image_too_dark', meanLuma, variance };
  }

  return { ok: true, meanLuma, variance };
}
