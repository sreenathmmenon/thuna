import { routineService } from '../routines/singleton';

const globalState = globalThis as typeof globalThis & {
  __thunaScheduler?: ReturnType<typeof setInterval>;
  __thunaSchedulerRunning?: boolean;
};

export async function runCompanionSchedulerTick(): Promise<void> {
  if (globalState.__thunaSchedulerRunning) return;
  globalState.__thunaSchedulerRunning = true;
  try {
    routineService.processUnanswered();
    await routineService.triggerDue();
  } finally {
    globalState.__thunaSchedulerRunning = false;
  }
}

export function startCompanionScheduler(): void {
  if (
    process.env.NODE_ENV === 'test' ||
    process.env.THUNA_SCHEDULER_ENABLED !== 'true' ||
    globalState.__thunaScheduler
  ) {
    return;
  }
  const configured = Number(process.env.THUNA_SCHEDULER_INTERVAL_SECONDS || 15);
  const seconds = Number.isFinite(configured)
    ? Math.max(5, Math.min(300, configured))
    : 15;
  void runCompanionSchedulerTick().catch((error: unknown) => {
    console.error('[thuna:scheduler]', error instanceof Error ? error.message : 'Scheduler failed.');
  });
  globalState.__thunaScheduler = setInterval(() => {
    void runCompanionSchedulerTick().catch((error: unknown) => {
      console.error(
        '[thuna:scheduler]',
        error instanceof Error ? error.message : 'Scheduler failed.',
      );
    });
  }, seconds * 1000);
  globalState.__thunaScheduler.unref?.();
}
