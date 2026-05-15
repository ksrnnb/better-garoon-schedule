import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildTodoPanel } from '../todoPanel';

// chrome.i18n is consumed by util/message.t() — return undefined so the
// callsite falls back to the literal default it passes in.
beforeEach(() => {
  (globalThis as unknown as { chrome: unknown }).chrome = {
    i18n: { getMessage: (_: string) => '' },
  };
});

afterEach(() => {
  delete (globalThis as Partial<{ chrome: unknown }>).chrome;
});

function makeDialogRoot(opts: {
  csrfTicket: string;
  bdate: string;
}): HTMLElement {
  const root = document.createElement('div');
  root.id = 'sch-simple-add-1-dialog';

  const csrf = document.createElement('input');
  csrf.type = 'hidden';
  csrf.name = 'csrf_ticket';
  csrf.value = opts.csrfTicket;
  root.appendChild(csrf);

  const bdate = document.createElement('input');
  bdate.type = 'hidden';
  bdate.name = 'bdate';
  bdate.value = opts.bdate;
  root.appendChild(bdate);

  document.body.appendChild(root);
  return root;
}

describe('buildTodoPanel — csrf_ticket freshness', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reads csrf_ticket from the live dialog at submit time, not at build time', async () => {
    const root = makeDialogRoot({
      csrfTicket: 'STALE_TICKET',
      bdate: '2026-05-16',
    });
    const panel = buildTodoPanel(root);
    document.body.appendChild(panel);

    // Simulate Garoon rotating the csrf_ticket between dialog opens (the bug
    // that previously caused intermittent "ToDo not added" failures).
    root.querySelector<HTMLInputElement>('input[name="csrf_ticket"]')!.value =
      'FRESH_TICKET';

    const fetchMock = vi.fn().mockResolvedValue(
      new Response('', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const titleInput = panel.querySelector<HTMLInputElement>(
      'input[name="title"]',
    )!;
    titleInput.value = 'test todo';

    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    panel.querySelector<HTMLFormElement>('form')!.requestSubmit();
    // Let the async submit handler resolve.
    await new Promise(r => setTimeout(r, 0));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('csrf_ticket')).toBe('FRESH_TICKET');
  });

  it('stops Enter from bubbling to ancestors but leaves default submit intact', () => {
    const root = makeDialogRoot({ csrfTicket: 'T', bdate: '2026-05-16' });
    const panel = buildTodoPanel(root);
    // Mount under root so a bubble-phase listener on root simulates Garoon's
    // document-level Enter handler (which would otherwise submit the hidden
    // schedule form even while the user is on the ToDo tab).
    root.appendChild(panel);

    const ancestorHandler = vi.fn();
    root.addEventListener('keydown', ancestorHandler);

    const titleInput = panel.querySelector<HTMLInputElement>(
      'input[name="title"]',
    )!;
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    titleInput.dispatchEvent(event);

    // Garoon must not see this Enter…
    expect(ancestorHandler).not.toHaveBeenCalled();
    // …but the browser's implicit form-submit-on-Enter must still fire, so
    // our submit handler can register the ToDo.
    expect(event.defaultPrevented).toBe(false);
  });

  it('lets Enter insert a newline in the memo textarea (no preventDefault)', () => {
    const root = makeDialogRoot({ csrfTicket: 'T', bdate: '2026-05-16' });
    const panel = buildTodoPanel(root);
    root.appendChild(panel);

    const ancestorHandler = vi.fn();
    root.addEventListener('keydown', ancestorHandler);

    const memo = panel.querySelector<HTMLTextAreaElement>(
      'textarea[name="memo"]',
    )!;
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    memo.dispatchEvent(event);

    // Propagation is still stopped (Garoon shouldn't see it), but the
    // textarea's default newline behavior must remain intact.
    expect(ancestorHandler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('treats a redirected 2xx response as success (Garoon 302s to the list view on success)', async () => {
    const root = makeDialogRoot({
      csrfTicket: 'T',
      bdate: '2026-05-16',
    });
    const panel = buildTodoPanel(root);
    document.body.appendChild(panel);

    // Garoon's command_add.csp returns 302 → list view on success. fetch
    // follows the redirect transparently, so res.redirected is true on the
    // happy path. Make sure we don't mistake that for failure.
    const redirected = new Response('', { status: 200 });
    Object.defineProperty(redirected, 'redirected', { value: true });
    const fetchMock = vi.fn().mockResolvedValue(redirected);
    vi.stubGlobal('fetch', fetchMock);

    const reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadSpy },
    });

    panel.querySelector<HTMLInputElement>('input[name="title"]')!.value = 'x';
    panel.querySelector<HTMLFormElement>('form')!.requestSubmit();
    await new Promise(r => setTimeout(r, 0));

    expect(reloadSpy).toHaveBeenCalledTimes(1);
    const message = panel.querySelector<HTMLElement>('.bgs-todo-message')!;
    expect(message.textContent).not.toMatch(/失敗|fail/i);
  });
});
