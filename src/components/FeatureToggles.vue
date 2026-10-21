<script setup lang="ts">
import { computed } from 'vue';
import { featuresForFlow } from '../lib/features';
import { setFeatureEnabled, setFeatureOption, useAppState } from '../lib/state';
import PSection from './ui/PSection.vue';
import PSelect from './ui/PSelect.vue';
import PToggle from './ui/PToggle.vue';
import type { Feature } from '../types/flow';

/**
 * The feature switches for one configuration. Only features that can insert
 * screens into the flow on screen are listed.
 */
const props = withDefaults(
  defineProps<{
    paneIndex: number;
    /** 'section' inside an inspector, where dividers separate the blocks. */
    variant?: 'card' | 'section';
  }>(),
  { variant: 'card' },
);

const state = useAppState();
const pane = computed(() => state.panes[props.paneIndex]!);
const applicable = computed(() => featuresForFlow(state.flow));

const isEnabled = (feature: Feature) =>
  pane.value.features[feature.id] !== undefined;

const selectedOption = (feature: Feature) =>
  pane.value.features[feature.id] ?? feature.defaultOptionId;

const optionsFor = (feature: Feature) =>
  feature.options.map((option) => ({ value: option.id, label: option.label }));
</script>

<template>
  <PSection
    v-if="applicable.length"
    class="features"
    title="Features"
    :variant="variant"
  >
    <div v-for="feature in applicable" :key="feature.id" class="features__item">
      <PToggle
        class="features__toggle"
        :label="feature.name"
        :model-value="isEnabled(feature)"
        @update:model-value="setFeatureEnabled(state, pane, feature.id, $event)"
      />
      <PSelect
        v-if="isEnabled(feature) && feature.options.length > 1"
        class="features__option"
        label="Option"
        hide-label
        :model-value="selectedOption(feature)"
        :options="optionsFor(feature)"
        @update:model-value="setFeatureOption(state, pane, feature.id, $event)"
      />
    </div>
  </PSection>
</template>

<style scoped>
.features :deep(.p-section__content) {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.features__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Bento draws the label before the switch, so the row only needs to push
 * them to opposite edges. */
.features__toggle {
  width: 100%;
  justify-content: space-between;
}

.features__option {
  width: 100%;
}
</style>
