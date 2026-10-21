<script setup lang="ts">
import { computed } from 'vue';
import { BentoDivider } from '@adyen/bento-vue3';
import { flows } from '../data/flows';
import { flowAlluvial } from '../lib/alluvial';
import { screenMetrics } from '../lib/metrics';
import PropertiesPanel from './PropertiesPanel.vue';
import MetricsPanel from './MetricsPanel.vue';
import type { Screen } from '../types/flow';
import type { TimeRangeId } from '../types/flow';

const props = defineProps<{
  screen: Screen;
  range: TimeRangeId;
}>();

const sourceFlow = computed(() =>
  flows.find((flow) => flow.id === props.screen.flowId),
);
const screenMetricValues = computed(() =>
  screenMetrics(props.screen.step, props.range),
);
const alluvial = computed(() =>
  sourceFlow.value ? flowAlluvial(sourceFlow.value, props.range) : undefined,
);
</script>

<template>
  <div class="screen-details">
    <PropertiesPanel
      variant="section"
      :properties="screen.properties"
      :feature-id="screen.step.featureId"
    />
    <BentoDivider />
    <MetricsPanel
      variant="section"
      :screen="screenMetricValues"
      :alluvial="alluvial"
      :flow-name="sourceFlow?.name"
    />
  </div>
</template>

<style scoped>
.screen-details {
  display: flex;
  flex-direction: column;
  gap: var(--b-spacer-060);
}
</style>
