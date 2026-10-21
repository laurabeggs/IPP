<script setup lang="ts">
import { computed } from 'vue';
import { BentoDivider, BentoLink } from '@adyen/bento-vue3';
import { usePane } from '../lib/pane';
import { useAppState } from '../lib/state';
import { flowAlluvial } from '../lib/alluvial';
import { screenMetrics } from '../lib/metrics';
import MetricsPanel from './MetricsPanel.vue';
import PropertiesPanel from './PropertiesPanel.vue';

/**
 * Properties and metrics for one row, shown as the content of its inspector:
 * the screen's properties, then its metrics with the whole flow's chart, each
 * a section between the inspector's dividers. The screen's name is the
 * inspector's own title, and the library link sits beside its close button.
 */
const props = defineProps<{ paneIndex: number }>();

const state = useAppState();
const { flow, step, properties } = usePane(() => props.paneIndex);
const featureId = computed(() => step.value?.featureId);

/** Opens this row's screen in the library's all-formats view. */
function openInLibrary(): void {
  if (!flow.value || !step.value) return;
  state.mode = 'screens';
  state.selectedScreenKey = `${flow.value.id}:${step.value.id}`;
}

const stepMetrics = computed(() =>
  step.value ? screenMetrics(step.value, state.range) : undefined,
);
const alluvial = computed(() =>
  flow.value ? flowAlluvial(flow.value, state.range) : undefined,
);
</script>

<template>
  <div class="insights">
    <BentoLink
      class="insights__link"
      to=""
      is-not-routing
      variant="quiet"
      href="#"
      @click.prevent="openInLibrary"
    >
      View in library
    </BentoLink>

    <div class="insights__body">
      <template v-if="properties && stepMetrics">
        <PropertiesPanel
          variant="section"
          :properties="properties"
          :feature-id="featureId"
        />
        <BentoDivider class="insights__divider" />
        <MetricsPanel
          variant="section"
          :screen="stepMetrics"
          :alluvial="alluvial"
          :flow-name="flow?.name"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.insights {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* Bento's inspector header only takes a title, so the link is placed in it
 * by hand: level with the title, left of the close button. The inspector's
 * panel is the positioned box both are laid out against. */
.insights__link {
  position: absolute;
  top: var(--b-spacer-070);
  right: var(--insights-link-right, 66px);
  display: flex;
  align-items: center;
  height: 26px;
  color: var(--b-color-label-primary);
  font-size: var(--b-text-body-font-size);
  font-weight: 500;
  line-height: var(--b-text-body-line-height);
  text-decoration: underline;
  white-space: nowrap;
  cursor: pointer;
}

.insights__link:hover {
  text-decoration: none;
}

.insights__body {
  display: flex;
  flex-direction: column;
  gap: var(--b-spacer-060);
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: var(--b-spacer-070);
  overflow-y: auto;
}
</style>
