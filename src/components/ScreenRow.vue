<script setup lang="ts">
import { computed, ref } from 'vue';
import { BentoInspector } from '@adyen/bento-vue3';
import { usePane } from '../lib/pane';
import { useAppState } from '../lib/state';
import ConfigColumn from './ConfigColumn.vue';
import InsightsColumn from './InsightsColumn.vue';
import ScreenStage from './ScreenStage.vue';
import ScreenStrip from './ScreenStrip.vue';
import PIconButton from './ui/PIconButton.vue';

/**
 * One configuration: its settings in an inspector on the left, its screen in
 * the middle with the ways back and forward on either side, and its insights
 * in an inspector on the right. Closing an inspector leaves the button that
 * opens it again floating over the screens.
 */
const props = defineProps<{
  paneIndex: number;
  /** Configuration name, empty when only one configuration is shown. */
  label: string;
}>();

const state = useAppState();
const { pane, flow, step, missingConfigParts, backChoices, forwardChoices } =
  usePane(() => props.paneIndex);

const isFirst = computed(() => props.paneIndex === 0);
/** Only the first row carries the buttons that open the panels again. */
const ownsPanelButtons = computed(() => isFirst.value);

const configTitle = computed(() =>
  isFirst.value ? 'Configuration' : props.label,
);
const insightsTitle = computed(() => {
  const title = step.value?.title ?? 'Properties & metrics';
  return state.compare && !isFirst.value ? `${title} · ${props.label}` : title;
});

// The inspector needs a page id for the screen reader, and asks to be told
// when it leaves the page. Focus goes back to the screens, which stay put
// whether the panels are open or closed.
const configPage = ref<string | undefined>(`config-${props.paneIndex}`);
const insightsPage = ref<string | undefined>(`insights-${props.paneIndex}`);
const screens = ref<HTMLElement>();
const focusAnchor = computed(() => screens.value ?? undefined);

function setConfigOpen(open: boolean): void {
  state.configOpen = open;
  if (open) configPage.value = `config-${props.paneIndex}`;
}

function setInsightsOpen(open: boolean): void {
  state.insightsOpen = open;
  if (open) insightsPage.value = `insights-${props.paneIndex}`;
}

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
    <BentoInspector
      class="row__inspector row__inspector--config"
      size="small"
      relative-layout="overlay-content"
      :title="configTitle"
      :is-open="state.configOpen"
      :active-page="configPage"
      :page-focus-anchor="focusAnchor"
      @update:is-open="setConfigOpen"
      @update:active-page="configPage = $event"
    >
      <template #page>
        <BentoInspector
          class="row__inspector row__inspector--insights properties-inspector properties-inspector--library-link"
          size="small"
          relative-layout="overlay-content"
          :title="insightsTitle"
          :is-open="state.insightsOpen"
          :active-page="insightsPage"
          :page-focus-anchor="focusAnchor"
          @update:is-open="setInsightsOpen"
          @update:active-page="insightsPage = $event"
        >
          <template #page>
            <div ref="screens" class="row__page">
              <!-- With a panel closed, its button floats over the screens at
                   the edge the panel comes back from. -->
              <PIconButton
                v-if="ownsPanelButtons && !state.configOpen"
                class="row__open row__open--config"
                icon="sliders"
                label="Open configuration"
                @click="setConfigOpen(true)"
              />
              <PIconButton
                v-if="ownsPanelButtons && !state.insightsOpen"
                class="row__open row__open--insights"
                icon="chart"
                label="Open metrics and properties"
                @click="setInsightsOpen(true)"
              />

              <div
                v-if="flow && step && state.screenLayout === 'single'"
                class="row__screen"
              >
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
                    <span class="row__branch-label">
                      {{ backChoices[0]!.title }}
                    </span>
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
                    <span class="row__branch-label">
                      {{ forwardChoices[0]!.title }}
                    </span>
                    <PIconButton
                      class="row__branch-button"
                      icon="arrow-right"
                      :label="`Go to ${forwardChoices[0]!.title}`"
                      @click="goTo(forwardChoices[0]!.stepId)"
                    />
                  </div>
                  <div
                    v-for="choice in
                    forwardChoices.length > 1 ? forwardChoices : []"
                    :key="choice.stepId + (choice.label ?? '')"
                    class="row__choice row__choice--forward"
                  >
                    <span class="row__branch-label">{{ choice.label }}</span>
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
            </div>
          </template>

          <template #content>
            <InsightsColumn :pane-index="paneIndex" />
          </template>
        </BentoInspector>
      </template>

      <template #content>
        <ConfigColumn :pane-index="paneIndex" />
      </template>
    </BentoInspector>
  </div>
