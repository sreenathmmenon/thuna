import { routineService } from '../../../../lib/routines/singleton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const routines = routineService.list();
  const now = Date.now();
  const phoneConfigured =
    process.env.THUNA_ENABLE_REAL_TELEPHONY === 'true' &&
    Boolean(
      process.env.EXOTEL_API_KEY &&
        process.env.EXOTEL_API_TOKEN &&
        process.env.EXOTEL_ACCOUNT_SID &&
        process.env.EXOTEL_CALLER_ID &&
        process.env.EXOTEL_VOICEBOT_FLOW_URL &&
        process.env.THUNA_ELDER_PHONE_NUMBER,
    );
  return Response.json({
    scheduler: process.env.THUNA_SCHEDULER_ENABLED === 'true' ? 'enabled' : 'disabled',
    delivery: {
      deviceAlert: true,
      automatedCall: phoneConfigured ? 'EXOTEL_CONFIGURED' : 'disabled_or_not_configured',
    },
    pending: routines.filter((routine) =>
      ['SCHEDULED', 'SNOOZED', 'DUE', 'ACTIVE'].includes(routine.state),
    ).length,
    overdue: routines.filter(
      (routine) =>
        ['SCHEDULED', 'SNOOZED'].includes(routine.state) &&
        Date.parse(routine.scheduledFor) <= now,
    ).length,
  });
}
