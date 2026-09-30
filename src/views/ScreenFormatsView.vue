<script setup lang="ts">
import { computed } from 'vue';
import { devices } from '../data/catalog';
import { compareVariants } from '../lib/compare';
import { useAppState } from '../lib/state';
import DisplayPills from '../components/DisplayPills.vue';
import ScreenDetailsPanel from '../components/ScreenDetailsPanel.vue';
import ScreenStage from '../components/ScreenStage.vue';
import type { CompareVariant } from '../lib/compare';
import type { Screen } from '../types/flow';

/**
 * One screen from the library, shown for the selected device, or one
 * preview per compared value, with its properties and metrics to the right.
 */
const props = defineProps<{ screen: Screen }>();

const state = useAppState();

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
    <div class="formats__content">
      <div class="formats__stage-area">
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

      <aside class="formats__panel">
        <header class="formats__panel-header">
          <span class="formats__panel-title">{{ screen.step.title }}</span>
        </header>
        <div class="formats__panel-body">
          <ScreenDetailsPanel :screen="screen" :range="state.range" />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.formats {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background: var(--px-surface);
}

.formats__content {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

.formats__stage-area {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: auto;
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

/* The panel floats on the page background: the header sits directly on it
 * and the sections carry their own glass containers. */
.formats__panel {
  display: flex;
  flex-direction: column;
  flex: 0 0 350px;
  min-height: 0;
}

.formats__panel-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-height: 44px;
  padding: 14px 16px 0;
  box-sizing: border-box;
}

.formats__panel-title {
  overflow: hidden;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--px-text);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.formats__panel-body {
  min-height: 0;
  overflow-y: auto;
  padding: 8px 16px 24px;
}

@media (max-width: 900px) {
  .formats__grid {
    padding-right: 16px;
    padding-left: 16px;
  }
}

@media (max-width: 760px) {
  .formats__content {
    flex-direction: column;
  }

  .formats__stage-area {
    flex: 0 0 auto;
    overflow: visible;
  }

  .formats__grid {
    margin: 0;
  }

  .formats__panel {
    flex: 0 0 auto;
    border-top: 1px solid var(--px-border-subtle);
  }

  .formats__panel-body {
    overflow: visible;
  }
}
</style>
