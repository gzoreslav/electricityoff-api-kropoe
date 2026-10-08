const PROVIDER_ID = 'KROPOE';

const ON = 1;
const OFF = 0;
const NO_DATA = 2;
const ON_FIRST_HALF = 3;
const OFF_FIRST_HALF = 4;

type ScheduleRow = Record<string, number | undefined> & {
  IsToday?: number;
};

type EventItem = {
  date: string;
  startTime: string;
  endTime: string;
  electricity: 'off';
  provider: typeof PROVIDER_ID;
  queue: string;
};

type DayEvents = {
  events: EventItem[];
  hasData: boolean;
};

function hourKey(hour: number): string {
  return `H${String(hour).padStart(2, '0')}`;
}

function formatMinute(total: number): string {
  if (total >= 24 * 60) return '24:00';
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function dayHasData(row: ScheduleRow | undefined): boolean {
  const first = row?.[hourKey(1)];
  return typeof first === 'number' && first !== NO_DATA;
}

function intervalsForDay(row: ScheduleRow | undefined): Array<{ start: number; end: number }> {
  if (!row) return [];

  const pieces: Array<{ start: number; end: number }> = [];

  for (let hour = 1; hour <= 24; hour++) {
    const code = row[hourKey(hour)];
    if (typeof code !== 'number' || code === ON || code === NO_DATA) continue;

    const start = (hour - 1) * 60;
    const end = hour * 60;

    if (code === OFF) pieces.push({ start, end });
    else if (code === ON_FIRST_HALF) pieces.push({ start: start + 30, end });
    else if (code === OFF_FIRST_HALF) pieces.push({ start, end: start + 30 });
  }

  const merged: Array<{ start: number; end: number }> = [];
  pieces.forEach((piece) => {
    const last = merged[merged.length - 1];
    if (last && last.end === piece.start) {
      last.end = piece.end;
      return;
    }
    merged.push({ ...piece });
  });

  return merged;
}

export function eventsFromSchedule(schedule: ScheduleRow[] | undefined, dateToday: string, dateTomorrow: string, queue: string): {
  events: EventItem[];
  hasTodayData: boolean;
  hasTomorrowData: boolean;
} {
  const rows = Array.isArray(schedule) ? schedule : [];
  const todayIndex = rows.findIndex((row) => row?.IsToday === 1);
  const todayRow = todayIndex >= 0 ? rows[todayIndex] : undefined;
  const tomorrowRow = todayIndex >= 0 ? rows[todayIndex + 1] : undefined;

  const toEvents = (row: ScheduleRow | undefined, date: string): DayEvents => ({
    hasData: dayHasData(row),
    events: dayHasData(row)
      ? intervalsForDay(row).map((interval) => ({
          date,
          startTime: formatMinute(interval.start),
          endTime: formatMinute(interval.end),
          electricity: 'off' as const,
          provider: PROVIDER_ID,
          queue,
        }))
      : [],
  });

  const today = toEvents(todayRow, dateToday);
  const tomorrow = toEvents(tomorrowRow, dateTomorrow);

  return {
    events: [...today.events, ...tomorrow.events],
    hasTodayData: today.hasData,
    hasTomorrowData: tomorrow.hasData,
  };
}

export function mergeQueueResults(
  parts: Array<{ events: EventItem[]; hasTodayData: boolean; hasTomorrowData: boolean }>
) {
  return {
    events: parts.flatMap((part) => part.events),
    hasTodayData: parts.some((part) => part.hasTodayData),
    hasTomorrowData: parts.some((part) => part.hasTomorrowData),
  };
}
