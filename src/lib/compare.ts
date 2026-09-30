import { devices } from '../data/catalog';
import type { AppState } from './state';
import type { Screen } from '../types/flow';

/** One screen preview variant: how a single compare value renders. */
export interface CompareVariant {
  label: string;
  device: string;
  language: string;
  currency: string;
}

/** Whether the library comparison currently renders side-by-side previews. */
export function isComparing(state: AppState): boolean {
  return state.libraryCompareOn && state.libraryCompareOptions.length > 0;
}

/**
 * The side-by-side previews for one screen under the library comparison: one
 * per selected value of the compared property, in selection order. Values the
 * screen does not support are left out. Empty until compare is on and values
 * are picked, so the default single preview can render instead.
 */
export function compareVariants(
  state: AppState,
  screen: Screen,
): CompareVariant[] {
  if (!isComparing(state)) return [];

  const supported: string[] = screen.properties.devices;
  const baseDevice = supported.includes(state.previewDevice)
    ? state.previewDevice
    : supported[0] ?? '';

  switch (state.libraryCompareProperty) {
    case 'device':
      return state.libraryCompareOptions.flatMap((id) => {
        if (!supported.includes(id)) return [];
        const device = devices.find((entry) => entry.id === id);
        return device
          ? [
              {
                label: device.name,
                device: id,
                language: state.previewLanguage,
                currency: state.previewCurrency,
              },
            ]
          : [];
      });
    case 'language':
      return state.libraryCompareOptions.map((language) => ({
        label: language,
        device: baseDevice,
        language,
        currency: state.previewCurrency,
      }));
    case 'release':
      return state.libraryCompareOptions.map((release) => ({
        label: release,
        device: baseDevice,
        language: state.previewLanguage,
        currency: state.previewCurrency,
      }));
  }
}
