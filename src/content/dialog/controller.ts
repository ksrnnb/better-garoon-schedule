import { watchSimpleAddDialog } from './observer';
import { buildTabBar, TabKey } from './tabs';
import { buildTodoPanel, readDialogContext } from './todoPanel';
import { ensureDialogStyle } from './style';

const LOG_PREFIX = '[bgs/dialog]';

export function startDialogEnhancer(): () => void {
  ensureDialogStyle();
  return watchSimpleAddDialog(root => {
    const ctx = readDialogContext(root);
    if (!ctx) {
      console.debug(LOG_PREFIX, 'context not ready', root);
      return false;
    }

    const base = root.querySelector<HTMLElement>('.simpleAddBase-grn');
    const scheduleTable = base?.querySelector<HTMLElement>(
      '.simpleAddTable-grn',
    );
    if (!base || !scheduleTable) {
      console.debug(LOG_PREFIX, 'inner DOM not ready, will retry', { base });
      return false;
    }

    const todoPanel = buildTodoPanel(ctx);
    todoPanel.style.display = 'none';

    // Lock the panel's width to the schedule table's so switching tabs
    // doesn't shrink the dialog. Measured lazily on first switch because
    // the table might not have laid out yet at attach time.
    let lockedWidth = 0;
    const setVisible = (key: TabKey): void => {
      if (key === 'todo' && lockedWidth === 0) {
        lockedWidth = scheduleTable.offsetWidth;
        if (lockedWidth > 0) {
          todoPanel.style.minWidth = `${lockedWidth}px`;
        }
      }
      scheduleTable.style.display = key === 'schedule' ? '' : 'none';
      todoPanel.style.display = key === 'todo' ? '' : 'none';
    };

    const tabBar = buildTabBar(setVisible);
    base.insertBefore(tabBar.element, base.firstChild);
    scheduleTable.parentElement?.insertBefore(
      todoPanel,
      scheduleTable.nextSibling,
    );

    // Move Garoon's close button into the tab bar so it stays visible
    // regardless of the active tab. DOM relocation preserves listeners.
    const closeBtn = scheduleTable.querySelector<HTMLElement>(
      '.simpleAddClose-grn',
    );
    if (closeBtn) {
      closeBtn.classList.add('bgs-tab-close');
      tabBar.element.appendChild(closeBtn);
    }

    console.debug(LOG_PREFIX, 'tab bar attached', root);
    return true;
  });
}
