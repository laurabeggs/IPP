<script setup lang="ts">
import { computed } from 'vue';
import { flows } from '../data/flows';
import { flowFunnel, flowMetrics, screenMetrics } from '../lib/metrics';
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
const flowMetricValues = computed(() =>
  sourceFlow.value ? flowMetrics(sourceFlow.value, props.range) : undefined,
);
const funnel = computed(() =>
  sourceFlow.value ? flowFunnel(sourceFlow.value, props.range) : undefined,
);
</script>

<template>
  <div class="screen-details">
    <PropertiesPanel
      :properties="screen.properties"
      :feature-name="screen.featureName"
      :feature-id="screen.step.featureId"
    />
    <MetricsPanel
      :screen="screenMetricValues"
      :flow="flowMetricValues"
      :funnel="funnel"
    />
  </div>
</template>

<style scoped>
.screen-details {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
</style>
