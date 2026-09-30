<script setup lang="ts">
/**
 * PInput is a deliberately simple placeholder text input.
 *
 * It is part of the placeholder component layer in src/components/ui/. When
 * the internal component library is available, replace the internals while
 * keeping the prop API so app code does not need to change.
 */
withDefaults(
  defineProps<{
    label: string;
    modelValue: string;
    placeholder?: string;
    /** Hides the label visually while keeping it available to screen readers. */
    hideLabel?: boolean;
    /** Control type: plain text or a masked password field. */
    type?: 'text' | 'password';
  }>(),
  { placeholder: '', hideLabel: false, type: 'text' },
);

defineEmits<{
  'update:modelValue': [value: string];
  submit: [];
}>();
</script>

<template>
  <label class="p-input">
    <span class="p-input__label" :class="{ 'p-input__label--hidden': hideLabel }">
      {{ label }}
    </span>
    <input
      class="p-input__control"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      @input="
        $emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
      @keyup.enter="$emit('submit')"
    />
  </label>
</template>

<style scoped>
.p-input {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.p-input__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--px-text-muted);
}

.p-input__label--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.p-input__control {
  font: inherit;
  font-size: 13px;
  min-height: 36px;
  padding: 7px 10px;
  border: 1px solid var(--px-border-subtle);
  border-radius: 7px;
  background: var(--px-surface);
  color: var(--px-text);
  width: 100%;
  transition: border-color 120ms ease, box-shadow 120ms ease;
}

.p-input__control:hover {
  border-color: var(--px-border);
}

.p-input__control:focus-visible {
  border-color: var(--px-border);
  outline: var(--b-focus-ring-outline) solid var(--b-focus-ring-color);
  outline-offset: var(--b-focus-ring-spacer);
}
</style>
