import { useEffect, useRef, useState } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { APIService } from './api';

// Blocks screenshots & screen recording while `active` is true.
// Android: applies FLAG_SECURE so captures come out blank (like WhatsApp/Instagram).
// iOS: prevents content from appearing in screen recordings.
export function usePreventCapture(active: boolean) {
  useEffect(() => {
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
// Shows overlay briefly on mount to catch early screenshots, then on screenshot detection
export function useCaptureBlockOverlay(active: boolean): boolean {
  const [showOverlay, setShowOverlay] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) {
      setShowOverlay(false);
      return;
    }

    // Show overlay briefly on mount (500ms) to catch immediate screenshot attempts
    setShowOverlay(true);
    const mountTimeout = setTimeout(() => {
      setShowOverlay(false);
    }, 500);

    const sub = ScreenCapture.addScreenshotListener(() => {
      // Show overlay when screenshot is detected and keep it for 3 seconds
      setShowOverlay(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setShowOverlay(false);
      }, 3000);
    });

    return () => {
      clearTimeout(mountTimeout);
      sub.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [active]);

  return showOverlay;
}
