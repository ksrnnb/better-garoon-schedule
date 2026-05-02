import { t } from './message';

export function localizeHTML() {
  document.body.innerHTML = document.body.innerHTML.replace(
    /__MSG_(\w+)__/g,
    (name, key) => t(key, name),
  );
}
