<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  BentoModalFullscreen,
  BentoSummaryGrid,
  BentoSummaryGridItemNumeric,
  BentoSummaryGridItemPercentage,
} from '@adyen/bento-vue3';
import { timeRanges } from '../data/catalog';
import { useAppState } from '../lib/state';
import { formatCount, formatRate, formatSeconds } from '../lib/metrics';
import AlluvialChart from './AlluvialChart.vue';
import PIconButton from './ui/PIconButton.vue';
import PSection from './ui/PSection.vue';
import PSelect from './ui/PSelect.vue';
import type { AlluvialData } from '../lib/alluvial';
import type { ScreenMetrics, TimeRangeId } from '../types/flow';

/**
 * One metrics section shared by the flow and library views: the period
 * selector sits in the header, the screen's figures follow in a summary
 * grid, then the whole flow's alluvial and the screen's possible errors.
 */
const props = withDefaults(
  defineProps<{
    /** Metrics for the screen itself. */
    screen: ScreenMetrics;
    /** The whole flow, charted under the screen's figures when present. */
    alluvial?: AlluvialData;
    /** Names the flow in the fullscreen chart's title. */
    flowName?: string;
    /** 'section' inside an inspector, where dividers separate the blocks. */
    variant?: 'card' | 'section';
  }>(),
  { variant: 'card' },
);

const state = useAppState();

const periodOptions = timeRanges.map((range) => ({
  value: range.id,
  label: range.label,
}));

const periodLabel = computed(
  () => timeRanges.find((range) => range.id === state.range)?.label ?? '',
);

const chart = computed(() =>
  props.alluvial?.stages ? props.alluvial : undefined,
);

const expanded = ref(false);
/* The fullscreen chart is sized to the window when it opens, leaving room
 * for the modal header and the padding around the chart. */
const expandedScale = ref(360);

function openExpanded(): void {
  const viewport = typeof window === 'undefined' ? 800 : window.innerHeight;
  expandedScale.value = Math.round(Math.min(520, Math.max(240, viewport - 300)));
  expanded.value = true;
}
</script>

<template>
  <PSection class="metrics" title="Metrics" :variant="variant">
    <template #header>
      <PSelect
        class="metrics__period"
        label="Period"
        hide-label
        size="compact"
        :model-value="state.range"
        :options="periodOptions"
        @update:model-value="state.range = $event as TimeRangeId"
      />
    </template>

    <BentoSummaryGrid class="metrics__figures">
      <template #cell-1-1>
        <BentoSummaryGridItemNumeric
          class="metrics__figure"
          title="Seen"
          size="small"
          :label="formatCount(screen.impressions)"
        />
      </template>
      <template #cell-1-2>
        <BentoSummaryGridItemPercentage
          class="metrics__figure"
          title="Drop-off"
          size="small"
          :label="formatRate(screen.dropOffRate)"
        />
      </template>
      <template #cell-1-3>
        <BentoSummaryGridItemNumeric
          class="metrics__figure"
          title="Avg time"
          size="small"
          :label="formatSeconds(screen.avgDurationSeconds)"
        />
      </template>
    </BentoSummaryGrid>

    <div v-if="chart" class="metrics__chart">
      <AlluvialChart class="metrics__alluvial" :data="chart" compact />
      <span class="metrics__expand-surface">
        <PIconButton
          class="metrics__expand"
          icon="expand"
          label="Expand shopper flow"
          @click="openExpanded"
        />
      </span>
    </div>

    <div v-if="screen.errors.length" class="metrics__errors-group">
      <span class="metrics__errors-title">Possible errors</span>
      <ul class="metrics__errors">
        <li
          v-for="error in screen.errors"
          :key="error.code"
          class="metrics__error"
        >
          <span>{{ error.label }}</span>
          <span class="metrics__error-count">
            {{ formatRate(error.rate) }}
          </span>
        </li>
      </ul>
    </div>

    <BentoModalFullscreen
      v-if="chart"
      class="metrics__modal"
      :title="flowName ? `${flowName}: shopper flow` : 'Shopper flow'"
      :contextual-label="periodLabel"
      :is-open="expanded"
      @update:is-open="expanded = $event"
    >
      <div class="metrics__modal-body">
        <AlluvialChart
          v-if="expanded"
          class="metrics__modal-chart"
          :data="chart"
          :scale-height="expandedScale"
        />
      </div>
    </BentoModalFullscreen>
  </PSection>
</template>

<style scoped>
.metrics.p-section--plain {
  gap: var(--b-spacer-070);
}

.metrics :deep(.p-section__header) {
  min-height: 28px;
}

.metrics :deep(.p-section__title) {
  font-weight: 700;
}

.metrics :deep(.p-section__content) {
  display: flex;
  flex-direction: column;
  gap: var(--b-spacer-070);
}

.metrics__period {
  flex: 0 0 auto;
  width: 133px;
}

/* Bento's condensed textbox is 28px inside a 1px border, so 30px overall.
 * Figma's is 28px overall: the inner textbox takes the 26px inside the
 * border. Padding the outer box instead pushed the label down. */
.metrics__period :deep(.b-dropdown-default-textbox--condensed) {
  min-height: 28px;
  height: 28px;
  padding-top: 0;
  padding-bottom: 0;
}

.metrics__period
  :deep(.b-dropdown-default-textbox--condensed .b-dropdown-default-textbox__textbox) {
  min-height: 26px;
  height: 26px;
}

.metrics__figures :deep(.b-summary-grid-item) {
  min-width: 0;
  gap: 2px;
}

/* Bento adds a margin under each tile's title on top of the tile's gap. */
.metrics__figures :deep(.b-summary-grid-item__header) {
  margin-bottom: 0;
}

/* The tiles have no title icons, but the empty slot keeps its margin and
 * would wrap titles like "Drop-off" in the narrow panel. */
.metrics__figures :deep(.b-summary-grid-item__title-icons:empty) {
  display: none;
}

.metrics__errors-group {
  display: flex;
  flex-direction: column;
  gap: var(--b-spacer-020);
  color: var(--b-color-label-primary);
}

.metrics__errors-title {
  font-size: 10px;
  font-weight: 700;
  line-height: var(--b-text-caption-line-height);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.metrics__errors {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--b-spacer-020);
}

.metrics__error {
  display: flex;
  justify-content: space-between;
  gap: var(--b-spacer-060);
  font-size: var(--b-text-body-font-size);
  line-height: var(--b-text-body-line-height);
}

.metrics__error-count {
  white-space: nowrap;
}

.metrics__chart {
  position: relative;
}

/* The expand button floats over the chart's top-right corner. Bento's
 * secondary fill is translucent, so the button sits on an opaque surface
 * that carries the shadow lifting it off the nodes and links. */
.metrics__expand-surface {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  display: inline-flex;
  border-radius: var(--b-border-radius-m);
  background: var(--b-color-background-primary);
  box-shadow: var(--b-shadow-medium);
  transition: box-shadow var(--b-animation-duration-fast)
    var(--b-animation-easing-standard);
}

.metrics__expand-surface:hover {
  box-shadow: var(--b-shadow-high);
}

.metrics__modal-body {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 48px clamp(24px, 6vw, 96px);
}

.metrics__modal-chart {
  max-width: 1200px;
}
</style>