</template>

<style scoped>
.row {
  --panel-width: var(--px-panel-width);
  --insights-panel-width: var(--px-panel-width);
  --panel-button-inset: var(--px-panel-button-inset);
  --screen-strip-left-inset: calc(var(--panel-width) + 40px);
  --screen-strip-right-inset: calc(var(--insights-panel-width) + 40px);
  --screen-inset-left: calc(var(--panel-width) + 24px);
  --screen-inset-right: calc(var(--insights-panel-width) + 24px);
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 0;
}

/* Closed, a panel leaves the screens the whole row: only its button stays,
 * floating in the corner it comes back from. */
.row--config-collapsed {
  --screen-strip-left-inset: var(--panel-button-inset);
  --screen-inset-left: var(--panel-button-inset);
}

.row--insights-collapsed {
  --screen-strip-right-inset: var(--panel-button-inset);
  --screen-inset-right: var(--panel-button-inset);
}

.row__inspector {
  flex: 1 1 auto;
  min-width: 0;
}

/* The inspector's own scrolling would fight the screens' and the panels',
 * which both scroll on their own. */
.row__inspector :deep(.b-inspector__page-wrapper) {
  overflow: hidden;
}

/* The panels scroll their own sections, so the inspector's boxes have to be
 * allowed to shrink to the height it gives them. Bento only gives its focus
 * trap a height when the inspector has pages, and without one the panel
 * below it grows past the bottom of the row. */
.row__inspector :deep(.b-inspector__focus-trap) {
  height: 100%;
}

.row__inspector :deep(.b-inspector__container),
.row__inspector :deep(.b-inspector__content) {
  min-height: 0;
  overflow: hidden;
}

.row__inspector--insights {
  --panel-width: var(--insights-panel-width);
}

/* Both panels are narrower than Bento's 420px small inspector. Compact
 * inspectors keep Bento's full-row width. */
.row__inspector.b-inspector--small:not(.b-inspector--is-compact)
  :deep(.b-inspector__container-wrapper) {
  width: var(--panel-width);
}

.row__inspector.b-inspector--small:not(.b-inspector--is-compact)
  :deep(.b-inspector__container) {
  width: calc(var(--panel-width) - 1px);
}

.row__inspector.b-inspector--small:not(.b-inspector--is-compact)
  :deep(.b-inspector__animation-enter-active) {
  animation-name: row-inspector-expand;
}

.row__inspector.b-inspector--small:not(.b-inspector--is-compact)
  :deep(.b-inspector__animation-leave-active) {
  animation-name: row-inspector-shrink;
}

@keyframes row-inspector-expand {
  from {
    width: 0;
  }
  to {
    width: var(--panel-width);
  }
}

@keyframes row-inspector-shrink {
  from {
    width: var(--panel-width);
  }
  to {
    width: 0;
  }
}

/* Bento only opens an inspector on the right; the configuration belongs on
 * the left, so this one is turned around, border and all. The insights
 * inspector sits inside this one's page, so only its own panel is turned. */
.row__inspector--config.b-inspector--overlay-content
  > :deep(.b-inspector__container-wrapper) {
  right: auto;
  left: 0;
  border-right: 1px solid var(--b-color-separator-secondary);
  border-left: 0;
}

.row__page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

/* The buttons that bring a panel back float over the screens, level with the
 * panel headers, and stay put while the screens scroll beneath them. */
.row__open {
  position: absolute;
  z-index: 4;
  top: 14px;
}

.row__open--config {
  left: 12px;
}

.row__open--insights {
  right: 12px;
}

.row__screen {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 28px var(--screen-inset-right) 32px var(--screen-inset-left);
  overflow: hidden;
  /* The screens sit on the palette's lightest grey; the panels and the band
     all share it. */
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

@media (max-width: 1240px) and (min-width: 761px) {
  .row__nav {
    width: 108px;
  }

  .row__screen {
    gap: 14px;
  }
}

/* Below its compact threshold Bento gives the inspector the whole row, so
 * the screens only have to keep room for the buttons. */
@media (max-width: 760px) {
  .row {
    --screen-inset-left: var(--panel-button-inset);
    --screen-inset-right: var(--panel-button-inset);
    --screen-strip-left-inset: var(--panel-button-inset);
    --screen-strip-right-inset: var(--panel-button-inset);
    flex-wrap: wrap;
    min-height: 0;
  }

  .row__screen:not(.row__screen--all) {
    flex-wrap: wrap;
    height: min(68vh, 560px);
    gap: 16px;
    padding: 24px 16px 28px;
  }

  .row__screen--all {
    height: min(68vh, 560px);
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
