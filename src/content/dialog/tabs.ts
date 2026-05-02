import { t } from '../../common/util';

export type TabKey = 'schedule' | 'todo';

export interface TabBar {
  element: HTMLElement;
  setActive: (key: TabKey) => void;
}

export function buildTabBar(onChange: (key: TabKey) => void): TabBar {
  const bar = document.createElement('div');
  bar.className = 'bgs-tab-bar';
  bar.setAttribute('role', 'tablist');

  const scheduleTab = makeTab('schedule', t('tab_schedule', '予定'));
  const todoTab = makeTab('todo', t('tab_todo', 'ToDo'));
  bar.append(scheduleTab, todoTab);

  const setActive = (key: TabKey): void => {
    for (const tab of [scheduleTab, todoTab]) {
      const active = tab.dataset.bgsTab === key;
      tab.classList.toggle('bgs-tab-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }
  };

  const activate = (tab: HTMLElement): void => {
    const key = tab.dataset.bgsTab as TabKey;
    setActive(key);
    onChange(key);
  };

  for (const tab of [scheduleTab, todoTab]) {
    tab.addEventListener('click', e => {
      e.preventDefault();
      activate(tab);
    });
    tab.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(tab);
      }
    });
  }

  setActive('schedule');
  return { element: bar, setActive };
}

function makeTab(key: TabKey, label: string): HTMLDivElement {
  const tab = document.createElement('div');
  tab.className = 'bgs-tab';
  tab.dataset.bgsTab = key;
  tab.textContent = label;
  tab.setAttribute('role', 'tab');
  return tab;
}
