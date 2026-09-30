<script setup lang="ts">
import { usePane } from '../lib/pane';
import { useAppState } from '../lib/state';
import ConfigColumn from './ConfigColumn.vue';
import InsightsColumn from './InsightsColumn.vue';
import ScreenStage from './ScreenStage.vue';
import ScreenStrip from './ScreenStrip.vue';
import PIconButton from './ui/PIconButton.vue';

/**
 * One configuration: its settings on the left, its screen in the middle with
 * the ways back and forward on either side, and its insights on the right.
 */
const props = defineProps<{
  paneIndex: number;
  /** Configuration name, empty when only one configuration is shown. */
  label: string;
}>();

const state = useAppState();
const { pane, flow, step, missingConfigParts, backChoices, forwardChoices } =
  usePane(() => props.paneIndex);

function goTo(stepId: string | undefined): void {
  if (stepId) pane.value.step = stepId;
}
</script>

<template>
  <div
    class="row"
    :class="{
      'row--config-collapsed': !state.configOpen,
      'row--insights-collapsed': !state.insightsOpen,
    }"
  >
    <div class="row__side" :class="{ 'row__side--rail': !state.configOpen }">
      <ConfigColumn
        v-if="state.configOpen"
        :pane-index="paneIndex"
        :label="label"
      />
      <PIconButton
        v-else-if="!state.compare || paneIndex === 0"
        icon="sliders"
        label="Show configuration"
        @click="state.configOpen = true"
      />
    </div>

    <!-- The hide buttons hover over the screens area, just past each panel's
         edge. -->
    <PIconButton
      v-if="state.configOpen && paneIndex === 0"
      class="row__hide row__hide--config"
      icon="chevron-left"
      label="Hide configuration"
      @click="state.configOpen = false"
    />

    <div v-if="flow && step && state.screenLayout === 'single'" class="row__screen">
      <div class="row__nav">
        <PIconButton
          v-if="backChoices.length === 0"
          icon="arrow-left"
          label="Back"
          :disabled="!backChoices.length"
          @click="goTo(backChoices[0]?.stepId)"
        />
        <div
          v-else-if="backChoices.length === 1"
          class="row__choice row__choice--back"
        >
          <PIconButton
            class="row__branch-button"
            icon="arrow-left"
            :label="`Back to ${backChoices[0]!.title}`"
            @click="goTo(backChoices[0]!.stepId)"
          />
          <span class="row__branch-label">{{ backChoices[0]!.title }}</span>
        </div>
        <div
          v-for="choice in backChoices.length > 1 ? backChoices : []"
          :key="choice.stepId"
          class="row__choice row__choice--back"
        >
          <PIconButton
            class="row__branch-button"
            icon="arrow-left"
            :label="`Back to ${choice.title}`"
            @click="goTo(choice.stepId)"
          />
          <span class="row__branch-label">{{ choice.title }}</span>
        </div>
        </div>
      <ScreenStage
        :flow-id="flow.id"
        :step-id="step.id"
        :step-title="step.title"
        :device-id="pane.config.device"
        :language="pane.config.language"
        :currency="pane.config.currency"
        :unsupported="missingConfigParts.includes('device')"
      />

      <div class="row__nav row__nav--forward">
        <div
          v-if="forwardChoices.length === 1"
          class="row__choice row__choice--forward"
        >
          <span class="row__branch-label">{{ forwardChoices[0]!.title }}</span>
          <PIconButton
            class="row__branch-button"
            icon="arrow-right"
            :label="`Go to ${forwardChoices[0]!.title}`"
            @click="goTo(forwardChoices[0]!.stepId)"
          />
        </div>
        <div
          v-for="choice in forwardChoices.length > 1 ? forwardChoices : []"
          :key="choice.stepId + (choice.label ?? '')"
          class="row__choice row__choice--forward"
        >
          <span class="row__branch-label">
            {{ choice.label }}
          </span>
          <PIconButton
            class="row__branch-button"
            icon="arrow-right"
            :label="`Go to ${choice.label ?? 'next screen'}`"
            @click="goTo(choice.stepId)"
          />
        </div>
      </div>
    </div>

    <ScreenStrip
      v-else-if="flow"
      class="row__screen row__screen--all"
      :pane-index="paneIndex"
    />

    <div
      class="row__side row__side--insights"
      :class="{ 'row__side--rail': !state.insightsOpen }"
    >
      <InsightsColumn v-if="state.insightsOpen" :pane-index="paneIndex" />
      <PIconButton
        v-else-if="!state.compare || paneIndex === 0"
        icon="chart"
        label="Show metrics and properties"
        @click="state.insightsOpen = true"
      />
    </div>

    <PIconButton
      v-if="state.insightsOpen && paneIndex === 0"
      class="row__hide row__hide--insights"
      icon="chevron-right"
      label="Hide metrics and properties"
      @click="state.insightsOpen = false"
    />
  </div>
