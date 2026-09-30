<script setup lang="ts">
/**
 * PPanel is a deliberately simple placeholder surface/panel.
 *
 * It is part of the placeholder component layer in src/components/ui/. When
 * the internal component library is available, replace the internals while
 * keeping the slot API so app code does not need to change.
 */
</script>

<template>
  <section class="p-panel">
    <slot />
  </section>
</template>

<style scoped>
.p-panel {
  background: var(--px-surface);
  border: 1px solid var(--px-border);
  border-radius: var(--px-radius);
}
</style>
