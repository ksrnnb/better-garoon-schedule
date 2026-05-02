import * as store from '../common/store';
import { startTimeIndicator } from './timeIndicator';

let cleanup: (() => void) | undefined;

export function apply(enabled: boolean): void {
  if (enabled && !cleanup) {
    cleanup = startTimeIndicator();
  } else if (!enabled && cleanup) {
    cleanup();
    cleanup = undefined;
  }
}

export async function init(): Promise<void> {
  const v = await store.load();
  apply(v.showsTimeIndicator !== false);

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local' || !('grn.config' in changes)) return;
    const next = await store.load();
    apply(next.showsTimeIndicator !== false);
  });
}
