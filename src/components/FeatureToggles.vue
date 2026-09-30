<script setup lang="ts">
import { computed } from 'vue';
import { featuresForFlow } from '../lib/features';
import { setFeatureEnabled, setFeatureOption, useAppState } from '../lib/state';
import PSelect from './ui/PSelect.vue';
import PToggle from './ui/PToggle.vue';
import type { Feature } from '../types/flow';

/**
 * The feature switches for one configuration. Only features that can insert
 * screens into the flow on screen are listed.
 */
const props = defineProps<{ paneIndex: number }>();

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
  <div v-if="applicable.length" class="features px-glass-card">
    <h3 class="features__title">Features</h3>
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
  </div>
</template>

<style scoped>
.features {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.features__title {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--px-text-muted);
}

.features__item {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.features__toggle {
  width: 100%;
  justify-content: space-between;
}

.features__toggle :deep(.p-toggle__label) {
  order: 1;
}

.features__toggle :deep(.p-toggle__track) {
  order: 2;
}

.features__option {
  width: 100%;
}
</style>
