<script setup lang="ts">
/**
 * PSelect is Bento's single-select dropdown behind the app's own prop names.
 */
import { computed } from 'vue';
import { BentoDropdown } from '@adyen/bento-vue3';
import type { SelectOption } from '../../types/ui';

const props = withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    options: SelectOption[];
    /** Shown as the first option when an empty value is allowed. */
    placeholder?: string;
    /** Greys the control out, for options that need something else first. */
    disabled?: boolean;
    /** Keeps the label for screen readers without drawing it. */
    hideLabel?: boolean;
    /** Compact is the default throughout the app; regular remains available. */
    size?: 'regular' | 'compact';
  }>(),
  { placeholder: '', disabled: false, hideLabel: false, size: 'compact' },
);

defineEmits<{ 'update:modelValue': [value: string] }>();

// The empty value stays selectable, so choosing it clears the setting the
// same way the placeholder option used to.
const items = computed(() =>
  props.placeholder
    ? [{ value: '', label: props.placeholder }, ...props.options]
    : props.options,
);
</script>

<template>
  <BentoDropdown
    class="p-select"
    :items="items"
    :model-value="modelValue"
    :label="hideLabel ? undefined : label"
    :aria-label="label"
    :placeholder="placeholder"
    :disabled="disabled"
    :condensed="size === 'compact'"
    @update:model-value="$emit('update:modelValue', String($event ?? ''))"
  />
</template>
