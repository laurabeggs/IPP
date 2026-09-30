<script setup lang="ts">
import { computed } from 'vue';
import { timeRanges } from '../data/catalog';
import { useAppState } from '../lib/state';
import { formatCount, formatRate, formatSeconds } from '../lib/metrics';
import PSelect from './ui/PSelect.vue';
import type { FunnelRow } from '../lib/metrics';
import type { ScreenMetrics, TimeRangeId } from '../types/flow';

/**
 * One metrics section shared by the flow and library views: the period
 * selector sits in the header, and the figures for the screen and its whole
 * flow follow as labelled groups.
 */
const props = defineProps<{
  /** Metrics for the screen itself. */
  screen: ScreenMetrics;
  /** Metrics for the whole flow, shown as a second group when present. */
  flow?: ScreenMetrics;
  /** Shown instead of the flow errors by the whole-flow group. */
  funnel?: FunnelRow[];
}>();

const state = useAppState();

const periodOptions = timeRanges.map((range) => ({
  value: range.id,
  label: range.label,
}));

interface MetricsGroup {
  key: string;
  label: string;
  metrics: ScreenMetrics;
  errors: ScreenMetrics['errors'];
  funnel?: FunnelRow[];
}

const groups = computed<MetricsGroup[]>(() => {
  const list: MetricsGroup[] = [
    {
      key: 'screen',
      label: 'Screen',
      metrics: props.screen,
      errors: props.screen.errors,
    },
  ];
  if (props.flow) {
    list.push({
      key: 'flow',
      label: 'Flow',
      metrics: props.flow,
      errors: props.flow.errors,
      funnel: props.funnel,
    });
  }
  return list;
});
</script>

<template>
  <section class="metrics px-glass-card">
    <header class="metrics__header">
      <h3 class="metrics__title">Metrics</h3>
      <PSelect
        class="metrics__period"
        label="Period"
        hide-label
        :model-value="state.range"
        :options="periodOptions"
        @update:model-value="state.range = $event as TimeRangeId"
      />
    </header>

    <div v-for="group in groups" :key="group.key" class="metrics__group">
      <h4 class="metrics__group-title">{{ group.label }}</h4>

      <div class="metrics__figures">
        <div class="metrics__figure">
          <span class="metrics__value">{{ formatCount(group.metrics.impressions) }}</span>
          <span class="metrics__caption">Seen</span>
        </div>
        <div class="metrics__figure">
          <span class="metrics__value">{{ formatRate(group.metrics.dropOffRate) }}</span>
          <span class="metrics__caption">Drop off</span>
        </div>
        <div class="metrics__figure">
          <span class="metrics__value">
            {{ formatSeconds(group.metrics.avgDurationSeconds) }}
          </span>
          <span class="metrics__caption">Time</span>
        </div>
      </div>

      <ul v-if="group.funnel?.length" class="metrics__funnel">
        <li v-for="row in group.funnel" :key="row.stepId" class="metrics__funnel-row">
          <span
            class="metrics__funnel-stage"
            :style="{
              width: `${Math.max(52, Math.round(row.shareOfStart * 100))}%`,
            }"
            :aria-label="`${row.title}: ${formatRate(row.shareOfStart)} reached`"
          >
            <span class="metrics__funnel-title">{{ row.title }}</span>
            <span class="metrics__funnel-share">
              {{ formatRate(row.shareOfStart) }}
            </span>
          </span>
        </li>
      </ul>

      <div v-else-if="group.errors.length" class="metrics__errors-group">
        <span class="metrics__errors-title">Possible errors</span>
        <ul class="metrics__errors">
          <li
            v-for="error in group.errors"
            :key="error.code"
            class="metrics__error"
          >
            <span>{{ error.label }}</span>
            <span class="metrics__error-count">{{ formatRate(error.rate) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
.metrics {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.metrics__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.metrics__title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--px-text-muted);
}

/* The chevron moves in with the smaller control so it keeps the same
 * distance from the right edge as from the top and bottom. */
.metrics__period {
  --p-select-chevron-inset: 10px;
  flex: 0 0 auto;
}

.metrics__period :deep(.p-select__control) {
  min-height: 32px;
  padding: 5px 28px 5px 8px;
}

.metrics__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.metrics__group + .metrics__group {
  padding-top: 14px;
  border-top: 1px solid var(--px-border-subtle);
}

.metrics__group-title {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--px-text-muted);
}

.metrics__figures {
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
}

.metrics__figure {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.metrics__value {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.metrics__caption {
  font-size: 11px;
  color: var(--px-text-muted);
}

.metrics__errors-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metrics__errors-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--px-text-muted);
}

.metrics__errors,
.metrics__funnel {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.metrics__funnel {
  align-items: center;
  gap: 2px;
}

.metrics__error {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}

.metrics__error-count {
  color: var(--px-text-muted);
  white-space: nowrap;
}

.metrics__funnel-row {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: 28px;
}

.metrics__funnel-stage {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  min-width: 0;
  min-height: 28px;
  padding: 5px 9px;
  color: var(--px-text);
  font-size: 11px;
  background: var(--b-color-background-highlight-weak);
  border: 1px solid var(--b-color-background-highlight-strong);
  border-radius: 4px;
  clip-path: polygon(3% 0, 97% 0, 100% 100%, 0 100%);
}

.metrics__funnel-title {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metrics__funnel-share {
  flex: 0 0 auto;
  color: var(--b-color-label-on-background-highlight-weak);
  font-weight: 600;
  text-align: right;
}
</style>
