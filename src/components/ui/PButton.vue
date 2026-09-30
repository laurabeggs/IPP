<script setup lang="ts">
/**
 * PButton is a deliberately simple placeholder button.
 *
 * It is part of the placeholder component layer in src/components/ui/. When
 * the internal component library is available, replace the internals while
 * keeping the prop API so app code does not need to change.
 */
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
  }>(),
  { variant: 'secondary', disabled: false },
);

defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="p-button"
    :class="`p-button--${variant}`"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<style scoped>
.p-button {
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  min-height: 36px;
  border-radius: 7px;
  padding: 8px 14px;
  cursor: pointer;
  border: 1px solid var(--px-border-subtle);
  transition: background 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.p-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.p-button--primary {
  background: var(--px-accent);
  color: var(--b-color-label-on-color);
  border-color: var(--px-accent);
}

.p-button--primary:not(:disabled):hover {
  background: var(--b-color-link-primary-hover);
}

.p-button--secondary {
  background: var(--px-surface);
  border-color: var(--px-border-subtle);
  color: var(--px-text);
}

.p-button--secondary:not(:disabled):hover {
  border-color: var(--px-border);
  box-shadow: var(--px-shadow-sm);
}
</style>
