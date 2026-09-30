<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { usePane } from '../lib/pane';
import { useAppState } from '../lib/state';
import FlowBand from '../components/FlowBand.vue';
import ScreenRow from '../components/ScreenRow.vue';

const state = useAppState();

// Both panes always exist, so both contexts can be built up front.
const contexts = [usePane(() => 0), usePane(() => 1)];
const MIN_FLOW_BAND_HEIGHT = 168;
const FLOW_BAND_RESIZE_STEP = 16;

let resizeStartY = 0;
let resizeStartHeight = 0;

/** Arrow keys step every visible configuration along its most likely path. */
function onKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

  const visible = state.compare ? contexts : contexts.slice(0, 1);
  for (const context of visible) {
    const stepId =
      event.key === 'ArrowLeft'
        ? context.backChoices.value[0]?.stepId
        : context.nextStepId.value;
    if (stepId) context.pane.value.step = stepId;
  }
}

function resizeFlowBand(event: PointerEvent): void {
  state.flowBandHeight = Math.max(
    MIN_FLOW_BAND_HEIGHT,
    resizeStartHeight + event.clientY - resizeStartY,
  );
}

function stopFlowBandResize(): void {
  window.removeEventListener('pointermove', resizeFlowBand);
  window.removeEventListener('pointerup', stopFlowBandResize);
}

function startFlowBandResize(event: PointerEvent): void {
  if (event.button !== 0) return;
  resizeStartY = event.clientY;
  resizeStartHeight = state.flowBandHeight;
  window.addEventListener('pointermove', resizeFlowBand);
  window.addEventListener('pointerup', stopFlowBandResize);
  event.preventDefault();
}

function onFlowBandResizeKeydown(event: KeyboardEvent): void {
  const step = event.shiftKey ? FLOW_BAND_RESIZE_STEP * 2 : FLOW_BAND_RESIZE_STEP;
  if (event.key === 'ArrowUp') {
    state.flowBandHeight = Math.max(
      MIN_FLOW_BAND_HEIGHT,
      state.flowBandHeight - step,
    );
    event.preventDefault();
  } else if (event.key === 'ArrowDown') {
    state.flowBandHeight += step;
    event.preventDefault();
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  stopFlowBandResize();
});
</script>

<template>
  <div class="flow-screen">
    <div
      class="flow-view"
      :class="{ 'flow-view--comparison': state.compare }"
      :style="{ '--flow-chart-height': `${state.flowBandHeight}px` }"
    >
      <FlowBand v-if="state.chartOpen" />
      <div
        v-if="state.chartOpen"
        class="flow-resize-handle"
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize master flow"
        aria-valuemin="168"
        :aria-valuenow="state.flowBandHeight"
        tabindex="0"
        @pointerdown="startFlowBandResize"
        @keydown="onFlowBandResizeKeydown"
      >
        <span aria-hidden="true" />
      </div>
      <div class="screen-area">
        <div class="screen-layout-switch" role="group" aria-label="Screen view">
          <button
            type="button"
            class="screen-layout-switch__option"
            :class="{
              'screen-layout-switch__option--active':
                state.screenLayout === 'single',
            }"
            :aria-pressed="state.screenLayout === 'single'"
            @click="state.screenLayout = 'single'"
          >
            One screen
          </button>
          <button
            type="button"
            class="screen-layout-switch__option"
            :class="{
              'screen-layout-switch__option--active':
                state.screenLayout === 'all',
            }"
            :aria-pressed="state.screenLayout === 'all'"
            @click="state.screenLayout = 'all'"
          >
            All screens
          </button>
        </div>
        <ScreenRow :pane-index="0" :label="state.compare ? 'A' : ''" />
        <ScreenRow v-if="state.compare" :pane-index="1" label="B" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.flow-screen {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: 0;
}

.flow-view {
  --flow-chart-height: 220px;
  --flow-chart-min-height: 168px;
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  height: auto;
  min-height: 0;
  width: 100%;
  overflow: visible;
}

.flow-view > :deep(.band) {
  flex: 0 0 var(--flow-chart-height);
  min-height: var(--flow-chart-min-height);
}

.flow-resize-handle {
  position: relative;
  z-index: 4;
  display: flex;
  flex: 0 0 12px;
  align-items: center;
  justify-content: center;
  margin: -6px 0;
  cursor: row-resize;
  touch-action: none;
}

.flow-resize-handle span {
  width: 48px;
  height: 2px;
  border-radius: 999px;
  background: var(--px-border);
  transition: background 120ms ease, width 120ms ease;
}

.flow-resize-handle:hover span,
.flow-resize-handle:focus-visible span {
  width: 64px;
  background: var(--b-color-background-success-strong);
}

.flow-resize-handle:focus-visible {
  outline: none;
  min-height: 0;
}

.screen-area {
  position: relative;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-height: 0;
}

.screen-area > :deep(.row) {
  flex: 1 1 0;
  min-height: 0;
}

.screen-area > :deep(.row + .row) {
  border-top: 1px solid var(--px-border-subtle);
}

/* The same pill container as the library's display pills: frosted glass,
 * fully rounded, on a low shadow. */
.screen-layout-switch {
  position: absolute;
  z-index: 5;
  top: 12px;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--px-glass-strong);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--px-border-subtle);
  border-radius: 999px;
  box-shadow: var(--px-shadow-sm);
  transform: translateX(-50%);
}

.screen-layout-switch__option {
  padding: 5px 12px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--px-text-muted);
  background: transparent;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.screen-layout-switch__option:hover {
  color: var(--px-text);
}

.screen-layout-switch__option--active {
  color: var(--px-text);
  background: var(--px-surface);
  box-shadow: var(--px-shadow-sm);
}

@media (max-width: 760px) {
  .flow-view {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .flow-view > :deep(.band) {
    flex-basis: var(--flow-chart-height);
    min-height: var(--flow-chart-min-height);
  }

  .screen-area > :deep(.row) {
    flex: none;
  }
}
</style>
