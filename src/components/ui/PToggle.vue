<script setup lang="ts">
/**
 * PToggle is Bento's switch behind the app's own prop names. Bento names the
 * state `value` and reports changes on `input`.
 */
import { BentoToggle } from '@adyen/bento-vue3';

defineProps<{
  label: string;
  modelValue: boolean;
}>();

defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <BentoToggle
    class="p-toggle"
    :value="modelValue"
    @input="$emit('update:modelValue', $event)"
  >
    {{ label }}
  </BentoToggle>
</template>
