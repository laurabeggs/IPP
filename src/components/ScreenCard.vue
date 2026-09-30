<script setup lang="ts">
import { computed } from 'vue';
import ScreenStage from './ScreenStage.vue';
import type { CompareVariant } from '../lib/compare';
import type { Screen } from '../types/flow';

const props = defineProps<{
  screen: Screen;
  deviceId: string;
  /** Language and currency the screen preview renders with. */
  language: string;
  currency: string;
  /** Side-by-side previews from the library comparison. */
  variants?: CompareVariant[];
}>();

defineEmits<{ select: [] }>();
</script>

<template>
  <button
    type="button"
    class="screen-card"
    :class="{ 'screen-card--compare': Boolean(variants?.length) }"
    @click="$emit('select')"
  >
    <div v-if="variants && variants.length" class="screen-card__compare">
      <div
        v-for="variant in variants"
        :key="`${variant.device}--${variant.language}--${variant.label}`"
        class="screen-card__compare-item"
      >
        <ScreenStage
          :flow-id="screen.flowId"
          :step-id="screen.step.id"
          :step-title="screen.step.title"
          :device-id="variant.device"
          :language="variant.language"
          :currency="variant.currency"
          size="compact"
        />
        <span class="screen-card__compare-label">{{ variant.label }}</span>
      </div>
    </div>
    <ScreenStage
      v-else
      :flow-id="screen.flowId"
      :step-id="screen.step.id"
      :step-title="screen.step.title"
      :device-id="deviceId"
      :language="language"
      :currency="currency"
      size="compact"
    />
    <span class="screen-card__title">{{ screen.step.title }}</span>
  </button>
</template>

<style scoped>
/* Every screen sits in its own white card on the grey page. */
.screen-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 14px 8px 18px;
  background: var(--px-surface);
  border: 1px solid var(--px-border-subtle);
  border-radius: 10px;
  cursor: pointer;
  font: inherit;
  text-align: center;
  transition: border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
}

.screen-card:hover {
  border-color: var(--px-border);
  box-shadow: var(--px-shadow-sm);
  transform: translateY(-2px);
}

.screen-card:focus-visible {
  border-color: var(--px-border);
  outline: var(--b-focus-ring-outline) solid var(--b-focus-ring-color);
  outline-offset: var(--b-focus-ring-spacer);
}

/* Comparing groups one screen's versions into a single card, so each set
 * reads as one screen rather than a row of loose previews. The card spans
 * the row, so it stays put on hover. */
.screen-card--compare {
  gap: 12px;
  padding: 20px 24px 22px;
}

.screen-card--compare:hover {
  transform: none;
}

.screen-card__title {
  max-width: 100%;
  overflow: hidden;
  font-size: 14px;
  font-weight: 700;
  margin-top: 4px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.screen-card__shown {
  font-size: 12px;
  color: var(--px-text-muted);
}

/* The previews keep their own size instead of stretching to fill the row,
 * so the space between them stays at the 24px gap however many there are. */
.screen-card__compare {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  width: 100%;
}

.screen-card__compare-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 0 auto;
}

.screen-card__compare-label {
  max-width: 100%;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  color: var(--px-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
