<script setup lang="ts">
/**
 * PToggle is a deliberately simple placeholder switch.
 *
 * It is part of the placeholder component layer in src/components/ui/. When the
 * internal component library is available, replace the internals while keeping
 * the prop API so app code does not need to change.
 */
defineProps<{
  label: string;
  modelValue: boolean;
}>();

defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <label class="p-toggle">
    <input
      class="p-toggle__input"
      type="checkbox"
      role="switch"
      :checked="modelValue"
      @change="
        $emit('update:modelValue', ($event.target as HTMLInputElement).checked)
      "
    />
    <span class="p-toggle__track" aria-hidden="true">
      <span class="p-toggle__knob" />
    </span>
    <span class="p-toggle__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.p-toggle {
  display: flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
}

.p-toggle__input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  margin: 0;
}

.p-toggle__track {
  position: relative;
  flex-shrink: 0;
  width: 30px;
  height: 18px;
  border-radius: 999px;
  background: var(--px-border);
  transition: background 120ms ease;
}

.p-toggle__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--px-surface);
  box-shadow: 0 1px 2px rgba(31, 42, 55, 0.3);
  transition: transform 120ms ease;
}

.p-toggle__input:checked + .p-toggle__track {
  background: var(--px-accent);
}

.p-toggle__input:checked + .p-toggle__track .p-toggle__knob {
  transform: translateX(12px);
}

.p-toggle__input:focus-visible + .p-toggle__track {
  outline: var(--b-focus-ring-outline) solid var(--b-focus-ring-color);
  outline-offset: var(--b-focus-ring-spacer);
}

.p-toggle__label {
  font-size: 13px;
}
</style>
