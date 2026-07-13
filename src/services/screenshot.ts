import { useEffect, useRef, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { APIService } from './api';

// Blocks screenshots & screen recording while `active` is true.
// Android: applies FLAG_SECURE so captures come out blank (like WhatsApp/Instagram).
// iOS: prevents content from appearing in screen recordings.
export function usePreventCapture(active: boolean) {
  useEffect(() => {
    if (__DEV__) {
      // In development/testing, preventScreenCaptureAsync makes screen-mirroring
      // tools (Scrcpy, Vysor, and emulator feeds) go completely black.
      return;
    }
    if (!active) return;
    const key = 'flash-prevent-' + Math.random().toString(36).slice(2);
    ScreenCapture.preventScreenCaptureAsync(key).catch((e) => {
      console.warn('preventScreenCapture failed:', e);
    });
    return () => {
      ScreenCapture.allowScreenCaptureAsync(key).catch((e) => {
        console.warn('allowScreenCapture failed:', e);
      });
    };
  }, [active]);
}

export function useScreenshotDetector(token: string | null, packId: string | undefined, onDetect: () => void) {
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  useEffect(() => {
    if (!packId || !token) return;
    const sub = ScreenCapture.addScreenshotListener(() => {
      onDetectRef.current();
      APIService.logScreenshot(token, packId).catch((e) => {
        console.warn('logScreenshot failed:', e);
      });
    });
    return () => {
      sub.remove();
    };
  }, [packId, token]);
}

// Detects screenshot attempts and returns whether to show overlay
// Shows overlay for 3 seconds after a screenshot is detected
export function useCaptureBlockOverlay(active: boolean): boolean {
  const [showOverlay, setShowOverlay] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;

    const sub = ScreenCapture.addScreenshotListener(() => {
      setShowOverlay(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
      }, 3000);
    });

    return () => {
      sub.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active]);

  return showOverlay;
}
