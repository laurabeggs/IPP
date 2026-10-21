<script setup lang="ts">
/**
 * A block of a panel. On its own it is a Bento card; inside an
 * inspector, where dividers already separate the blocks, it is a plain
 * titled section. Both draw the same content wrapper, so the panels style
 * their insides the same way either way.
 */
import { BentoCard } from '@adyen/bento-vue3';

withDefaults(
  defineProps<{
    title?: string;
    /** 'section' for blocks that sit between an inspector's dividers. */
    variant?: 'card' | 'section';
  }>(),
  { variant: 'card' },
);
</script>

<template>
  <BentoCard
    v-if="variant === 'card'"
    class="p-section p-section--card"
    title-size="small"
  >
    {{ title }}
    <template v-if="$slots.header" #header><slot name="header" /></template>
    <template #content>
      <div class="p-section__content"><slot /></div>
    </template>
  </BentoCard>

  <section v-else class="p-section p-section--plain">
    <header v-if="title || $slots.header" class="p-section__header">
      <h3 v-if="title" class="p-section__title">{{ title }}</h3>
      <slot name="header" />
    </header>
    <div class="p-section__content"><slot /></div>
  </section>
</template>

<style scoped>
.p-section--plain {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* The plain section's title matches Bento's small card title, so a section
 * and a card read the same when they sit next to each other. */
.p-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 26px;
}

.p-section__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--px-text);
}
</style>
