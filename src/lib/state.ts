import { effectScope, reactive, watch } from 'vue';
import {
  currencies,
  devices,
  firmwareVersions,
  languages,
  merchants,
  timeRanges,
} from '../data/catalog';
import { features as featureCatalog } from '../data/features';
import { flows } from '../data/flows';
import {
  featureById,
  featureForStep,
  resolveFlow,
  type FeatureSelections,
} from './features';
import { allScreens, owningTeams } from './flows';
import type {
  DeviceId,
  FeatureId,
  PaymentFlow,
  TimeRangeId,
} from '../types/flow';
import type { FlowConfig } from './flows';

export type ModeId = 'flow' | 'screens';
export type ScreenLayoutId = 'single' | 'all';
/** The property a library comparison varies across its side-by-side previews. */
export type LibraryCompareProperty = 'language' | 'device' | 'release';

export const modeIds: ModeId[] = ['flow', 'screens'];
export const libraryCompareProperties: LibraryCompareProperty[] = [
  'language',
  'device',
  'release',
];

export interface PaneConfig extends FlowConfig {
  /** Merchant preset the configuration came from, empty when custom. */
  merchant: string;
}

export interface PaneState {
  /** The screen this configuration is showing. The flow itself is shared. */
  step: string;
  config: PaneConfig;
  /** Enabled features for this configuration, mapped to their option. */
  features: FeatureSelections;
}

export interface AppState {
  mode: ModeId;
  /** Both configurations show the same flow, so a comparison stays like for like. */
  flow: string;
  /** Whether the second configuration is shown below the first. */
  compare: boolean;
  configOpen: boolean;
  insightsOpen: boolean;
  chartOpen: boolean;
  /** User-adjusted height of the expandable master-flow band. */
  flowBandHeight: number;
  screenLayout: ScreenLayoutId;
  askOpen: boolean;
  /** Always two panes; the second is only used while comparing. */
  panes: PaneState[];
  range: TimeRangeId;
  query: string;
  filterDevices: string[];
  filterTeams: string[];
  filterFeatures: FeatureId[];
  /** Library display configuration: the language and currency the screen
   * previews render with. They change the displayed content, not which
   * screens appear. */
  previewLanguage: string;
  previewCurrency: string;
  /** Library display configuration: the device and release the previews
   * are set to. */
  previewDevice: string;
  previewRelease: string;
  /** The screen the library is showing in all device formats, empty on the
   * grid of all screens. Encoded as "<flow id>:<step id>". */
  selectedScreenKey: string;
  /** Library comparison: one preview per selected value, side by side. */
  libraryCompareOn: boolean;
  /** The property the comparison varies: language, device, or release. */
  libraryCompareProperty: LibraryCompareProperty;
  /** The selected values of the compared property. */
  libraryCompareOptions: string[];
}

function defaultPane(): PaneState {
  return {
    step: flows[0]?.steps[0]?.id ?? '',
    config: {
      merchant: '',
      device: 'e285',
      language: 'en-US',
      currency: 'EUR',
      firmware: '1.62',
    },
    features: {},
  };
}

export function defaultState(): AppState {
  return {
    mode: 'flow',
    flow: flows[0]?.id ?? '',
    compare: false,
    configOpen: true,
    insightsOpen: true,
    chartOpen: true,
    flowBandHeight: 220,
    screenLayout: 'single',
    askOpen: false,
    panes: [defaultPane(), defaultPane()],
    range: '30d',
    query: '',
    filterDevices: [],
    filterTeams: [],
    filterFeatures: [],
    previewLanguage: 'en-US',
    previewCurrency: 'EUR',
    previewDevice: 'e285',
    previewRelease: '1.62',
    selectedScreenKey: '',
    libraryCompareOn: false,
    libraryCompareProperty: 'device',
    libraryCompareOptions: [],
  };
}

const deviceIds = devices.map((device) => device.id) as string[];
const featureIds = featureCatalog.map((feature) => feature.id);

const isKnown = {
  flow: (value: string) => flows.some((flow) => flow.id === value),
  merchant: (value: string) => merchants.some((item) => item.id === value),
  device: (value: string) => deviceIds.includes(value),
  language: (value: string) => languages.includes(value),
  currency: (value: string) => currencies.includes(value),
  firmware: (value: string) => firmwareVersions.includes(value),
  range: (value: string) => timeRanges.some((range) => range.id === value),
  team: (value: string) => owningTeams().includes(value),
};

/** Screen keys are "<flow id>:<step id>" and only resolve against real screens. */
function isKnownScreen(key: string): boolean {
  return allScreens().some(
    (screen) => `${screen.flowId}:${screen.step.id}` === key,
  );
}

