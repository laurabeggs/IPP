<script setup lang="ts">
import { computed } from 'vue';
import { usePane } from '../lib/pane';
import { useAppState } from '../lib/state';
import { flowFunnel, flowMetrics, screenMetrics } from '../lib/metrics';
import MetricsPanel from './MetricsPanel.vue';
import PropertiesPanel from './PropertiesPanel.vue';
import PIcon from './ui/PIcon.vue';

/** Properties and metrics for one row: the open screen, then the whole flow. */
const props = defineProps<{ paneIndex: number }>();

const state = useAppState();
const { flow, step, properties, featureName } = usePane(() => props.paneIndex);
const isFirst = computed(() => props.paneIndex === 0);
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
const totals = computed(() =>
  flow.value ? flowMetrics(flow.value, state.range) : undefined,
);
const funnel = computed(() =>
  flow.value ? flowFunnel(flow.value, state.range) : undefined,
);
</script>

<template>
  <aside class="insights">
    <header class="insights__header">
      <span class="insights__label">
        {{ step?.title ?? 'Properties & metrics'
        }}<template v-if="state.compare && !isFirst"> · B</template>
      </span>
      <button type="button" class="insights__link" @click="openInLibrary">
        <span>View in screen library</span>
        <PIcon name="external-link" />
      </button>
    </header>

    <div class="insights__body">
      <template v-if="properties && stepMetrics && totals && funnel">
        <PropertiesPanel
          :properties="properties"
          :feature-name="featureName"
          :feature-id="featureId"
        />
        <MetricsPanel :screen="stepMetrics" :flow="totals" :funnel="funnel" />
      </template>
    </div>
  </aside>
</template>

<style scoped>
/* The whole column scrolls: the header sits on the page background and the
 * sections float in glass containers. */
.insights {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  min-height: 0;
  overflow-y: auto;
}

/* The header sits directly on the page background, in no container: the
 * screen name, with the library link right-aligned across from it. */
.insights__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px 0;
  box-sizing: border-box;
}

/* The title keeps the height of the library view's panel header. */
.insights__label {
  overflow: hidden;
  min-width: 0;
  min-height: 30px;
  font-size: 14px;
  font-weight: 600;
  line-height: 30px;
  color: var(--px-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insights__link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  padding: 0;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--px-link);
  background: none;
  border: none;
  cursor: pointer;
  white-space: nowrap;
}

.insights__link:hover {
  text-decoration: underline;
}

.insights__link :deep(.p-icon) {
  width: 12px;
  height: 12px;
}

.insights__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  padding: 8px 16px 24px;
  box-sizing: border-box;
}
</style>
