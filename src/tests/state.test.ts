import { describe, expect, it } from 'vitest';
import {
  addComparison,
  applyMerchant,
  defaultState,
  openFlowStep,
  removeComparison,
  setConfigValue,
  setFeatureEnabled,
  setFeatureOption,
  setFlow,
  stateFromHash,
  toHash,
} from '../lib/state';

describe('share links', () => {
  it('keeps a default link short but still names the step', () => {
    expect(toHash(defaultState())).toBe('#/flow?step=see-amount');
  });

  it('leaves the step out of a screen library link', () => {
    const state = defaultState();
    state.mode = 'screens';
    state.filterDevices = ['ams1', 's1f2'];
    state.filterTeams = ['Receipts and Loyalty'];
    state.filterFeatures = ['tipping'];
    state.range = '5d';
    state.previewLanguage = 'de-DE';
    state.previewCurrency = 'USD';
    state.previewDevice = 's1f2';
    state.previewRelease = '1.60';
    state.selectedScreenKey = 'basic-card-payment:see-amount';
    expect(toHash(state)).toBe(
      '#/screens?range=5d&fdevice=ams1%2Cs1f2&fteam=Receipts+and+Loyalty&ffeature=tipping&plang=de-DE&pcur=USD&pdev=s1f2&prel=1.60&screen=basic-card-payment%3Asee-amount',
    );
    expect(stateFromHash(toHash(state))).toEqual(state);
  });

  it('round trips the library comparison', () => {
    const state = defaultState();
    state.mode = 'screens';
    state.libraryCompareOn = true;
    state.libraryCompareProperty = 'release';
    state.libraryCompareOptions = ['1.60', '1.62'];

    const hash = toHash(state);
    expect(hash).toContain('lcmp=1');
    expect(hash).toContain('lcp=release');
    expect(hash).toContain('lco=1.60%2C1.62');
    expect(stateFromHash(hash)).toEqual(state);
  });

  it('round trips a single configuration', () => {
    const state = defaultState();
    state.range = '5d';
    setFlow(state, 'refund');
    state.panes[0]!.step = 'refund-failed';
    applyMerchant(state.panes[0]!, 'meridian-fuel');

    expect(stateFromHash(toHash(state))).toEqual(state);
  });

  it('round trips enabled features and their options', () => {
    const state = defaultState();
    setFeatureEnabled(state, state.panes[0]!, 'tipping', true);
    setFeatureOption(state, state.panes[0]!, 'tipping', 'custom');
    setFeatureEnabled(state, state.panes[0]!, 'cvm', true);

    const link = toHash(state);
    expect(link).toContain('feat=tipping.custom*cvm.pin');
    expect(stateFromHash(link)).toEqual(state);
  });

  it('round trips the all-screen layout choice', () => {
    const state = defaultState();
    state.screenLayout = 'all';

    const link = toHash(state);
    expect(link).toContain('layout=all');
    expect(stateFromHash(link)).toEqual(state);
  });

  it('round trips a comparison of two configurations', () => {
    const state = defaultState();
    addComparison(state);
    state.range = '24h';
    setFlow(state, 'payment-with-receipt');
    state.panes[0]!.step = 'receipt-digital';
    state.panes[1]!.step = 'receipt-digital';
    setConfigValue(state.panes[1]!, 'language', 'de-DE');

    const link = toHash(state);
    expect(link).toContain('compare=1');
    expect(link).toContain('flow=payment-with-receipt');
    expect(stateFromHash(link)).toEqual(state);
  });

  it('round trips features separately for each configuration', () => {
    const state = defaultState();
    addComparison(state);
    setFeatureEnabled(state, state.panes[0]!, 'tipping', true);
    setFeatureEnabled(state, state.panes[1]!, 'cvm', true);

    const link = toHash(state);
    expect(link).toContain('feat=tipping.percentages');
    expect(link).toContain('feat2=cvm.pin');
    expect(stateFromHash(link)).toEqual(state);
  });

  it('leaves the second pane out of the link when not comparing', () => {
    const state = defaultState();
    addComparison(state);
    setFeatureEnabled(state, state.panes[1]!, 'cvm', true);
    removeComparison(state);

    const link = toHash(state);
    expect(link).not.toContain('step2');
    expect(link).not.toContain('feat2');
  });

  it('ignores an unknown mode, flow, or device', () => {
    const state = stateFromHash('#/nowhere?flow=not-a-flow&device=fax-machine');
    const defaults = defaultState();
    expect(state.mode).toBe(defaults.mode);
    expect(state.flow).toBe(defaults.flow);
    expect(state.panes[0]!.config.device).toBe(defaults.panes[0]!.config.device);
  });

  it('ignores features and options that do not exist', () => {
    const state = stateFromHash('#/flow?feat=telepathy.yes*tipping.bogus');
    expect(state.panes[0]!.features).toEqual({ tipping: 'percentages' });
  });

  it('falls back to the first step when a link names a step from another flow', () => {
    const state = stateFromHash('#/flow?flow=refund&step=enter-pin');
    expect(state.flow).toBe('refund');
    expect(state.panes[0]!.step).toBe('refund-amount');
  });

  it('accepts a feature step when the link enables its feature', () => {
    const state = stateFromHash('#/flow?feat=tipping.custom&step=tip-total');
    expect(state.panes[0]!.features).toEqual({ tipping: 'custom' });
    expect(state.panes[0]!.step).toBe('tip-total');
  });

  it('reads an empty hash as the default state', () => {
    expect(stateFromHash('')).toEqual(defaultState());
    expect(stateFromHash('#/')).toEqual(defaultState());
  });
});

