const DIALOG_ROOT_SELECTOR = '[id^="sch-simple-add"][id$="-dialog"]';
const APPLIED_FLAG = 'bgsTabsApplied';

// Return false to indicate the dialog isn't ready yet (e.g. inner content not
// rendered) — the observer will retry on the next mutation. Anything else
// (including void) is treated as success and the dialog is marked processed.
export type DialogHandler = (root: HTMLElement) => boolean | void;

export function watchSimpleAddDialog(onAppear: DialogHandler): () => void {
  const observer = new MutationObserver(() => tryAll());

  // The content script keeps running after the extension is disabled or
  // reloaded, but chrome.* APIs throw "Extension context invalidated" once
  // the runtime is gone. chrome.runtime.id becomes undefined at that point,
  // so use it as the liveness check and stop observing.
  const tryAll = (): void => {
    if (!chrome.runtime?.id) {
      observer.disconnect();
      return;
    }
    document
      .querySelectorAll<HTMLElement>(DIALOG_ROOT_SELECTOR)
      .forEach(root => {
        if (root.dataset[APPLIED_FLAG]) return;
        const result = onAppear(root);
        if (result !== false) {
          root.dataset[APPLIED_FLAG] = '1';
        }
      });
  };

  tryAll();
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
