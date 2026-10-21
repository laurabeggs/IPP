<script setup lang="ts">
/**
 * PIconButton is Bento's icon-only button. The label is not drawn, it names
 * the button for screen readers and on hover.
 */
import { BentoButton } from '@adyen/bento-vue3';
import PIcon from './PIcon.vue';
import type { IconName } from '../../types/ui';

const props = withDefaults(
  defineProps<{
    icon: IconName;
    label: string;
    /** Plain drops the border, for buttons sitting inside another surface. */
    variant?: 'plain' | 'outline';
    disabled?: boolean;
  }>(),
  { variant: 'outline', disabled: false },
);

defineEmits<{ click: [] }>();

const bentoVariant = props.variant === 'plain' ? 'tertiary' : 'secondary';
</script>

<template>
  <BentoButton
    class="p-icon-button"
    :variant="bentoVariant"
    condensed
    :disabled="disabled"
    :aria-label="label"
    :title="label"
    @click="$emit('click')"
  >
    <template #iconLeft>
      <PIcon :name="icon" />
    </template>
  </BentoButton>
</template>
