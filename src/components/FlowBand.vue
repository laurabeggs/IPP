<script setup lang="ts">
import { computed } from 'vue';
import { flows } from '../data/flows';
import { resolveFullJourney } from '../lib/features';
import { openStepEverywhere, paneFlow, useAppState } from '../lib/state';
import { stepById } from '../lib/flows';
import FlowMap from './FlowMap.vue';
import type { FlowMarker } from '../types/ui';

/**
 * The whole journey, once, above every configuration. It includes every
 * optional feature and option, then disables alternatives not present in the
 * visible configurations.
 */
const state = useAppState();

const visiblePanes = computed(() =>
  state.compare ? state.panes : state.panes.slice(0, 1),
);

const chartFlow = computed(() => {
  const base = flows.find((flow) => flow.id === state.flow);
  return base ? resolveFullJourney(base) : undefined;
});

const markers = computed<FlowMarker[]>(() =>
  visiblePanes.value.map((pane, index) => {
    const resolved = paneFlow(state, pane);
    const step = resolved ? stepById(resolved, pane.step) : undefined;
    return {
      stepId: step?.id ?? pane.step,
      optionId: step?.featureId
        ? pane.features[step.featureId]
        : undefined,
      label: state.compare ? ['A', 'B'][index]! : '',
    };
  }),
);

const enabledStepIds = computed(() => {
  const enabled = new Set<string>();

  for (const pane of visiblePanes.value) {
    const resolved = paneFlow(state, pane);
    if (!resolved) continue;

    for (const step of chartFlow.value?.steps ?? []) {
      if (step.chartOnly) {
        if (step.featureId && pane.features[step.featureId] !== undefined) {
          enabled.add(step.id);
        }
        continue;
      }

      const sourceId = step.sourceStepId ?? step.id;
      const isInConfiguration = resolved.steps.some(
        (resolvedStep) => resolvedStep.id === sourceId,
      );
      const isSelectedOption =
        !step.featureId ||
        pane.features[step.featureId] === step.featureOptionId;
      if (isInConfiguration && isSelectedOption) enabled.add(step.id);
    }
  }

  return [...enabled];
});
</script>

<template>
  <section class="band">
    <FlowMap
      v-if="chartFlow && state.chartOpen"
      :flow="chartFlow"
      :markers="markers"
      :enabled-step-ids="enabledStepIds"
      @select="openStepEverywhere(state, $event)"
    />
  </section>
</template>

<style scoped>
.band {
  display: flex;
  flex-direction: column;
  min-height: 30px;
  padding: 18px 64px 18px 40px;
  /* The recessed band: one step warmer than the screens' primary surface. */
  background: var(--px-surface-muted);
  border-top: 1px solid var(--px-border-subtle);
  border-bottom: 1px solid var(--px-border-subtle);
  box-shadow: inset 0 8px 16px rgba(31, 42, 55, 0.045),
    inset 0 -3px 8px rgba(31, 42, 55, 0.025);
}

.band > :deep(.chart) {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  max-width: 100%;
  max-height: 100%;
  overflow: auto;
  overscroll-behavior: contain;
}

@media (max-width: 760px) {
  .band {
    padding-right: 16px;
    padding-left: 16px;
  }
}
</style>
