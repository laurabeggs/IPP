<script setup lang="ts">
/**
 * PTag is a deliberately simple placeholder tag/label.
 *
 * It is part of the placeholder component layer in src/components/ui/. When
 * the internal component library is available, replace the internals while
 * keeping the prop API so app code does not need to change.
 */
withDefaults(
  defineProps<{
    label: string;
    tone?: 'neutral' | 'accent';
  }>(),
  { tone: 'neutral' },
);
</script>

<template>
  <span class="p-tag" :class="`p-tag--${tone}`">{{ label }}</span>
</template>

<style scoped>
.p-tag {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.p-tag--neutral {
  background: var(--px-bg);
  color: var(--px-text-muted);
}

.p-tag--accent {
  background: var(--b-color-background-success-weak);
  color: var(--b-color-label-on-background-success-weak);
}
</style>
