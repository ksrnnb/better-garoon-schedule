import { init } from './content/timeIndicatorController';
import { startDialogEnhancer } from './content/dialog/controller';

function bootstrap(): void {
  init();
  startDialogEnhancer();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
