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

  it('treats a redirected response as failure (does not reload)', async () => {
    const root = makeDialogRoot({
      csrfTicket: 'T',
      bdate: '2026-05-16',
    });
    const panel = buildTodoPanel(root);
    document.body.appendChild(panel);

    // Garoon redirects to login when csrf_ticket is stale — fetch follows the
    // redirect automatically, so res.ok stays true. We must detect it ourselves.
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

    expect(reloadSpy).not.toHaveBeenCalled();
    const message = panel.querySelector<HTMLElement>('.bgs-todo-message')!;
    expect(message.textContent).toMatch(/失敗|fail/i);
  });
});
