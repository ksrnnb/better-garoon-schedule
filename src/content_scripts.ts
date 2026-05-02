import { init as initTimeIndicator } from './content/timeIndicatorController';
import { init as initDialogEnhancer } from './content/dialog/controller';

function bootstrap(): void {
  initTimeIndicator();
  initDialogEnhancer();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
} else {
  bootstrap();
}
