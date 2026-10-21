<script setup lang="ts">
/**
 * PMultiSelect is Bento's multi-select dropdown behind the app's own prop
 * names. Bento applies each choice as it is made, so there is no Apply step.
 */
import { BentoDropdown } from '@adyen/bento-vue3';
import type { SelectOption } from '../../types/ui';

withDefaults(
  defineProps<{
    label: string;
    modelValue: string[];
    options: SelectOption[];
    placeholder?: string;
    hideLabel?: boolean;
    /** Compact is the default throughout the app; regular remains available. */
    size?: 'regular' | 'compact';
  }>(),
  { placeholder: 'Any', hideLabel: false, size: 'compact' },
);

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();

function onUpdate(value: unknown): void {
  emit('update:modelValue', Array.isArray(value) ? value.map(String) : []);
}
</script>

<template>
  <BentoDropdown
    class="p-multi-select"
    multiple
    :items="options"
    :model-value="modelValue"
    :label="hideLabel ? undefined : label"
    :aria-label="label"
    :placeholder="placeholder"
    :condensed="size === 'compact'"
    @update:model-value="onUpdate"
  />
</template>
