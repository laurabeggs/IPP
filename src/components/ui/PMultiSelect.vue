<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import PButton from './PButton.vue';
import PIcon from './PIcon.vue';
import type { SelectOption } from '../../types/ui';

const props = withDefaults(
  defineProps<{
    label: string;
    modelValue: string[];
    options: SelectOption[];
    placeholder?: string;
    hideLabel?: boolean;
    /** Compact pills, for controls floating over content. */
    size?: 'regular' | 'compact';
  }>(),
  { placeholder: 'Any', hideLabel: false, size: 'regular' },
);

const emit = defineEmits<{
  'update:modelValue': [value: string[]];
}>();

const root = ref<HTMLElement | null>(null);
const open = ref(false);
/** The selection being edited in the menu, committed to the model by Apply. */
const pending = ref<string[]>([]);

const summary = computed(() => {
  if (!props.modelValue.length) return props.placeholder;
  if (props.modelValue.length === 1) {
    return (
      props.options.find((option) => option.value === props.modelValue[0])?.label ??
      props.modelValue[0]
    );
  }
  return `${props.modelValue.length} selected`;
});

/** True once the menu selection differs from the committed model. */
const hasChanges = computed(
  () =>
    pending.value.length !== props.modelValue.length ||
    pending.value.some((value) => !props.modelValue.includes(value)),
);

function isSelected(value: string): boolean {
  return pending.value.includes(value);
}

function toggleMenu(): void {
  if (open.value) {
    open.value = false;
    return;
  }
  pending.value = [...props.modelValue];
  open.value = true;
}

function toggle(value: string): void {
  pending.value = isSelected(value)
    ? pending.value.filter((selected) => selected !== value)
    : [...pending.value, value];
}

function apply(): void {
  emit('update:modelValue', pending.value);
  open.value = false;
}

/** Closes the menu when a press lands outside this component. */
function onPointerDownOutside(event: PointerEvent): void {
  if (!open.value) return;
  if (root.value?.contains(event.target as Node)) return;
  open.value = false;
}

onMounted(() => document.addEventListener('pointerdown', onPointerDownOutside));
onBeforeUnmount(() =>
  document.removeEventListener('pointerdown', onPointerDownOutside),
);
</script>

<template>
  <div
    ref="root"
    class="p-multi-select"
    :class="{ 'p-multi-select--compact': size === 'compact' }"
  >
    <span
      class="p-multi-select__label"
      :class="{ 'p-multi-select__label--hidden': hideLabel }"
    >
      {{ label }}
    </span>
    <button
      type="button"
      class="p-multi-select__control"
      :aria-label="label"
      :aria-expanded="open"
      @click="toggleMenu"
      @keydown.esc="open = false"
    >
      <span class="p-multi-select__summary">{{ summary }}</span>
      <PIcon name="chevron-down" />
    </button>
    <div
      v-if="open"
      class="p-multi-select__menu"
      role="group"
      :aria-label="label"
      @click.stop
    >
      <div class="p-multi-select__options">
        <label
          v-for="option in options"
          :key="option.value"
          class="p-multi-select__option"
        >
          <input
            type="checkbox"
            :checked="isSelected(option.value)"
            @change="toggle(option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
      </div>
      <footer class="p-multi-select__footer">
        <PButton
          class="p-multi-select__apply"
          :disabled="!hasChanges"
          @click="apply"
        >
          Apply
        </PButton>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.p-multi-select {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.p-multi-select__label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--px-text-muted);
}

.p-multi-select__label--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.p-multi-select__control {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 132px;
  min-height: 36px;
  padding: 7px 10px;
  font: inherit;
  font-size: 13px;
  text-align: left;
  color: var(--px-text);
  background: var(--px-surface);
  border: 1px solid var(--px-border-subtle);
  border-radius: 7px;
  cursor: pointer;
}

.p-multi-select__control:hover {
  border-color: var(--px-border);
}

.p-multi-select__control:focus-visible {
  border-color: var(--px-border);
  outline: var(--b-focus-ring-outline) solid var(--b-focus-ring-color);
  outline-offset: var(--b-focus-ring-spacer);
}

.p-multi-select__summary {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.p-multi-select__control :deep(.p-icon) {
  width: 14px;
  height: 14px;
}

.p-multi-select__menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 12;
  display: flex;
  flex-direction: column;
  min-width: max(200px, 100%);
  background: var(--px-surface);
  border: 1px solid var(--px-border-subtle);
  border-radius: 8px;
  box-shadow: var(--px-shadow-sm);
}

.p-multi-select__options {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 260px;
  overflow-y: auto;
  padding: 6px;
}

.p-multi-select__footer {
  display: flex;
  justify-content: flex-end;
  padding: 8px 6px;
  border-top: 1px solid var(--px-border-subtle);
}

.p-multi-select__footer .p-multi-select__apply {
  min-height: 30px;
  padding: 5px 12px;
  font-size: 12px;
}

.p-multi-select__option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 6px;
  font-size: 12px;
  color: var(--px-text);
  border-radius: 5px;
  cursor: pointer;
}

.p-multi-select__option:hover {
  background: var(--px-surface-muted);
}

.p-multi-select__option input {
  margin: 0;
  accent-color: var(--px-accent);
}

.p-multi-select--compact .p-multi-select__control {
  min-height: 30px;
  min-width: 110px;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 999px;
}
</style>
