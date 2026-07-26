import { invalidInput } from '@/lib/memory/errors';
import { memoryStore } from '@/lib/memory/default-store';
import {
  memoryErrorResponse,
  readJsonObject,
} from '@/lib/memory/http';
import type {
  HistoryCategory,
  HistoryInput,
} from '@/lib/memory/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HISTORY_CATEGORIES: HistoryCategory[] = [
  'tasks',
  'routines',
  'corrections',
  'handoffs',
];

function parseCategory(value: unknown): HistoryCategory {
  if (
    typeof value !== 'string' ||
    !HISTORY_CATEGORIES.includes(value as HistoryCategory)
  ) {
    throw invalidInput(
      'category must be tasks, routines, corrections, or handoffs',
    );
  }
  return value as HistoryCategory;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const categoryValue = new URL(request.url).searchParams.get('category');
    const history = categoryValue
      ? memoryStore.listHistory(parseCategory(categoryValue))
      : memoryStore.listHistory();
    return Response.json({ history });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await readJsonObject(request);
    const category = parseCategory(body.category);
    const entry = memoryStore.appendHistory(category, body as unknown as HistoryInput);
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    return memoryErrorResponse(error);
  }
}
