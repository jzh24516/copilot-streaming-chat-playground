/**
 * ES-module bridge for the Copilot Studio client browser bundle.
 *
 * app.js runs as a classic script and cannot use bare-specifier imports, so we
 * load the SDK here (resolved via the importmap in index.html) and expose the
 * pieces it needs on `window`. A "copilotsdkready" event signals availability.
 */
import {
  CopilotStudioClient,
  CopilotStudioWebChat,
  ConnectionSettings
} from '@microsoft/agents-copilotstudio-client';

window.CopilotStudioSDK = {
  CopilotStudioClient,
  CopilotStudioWebChat,
  ConnectionSettings,
  ready: true
};

window.dispatchEvent(new Event('copilotsdkready'));