</template>

<style scoped>
.row {
  --config-width: 350px;
  --insights-width: 350px;
  --config-rail-width: 48px;
  --insights-rail-width: 48px;
  --screen-strip-left-inset: calc(var(--config-width) + 40px);
  --screen-strip-right-inset: calc(var(--insights-width) + 40px);
  --screen-inset-left: calc(var(--config-width) + 24px);
  --screen-inset-right: calc(var(--insights-width) + 24px);
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 0;
  min-height: 0;
}

/* The side columns float on the page background: their sections carry
 * their own cards, nothing frames the column itself. */
.row__side {
  position: absolute;
  z-index: 3;
  isolation: isolate;
  top: 0;
  bottom: 0;
  left: 0;
  width: var(--config-width);
  overflow: hidden;
}

.row__side--insights {
  right: 0;
  left: auto;
  width: var(--insights-width);
}

/* Collapsed, the side is just its expand button floating on the page. */
.row__side--rail {
  width: var(--config-rail-width);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 20px;
  overflow: hidden;
}

.row--insights-collapsed .row__side--insights {
  width: var(--insights-rail-width);
}

/* The hide buttons float outside the panels, over the screens area, beside
 * each panel's near edge, level with the panel headers. They stay put while
 * the screens scroll beneath them. */
.row__hide {
  position: absolute;
  z-index: 4;
  top: 14px;
}

.row__hide--config {
  left: calc(var(--config-width) + 8px);
}

.row__hide--insights {
  right: calc(var(--insights-width) + 8px);
}

.row--config-collapsed {
  --screen-strip-left-inset: calc(var(--config-rail-width) + 24px);
  --screen-inset-left: calc(var(--config-rail-width) + 16px);
}

.row--insights-collapsed {
  --screen-strip-right-inset: calc(var(--insights-rail-width) + 24px);
  --screen-inset-right: calc(var(--insights-rail-width) + 16px);
}

.row__screen {
  flex: 1;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 28px var(--screen-inset-right) 32px var(--screen-inset-left);
  overflow: hidden;
  /* The screens sit on the palette's lightest grey; the side panels and
     the band all share it. */
  background: var(--px-surface-muted);
}

.row__screen--all {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 28px var(--screen-strip-right-inset) 24px
    var(--screen-strip-left-inset);
}

.row__nav {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  width: 148px;
  flex-shrink: 0;
}

.row__nav--forward {
  align-items: flex-end;
}

.row__choice {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 6px;
}

.row__choice--forward {
  justify-content: flex-end;
}

.row__branch-button {
  flex: 0 0 30px;
}

.row__branch-label {
  color: var(--px-text-muted);
  font-size: 12px;
  line-height: 1.35;
}

.row__choice--forward .row__branch-label {
  text-align: right;
}

@media (max-width: 1100px) and (min-width: 761px) {
  .row {
    --config-width: 236px;
    --insights-width: 264px;
  }

  .row__nav {
    width: 108px;
  }

  .row__screen {
    gap: 14px;
  }
}

@media (max-width: 760px) {
  .row {
    --config-width: min(220px, 78vw);
    --insights-width: min(240px, 82vw);
    display: flex;
    flex-wrap: wrap;
    min-height: 0;
  }

  .row__side {
    width: min(220px, 78vw);
    max-height: 100%;
  }

  .row__side--insights {
    width: min(240px, 82vw);
  }

  .row__side--rail {
    width: var(--config-rail-width);
  }

  .row--insights-collapsed .row__side--insights {
    width: var(--insights-rail-width);
  }

  .row__screen:not(.row__screen--all) {
    order: 2;
    flex-wrap: wrap;
    height: min(68vh, 560px);
    gap: 16px;
    padding: 24px 16px 28px;
  }

  .row__screen--all {
    display: flex;
    order: 2;
    height: min(68vh, 560px);
    padding: 28px var(--screen-strip-right-inset) 24px
      var(--screen-strip-left-inset);
  }

  .row__screen:not(.row__screen--all) .row__nav {
    width: calc(50% - 8px);
    order: 2;
  }

  .row__screen:not(.row__screen--all) .row__nav--forward {
    order: 3;
  }

  .row__screen:not(.row__screen--all) :deep(.stage) {
    order: 1;
    width: 100%;
  }
}
</style>
