import { readAppStorage, writeAppStorage } from '@/lib/app-storage';

const STORAGE_KEY = 'lifeos.reminder_fires.v1';
const RETAIN_DAYS = 7;

export interface ReminderFireRecord {
  entryId: string;
  firedAt: string;
}

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function pruneOld(records: ReminderFireRecord[]): ReminderFireRecord[] {
  const cutoff = Date.now() - RETAIN_DAYS * 24 * 60 * 60 * 1000;
  return records.filter((record) => Date.parse(record.firedAt) >= cutoff);
}

async function readRecords(): Promise<ReminderFireRecord[]> {
  try {
    const raw = await readAppStorage(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as ReminderFireRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeRecords(records: ReminderFireRecord[]): Promise<void> {
  await writeAppStorage(STORAGE_KEY, JSON.stringify(pruneOld(records)));
}

export async function logReminderFire(entryId: string): Promise<void> {
  const records = await readRecords();
  const now = new Date().toISOString();
  const withoutDup = records.filter(
    (record) => !(record.entryId === entryId && isToday(record.firedAt)),
  );
  withoutDup.push({ entryId, firedAt: now });
  await writeRecords(withoutDup);
}

export async function getTodaysReminderFires(): Promise<ReminderFireRecord[]> {
  const records = await readRecords();
  return records.filter((record) => isToday(record.firedAt));
}

export async function clearReminderFire(entryId: string): Promise<void> {
  const records = await readRecords();
  await writeRecords(records.filter((record) => record.entryId !== entryId));
}

export async function countTodaysReminderFires(): Promise<number> {
  const fires = await getTodaysReminderFires();
  return fires.length;
}
