<script setup lang="ts">
import { BentoCard } from '@adyen/bento-vue3';
import ScreenStage from './ScreenStage.vue';
import type { CompareVariant } from '../lib/compare';
import type { Screen } from '../types/flow';

defineProps<{
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
  <BentoCard
    class="screen-card"
    :class="{ 'screen-card--compare': Boolean(variants?.length) }"
    clickable
    @click="$emit('select')"
  >
    <template #content>
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
    </template>
  </BentoCard>
</template>

<style scoped>
/* Bento's card supplies the white surface and its outline; the rest is how
 * this card stacks a preview above its screen name. */
.screen-card {
  min-width: 0;
  text-align: center;
  transition: transform 120ms ease;
}

.screen-card:hover {
  transform: translateY(-2px);
}

.screen-card :deep(.b-card__content) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* Comparing groups one screen's versions into a single card, so each set
 * reads as one screen rather than a row of loose previews. The card spans
 * the row, so it stays put on hover. */
.screen-card--compare:hover {
  transform: none;
}

.screen-card--compare :deep(.b-card__content) {
  gap: 12px;
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
