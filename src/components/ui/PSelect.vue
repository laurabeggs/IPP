<script setup lang="ts">
/**
 * PSelect is a deliberately simple placeholder select.
 *
 * It is part of the placeholder component layer in src/components/ui/. When
 * the internal component library is available, replace the internals while
 * keeping the prop API so app code does not need to change.
 */
import type { SelectOption } from '../../types/ui';

withDefaults(
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
    /** Compact pills, for controls floating over content. */
    size?: 'regular' | 'compact';
  }>(),
  { placeholder: '', disabled: false, hideLabel: false, size: 'regular' },
);

defineEmits<{ 'update:modelValue': [value: string] }>();
</script>

<template>
  <label
    class="p-select"
    :class="{ 'p-select--compact': size === 'compact' }"
  >
    <span class="p-select__label" :class="{ 'p-select__label--hidden': hideLabel }">
      {{ label }}
    </span>
    <span class="p-select__shell">
      <select
        class="p-select__control"
        :value="modelValue"
        :disabled="disabled"
        @change="
          $emit('update:modelValue', ($event.target as HTMLSelectElement).value)
        "
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </span>
  </label>
</template>

<style scoped>
.p-select {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.p-select__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--px-text-muted);
}

.p-select__label--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* The native arrow hugs the control's right edge, so it is replaced by this
 * chevron, which keeps the same distance from the right edge as from the
 * top and bottom. The inset follows the control's height: 12px for the
 * regular 36px, overridable for shorter controls. */
.p-select__shell {
  position: relative;
  display: flex;
  min-width: 0;
}

.p-select__shell::after {
  --p-select-chevron: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23000' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m4 8 6 6 6-6'/%3E%3C/svg%3E");
  content: '';
  position: absolute;
  top: 50%;
  right: var(--p-select-chevron-inset, 12px);
  width: 12px;
  height: 12px;
  transform: translateY(-50%);
  pointer-events: none;
  background-color: var(--px-text-muted);
  -webkit-mask: var(--p-select-chevron) no-repeat center / contain;
  mask: var(--p-select-chevron) no-repeat center / contain;
}

.p-select__control {
  font: inherit;
  font-size: 13px;
  width: 100%;
  min-height: 36px;
  padding: 7px 30px;
  border: 1px solid var(--px-border-subtle);
  border-radius: 7px;
  background: var(--px-surface);
  color: var(--px-text);
  appearance: none;
  -webkit-appearance: none;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.p-select__control:hover {
  border-color: var(--px-border);
}

.p-select__control:focus-visible {
  border-color: var(--px-border);
  outline: var(--b-focus-ring-outline) solid var(--b-focus-ring-color);
  outline-offset: var(--b-focus-ring-spacer);
}

.p-select__control:disabled {
  background: var(--px-surface-muted);
  color: var(--px-text-muted);
}

.p-select--compact .p-select__shell::after {
  --p-select-chevron-inset: 9px;
}

.p-select--compact .p-select__control {
  min-height: 30px;
  padding: 4px 28px 4px 12px;
  font-size: 12px;
  border-radius: 999px;
}
</style>
