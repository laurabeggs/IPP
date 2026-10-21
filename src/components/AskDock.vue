<script setup lang="ts">
import { ref } from 'vue';
import { BentoPopover } from '@adyen/bento-vue3';
import { answerQuestion, suggestedQuestions } from '../lib/ask';
import { openFlowStep, useAppState } from '../lib/state';
import PButton from './ui/PButton.vue';
import PIconButton from './ui/PIconButton.vue';
import PInput from './ui/PInput.vue';
import type { AskAnswer } from '../lib/ask';

/**
 * A popover for questions about the same placeholder data, anchored to the
 * Ask button in the header. Still a keyword-matched stand-in, not a real
 * model.
 */
defineProps<{
  /** The header button the popover points at. */
  target: HTMLElement;
}>();

const state = useAppState();

const draft = ref('');
const answer = ref<AskAnswer | undefined>();

function ask(question: string): void {
  const trimmed = question.trim();
  if (!trimmed) return;
  draft.value = trimmed;
  answer.value = answerQuestion(trimmed, state.range);
}

function open(flowId: string, stepId?: string): void {
  openFlowStep(state, flowId, stepId);
  state.askOpen = false;
}
</script>

<template>
  <BentoPopover
    class="ask"
    open
    title="Ask"
    dismissible
    position="bottom-end"
    :target-element="target"
    @dismiss="state.askOpen = false"
  >
    <div class="ask__body">
      <div class="ask__row">
        <PInput
          class="ask__input"
          label="Question"
          hide-label
          :model-value="draft"
          placeholder="Ask about the flows"
          @update:model-value="draft = $event"
          @submit="ask(draft)"
        />
        <PButton variant="primary" @click="ask(draft)">Ask</PButton>
      </div>

      <div v-if="!answer" class="ask__suggestions">
        <PButton
          v-for="question in suggestedQuestions"
          :key="question"
          class="ask__chip"
          @click="ask(question)"
        >
          {{ question }}
        </PButton>
      </div>

      <div v-else class="ask__answer">
        <p class="ask__headline">{{ answer.headline }}</p>
        <ul class="ask__rows">
          <li
            v-for="row in answer.rows"
            :key="row.label"
            class="ask__answer-row"
          >
            <span class="ask__row-label">
              {{ row.label }}
              <span v-if="row.detail" class="ask__row-detail">
                {{ row.detail }}
              </span>
            </span>
            <span class="ask__row-value">{{ row.value }}</span>
            <PIconButton
              v-if="row.flowId"
              icon="arrow-right"
              label="Open this screen"
              @click="open(row.flowId, row.stepId)"
            />
          </li>
        </ul>
      </div>
    </div>
  </BentoPopover>
</template>

<style scoped>
.ask {
  z-index: 20;
}

.ask__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(340px, calc(100vw - 48px));
  max-height: min(60vh, 560px);
  overflow-y: auto;
}

.ask__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ask__input {
  flex: 1;
}

.ask__suggestions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.ask__chip {
  text-align: left;
}

.ask__answer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ask__headline {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.ask__rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ask__answer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--px-border-subtle);
}

.ask__answer-row:last-child {
  border-bottom: none;
}

.ask__row-label {
  flex: 1;
  font-size: 12px;
  display: flex;
  flex-direction: column;
}

.ask__row-detail {
  font-size: 11px;
  color: var(--px-text-muted);
}

.ask__row-value {
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
