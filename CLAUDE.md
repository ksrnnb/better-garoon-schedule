# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Chrome Manifest V3 extension that augments Cybozu Garoon's cloud (`*.cybozu.com`) schedule UI. Two surfaces today:

1. A red current-time line overlaid on the day/week schedule view.
2. A "ToDo" tab injected into Garoon's "Simple Add" schedule dialog that posts to Garoon's `/g/todo/command_add.csp` endpoint.

Both features are pure DOM scrapers — Garoon has no public API for these surfaces, so selectors and undocumented endpoints are load-bearing and **will break when Garoon ships UI changes**. Treat any selector or form field name as a contract that needs a corresponding test or fixture when changed.

This is **not** an official Cybozu product. Only cloud Garoon is supported; on-prem is out of scope.

## Commands

```sh
pnpm install
pnpm build:dev    # webpack dev build → dist/
pnpm build        # NODE_ENV=production webpack && scripts/zip.sh → archive.zip
pnpm start        # webpack --watch
pnpm icons        # regenerate PNG icons from src/icon/calendar.svg via sharp
pnpm typecheck    # tsc --noEmit -p tsconfig.test.json
pnpm lint         # eslint src     (also: pnpm lint:fix)
pnpm test         # vitest run     (also: pnpm test:watch)
```

Run a single test file: `pnpm test src/content/__tests__/timeIndicator.test.ts`. Run a single test: `pnpm test -t 'name fragment'`.

CI (`.github/workflows/ci.yml`) runs `pnpm lint && pnpm typecheck && pnpm test` on Node 24 with pnpm 10.33.0.

To load the unpacked extension in Chrome: `pnpm build:dev`, then load `dist/` from `chrome://extensions` (developer mode).

## Architecture

Two webpack entry points (see `webpack.config.ts`), each emitted to `dist/` next to `public/` assets copied verbatim by `CopyWebpackPlugin`:

- `src/content_scripts.ts` → `content_scripts.js` — injected into `https://*.cybozu.com/g/*` at `document_idle` per `public/manifest.json`. Bootstraps both features.
- `src/options.ts` → `options.js` — backs `public/options.html` (the `options_ui` page).

### Storage and i18n

- `src/common/store/index.ts` wraps `chrome.storage.local` under the single key `grn.config`. `load()` merges with `defaultConfig`; `save()` does a read-modify-write so partial updates don't drop fields. The `storage.onChanged` listener in `timeIndicatorController.ts` filters on this key.
- `src/common/util/message.ts` (`t(key, fallback)`) reads `chrome.i18n.getMessage`. `localizeHTML()` replaces `__MSG_..__` tokens in `document.body.innerHTML` for static HTML pages. New user-facing strings must be added to **both** `public/_locales/ja/messages.json` and `public/_locales/en/messages.json`; `default_locale` in the manifest is `ja`.

### Time indicator (`src/content/`)

- `timeIndicatorController.ts` owns the lifecycle: subscribes to storage, calls `apply(enabled)`, and only `startTimeIndicator()` when enabled — toggling at runtime tears down and rebuilds.
- `timeIndicator.ts` finds "today's column" by three signals in order: week-view `aria-current="date"` header, week-view all-day cell `data-bdate`, then day-view `data-bdate` on a time row. Column ids are *frozen at first render* and unreliable after navigation, which is why this fallback chain exists. Position is recomputed via `requestAnimationFrame` on a `MutationObserver` over `document.body`, plus `scroll` / `resize`, plus a self-rescheduling minute timer aligned to the wall clock. The overlay is `position: fixed` and lives directly under `document.body`.
- `isTodayBdate()` accepts both zero-padded (`YYYY-MM-DD`) and unpadded (`YYYY-M-D`) forms because Garoon emits each in different attributes.

### Dialog enhancer (`src/content/dialog/`)

- `controller.ts` is the entry point. It uses `observer.ts` to wait for `[id^="sch-simple-add"][id$="-dialog"]`, then injects a tab bar (`tabs.ts`) above Garoon's `.simpleAddTable-grn` and a custom ToDo panel (`todoPanel.ts`) next to it. The schedule table and todo panel are mutually toggled via `display`. Garoon's close button is *moved* into the tab bar so it stays visible across tabs (DOM relocation preserves listeners).
- `observer.ts` is a generic "apply once per matching root" pattern. The handler returns `false` to defer marking-as-applied when the inner DOM isn't ready (the next mutation retries). It also stops observing once `chrome.runtime.id` becomes undefined — content scripts keep running after the extension is reloaded/disabled, and any `chrome.*` call would otherwise throw "Extension context invalidated".
- `todoPanel.ts` posts a `multipart/form-data` request to `/g/todo/command_add.csp?` with `same-origin` credentials. The CSRF ticket (`csrf_ticket`) and `bdate` are read from hidden inputs inside the dialog root via `readDialogContext()`. After a successful POST, the page is reloaded so the new ToDo appears in Garoon's UI.
- `style.ts` deliberately reuses Garoon's own CSS classes (`simpleAddTable-grn`, `inputFrame-grn`, `simpleAddTitle-grn`, `simpleAddMemo-grn`, `buttonPostMain-grn`) for the injected form so it visually matches the schedule tab. Only elements without a Garoon equivalent are styled directly.

## Testing

- `vitest` with the `jsdom` environment (`vitest.config.ts`). Tests live next to the code as `src/**/*.test.ts` (typically under a `__tests__/` folder).
- `tsconfig.test.json` is what `pnpm typecheck` runs against — the production `tsconfig.json` targets `es5/commonjs` for ts-loader. Test code may rely on test-only types.
- `test/setup.ts` runs `vi.restoreAllMocks()` and `vi.useRealTimers()` after each test — assume timers and mocks are reset between tests, but write tests that don't lean on cross-test ordering.
- jsdom does not lay out elements. Tests that exercise positioning (e.g. `startTimeIndicator`) must stub `offsetParent` and `getBoundingClientRect()` — see `timeIndicator.test.ts` for the pattern.

## Style

ESLint flat config (`eslint.config.mjs`) enforces Prettier formatting (single quotes, 80 col, trailing commas, 2-space, `arrowParens: 'avoid'`) and bans `any` (`@typescript-eslint/no-explicit-any: error`). Run `pnpm lint:fix` before committing.
