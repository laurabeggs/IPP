<script setup lang="ts">
/**
 * PTag is Bento's tag behind the app's own prop names.
 */
import { BentoTag } from '@adyen/bento-vue3';

withDefaults(
  defineProps<{
    label: string;
    tone?: 'neutral' | 'accent';
  }>(),
  { tone: 'neutral' },
);
</script>

<template>
  <BentoTag
    class="p-tag"
    :label="label"
    :variant="tone === 'accent' ? 'green' : 'grey'"
  />
</template>
