// @vitest-environment jsdom
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import PasswordGate from '../components/PasswordGate.vue';
import { GATE_STORAGE_KEY } from '../lib/gate';

// The tests stand in for the real password so it never ships in this public
// repository; the source carries only its digest.
const { checkPasswordMock } = vi.hoisted(() => ({
  checkPasswordMock: vi.fn(async (input: string) => input === 'let-me-in'),
}));

vi.mock('../lib/gate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/gate')>();
  return { ...actual, checkPassword: checkPasswordMock };
});

// A marker component for the gated content: string slots would need the
// runtime template compiler, which the tests do not load.
const SlotMarker = defineComponent({
  render: () => h('div', { class: 'gate-slot' }),
});

function mountGate() {
  return mount(PasswordGate, { slots: { default: SlotMarker } });
}

describe('the password gate', () => {
  beforeEach(() => {
    sessionStorage.removeItem(GATE_STORAGE_KEY);
    checkPasswordMock.mockClear();
  });

  it('keeps the app hidden until the right password unlocks it', async () => {
    const wrapper = mountGate();
    expect(wrapper.find('.gate').exists()).toBe(true);
    expect(wrapper.find('.gate-slot').exists()).toBe(false);

    await wrapper.find('.p-input__control').setValue('nope');
    await wrapper.find('.gate .p-button').trigger('click');
    await vi.waitFor(() =>
      expect(wrapper.find('.gate__error').exists()).toBe(true),
    );
    expect(wrapper.find('.gate-slot').exists()).toBe(false);
    expect(checkPasswordMock).toHaveBeenCalledWith('nope');

    await wrapper.find('.p-input__control').setValue('let-me-in');
    await wrapper.find('.gate .p-button').trigger('click');
    await vi.waitFor(() =>
      expect(wrapper.find('.gate-slot').exists()).toBe(true),
    );
    expect(wrapper.find('.gate').exists()).toBe(false);
    expect(sessionStorage.getItem(GATE_STORAGE_KEY)).toBe('1');
  });

  it('unlocks with Enter in the password field', async () => {
    const wrapper = mountGate();
    await wrapper.find('.p-input__control').setValue('let-me-in');
    await wrapper.find('.p-input__control').trigger('keyup.enter');
    await vi.waitFor(() =>
      expect(wrapper.find('.gate-slot').exists()).toBe(true),
    );
    expect(sessionStorage.getItem(GATE_STORAGE_KEY)).toBe('1');
  });

  it('stays locked when the keyboard submits a wrong password', async () => {
    const wrapper = mountGate();
    await wrapper.find('.p-input__control').setValue('nope');
    await wrapper.find('.p-input__control').trigger('keyup.enter');
    await vi.waitFor(() =>
      expect(wrapper.find('.gate__error').exists()).toBe(true),
    );
    expect(wrapper.find('.gate-slot').exists()).toBe(false);
    expect(sessionStorage.getItem(GATE_STORAGE_KEY)).toBe(null);
  });

  it('skips the prompt when the browser session already unlocked', () => {
    sessionStorage.setItem(GATE_STORAGE_KEY, '1');
    const wrapper = mountGate();
    expect(wrapper.find('.gate').exists()).toBe(false);
    expect(wrapper.find('.gate-slot').exists()).toBe(true);
    expect(checkPasswordMock).not.toHaveBeenCalled();
  });
});
