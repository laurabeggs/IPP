<script setup lang="ts">
/**
 * PIcon is the deliberately small placeholder icon set.
 *
 * It is part of the placeholder component layer in src/components/ui/. When the
 * internal component library is available, map these names onto its icons and
 * keep the prop API so app code does not need to change.
 */
import type { IconName } from '../../types/ui';

defineProps<{ name: IconName }>();
</script>

<template>
  <svg
    class="p-icon"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'menu'">
      <path d="M3 5h14M3 10h14M3 15h14" />
    </template>
    <template v-else-if="name === 'sliders'">
      <path d="M3 6h9M15 6h2M3 14h2M8 14h9" />
      <circle cx="13" cy="6" r="2" />
      <circle cx="6" cy="14" r="2" />
    </template>
    <template v-else-if="name === 'chart'">
      <path d="M3 17h14" />
      <path d="M6 17V9M10 17V4M14 17v-6" />
    </template>
    <template v-else-if="name === 'chevron-left'">
      <path d="M12 4 6 10l6 6" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="m8 4 6 6-6 6" />
    </template>
    <template v-else-if="name === 'chevron-up'">
      <path d="m4 12 6-6 6 6" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="m4 8 6 6 6-6" />
    </template>
    <template v-else-if="name === 'arrow-left'">
      <path d="M16 10H4M9 5 4 10l5 5" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </template>
    <template v-else-if="name === 'ask'">
      <path d="M17 12a3 3 0 0 1-3 3H8l-4 3v-3.5A3 3 0 0 1 3 12V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3z" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m5 5 10 10M15 5 5 15" />
    </template>
    <template v-else-if="name === 'external-link'">
      <path d="M11 3h6v6M10 10l7-7" />
      <path d="M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M4 7h12M8 7V4h4v3M6 7l.7 10h6.6L14 7M8.5 10v4M11.5 10v4" />
    </template>
    <template v-else-if="name === 'link'">
      <path d="M8 12a3 3 0 0 0 4 0l3-3a3 3 0 0 0-4-4l-1 1" />
      <path d="M12 8a3 3 0 0 0-4 0l-3 3a3 3 0 0 0 4 4l1-1" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M10 4v12M4 10h12" />
    </template>
    <template v-else-if="name === 'sun'">
      <circle cx="10" cy="10" r="3.5" />
      <path
        d="M10 2v2.4M10 15.6V18M2 10h2.4M15.6 10H18M4.3 4.3l1.7 1.7M15.7 15.7l-1.7-1.7M15.7 4.3l-1.7 1.7M4.3 15.7l1.7-1.7"
      />
    </template>
    <template v-else-if="name === 'moon'">
      <path d="M10 2.5a5 5 0 0 0 7.5 7.5 7.5 7.5 0 1 1-7.5-7.5Z" />
    </template>
  </svg>
</template>

<style scoped>
.p-icon {
  width: 18px;
  height: 18px;
  display: block;
  flex-shrink: 0;
}
</style>
