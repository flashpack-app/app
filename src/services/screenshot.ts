import { useEffect, useRef } from 'react';
import * as ScreenCapture from 'expo-screen-capture';
import { APIService } from './api';

// Blocks screenshots & screen recording while `active` is true.
// Android: applies FLAG_SECURE so captures come out blank (like WhatsApp/Instagram).
// iOS: prevents content from appearing in screen recordings.
export function usePreventCapture(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const key = 'flash-prevent-' + Math.random().toString(36).slice(2);
    ScreenCapture.preventScreenCaptureAsync(key).catch(() => {});
    return () => {
      ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
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
      APIService.logScreenshot(token, packId).catch(() => {});
    });
    return () => {
      sub.remove();
    };
  }, [packId, token]);
}
