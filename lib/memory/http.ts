import { MemoryError, invalidInput } from './errors';

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw invalidInput('Request body must be valid JSON');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalidInput('Request body must be a JSON object');
  }
  return body as Record<string, unknown>;
}

export function memoryErrorResponse(error: unknown): Response {
  if (error instanceof MemoryError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  return Response.json(
    {
      error: {
        code: 'MEMORY_IO_ERROR',
        message: 'The memory request could not be completed',
      },
    },
    { status: 500 },
  );
}
