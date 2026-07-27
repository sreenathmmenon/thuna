export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCompanionScheduler } = await import('./lib/companion/scheduler');
    startCompanionScheduler();
  }
}