describe('configuration', () => {
  it('moves both panes to the shared flow and its first screen', () => {
    const state = defaultState();
    addComparison(state);

    setFlow(state, 'refund');

    expect(state.flow).toBe('refund');
    expect(state.panes.map((pane) => pane.step)).toEqual([
      'refund-amount',
      'refund-amount',
    ]);
  });

  it('loads a merchant preset and clears it when a field is edited', () => {
    const state = defaultState();
    const pane = state.panes[0]!;

    applyMerchant(pane, 'harbour-cafes');
    expect(pane.config.device).toBe('e285');
    expect(pane.config.currency).toBe('GBP');

    setConfigValue(pane, 'currency', 'EUR');
    expect(pane.config.merchant).toBe('');
    expect(pane.config.currency).toBe('EUR');
  });

  it('starts a comparison from the first configuration on a different device', () => {
    const state = defaultState();
    setFlow(state, 'refund');
    state.panes[0]!.step = 'refund-confirmed';
    addComparison(state);

    const [first, second] = state.panes;
    expect(state.compare).toBe(true);
    expect(second!.step).toBe(first!.step);
    expect(second!.config.device).not.toBe(first!.config.device);
    expect(second!.config.language).toBe(first!.config.language);
  });

  it('carries the enabled features into the comparison', () => {
    const state = defaultState();
    setFeatureEnabled(state, state.panes[0]!, 'tipping', true);
    addComparison(state);

    expect(state.panes[1]!.features).toEqual({ tipping: 'percentages' });
  });

  it('opens a library screen and enables its owning feature', () => {
    const state = defaultState();
    openFlowStep(state, 'basic-card-payment', 'choose-tip');

    expect(state.mode).toBe('flow');
    expect(state.flow).toBe('basic-card-payment');
    expect(state.panes[0]!.features.tipping).toBe('percentages');
    expect(state.panes[0]!.step).toBe('choose-tip');
  });
});

describe('features', () => {
  it('switches a feature on with its default option and off again', () => {
    const state = defaultState();
    const pane = state.panes[0]!;

    setFeatureEnabled(state, pane, 'tipping', true);
    expect(pane.features).toEqual({ tipping: 'percentages' });

    setFeatureOption(state, pane, 'tipping', 'custom');
    expect(pane.features).toEqual({ tipping: 'custom' });

    setFeatureEnabled(state, pane, 'tipping', false);
    expect(pane.features).toEqual({});
  });

  it('puts the pane back on an existing screen when its feature switches off', () => {
    const state = defaultState();
    const pane = state.panes[0]!;

    setFeatureEnabled(state, pane, 'tipping', true);
    pane.step = 'choose-tip';
    setFeatureEnabled(state, pane, 'tipping', false);
    expect(pane.step).toBe('see-amount');
  });

  it('keeps the pane on its step while the feature stays on', () => {
    const state = defaultState();
    const pane = state.panes[0]!;

    setFeatureEnabled(state, pane, 'tipping', true);
    pane.step = 'choose-tip';
    setFeatureOption(state, pane, 'tipping', 'custom');
    expect(pane.step).toBe('choose-tip');
  });
});
