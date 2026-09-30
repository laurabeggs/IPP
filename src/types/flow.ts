export type DeviceId = 'e285' | 's1f2' | 'ams1' | 'tap-to-pay';

export type FormFactor = 'handheld' | 'countertop' | 'unattended' | 'mobile';

export type TimeRangeId = '24h' | '5d' | '30d';

/** Optional checkout features a configuration can switch on. */
export type FeatureId =
  | 'tipping'
  | 'giving'
  | 'installments'
  | 'loyalty'
  | 'dcc'
  | 'surcharge'
  | 'cvm';

export interface Device {
  id: DeviceId;
  name: string;
  formFactor: FormFactor;
  /** Logical shopper-facing screen dimensions used for proportional rendering. */
  screen: {
    width: number;
    height: number;
  };
}

export interface TimeRange {
  id: TimeRangeId;
  label: string;
  /** Share of the 30-day volume attributed to this range in the mock data. */
  volumeShare: number;
}

/** Properties shared by every screen in a flow unless a step overrides them. */
export interface ScreenProperties {
  devices: DeviceId[];
  firmwareVersions: string[];
  languages: string[];
  currencies: string[];
  owningTeam: string;
}

export interface ScreenErrorRate {
  code: string;
  label: string;
  /** Share of impressions that hit this error, 0 to 1. */
  rate: number;
}

/** Mock baseline numbers for a screen, expressed over a 30-day window. */
export interface BaseMetrics {
  impressions30d: number;
  /** Share of shoppers who abandon on this screen, 0 to 1. */
  dropOffRate: number;
  avgDurationSeconds: number;
  errors: ScreenErrorRate[];
}

export interface ScreenErrorCount {
  code: string;
  label: string;
  count: number;
  rate: number;
}

export interface ScreenMetrics {
  impressions: number;
  dropOffRate: number;
  avgDurationSeconds: number;
  errors: ScreenErrorCount[];
}

export interface StepBranch {
  label: string;
  targetStepId: string;
  /** Share of shoppers taking this path, 0 to 1. */
  share: number;
}

export interface FlowStep {
  /**
   * Stable identifier for the step. Also used as the screenshot filename:
   * public/screens/<flow id>/<step id>.png
   */
  id: string;
  /** Original step id when this is a full-journey chart variant. */
  sourceStepId?: string;
  /** Set on steps added by an optional feature. */
  featureId?: FeatureId;
  /** Feature option represented by this chart variant. */
  featureOptionId?: string;
  /** Structural feature gate shown only in the full-journey chart. */
  chartOnly?: boolean;
  /** Short step name shown in the timeline, e.g. "Present card". */
  title: string;
  /** What the shopper sees and does at this step. */
  shopperDescription: string;
  /** Optional context for internal teams, e.g. what happens behind the scenes. */
  internalNote?: string;
  /** The single next step, for steps without a decision point. */
  nextStepId?: string;
  /** Alternative paths out of this step. Use instead of nextStepId. */
  branches?: StepBranch[];
  /** Overrides for the flow-level properties, for example a narrower device list. */
  propertyOverrides?: Partial<ScreenProperties>;
  metrics: BaseMetrics;
}

export interface PaymentFlow {
  /** Stable identifier for the flow. Also the screenshots folder name. */
  id: string;
  name: string;
  summary: string;
  /** Properties inherited by every step in the flow. */
  properties: ScreenProperties;
  steps: FlowStep[];
}

/** One selectable variant of a feature, for example "Suggested percentages". */
export interface FeatureOption {
  id: string;
  label: string;
  /** What changes about the screens when this option is selected. */
  description?: string;
}

/** Where and how a feature inserts its screens into one flow. */
export interface FeatureInsertion {
  flowId: string;
  /** The feature screens are spliced in after this step. */
  afterStepId: string;
  /** The screens to insert, per option id. An empty list adds nothing. */
  stepsByOption: Record<string, FlowStep[]>;
}

export interface Feature {
  id: FeatureId;
  name: string;
  /** One line about what the feature does, shown under the toggle. */
  description: string;
  /** The option selected when the feature is switched on. */
  defaultOptionId: string;
  options: FeatureOption[];
  insertions: FeatureInsertion[];
}

export interface Merchant {
  id: string;
  name: string;
  segment: string;
  config: {
    device: DeviceId;
    language: string;
    currency: string;
    firmware: string;
  };
  /** Flow ids this merchant runs most, highest volume first. */
  topFlowIds: string[];
}

/** A single screen, resolved out of the flow it belongs to. */
export interface Screen {
  flowId: string;
  flowName: string;
  step: FlowStep;
  properties: ScreenProperties;
  /** Set when this screen only exists while a feature is switched on. */
  featureName?: string;
}
