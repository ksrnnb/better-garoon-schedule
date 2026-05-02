export function t(key: string, defaultValue?: string) {
  const msg = chrome.i18n.getMessage(key);
  if (!msg && !defaultValue) {
    console.warn(`undefined message key: ${key}`);
  }
  return msg || defaultValue || key;
}
