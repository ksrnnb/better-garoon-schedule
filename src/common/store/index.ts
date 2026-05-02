export interface Store {
  showsTimeIndicator?: boolean;
  showsTodoTab?: boolean;
}

export const defaultConfig: Store = {
  showsTimeIndicator: true,
  showsTodoTab: true,
};

const storageKey = 'grn.config';

export function load(): Promise<Store> {
  return new Promise(resolve => {
    chrome.storage.local.get(items => {
      resolve({ ...defaultConfig, ...(items[storageKey] || {}) });
    });
  });
}

export async function save(input: Partial<Store>): Promise<void> {
  const data = await load();

  return new Promise(resolve => {
    chrome.storage.local.set({ [storageKey]: { ...data, ...input } }, resolve);
  });
}
