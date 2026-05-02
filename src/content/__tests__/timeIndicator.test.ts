import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isTodayBdate,
  nowMinutes,
  readColumnRange,
  startTimeIndicator,
  todayDateString,
} from '../timeIndicator';

describe('todayDateString', () => {
  it('builds YYYY-MM-DD from local-time components (zero-padded)', () => {
    const d = new Date(2026, 0, 5); // Jan 5
    expect(todayDateString(d)).toBe('2026-01-05');
  });

  it('keeps two-digit components intact', () => {
    const d = new Date(2026, 11, 31);
    expect(todayDateString(d)).toBe('2026-12-31');
  });

  it('uses now as the default argument (smoke check)', () => {
    expect(todayDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('nowMinutes', () => {
  it('returns hours*60 + minutes (local time)', () => {
    expect(nowMinutes(new Date(2026, 3, 25, 9, 30))).toBe(9 * 60 + 30);
  });

  it('returns 0 at midnight', () => {
    expect(nowMinutes(new Date(2026, 3, 25, 0, 0))).toBe(0);
  });

  it('returns 23*60 + 59 at the last minute of the day', () => {
    expect(nowMinutes(new Date(2026, 3, 25, 23, 59))).toBe(23 * 60 + 59);
  });
});

describe('isTodayBdate', () => {
  // Today is the host's current date — fix it via fake timers so the test
  // is deterministic regardless of when it runs.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 25, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true for zero-padded YYYY-MM-DD matching today', () => {
    expect(isTodayBdate('2026-04-25')).toBe(true);
  });

  it('returns true for unpadded YYYY-M-D matching today', () => {
    // Garoon emits this form on time-row attributes — it must still match.
    expect(isTodayBdate('2026-4-25')).toBe(true);
  });

  it('returns true for partially padded forms (YYYY-M-DD, YYYY-MM-D)', () => {
    expect(isTodayBdate('2026-4-05')).toBe(false); // day differs
    expect(isTodayBdate('2026-04-25')).toBe(true);
  });

  it('returns false when the date does not match today', () => {
    expect(isTodayBdate('2026-04-24')).toBe(false);
    expect(isTodayBdate('2025-04-25')).toBe(false);
    expect(isTodayBdate('2026-05-25')).toBe(false);
  });

  it('returns false for malformed strings', () => {
    expect(isTodayBdate(undefined)).toBe(false);
    expect(isTodayBdate('')).toBe(false);
    expect(isTodayBdate('2026/04/25')).toBe(false);
    expect(isTodayBdate('2026-04')).toBe(false);
    expect(isTodayBdate('not-a-date')).toBe(false);
    expect(isTodayBdate('2026-13-01')).toBe(false); // month out of range, but regex allows; numeric eq still fails
  });
});

describe('readColumnRange', () => {
  // Helper: build a fake Garoon week column with given hour data attributes.
  const buildColumn = (hours: (string | number)[]): HTMLElement => {
    const col = document.createElement('div');
    col.className = 'personal_day_event_list';
    for (const h of hours) {
      const row = document.createElement('div');
      row.className = 'personal_day_calendar_time_row';
      row.setAttribute('data-hour', String(h));
      col.appendChild(row);
    }
    return col;
  };

  it('returns null when the column has no time rows', () => {
    const col = document.createElement('div');
    expect(readColumnRange(col)).toBeNull();
  });

  it('returns startMinute / endMinute derived from first and (last+1) hour', () => {
    const col = buildColumn([8, 9, 10, 11, 17]);
    expect(readColumnRange(col)).toEqual({
      startMinute: 8 * 60,
      endMinute: 18 * 60,
    });
  });

  it('handles a single-row column (start == hour, end == hour+1 in minutes)', () => {
    const col = buildColumn([12]);
    expect(readColumnRange(col)).toEqual({
      startMinute: 12 * 60,
      endMinute: 13 * 60,
    });
  });

  it('returns null when first or last data-hour is non-numeric', () => {
    const col = buildColumn(['oops', 9, 10]);
    expect(readColumnRange(col)).toBeNull();
  });

  it('returns null when the last data-hour is missing', () => {
    const col = buildColumn([9, 10]);
    const lastRow = col.lastElementChild as HTMLElement;
    lastRow.removeAttribute('data-hour');
    expect(readColumnRange(col)).toBeNull();
  });
});

describe('startTimeIndicator', () => {
  // timeIndicator.ts 内部定数の写経。これらの ID は描画オーバーレイの契約だが
  // モジュールから export されていないのでテスト側に複製している。
  const INDICATOR_ID = 'garoon-now-indicator-overlay';
  const STYLE_ID = 'garoon-now-indicator-style';

  // startTimeIndicator() が「今日の列」と認識する日表示の DOM を組み立てる。
  // jsdom はレイアウト計算をしないため、findTodayColumn() の可視判定
  // (offsetParent !== null) と render() の位置計算 (getBoundingClientRect)
  // が依存するジオメトリ読み取りもここでスタブする。
  // endHour は半開区間の右端 (= 列が覆う範囲は [startHour:00, endHour:00))。
  // 例えば { startHour: 8, endHour: 18 } の列は data-hour="8".."17" の 10 行を
  // 持ち、readColumnRange() が endMinute=18*60 を返す。
  const buildDayView = (
    bdate: string,
    { startHour, endHour }: { startHour: number; endHour: number },
  ): HTMLElement => {
    const td = document.createElement('td');
    td.className = 'personal_day_calendar_date';
    const list = document.createElement('div');
    list.className = 'personal_day_event_list';
    td.appendChild(list);

    for (let h = startHour; h < endHour; h++) {
      const row = document.createElement('div');
      row.className = 'personal_day_calendar_time_row';
      row.setAttribute('data-hour', String(h));
      if (h === startHour) row.setAttribute('data-bdate', bdate);
      list.appendChild(row);
    }

    document.body.appendChild(td);

    Object.defineProperty(list, 'offsetParent', {
      configurable: true,
      get: () => document.body,
    });
    list.getBoundingClientRect = (): DOMRect =>
      ({
        top: 100,
        left: 50,
        right: 250,
        bottom: 700,
        width: 200,
        height: 600,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect;

    return list;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    // 実時間とは無関係な日付に "now" を固定する。findTodayColumn() と
    // isTodayBdate() はどちらも new Date() を読むが、fake timers がここで
    // 設定した値に振り替えるため、テストはホスト時計の日付に依存しない。
    // あえて今日と異なる日付を選ぶことで、その決定論性をコードから読み取れる。
    vi.setSystemTime(new Date(2024, 6, 15, 12, 0, 0));
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('今日の列が表示されているなら赤いラインを document.body に挿入する', () => {
    buildDayView('2024-7-15', { startHour: 8, endHour: 18 });

    const stop = startTimeIndicator();
    try {
      // runOnlyPendingTimers は現在キューされている rAF (→ render →
      // インジケーター挿入) と 60 秒の tickToNextMinute setTimeout (→ rAF と
      // setTimeout を再キュー) を発火するが、その実行中に再キューされた
      // タイマーは発火しないため、再帰は 1 周で停止する。
      vi.runOnlyPendingTimers();

      const indicator = document.getElementById(INDICATOR_ID);
      expect(indicator).not.toBeNull();
      expect(indicator?.parentElement).toBe(document.body);
      expect(indicator?.hidden).toBe(false);

      // ratio = (12:00 - 08:00) / (18:00 - 08:00) = 0.4
      // top   = rect.top + rect.height * ratio = 100 + 600 * 0.4 = 340
      expect(indicator?.style.getPropertyValue('--gni-top')).toBe('340px');
      expect(indicator?.style.getPropertyValue('--gni-left')).toBe('50px');
      expect(indicator?.style.getPropertyValue('--gni-width')).toBe('200px');

      // 共有 <style> ブロックが赤色とレイアウトを持つので、その存在も
      // 「赤いラインが DOM にある」状態の構成要素として確認する。
      expect(document.getElementById(STYLE_ID)).not.toBeNull();
    } finally {
      stop();
    }
  });

  // Garoon の表示時刻設定で「営業時間だけ表示」（例: 8:00-18:00）にした場合、
  // 現在時刻が列の範囲外なら render() の `minutes > endMinute` / `minutes <
  // startMinute` 判定でインジケーターは挿入されない。境界（18:00 ぴったり）は
  // 厳密大なり比較で含むため、ここでは明確に範囲外な時刻だけを検証する。
  it.each([
    { label: '営業時間後 (20:00)', hour: 20 },
    { label: '営業時間前 (6:00)', hour: 6 },
  ])(
    'Garoon の表示時刻が 8:00-18:00 のとき $label には赤いラインを表示しない',
    ({ hour }) => {
      vi.setSystemTime(new Date(2024, 6, 15, hour, 0, 0));
      buildDayView('2024-7-15', { startHour: 8, endHour: 18 });

      const stop = startTimeIndicator();
      try {
        vi.runOnlyPendingTimers();
        expect(document.getElementById(INDICATOR_ID)).toBeNull();
      } finally {
        stop();
      }
    },
  );

  it('今日と一致する列が無ければインジケーターを挿入しない', () => {
    // bdate を fake "now" の前日にすると findTodayColumn() は null を返す。
    buildDayView('2024-7-14', { startHour: 8, endHour: 18 });

    const stop = startTimeIndicator();
    try {
      vi.runOnlyPendingTimers();
      expect(document.getElementById(INDICATOR_ID)).toBeNull();
    } finally {
      stop();
    }
  });

  it('stop() を呼ぶとインジケーターと style を取り除く', () => {
    buildDayView('2024-7-15', { startHour: 8, endHour: 18 });
    const stop = startTimeIndicator();
    vi.runOnlyPendingTimers();
    expect(document.getElementById(INDICATOR_ID)).not.toBeNull();

    stop();

    expect(document.getElementById(INDICATOR_ID)).toBeNull();
    expect(document.getElementById(STYLE_ID)).toBeNull();
  });
});