function baseFlow(flowId: string): PaymentFlow | undefined {
  return flows.find((flow) => flow.id === flowId);
}

/** The flow one configuration shows: the shared flow with its features applied. */
export function paneFlow(state: AppState, pane: PaneState): PaymentFlow | undefined {
  const base = baseFlow(state.flow);
  return base ? resolveFlow(base, pane.features) : undefined;
}

/** Pane parameters get a "2" suffix for the second pane, so links stay readable. */
function paneParam(name: string, index: number): string {
  return index === 0 ? name : `${name}2`;
}

/**
 * Features are serialised as "feature.option" pairs joined by "*", the one
 * separator URLSearchParams keeps readable in the address bar.
 */
function serializeFeatures(features: FeatureSelections): string {
  return Object.entries(features)
    .map(([featureId, optionId]) => `${featureId}.${optionId}`)
    .join('*');
}

/** Only features and options that exist survive the round trip. */
function parseFeatures(value: string): FeatureSelections {
  const parsed: FeatureSelections = {};
  for (const part of value.split('*')) {
    if (!part) continue;
    const [featureId, optionId] = part.split('.');
    if (!featureId || !optionId) continue;
    const feature = featureById(featureId);
    if (!feature) continue;
    parsed[feature.id] = feature.options.some((option) => option.id === optionId)
      ? optionId
      : feature.defaultOptionId;
  }
  return parsed;
}

function readPane(
  state: AppState,
  pane: PaneState,
  params: URLSearchParams,
  index: number,
  flowFromLink: boolean,
): void {
  const featureParam = params.get(paneParam('feat', index));
  if (featureParam) pane.features = parseFeatures(featureParam);

  // The step is validated against the flow with this pane's features applied,
  // so a link can point straight at a screen a feature adds.
  const resolved = paneFlow(state, pane);
  const stepId = params.get(paneParam('step', index));
  if (stepId && resolved?.steps.some((step) => step.id === stepId)) {
    pane.step = stepId;
  } else if (flowFromLink && resolved) {
    pane.step = resolved.steps[0]?.id ?? '';
  }

  const merchant = params.get(paneParam('merchant', index));
  if (merchant && isKnown.merchant(merchant)) pane.config.merchant = merchant;

  const device = params.get(paneParam('device', index));
  if (device && isKnown.device(device)) pane.config.device = device as DeviceId;

  const language = params.get(paneParam('lang', index));
  if (language && isKnown.language(language)) pane.config.language = language;

  const currency = params.get(paneParam('cur', index));
  if (currency && isKnown.currency(currency)) pane.config.currency = currency;

  const firmware = params.get(paneParam('fw', index));
  if (firmware && isKnown.firmware(firmware)) pane.config.firmware = firmware;
}

function writePane(
  pane: PaneState,
  defaults: PaneState,
  params: URLSearchParams,
  index: number,
  alwaysWriteStep: boolean,
): void {
  if (pane.step && (alwaysWriteStep || pane.step !== defaults.step)) {
    params.set(paneParam('step', index), pane.step);
  }
  if (pane.config.merchant) {
    params.set(paneParam('merchant', index), pane.config.merchant);
  }
  if (pane.config.device !== defaults.config.device) {
    params.set(paneParam('device', index), pane.config.device);
  }
  if (pane.config.language !== defaults.config.language) {
    params.set(paneParam('lang', index), pane.config.language);
  }
  if (pane.config.currency !== defaults.config.currency) {
    params.set(paneParam('cur', index), pane.config.currency);
  }
  if (pane.config.firmware !== defaults.config.firmware) {
    params.set(paneParam('fw', index), pane.config.firmware);
  }
  const serializedFeatures = serializeFeatures(pane.features);
  if (serializedFeatures) {
    params.set(paneParam('feat', index), serializedFeatures);
  }
}

