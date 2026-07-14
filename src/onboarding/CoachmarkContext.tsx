import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { hasSeenCoachmarks, markCoachmarksSeen } from '../services/onboardingStore';
import CoachmarkOverlay from './CoachmarkOverlay';

export interface CoachRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoachStep {
  /** id of the registered target this step points at */
  id: string;
  title: string;
  text: string;
}

type MeasureFn = () => Promise<CoachRect | null>;

interface CoachmarkContextValue {
  registerTarget: (id: string, measure: MeasureFn) => void;
  unregisterTarget: (id: string) => void;
  /** Starts the tour only if the user has not seen it yet. */
  startOnboardingOnce: (steps: CoachStep[]) => Promise<void>;
  /** Forces the tour to run (e.g. from a "replay tutorial" button). */
  startOnboarding: (steps: CoachStep[]) => Promise<void>;
  isRunning: boolean;
}

const CoachmarkContext = createContext<CoachmarkContextValue | undefined>(undefined);

export const CoachmarkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const targets = useRef<Map<string, MeasureFn>>(new Map());
  const [steps, setSteps] = useState<CoachStep[]>([]);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<CoachRect | null>(null);
  const [running, setRunning] = useState(false);

  const registerTarget = useCallback((id: string, measure: MeasureFn) => {
    targets.current.set(id, measure);
  }, []);

  const unregisterTarget = useCallback((id: string) => {
    targets.current.delete(id);
  }, []);

  const measureStep = useCallback(async (stepList: CoachStep[], i: number) => {
    const step = stepList[i];
    if (!step) return null;
    const fn = targets.current.get(step.id);
    if (!fn) return null;
    // Retry a few times in case layout is not ready yet.
    for (let attempt = 0; attempt < 5; attempt++) {
      const r = await fn();
      if (r && r.width > 0 && r.height > 0) return r;
      await new Promise((res) => setTimeout(res, 120));
    }
    return null;
  }, []);

  const run = useCallback(
    async (stepList: CoachStep[]) => {
      if (stepList.length === 0) return;
      const r = await measureStep(stepList, 0);
      setSteps(stepList);
      setIndex(0);
      setRect(r);
      setRunning(true);
    },
    [measureStep],
  );

  const startOnboarding = useCallback(
    async (stepList: CoachStep[]) => {
      await run(stepList);
    },
    [run],
  );

  const startOnboardingOnce = useCallback(
    async (stepList: CoachStep[]) => {
      if (await hasSeenCoachmarks()) return;
      await run(stepList);
    },
    [run],
  );

  const finish = useCallback(async () => {
    setRunning(false);
    setSteps([]);
    setIndex(0);
    setRect(null);
    try {
      await markCoachmarksSeen();
    } catch (error) {
      console.error('failed to persist coachmark completion:', error);
    }
  }, []);

  const next = useCallback(async () => {
    const nextIndex = index + 1;
    if (nextIndex >= steps.length) {
      await finish();
      return;
    }
    const r = await measureStep(steps, nextIndex);
    setIndex(nextIndex);
    setRect(r);
  }, [finish, index, measureStep, steps]);

  const value = useMemo<CoachmarkContextValue>(
    () => ({
      registerTarget,
      unregisterTarget,
      startOnboarding,
      startOnboardingOnce,
      isRunning: running,
    }),
    [registerTarget, unregisterTarget, startOnboarding, startOnboardingOnce, running],
  );

  return (
    <CoachmarkContext.Provider value={value}>
      {children}
      {running && steps[index] && (
        <CoachmarkOverlay
          rect={rect}
          step={steps[index]}
          index={index}
          total={steps.length}
          onNext={next}
          onSkip={finish}
        />
      )}
    </CoachmarkContext.Provider>
  );
};

export function useCoachmark(): CoachmarkContextValue {
  const ctx = useContext(CoachmarkContext);
  if (!ctx) throw new Error('useCoachmark must be used within CoachmarkProvider');
  return ctx;
}
