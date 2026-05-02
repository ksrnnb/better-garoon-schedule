const STYLE_ID = 'bgs-dialog-style';

// Layout/typography for labels, inputs, and the table itself reuse Garoon's
// own classes (simpleAddTable-grn, inputFrame-grn, simpleAddTitle-grn,
// simpleAddMemo-grn, buttonPostMain-grn). We only style elements that have
// no Garoon equivalent.
const STYLE = `
  .bgs-tab-bar {
    display: flex;
    align-items: center;
    padding: 0 4px;
    margin-bottom: 12px;
    background: #fff;
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
    font-size: 13px;
  }
  .bgs-tab-close {
    margin-left: auto;
    margin-right: 8px;
    float: none !important;
    cursor: pointer;
  }
  .bgs-tab {
    padding: 10px 16px;
    margin-bottom: -1px;
    font-weight: 500;
    letter-spacing: 0.4px;
    color: rgba(0, 0, 0, 0.6);
    cursor: pointer;
    position: relative;
    user-select: none;
    transition:
      color 150ms ease,
      background-color 150ms ease;
  }
  .bgs-tab:hover {
    color: rgba(0, 0, 0, 0.87);
    background-color: rgba(25, 118, 210, 0.04);
  }
  .bgs-tab:focus { outline: none; }
  .bgs-tab:focus-visible {
    outline: none;
    background-color: rgba(25, 118, 210, 0.12);
  }
  .bgs-tab-active { color: #1976d2; }
  .bgs-tab-active::after {
    content: '';
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 0;
    height: 2px;
    background: #1976d2;
    border-radius: 1px 1px 0 0;
  }
  /* The close button used to live inside this header cell and propped its
     height up via float. We move it out into the tab bar, so compensate
     with bottom padding to keep the gap to the next row unchanged. */
  #schedule_simple_add-header > .header-grn { padding-bottom: 12px; !important }
  .bgs-todo-panel { background: #fff; box-sizing: border-box; }
  .bgs-todo-date { padding: 4px 6px; line-height: 1.4; }
  .bgs-todo-memo { min-height: 60px; resize: vertical; white-space: pre-wrap; }
  .bgs-todo-nolimit {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-left: 8px;
    color: #333;
    font-size: 12px;
  }
  .bgs-todo-nolimit > input { margin: 0; }
  .bgs-todo-message {
    font-size: 12px;
    color: #666;
  }
  .bgs-todo-message:not(:empty) { margin-bottom: 4px; }
  .bgs-todo-message.bgs-todo-message--error { color: #d50000; }
  .bgs-todo-submit-wrap { display: inline-block; }
`;

export function ensureDialogStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE;
  document.head.appendChild(style);
}