/** Applies a shared link onto a state object. Invalid values are ignored. */
export function applyHash(state: AppState, hash: string): void {
  const cleaned = hash.replace(/^#\/?/, '');
  if (!cleaned) return;

  const [modePart, queryPart] = cleaned.split('?');
  if (modeIds.includes(modePart as ModeId)) {
    state.mode = modePart as ModeId;
  }

  const params = new URLSearchParams(queryPart ?? '');

  state.compare = params.get('compare') === '1';
  if (params.get('layout') === 'all') state.screenLayout = 'all';

  const flowId = params.get('flow');
  const flowFromLink = Boolean(flowId && isKnown.flow(flowId));
  if (flowFromLink) state.flow = flowId!;

  const range = params.get('range');
  if (range && isKnown.range(range)) state.range = range as TimeRangeId;

  const query = params.get('q');
  if (query) state.query = query;

  const readList = (
    name: string,
    validate: (value: string) => boolean,
  ): string[] =>
    (params.get(name) ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value && validate(value));

  state.filterDevices = readList('fdevice', isKnown.device);
  state.filterTeams = readList('fteam', isKnown.team);
  state.filterFeatures = readList('ffeature', (value) =>
    featureIds.includes(value as FeatureId),
  ) as FeatureId[];

  const previewLanguage = params.get('plang');
  if (previewLanguage && isKnown.language(previewLanguage)) {
    state.previewLanguage = previewLanguage;
  }
  const previewCurrency = params.get('pcur');
  if (previewCurrency && isKnown.currency(previewCurrency)) {
    state.previewCurrency = previewCurrency;
  }
  const previewDevice = params.get('pdev');
  if (previewDevice && isKnown.device(previewDevice)) {
    state.previewDevice = previewDevice;
  }
  const previewRelease = params.get('prel');
  if (previewRelease && isKnown.firmware(previewRelease)) {
    state.previewRelease = previewRelease;
  }

  const selectedScreen = params.get('screen');
  if (selectedScreen && isKnownScreen(selectedScreen)) {
    state.selectedScreenKey = selectedScreen;
  }

  if (params.get('lcmp') === '1') state.libraryCompareOn = true;
  const compareProperty = params.get('lcp');
  if (
    compareProperty &&
    libraryCompareProperties.includes(
      compareProperty as LibraryCompareProperty,
    )
  ) {
    state.libraryCompareProperty = compareProperty as LibraryCompareProperty;
  }
  const isKnownOption =
    state.libraryCompareProperty === 'device'
      ? isKnown.device
      : state.libraryCompareProperty === 'language'
        ? isKnown.language
        : isKnown.firmware;
  state.libraryCompareOptions = readList('lco', isKnownOption);

  state.panes.forEach((pane, index) =>
    readPane(state, pane, params, index, flowFromLink),
  );
}

export function stateFromHash(hash: string): AppState {
  const state = defaultState();
  applyHash(state, hash);
  return state;
}

/** Serialises state into a hash, leaving out anything still at its default. */
export function toHash(state: AppState): string {
  const defaults = defaultState();
  const params = new URLSearchParams();

  if (state.compare) params.set('compare', '1');
  if (state.flow !== defaults.flow) params.set('flow', state.flow);
  if (state.range !== defaults.range) params.set('range', state.range);
  if (state.screenLayout !== defaults.screenLayout) {
    params.set('layout', state.screenLayout);
  }
  if (state.query) params.set('q', state.query);
  if (state.filterDevices.length) {
    params.set('fdevice', state.filterDevices.join(','));
  }
  if (state.filterTeams.length) {
    params.set('fteam', state.filterTeams.join(','));
  }
  if (state.filterFeatures.length) {
    params.set('ffeature', state.filterFeatures.join(','));
  }
  if (state.previewLanguage !== defaults.previewLanguage) {
    params.set('plang', state.previewLanguage);
  }
  if (state.previewCurrency !== defaults.previewCurrency) {
    params.set('pcur', state.previewCurrency);
  }
  if (state.previewDevice !== defaults.previewDevice) {
    params.set('pdev', state.previewDevice);
  }
  if (state.previewRelease !== defaults.previewRelease) {
    params.set('prel', state.previewRelease);
  }
  if (state.selectedScreenKey) {
    params.set('screen', state.selectedScreenKey);
  }
  if (state.libraryCompareOn) params.set('lcmp', '1');
  if (state.libraryCompareProperty !== defaults.libraryCompareProperty) {
    params.set('lcp', state.libraryCompareProperty);
  }
  if (state.libraryCompareOptions.length) {
    params.set('lco', state.libraryCompareOptions.join(','));
  }

  // The step is what makes a flow link useful, so always name it there.
  const alwaysWriteStep = state.mode === 'flow';
  writePane(state.panes[0]!, defaults.panes[0]!, params, 0, alwaysWriteStep);
  if (state.compare) {
    writePane(state.panes[1]!, defaults.panes[1]!, params, 1, alwaysWriteStep);
  }

  const query = params.toString();
  return query ? `#/${state.mode}?${query}` : `#/${state.mode}`;
}

let singleton: AppState | undefined;

export function useAppState(): AppState {
  if (singleton) return singleton;

  const state = reactive(defaultState());
  singleton = state;

  if (typeof window === 'undefined') return state;

  const readHash = (): void => applyHash(state, window.location.hash);
  readHash();
  window.addEventListener('hashchange', readHash);

  // A detached scope keeps the URL in sync for the life of the page, rather
  // than stopping when the component that first read the state unmounts.
  effectScope(true).run(() => {
    watch(
      () => toHash(state),
      (hash) => {
        if (window.location.hash !== hash) {
          window.history.replaceState(null, '', hash);
        }
      },
      { immediate: true },
    );
  });

  return state;
}

export function shareLink(state: AppState): string {
  if (typeof window === 'undefined') return toHash(state);
  const { origin, pathname } = window.location;
  return `${origin}${pathname}${toHash(state)}`;
}

/** Applies a merchant's configuration to one pane, or clears it for a custom setup. */
export function applyMerchant(pane: PaneState, merchantId: string): void {
  pane.config.merchant = merchantId;
  const merchant = merchants.find((candidate) => candidate.id === merchantId);
  if (!merchant) return;
  pane.config.device = merchant.config.device;
  pane.config.language = merchant.config.language;
  pane.config.currency = merchant.config.currency;
  pane.config.firmware = merchant.config.firmware;
}

/** Editing a single field means the pane is no longer on a merchant preset. */
export function setConfigValue(
  pane: PaneState,
  key: 'device' | 'language' | 'currency' | 'firmware',
  value: string,
): void {
  if (key === 'device') {
    pane.config.device = value as DeviceId;
  } else {
    pane.config[key] = value;
  }
  pane.config.merchant = '';
}

/**
 * Starts a comparison from a copy of the first configuration, switched to a
 * different device so the two sides differ from the start.
 */
export function addComparison(state: AppState): void {
  const source = state.panes[0]!;
  const alternative =
    devices.find((device) => device.id !== source.config.device)?.id ??
    source.config.device;

  state.panes[1] = {
    step: source.step,
    config: { ...source.config, merchant: '', device: alternative },
    features: { ...source.features },
  };
  state.compare = true;
}

export function removeComparison(state: AppState): void {
  state.compare = false;
}

/** Puts a pane on a screen that exists after the flow or its features changed. */
function revalidatePaneStep(state: AppState, pane: PaneState): void {
  const resolved = paneFlow(state, pane);
  if (!resolved) return;
  if (!resolved.steps.some((step) => step.id === pane.step)) {
    pane.step = resolved.steps[0]?.id ?? '';
  }
}

/** The flow applies to both configurations, so both move to it together. */
export function setFlow(state: AppState, flowId: string): void {
  if (!isKnown.flow(flowId)) return;
  state.flow = flowId;
  for (const pane of state.panes) {
    pane.step = paneFlow(state, pane)?.steps[0]?.id ?? '';
  }
}

/** Switches a feature on with its default option, or off entirely. */
export function setFeatureEnabled(
  state: AppState,
  pane: PaneState,
  featureId: FeatureId,
  enabled: boolean,
): void {
  if (enabled) {
    pane.features[featureId] =
      pane.features[featureId] ?? featureById(featureId)?.defaultOptionId ?? '';
  } else {
    delete pane.features[featureId];
  }
  revalidatePaneStep(state, pane);
}

/** Selects a different option for a feature that is already switched on. */
export function setFeatureOption(
  state: AppState,
  pane: PaneState,
  featureId: FeatureId,
  optionId: string,
): void {
  if (pane.features[featureId] === undefined) return;
  pane.features[featureId] = optionId;
  revalidatePaneStep(state, pane);
}

/** Moves every configuration that has this screen onto it. */
export function openStepEverywhere(state: AppState, stepId: string): void {
  const visible = state.compare ? state.panes : state.panes.slice(0, 1);
  for (const pane of visible) {
    if (paneFlow(state, pane)?.steps.some((step) => step.id === stepId)) {
      pane.step = stepId;
    }
  }
}

/** Opens a flow and step from the screen library. */
export function openFlowStep(
  state: AppState,
  flowId: string,
  stepId?: string,
): void {
  if (!isKnown.flow(flowId)) return;
  state.flow = flowId;
  state.mode = 'flow';

  const pane = state.panes[0];
  if (!pane) return;

  // Opening a screen a feature adds switches that feature on, so the screen
  // the library pointed at actually appears.
  if (stepId) {
    const feature = featureForStep(flowId, stepId);
    if (feature && !pane.features[feature.id]) {
      pane.features[feature.id] = feature.defaultOptionId;
    }
  }

  const resolved = paneFlow(state, pane);
  pane.step =
    stepId && resolved?.steps.some((step) => step.id === stepId)
      ? stepId
      : (resolved?.steps[0]?.id ?? '');

  for (const other of state.panes.slice(1)) revalidatePaneStep(state, other);
}
