<script setup lang="ts">
/**
 * PPanel is Bento's card used as a plain surface: the content slot carries
 * the whole panel, so nothing is rendered as a card title.
 */
import { BentoCard } from '@adyen/bento-vue3';
</script>

<template>
  <BentoCard class="p-panel">
    <template #content>
      <slot />
    </template>
  </BentoCard>
</template>
