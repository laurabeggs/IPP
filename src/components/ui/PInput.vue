<script setup lang="ts">
/**
 * PInput is Bento's input field behind the app's own prop names.
 */
import { BentoInputField } from '@adyen/bento-vue3';

withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    placeholder?: string;
    /** Hides the label visually while keeping it available to screen readers. */
    hideLabel?: boolean;
    /** Control type: plain text or a masked password field. */
    type?: 'text' | 'password';
    /** Compact is the default throughout the app; regular remains available. */
    size?: 'regular' | 'compact';
  }>(),
  { placeholder: '', hideLabel: false, type: 'text', size: 'compact' },
);

defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();
</script>

<template>
  <BentoInputField
    class="p-input"
    :model-value="modelValue"
    :type="type"
    :label="hideLabel ? undefined : label"
    :aria-label="label"
    :placeholder="placeholder"
    :condensed="size === 'compact'"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
    @keyup.enter="$emit('submit')"
  />
</template>
