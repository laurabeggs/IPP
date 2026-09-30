<script setup lang="ts">
/**
 * The soft password gate in front of the hosted prototype.
 *
 * GitHub Pages has no server-side auth, so this keeps the app unmounted until
 * the entered password hashes to the digest in src/lib/gate.ts. The unlock
 * lasts for the browser session.
 */
import { ref } from 'vue';
import PButton from './ui/PButton.vue';
import PInput from './ui/PInput.vue';
import PPanel from './ui/PPanel.vue';
import { checkPassword, GATE_STORAGE_KEY } from '../lib/gate';

const unlocked = ref(sessionStorage.getItem(GATE_STORAGE_KEY) === '1');
const password = ref('');
const rejected = ref(false);
const checking = ref(false);

/** Checks the entered password; calls while one runs are ignored. */
async function attempt(): Promise<void> {
  if (checking.value) return;
  checking.value = true;
  rejected.value = false;
  const ok = await checkPassword(password.value);
  checking.value = false;
  if (ok) {
    sessionStorage.setItem(GATE_STORAGE_KEY, '1');
    unlocked.value = true;
  } else {
    rejected.value = true;
  }
}
</script>

<template>
  <div v-if="!unlocked" class="gate">
    <PPanel class="gate__card">
      <h1 class="gate__title">Payment Flow Explorer</h1>
      <p class="gate__hint">This prototype is password protected.</p>
      <PInput
        label="Password"
        type="password"
        :model-value="password"
        placeholder="Password"
        @update:model-value="password = $event"
        @submit="attempt"
      />
      <PButton variant="primary" :disabled="checking" @click="attempt">
        Unlock
      </PButton>
      <p v-if="rejected" class="gate__error" role="alert">
        Wrong password. Try again.
      </p>
    </PPanel>
  </div>
  <slot v-else />
</template>

<style scoped>
.gate {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px;
  background: var(--px-bg);
}

.gate__card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: min(320px, 100%);
  padding: 24px;
  box-shadow: var(--px-shadow-lg);
}

.gate__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--px-text);
}

.gate__hint {
  margin: 0;
  font-size: 13px;
  color: var(--px-text-muted);
}

.gate__error {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--px-text-critical);
}
</style>
