<script setup lang="ts">
/**
 * PIconButton is a deliberately simple placeholder icon button. The label is
 * not drawn, it names the button for screen readers and on hover.
 *
 * It is part of the placeholder component layer in src/components/ui/. When the
 * internal component library is available, replace the internals while keeping
 * the prop API so app code does not need to change.
 */
import PIcon from './PIcon.vue';
import type { IconName } from '../../types/ui';

withDefaults(
  defineProps<{
    icon: IconName;
    label: string;
    variant?: 'plain' | 'outline';
    disabled?: boolean;
  }>(),
  { variant: 'outline', disabled: false },
);

defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="p-icon-button"
    :class="`p-icon-button--${variant}`"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <PIcon :name="icon" />
  </button>
</template>

<style scoped>
.p-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 8px;
  cursor: pointer;
  color: var(--px-text-muted);
  background: none;
  border: 1px solid transparent;
  transition:
    background 120ms ease,
    color 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease;
}

.p-icon-button--outline {
  background: var(--px-surface);
  border-color: var(--px-border-subtle);
  box-shadow: var(--px-shadow-sm);
}

.p-icon-button:not(:disabled):hover {
  color: var(--px-text);
  border-color: var(--px-border);
  background: var(--px-surface-muted);
}

.p-icon-button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
