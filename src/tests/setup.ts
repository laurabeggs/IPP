import { config } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';

// Bento components call useI18n internally, which needs an installed
// instance. The app installs the same one in main.ts.
config.global.plugins = [
  createI18n({ legacy: false, locale: 'en-US', fallbackLocale: 'en-US' }),
];

// jsdom implements neither of these, and Bento's listbox and floating
// elements call them while opening.
if (typeof Element !== 'undefined' && !Element.prototype.checkVisibility) {
  Element.prototype.checkVisibility = () => true;
}

// jsdom does not scroll; the flow map only needs the call to exist.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {};
}

// jsdom has <dialog> without its modal API, which Bento's modals open with.
if (
  typeof HTMLDialogElement !== 'undefined' &&
  !HTMLDialogElement.prototype.showModal
) {
  HTMLDialogElement.prototype.showModal = function showModal(): void {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(): void {
    this.open = false;
  };
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as typeof ResizeObserver;
}
