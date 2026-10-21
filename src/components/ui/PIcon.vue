<script setup lang="ts">
/**
 * PIcon maps the app's icon names onto Bento's 16px icon set.
 *
 * The names are kept so call sites read the same as before; each one resolves
 * to a component from @adyen/ui-assets-icons-16.
 */
import ArrowLeft from '@adyen/ui-assets-icons-16/vue/arrow-left';
import ArrowRight from '@adyen/ui-assets-icons-16/vue/arrow-right';
import Bin from '@adyen/ui-assets-icons-16/vue/bin';
import Chain from '@adyen/ui-assets-icons-16/vue/chain-1';
import ChevronDown from '@adyen/ui-assets-icons-16/vue/chevron-down';
import ChevronLeft from '@adyen/ui-assets-icons-16/vue/chevron-left';
import ChevronRight from '@adyen/ui-assets-icons-16/vue/chevron-right';
import ChevronUp from '@adyen/ui-assets-icons-16/vue/chevron-up';
import Cross from '@adyen/ui-assets-icons-16/vue/cross';
import Expand from '@adyen/ui-assets-icons-16/vue/expand';
import ExternalLink from '@adyen/ui-assets-icons-16/vue/external-link';
import Graph from '@adyen/ui-assets-icons-16/vue/graph';
import Menu from '@adyen/ui-assets-icons-16/vue/menu';
import Message from '@adyen/ui-assets-icons-16/vue/message';
import Plus from '@adyen/ui-assets-icons-16/vue/plus';
import Sleep from '@adyen/ui-assets-icons-16/vue/sleep';
import Sliders from '@adyen/ui-assets-icons-16/vue/sliders-1';
import Sun from '@adyen/ui-assets-icons-16/vue/sun';
import { computed } from 'vue';
import type { Component } from 'vue';
import type { IconName } from '../../types/ui';

const props = defineProps<{ name: IconName }>();

const icons: Record<IconName, Component> = {
  menu: Menu,
  sliders: Sliders,
  chart: Graph,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  ask: Message,
  close: Cross,
  expand: Expand,
  'external-link': ExternalLink,
  trash: Bin,
  link: Chain,
  plus: Plus,
  sun: Sun,
  moon: Sleep,
};

const icon = computed(() => icons[props.name]);
</script>

<template>
  <component :is="icon" class="p-icon" aria-hidden="true" />
</template>

<style scoped>
.p-icon {
  width: 16px;
  height: 16px;
  display: block;
  flex-shrink: 0;
}
</style>
