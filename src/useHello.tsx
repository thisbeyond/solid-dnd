import { createSignal } from 'solid-js';

export function useHello() {
  const [hello, setHello] = createSignal('');

  return [hello, { setHello }] as const;
}
