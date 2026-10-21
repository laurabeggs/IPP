<script setup lang="ts">
import { computed, ref } from 'vue';
import { BentoInspector } from '@adyen/bento-vue3';
import { devices } from '../data/catalog';
import { compareVariants } from '../lib/compare';
import { useAppState } from '../lib/state';
import DisplayPills from '../components/DisplayPills.vue';
import ScreenDetailsPanel from '../components/ScreenDetailsPanel.vue';
import ScreenStage from '../components/ScreenStage.vue';
import PIconButton from '../components/ui/PIconButton.vue';
import type { CompareVariant } from '../lib/compare';
import type { Screen } from '../types/flow';

/**
 * One screen from the library, shown for the selected device, or one
 * preview per compared value, with its properties and metrics to the right.
 */
const props = defineProps<{ screen: Screen }>();

const state = useAppState();
const detailsPage = ref<string | undefined>('library-details');
const stageArea = ref<HTMLElement>();

function setPanelOpen(open: boolean): void {
  state.insightsOpen = open;
  if (open) detailsPage.value = 'library-details';
}

/**
 * The stages on show: compare variants when comparing, the selected device's
 * screen else. A screen without the selected device falls back to its first
 * supported one.
 */
const stages = computed<CompareVariant[]>(() => {
  const compared = compareVariants(state, props.screen);
  if (compared.length) return compared;
  const supported: string[] = props.screen.properties.devices;
  const id = supported.includes(state.previewDevice)
    ? state.previewDevice
    : supported[0] ?? '';
  const device = devices.find((entry) => entry.id === id);
  return device
    ? [
        {
          label: device.name,
          device: id,
          language: state.previewLanguage,
          currency: state.previewCurrency,
        },
      ]
    : [];
});
</script>

<template>
  <div class="formats">
    <BentoInspector
      class="formats__content properties-inspector"
      size="small"
      relative-layout="push-content"
      :title="screen.step.title"
      :is-open="state.insightsOpen"
      :active-page="detailsPage"
      :page-focus-anchor="stageArea"
      @update:is-open="setPanelOpen"
      @update:active-page="detailsPage = $event"
    >
      <template #page>
        <div ref="stageArea" class="formats__stage-area">
          <PIconButton
            v-if="!state.insightsOpen"
            class="formats__open"
            icon="chart"
            label="Open metrics and properties"
            @click="setPanelOpen(true)"
          />
          <!-- The pills sit with the screens: centered with the stages,
               staying at the top of the scroll area, beside nothing else. -->
          <DisplayPills class="formats__pills" />
          <div class="formats__grid">
            <div
              v-for="stage in stages"
              :key="`${stage.device}--${stage.language}--${stage.label}`"
              class="formats__item"
            >
              <ScreenStage
                :flow-id="screen.flowId"
                :step-id="screen.step.id"
                :step-title="screen.step.title"
                :device-id="stage.device"
                :language="stage.language"
                :currency="stage.currency"
              />
              <span class="formats__device">{{ stage.label }}</span>
            </div>
          </div>
        </div>
      </template>
      <template #content>
        <div class="formats__panel">
          <ScreenDetailsPanel :screen="screen" :range="state.range" />
        </div>
      </template>
    </BentoInspector>
  </div>
</template>

<style scoped>
.formats {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--px-bg);
}

.formats__content {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.formats__content :deep(.b-inspector__page-wrapper) {
  min-width: 0;
}

/* Bento sizes the panel with height: 100%, which doesn't resolve against the
 * flexed inspector, so the panel stopped at its content's height. Stretching
 * it fills the page instead. */
.formats__content :deep(.b-inspector__container-wrapper) {
  align-self: stretch;
  height: auto;
}

.formats__content :deep(.b-inspector__focus-trap) {
  height: 100%;
}

/* The same width as the Flow panels, narrower than Bento's 420px. */
.formats__content.b-inspector--small:not(.b-inspector--is-compact)
  :deep(.b-inspector__container-wrapper) {
  width: var(--px-panel-width);
}

.formats__content.b-inspector--small:not(.b-inspector--is-compact)
  :deep(.b-inspector__container) {
  width: calc(var(--px-panel-width) - 1px);
}

.formats__content.b-inspector--small:not(.b-inspector--is-compact)
  :deep(.b-inspector__animation-enter-active) {
  animation-name: formats-inspector-expand;
}

.formats__content.b-inspector--small:not(.b-inspector--is-compact)
  :deep(.b-inspector__animation-leave-active) {
  animation-name: formats-inspector-shrink;
}

@keyframes formats-inspector-expand {
  from {
    width: 0;
  }
  to {
    width: var(--px-panel-width);
  }
}

@keyframes formats-inspector-shrink {
  from {
    width: var(--px-panel-width);
  }
  to {
    width: 0;
  }
}

.formats__content :deep(.b-inspector__container),
.formats__content :deep(.b-inspector__content) {
  min-height: 0;
  overflow: hidden;
}

.formats__stage-area {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  height: 100%;
  overflow: auto;
}

.formats__open {
  position: absolute;
  z-index: 4;
  top: 16px;
  right: 24px;
}

/* The pills sit in the stages' own container, centered with the screens,
 * and stay at the top of the scroll area while the stages scroll beneath. */
.formats__pills {
  position: sticky;
  top: 14px;
  width: fit-content;
  margin: 14px auto 0;
}

.formats__grid {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  align-items: flex-start;
  justify-content: center;
  gap: 36px 40px;
  width: 100%;
  margin: auto;
  padding: 36px 40px 44px;
}

.formats__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.formats__device {
  font-size: 12px;
  font-weight: 600;
  color: var(--px-text-muted);
}

.formats__panel {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: var(--b-spacer-070);
}

@media (max-width: 900px) {
  .formats__grid {
    padding-right: 16px;
    padding-left: 16px;
  }
}

@media (max-width: 760px) {
  .formats__grid {
    margin: 0;
  }
}
</style>
