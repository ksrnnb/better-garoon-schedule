import { t } from '../../common/util';

const TODO_ENDPOINT = '/g/todo/command_add.csp?';

interface DialogContext {
  csrfTicket: string;
  bdate: string; // YYYY-MM-DD
}

export function readDialogContext(root: HTMLElement): DialogContext | null {
  const csrf = root.querySelector<HTMLInputElement>(
    'input[name="csrf_ticket"]',
  )?.value;
  const bdate = root.querySelector<HTMLInputElement>(
    'input[name="bdate"]',
  )?.value;
  if (!csrf || !bdate) return null;
  return { csrfTicket: csrf, bdate };
}

function readCsrfTicket(root: HTMLElement): string | null {
  return (
    root.querySelector<HTMLInputElement>('input[name="csrf_ticket"]')?.value ??
    null
  );
}

export function buildTodoPanel(root: HTMLElement): HTMLElement {
  // Read bdate only for the initial date-input default. CSRF is intentionally
  // re-read at submit time — Garoon reuses the dialog DOM across opens and
  // rotates csrf_ticket between operations, so a captured value goes stale.
  const initialCtx = readDialogContext(root);
  const panel = document.createElement('div');
  panel.className = 'bgs-todo-panel';

  const form = document.createElement('form');
  form.className = 'bgs-todo-form';
  form.noValidate = true;
  panel.appendChild(form);

  // Reuse Garoon's own simpleAddTable-grn so labels render with the same
  // CSS as the schedule tab's <th>.
  const table = document.createElement('table');
  table.className = 'simpleAddTable-grn bgs-todo-table';
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  form.appendChild(table);

  const titleRow = row(t('todo_title_label', 'ToDo名'));
  const titleInput = document.createElement('input');
  titleInput.type = 'text';
  titleInput.name = 'title';
  titleInput.maxLength = 100;
  titleInput.required = true;
  titleInput.className = 'inputFrame-grn simpleAddTitle-grn';
  titleInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') e.preventDefault();
  });
  titleRow.value.appendChild(titleInput);
  tbody.appendChild(titleRow.tr);

  const dueRow = row(t('todo_due_label', '締切日'));
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.name = 'ldate';
  dateInput.value = initialCtx?.bdate ?? '';
  dateInput.className = 'inputFrame-grn bgs-todo-date';
  dueRow.value.appendChild(dateInput);

  const noLimitLabel = document.createElement('label');
  noLimitLabel.className = 'bgs-todo-nolimit';
  const noLimit = document.createElement('input');
  noLimit.type = 'checkbox';
  noLimit.name = 'nolimit';
  noLimit.value = '1';
  noLimitLabel.appendChild(noLimit);
  noLimitLabel.append(' ', t('todo_nolimit_label', '締切なし'));
  dueRow.value.appendChild(noLimitLabel);

  noLimit.addEventListener('change', () => {
    dateInput.disabled = noLimit.checked;
  });
  tbody.appendChild(dueRow.tr);

  const memoRow = row(t('todo_memo_label', 'メモ'));
  const memo = document.createElement('textarea');
  memo.name = 'memo';
  memo.rows = 5;
  memo.className = 'inputFrame-grn simpleAddMemo-grn bgs-todo-memo';
  memoRow.value.appendChild(memo);
  tbody.appendChild(memoRow.tr);

  // Bottom row: empty label cell + value cell with message and submit,
  // mirroring the schedule form's "登録する" row layout.
  const submitTr = document.createElement('tr');
  const submitTh = document.createElement('td');
  const submitTd = document.createElement('td');
  submitTr.appendChild(submitTh);
  submitTr.appendChild(submitTd);
  tbody.appendChild(submitTr);

  const message = document.createElement('div');
  message.className = 'bgs-todo-message';
  message.setAttribute('role', 'status');
  submitTd.appendChild(message);

  // Reuse Garoon's primary button class so the look matches "登録する" exactly.
  const submitWrap = document.createElement('div');
  submitWrap.className = 'buttonPostMain-grn bgs-todo-submit-wrap';
  const submitLink = document.createElement('a');
  submitLink.href = 'javascript:void(0);';
  submitLink.setAttribute('role', 'button');
  submitLink.textContent = t('todo_submit_label', '追加する');
  submitWrap.appendChild(submitLink);
  submitTd.appendChild(submitWrap);

  let busy = false;
  const setBusy = (v: boolean): void => {
    busy = v;
    submitWrap.style.opacity = v ? '0.6' : '';
    submitWrap.style.pointerEvents = v ? 'none' : '';
  };

  submitLink.addEventListener('click', e => {
    e.preventDefault();
    if (busy) return;
    form.requestSubmit();
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!titleInput.value.trim()) {
      message.textContent = t(
        'todo_title_required',
        'ToDo名を入力してください。',
      );
      message.classList.add('bgs-todo-message--error');
      titleInput.focus();
      return;
    }
    message.classList.remove('bgs-todo-message--error');

    setBusy(true);
    message.textContent = t('todo_submitting', '送信中…');
    try {
      await submitTodo(root, {
        title: titleInput.value,
        memo: memo.value,
        nolimit: noLimit.checked,
        date: dateInput.value,
      });
      // 登録した ToDo を画面に反映するためにリロードする
      location.reload();
      message.textContent = t('todo_submitted', 'ToDo を追加しました');
      titleInput.value = '';
      memo.value = '';
    } catch (err) {
      console.warn('[bgs] failed to add todo', err);
      message.textContent = t(
        'todo_submit_failed',
        '追加に失敗しました。再度お試しください。',
      );
    } finally {
      setBusy(false);
    }
  });

  return panel;
}

interface TodoFormValue {
  title: string;
  memo: string;
  nolimit: boolean;
  date: string; // YYYY-MM-DD
}

async function submitTodo(root: HTMLElement, v: TodoFormValue): Promise<void> {
  // Re-read csrf_ticket from the live dialog at submit time. Garoon rotates
  // it between operations and reuses the dialog DOM across opens, so a value
  // captured when the panel was built can be stale by the time we POST.
  const csrfTicket = readCsrfTicket(root);
  if (!csrfTicket) {
    throw new Error('csrf_ticket not found in dialog');
  }

  const fd = new FormData();
  fd.append('csrf_ticket', csrfTicket);
  fd.append('cid', '');
  fd.append('category', '');
  fd.append('title', v.title);
  fd.append('priority', '1');
  fd.append('memo', v.memo);

  if (v.nolimit) {
    fd.append('nolimit', '1');
  } else {
    const [y, m, d] = v.date.split('-');
    fd.append('ldate_year', String(Number(y)));
    fd.append('ldate_month', String(Number(m)));
    fd.append('ldate_day', String(Number(d)));
  }

  const res = await fetch(TODO_ENDPOINT, {
    method: 'POST',
    body: fd,
    credentials: 'same-origin',
  });
  // A redirect on this endpoint means Garoon bounced us to login or an error
  // page — typically a stale csrf_ticket or expired session. Treat as failure
  // so we don't reload the page and silently lose the user's input.
  if (!res.ok || res.redirected) {
    throw new Error(
      `HTTP ${res.status}${res.redirected ? ' (redirected)' : ''}`,
    );
  }
}

function row(label: string): {
  tr: HTMLTableRowElement;
  value: HTMLTableCellElement;
} {
  const tr = document.createElement('tr');
  tr.setAttribute('valign', 'top');
  const th = document.createElement('th');
  th.textContent = label;
  const td = document.createElement('td');
  tr.appendChild(th);
  tr.appendChild(td);
  return { tr, value: td };
}
