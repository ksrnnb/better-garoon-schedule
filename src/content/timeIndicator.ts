const INDICATOR_ID = 'garoon-now-indicator-overlay';
const STYLE_ID = 'garoon-now-indicator-style';

const STYLE = `
  #${INDICATOR_ID} {
    position: fixed;
    height: 2px;
    background: #d93025;
    z-index: 99999;
    pointer-events: none;
    top: var(--gni-top, 0);
    left: var(--gni-left, 0);
    width: var(--gni-width, 0);
  }
  #${INDICATOR_ID}[hidden] { display: none; }
  #${INDICATOR_ID}::before {
    content: '';
    position: absolute;
    left: -6px;
    top: -4px;
    width: 10px;
    height: 10px;
    background: #d93025;
    border-radius: 50%;
  }
`;

export interface ColumnRange {
  startMinute: number;
  endMinute: number;
}

export function todayDateString(now: Date = new Date()): string {
  // toISOString is UTC and shifts the date in non-UTC timezones, so build
  // the YYYY-MM-DD string from local components.
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function nowMinutes(now: Date = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function isTodayBdate(bdate: string | undefined): boolean {
  if (!bdate) return false;
  // Garoon emits both YYYY-MM-DD (zero-padded, e.g. all-day cells) and
  // YYYY-M-D (no padding, e.g. time-row attributes). Compare numerically.
  const m = bdate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return false;
  const now = new Date();
  return (
    Number(m[1]) === now.getFullYear() &&
    Number(m[2]) === now.getMonth() + 1 &&
    Number(m[3]) === now.getDate()
  );
}

function weekGridColumnAt(index: number): HTMLElement | null {
  const gridTds = document.querySelectorAll<HTMLElement>(
    'td.personal_week_calendar_date',
  );
  const td = gridTds[index];
  if (!td) return null;
  const inner = td.querySelector<HTMLElement>('.personal_day_event_list');
  return inner && inner.offsetParent !== null ? inner : null;
}

function findTodayColumn(): HTMLElement | null {
  const today = todayDateString();

  // Week view: column ids are frozen at first-render dates, but aria-current
  // and the all-day TD's data-bdate stay in sync with the displayed dates.
  // Locate the column by index from those signals.
  const headers = document.querySelectorAll<HTMLElement>(
    'td.personal_week_calendar_date_cell',
  );
  const ariaIndex = Array.from(headers).findIndex(
    h => h.getAttribute('aria-current') === 'date',
  );
  if (ariaIndex >= 0) {
    const col = weekGridColumnAt(ariaIndex);
    if (col) return col;
  }

  const alldayCells = document.querySelectorAll<HTMLElement>(
    'td.personal_week_calendar_event_cell[data-bdate]',
  );
  const bdateIndex = Array.from(alldayCells).findIndex(
    c => c.dataset.bdate === today,
  );
  if (bdateIndex >= 0) {
    const col = weekGridColumnAt(bdateIndex);
    if (col) return col;
  }

  // Day view: a single visible column under td.personal_day_calendar_date.
  // The column id is empty, so verify "displayed day == today" via a time
  // row's data-bdate. If the user has navigated to another day, no indicator.
  const dayCol = document.querySelector<HTMLElement>(
    'td.personal_day_calendar_date .personal_day_event_list',
  );
  if (dayCol && dayCol.offsetParent !== null) {
    const row = dayCol.querySelector<HTMLElement>(
      '.personal_day_calendar_time_row[data-bdate]',
    );
    if (row && isTodayBdate(row.dataset.bdate)) {
      return dayCol;
    }
  }

  return null;
}

export function readColumnRange(column: HTMLElement): ColumnRange | null {
  const rows = column.querySelectorAll<HTMLElement>(
    '.personal_day_calendar_time_row',
  );
  if (rows.length === 0) return null;

  const first = Number(rows[0].dataset.hour);
  const last = Number(rows[rows.length - 1].dataset.hour);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return null;

  return { startMinute: first * 60, endMinute: (last + 1) * 60 };
}

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.appendChild(style);
}

function ensureIndicator(): HTMLElement {
  const existing = document.getElementById(INDICATOR_ID);
  if (existing) return existing;
  const el = document.createElement('div');
  el.id = INDICATOR_ID;
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

function removeIndicator(): void {
  document.getElementById(INDICATOR_ID)?.remove();
}

export function startTimeIndicator(): () => void {
  const ac = new AbortController();
  let scheduled = false;
  let minuteTimer: number | undefined;

  const render = (): void => {
    scheduled = false;

    const column = findTodayColumn();
    if (!column) {
      removeIndicator();
      return;
    }

    const range = readColumnRange(column);
    if (!range) {
      removeIndicator();
      return;
    }

    const minutes = nowMinutes();
    if (minutes < range.startMinute || minutes > range.endMinute) {
      removeIndicator();
      return;
    }

    const ratio =
      (minutes - range.startMinute) / (range.endMinute - range.startMinute);
    const rect = column.getBoundingClientRect();
    const top = rect.top + rect.height * ratio;

    const el = ensureIndicator();
    el.hidden = false;
    el.style.setProperty('--gni-top', `${top}px`);
    el.style.setProperty('--gni-left', `${rect.left}px`);
    el.style.setProperty('--gni-width', `${rect.width}px`);
  };

  const schedule = (): void => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(render);
  };

  const tickToNextMinute = (): void => {
    schedule();
    const now = new Date();
    const msUntilNextMinute =
      60_000 - (now.getSeconds() * 1000 + now.getMilliseconds());
    minuteTimer = window.setTimeout(tickToNextMinute, msUntilNextMinute);
  };

  ensureStyle();
  schedule();
  tickToNextMinute();

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('scroll', schedule, {
    passive: true,
    signal: ac.signal,
  });
  window.addEventListener('resize', schedule, { signal: ac.signal });

  return () => {
    ac.abort();
    observer.disconnect();
    if (minuteTimer !== undefined) clearTimeout(minuteTimer);
    removeIndicator();
    document.getElementById(STYLE_ID)?.remove();
  };
}
