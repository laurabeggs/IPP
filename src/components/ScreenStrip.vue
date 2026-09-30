<script setup lang="ts">
import { usePane } from '../lib/pane';
import ScreenStage from './ScreenStage.vue';

const props = defineProps<{ paneIndex: number }>();

const { pane, flow, missingConfigParts } = usePane(() => props.paneIndex);
</script>

<template>
  <div class="screen-strip" aria-label="All screens in this flow">
    <button
      v-for="screen in flow?.steps ?? []"
      :key="screen.id"
      type="button"
      class="screen-strip__item"
      :class="{ 'screen-strip__item--active': pane.step === screen.id }"
      :aria-current="pane.step === screen.id ? 'step' : undefined"
      @click="pane.step = screen.id"
    >
      <ScreenStage
        :flow-id="flow!.id"
        :step-id="screen.id"
        :step-title="screen.title"
        :device-id="pane.config.device"
        :language="pane.config.language"
        :currency="pane.config.currency"
        :unsupported="missingConfigParts.includes('device')"
        size="compact"
      />
      <span class="screen-strip__title">{{ screen.title }}</span>
    </button>
  </div>
</template>

<style scoped>
.screen-strip {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 24px;
  width: max-content;
  min-width: 100%;
  height: 100%;
  min-height: 330px;
  padding: 28px var(--screen-strip-right-inset, 40px) 24px
    var(--screen-strip-left-inset, 40px);
}

.screen-strip__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-width: 184px;
  padding: 10px 12px 12px;
  font: inherit;
  color: var(--px-text);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}

.screen-strip__item:hover {
  background: var(--px-glass);
  border-color: var(--px-border-subtle);
}

.screen-strip__item--active {
  background: var(--px-glass-strong);
  border-color: var(--px-border);
}

.screen-strip__title {
  max-width: 180px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}
</style>
