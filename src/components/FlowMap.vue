<script lang="ts">
// Module scope, so two charts on the same page get different arrowhead ids.
let instanceCount = 0;
</script>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  buildElkFlowMap,
  buildFlowMap,
  journeyGeometry,
  regularGeometry,
} from '../lib/graph';
import type { PaymentFlow } from '../types/flow';
import type { FlowMarker } from '../types/ui';

const props = defineProps<{
  flow: PaymentFlow;
  markers: FlowMarker[];
  enabledStepIds: string[];
}>();

const emit = defineEmits<{ select: [stepId: string] }>();

const geometry = computed(() =>
  props.flow.steps.some((step) => step.chartOnly)
    ? journeyGeometry
    : regularGeometry,
);
const layout = ref(buildFlowMap(props.flow, geometry.value));
let layoutRequest = 0;

async function refreshLayout(): Promise<void> {
  const request = ++layoutRequest;
  const flow = props.flow;
  const selectedGeometry = geometry.value;

  // Render the deterministic layout immediately, then replace it when ELK
  // finishes so the chart never appears empty while the async layout runs.
  layout.value = buildFlowMap(flow, selectedGeometry);

  try {
    const elkLayout = await buildElkFlowMap(flow, selectedGeometry);
    if (request === layoutRequest) layout.value = elkLayout;
  } catch {
    // The synchronous layout remains visible if ELK cannot calculate a graph.
  }
}

watch(
  [() => props.flow, geometry],
  () => {
    void refreshLayout();
  },
  { immediate: true },
);

const enabledStepIds = computed(() => new Set(props.enabledStepIds));

const markersByNode = computed(() => {
  const grouped = new Map<string, string[]>();
  for (const node of layout.value.nodes) {
    const sourceId = node.step.sourceStepId ?? node.step.id;
    const matches = props.markers.filter(
      (marker) =>
        marker.stepId === sourceId &&
        (!node.step.featureId ||
          marker.optionId === node.step.featureOptionId),
    );
    if (!matches.length) continue;

    const labels = matches
      .map((marker) => marker.label)
      .filter((label) => label.length > 0);
    grouped.set(node.step.id, labels);
  }
  return grouped;
});

function scrollToSelectedNode(): void {
  const selectedNode = document.querySelector<HTMLElement>(
    '.chart__node--active',
  );
  selectedNode?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'center',
  });
}

watch(
  [markersByNode, layout],
  () => {
    // Wait for Vue to render the active class and for ELK to finish replacing
    // the fallback layout before looking up the selected node.
    requestAnimationFrame(scrollToSelectedNode);
  },
  { flush: 'post' },
);

function isDisabled(stepId: string): boolean {
  const node = layout.value.nodes.find((item) => item.step.id === stepId);
  return Boolean(node?.step.chartOnly || !enabledStepIds.value.has(stepId));
}

function selectNode(stepId: string): void {
  if (isDisabled(stepId)) return;
  const node = layout.value.nodes.find((item) => item.step.id === stepId);
  if (node) emit('select', node.step.sourceStepId ?? node.step.id);
}

const arrowId = `flow-arrow-${(instanceCount += 1)}`;
</script>

<template>
  <div class="chart">
    <div
      class="chart__canvas"
      :style="{ width: `${layout.width}px`, height: `${layout.height}px` }"
    >
      <svg
        class="chart__edges"
        :width="layout.width"
        :height="layout.height"
        aria-hidden="true"
      >
        <defs>
          <marker
            :id="arrowId"
            viewBox="0 0 8 8"
            refX="7"
            refY="4"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 7 4 L 0 7 z" class="chart__arrow" />
          </marker>
        </defs>

        <g v-for="edge in layout.edges" :key="`${edge.from}-${edge.to}-${edge.label ?? ''}`">
          <path
            class="chart__edge"
            :d="edge.path"
            :marker-end="
              edge.showArrow === false ? undefined : `url(#${arrowId})`
            "
          />
          <text
            v-if="edge.label"
            class="chart__edge-label"
            :x="edge.labelX"
            :y="edge.labelY"
            text-anchor="middle"
          >
            <tspan :x="edge.labelX">{{ edge.label }}</tspan>
            <tspan
              v-if="edge.share"
              class="chart__edge-share"
              :x="edge.labelX"
              dy="12"
            >
              {{ Math.round((edge.share ?? 0) * 100) }}%
            </tspan>
          </text>
        </g>
      </svg>

      <button
        v-for="node in layout.nodes"
        :key="node.step.id"
        type="button"
        class="chart__node"
        :class="{
          'chart__node--active': markersByNode.has(node.step.id),
          'chart__node--disabled': isDisabled(node.step.id),
          'chart__node--terminal': node.isTerminal,
        }"
        :style="{
          left: `${node.x}px`,
          top: `${node.y}px`,
          width: `${layout.geometry.nodeWidth}px`,
          height: `${layout.geometry.nodeHeight}px`,
        }"
        :aria-current="markersByNode.has(node.step.id) ? 'step' : undefined"
        :disabled="isDisabled(node.step.id)"
        :title="node.step.shopperDescription"
        @click="selectNode(node.step.id)"
      >
        {{ node.step.title }}
        <span
          v-for="(label, index) in markersByNode.get(node.step.id) ?? []"
          :key="label"
          class="chart__marker"
          :style="{ right: `${-9 + index * -18}px` }"
        >
          {{ label }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chart {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding: 4px 2px 8px;
  overscroll-behavior: contain;
}

.chart__canvas {
  position: relative;
}

.chart__edges {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.chart__edge {
  fill: none;
  stroke: var(--px-border);
  stroke-width: 1.4;
}

.chart__arrow {
  fill: var(--px-border);
}

.chart__edge-label {
  font-size: 10px;
  fill: var(--px-text-muted);
  /* Keeps the label readable where it crosses a connector. */
  paint-order: stroke;
  stroke: var(--px-bg);
  stroke-width: 3px;
  stroke-linejoin: round;
}

.chart__edge-share {
  font-size: 9px;
}

.chart__node {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
  text-align: center;
  color: var(--px-text);
  background: var(--px-surface);
  border: 1px solid var(--px-border-subtle);
  border-radius: 6px;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(31, 42, 55, 0.04);
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.chart__node--terminal {
  border-radius: 999px;
}

.chart__node:not(:disabled):hover {
  border-color: var(--px-border);
  box-shadow: var(--px-shadow-sm);
}

.chart__node--disabled {
  color: var(--px-text-muted);
  background: var(--px-surface-muted);
  border-style: dashed;
  opacity: 0.52;
  cursor: not-allowed;
  box-shadow: none;
}

.chart__node--active {
  border-color: var(--b-color-background-highlight-strong);
  background: var(--b-color-background-highlight-weak);
  font-weight: 600;
}

.chart__marker {
  position: absolute;
  top: -8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 700;
  color: var(--b-color-label-on-color);
  background: var(--b-color-background-highlight-strong);
}
</style>
