/** Option shape used by the placeholder select component. */
export interface SelectOption {
  value: string;
  label: string;
}

/** Marks the screen a configuration is showing, so one chart can serve both. */
export interface FlowMarker {
  stepId: string;
  /** Configuration name, empty when only one configuration is shown. */
  label: string;
  /** Option selected when the marked step has multiple chart variants. */
  optionId?: string;
}

/** Names available in the placeholder icon set. */
export type IconName =
  | 'menu'
  | 'sliders'
  | 'chart'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'ask'
  | 'close'
  | 'external-link'
  | 'trash'
  | 'link'
  | 'plus'
  | 'sun'
  | 'moon';
