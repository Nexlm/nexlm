import { create } from 'zustand';

let nextId = 1;

export const useToastStore = create((set) => ({
  toasts: [],
  push(toast) {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts, { id, tone: 'info', ...toast }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), toast.duration ?? 5000);
    return id;
  },
  dismiss(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

const push = (tone, message) => useToastStore.getState().push({ tone, message });

export const toast = {
  success: (message) => push('success', message),
  info: (message) => push('info', message),
  error: (errorOrMessage) =>
    push('error', typeof errorOrMessage === 'string' ? errorOrMessage : errorOrMessage?.message ?? 'Something went wrong'),
};
