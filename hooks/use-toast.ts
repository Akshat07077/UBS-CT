"use client";
import { useState, useCallback } from "react";

export type ToastVariant = "default" | "destructive";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let listeners: Array<(toasts: ToastMessage[]) => void> = [];
let toasts: ToastMessage[] = [];

function dispatch(toast: ToastMessage) {
  toasts = [...toasts, toast];
  listeners.forEach((l) => l(toasts));
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== toast.id);
    listeners.forEach((l) => l(toasts));
  }, 4000);
}

export function toast(msg: Omit<ToastMessage, "id">) {
  dispatch({ ...msg, id: Math.random().toString(36).slice(2) });
}

export function useToast() {
  const [state, setState] = useState<ToastMessage[]>(toasts);

  const subscribe = useCallback(() => {
    listeners.push(setState);
    return () => { listeners = listeners.filter((l) => l !== setState); };
  }, []);

  useState(subscribe);

  return { toasts: state, toast };
}
