import { computed } from 'vue';
import type { ComputedRef } from 'vue';
import { featureById } from './features';
import {
  mostLikelyNextStepId,
  previousStepIds,
  screenProperties,
  stepById,
  unsupportedConfigParts,
} from './flows';
import { paneFlow, useAppState } from './state';
import type { PaneState } from './state';
import type { FlowStep, PaymentFlow, ScreenProperties } from '../types/flow';

/**
 * One step you can move to from the current screen. Backward and forward moves
 * share this shape because they are shown the same way.
 */
export interface PathChoice {
  stepId: string;
  title: string;
  /** Branch label, for the outgoing branches of a decision screen. */
  label?: string;
  /** Share of shoppers on this path, 0 to 1, when known. */
  share?: number;
}

export interface PaneContext {
  pane: ComputedRef<PaneState>;
  flow: ComputedRef<PaymentFlow | undefined>;
  step: ComputedRef<FlowStep | undefined>;
  properties: ComputedRef<ScreenProperties | undefined>;
  /** Feature name when the current screen comes from an optional feature. */
  featureName: ComputedRef<string | undefined>;
  missingConfigParts: ComputedRef<string[]>;
  /** Every way back from the current screen, most likely first. */
  backChoices: ComputedRef<PathChoice[]>;
  /** Every way forward from the current screen, most likely first. */
  forwardChoices: ComputedRef<PathChoice[]>;
  nextStepId: ComputedRef<string | undefined>;
}

/**
 * The resolved view of one configuration: the shared flow with that
 * configuration's features applied, plus the values the screen, the navigation,
 * and the insights column all need.
 */
export function usePane(paneIndex: () => number): PaneContext {
  const state = useAppState();

  const pane = computed(() => state.panes[paneIndex()]!);
  const flow = computed(() => paneFlow(state, pane.value));

  const step = computed(() => {
    const resolved = flow.value;
    if (!resolved) return undefined;
    // Falls back to the first screen if the selected one no longer exists,
    // for example after the flow or its features changed underneath it.
    return stepById(resolved, pane.value.step) ?? resolved.steps[0];
  });

  const properties = computed(() =>
    flow.value && step.value
      ? screenProperties(flow.value, step.value)
      : undefined,
  );

  const featureName = computed(() => {
    const featureId = step.value?.featureId;
    return featureId ? featureById(featureId)?.name : undefined;
  });

  const missingConfigParts = computed(() =>
    flow.value ? unsupportedConfigParts(flow.value, pane.value.config) : [],
  );

  const backChoices = computed<PathChoice[]>(() => {
    const resolved = flow.value;
    const current = step.value;
    if (!resolved || !current) return [];
    return previousStepIds(resolved, current.id)
      .map((id) => {
        const predecessor = stepById(resolved, id);
        const branch = predecessor?.branches?.find(
          (item) => item.targetStepId === current.id,
        );
        return {
          stepId: id,
          title: predecessor?.title ?? id,
          share: branch?.share,
        };
      })
      .sort((a, b) => (b.share ?? 1) - (a.share ?? 1));
  });

  const forwardChoices = computed<PathChoice[]>(() => {
    const resolved = flow.value;
    const current = step.value;
    if (!resolved || !current) return [];
    if (current.branches?.length) {
      return current.branches.map((branch) => ({
        stepId: branch.targetStepId,
        title:
          stepById(resolved, branch.targetStepId)?.title ?? branch.targetStepId,
        label: branch.label,
        share: branch.share,
      }));
    }
    if (!current.nextStepId) return [];
    return [
      {
        stepId: current.nextStepId,
        title:
          stepById(resolved, current.nextStepId)?.title ?? current.nextStepId,
      },
    ];
  });

  const nextStepId = computed(() =>
    step.value ? mostLikelyNextStepId(step.value) : undefined,
  );

  return {
    pane,
    flow,
    step,
    properties,
    featureName,
    missingConfigParts,
    backChoices,
    forwardChoices,
    nextStepId,
  };
}
