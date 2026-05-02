import { beforeEach, describe, expect, it, vi } from 'vitest';

// startTimeIndicator は DOM/タイマー/MutationObserver を伴うため、
// テストではモックに差し替えて呼び出し回数と cleanup の発火だけを検証する。
vi.mock('../timeIndicator', () => ({
  startTimeIndicator: vi.fn(),
}));

describe('apply（現在時刻ライン表示のトグル）', () => {
  let cleanupSpy: ReturnType<typeof vi.fn>;
  let controller: typeof import('../timeIndicatorController');
  let timeIndicator: typeof import('../timeIndicator');

  beforeEach(async () => {
    // controller モジュールはトップレベルの cleanup 変数で状態を保持し、
    // vi.mock の vi.fn() インスタンスもテストをまたいで履歴が残るため、
    // モジュール再評価とモックのクリアを毎回行ってフレッシュな状態にする。
    vi.resetModules();
    vi.clearAllMocks();
    cleanupSpy = vi.fn();
    timeIndicator = await import('../timeIndicator');
    vi.mocked(timeIndicator.startTimeIndicator).mockReturnValue(
      cleanupSpy as () => void,
    );
    controller = await import('../timeIndicatorController');
  });

  it('ON にすると startTimeIndicator が呼び出される', () => {
    controller.apply(true);
    expect(timeIndicator.startTimeIndicator).toHaveBeenCalledTimes(1);
  });

  it('既に ON の状態で再度 ON にしても二重起動されない', () => {
    controller.apply(true);
    controller.apply(true);
    expect(timeIndicator.startTimeIndicator).toHaveBeenCalledTimes(1);
  });

  it('OFF にすると startTimeIndicator が返した cleanup が呼び出される', () => {
    controller.apply(true);
    controller.apply(false);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it('未起動の状態で OFF を渡しても何も起こらない', () => {
    controller.apply(false);
    expect(timeIndicator.startTimeIndicator).not.toHaveBeenCalled();
    expect(cleanupSpy).not.toHaveBeenCalled();
  });

  it('OFF→ON で再起動でき、cleanup は OFF 時の 1 回だけ呼ばれる', () => {
    controller.apply(true);
    controller.apply(false);
    controller.apply(true);
    expect(timeIndicator.startTimeIndicator).toHaveBeenCalledTimes(2);
    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });
});
