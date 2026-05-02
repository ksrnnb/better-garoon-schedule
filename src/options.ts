import * as store from './common/store';
import { localizeHTML } from './common/util';

function input(name: string, defaultChecked?: boolean): HTMLInputElement {
  const elem = document.querySelector(
    `input[name=${name}]`,
  ) as HTMLInputElement;
  if (typeof defaultChecked === 'boolean') {
    elem.checked = defaultChecked;
  }
  return elem;
}

async function init() {
  localizeHTML();

  const v = await store.load();
  const showsTimeIndicator = input(
    'shows-time-indicator',
    v.showsTimeIndicator !== false,
  );
  const showsTodoTab = input('shows-todo-tab', v.showsTodoTab !== false);

  document
    .querySelector('#ext-options')!
    .addEventListener('submit', async ev => {
      ev.preventDefault();
      await store.save({
        showsTimeIndicator: showsTimeIndicator.checked,
        showsTodoTab: showsTodoTab.checked,
      });
      const saved = document.querySelector<HTMLSpanElement>('.saved')!;
      saved.hidden = false;
      setTimeout(() => {
        saved.hidden = true;
      }, 2000);
    });
}

document.addEventListener('DOMContentLoaded', init);
