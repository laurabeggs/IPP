<script setup lang="ts">
/**
 * PButton is Bento's button behind the app's own prop names, so call sites
 * read the same as they did before the design system was adopted.
 */
import { BentoButton } from '@adyen/bento-vue3';

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    /** Compact is the default throughout the app; regular remains available. */
    size?: 'regular' | 'compact';
  }>(),
  { variant: 'secondary', disabled: false, size: 'compact' },
);

defineEmits<{ click: [] }>();
</script>

<template>
  <BentoButton
    class="p-button"
    :variant="variant"
    :disabled="disabled"
    :condensed="size === 'compact'"
    @click="$emit('click')"
  >
    <slot />
  </BentoButton>
</template>
