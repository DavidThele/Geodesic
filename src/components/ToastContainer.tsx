import React from 'react';
import { useTodo } from '../context/TodoContext';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useTodo();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md shadow-xl border border-neutral-200/80 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 animate-in slide-in-from-top-3 duration-200"
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {toast.type === 'alert' && <AlertCircle className="w-4 h-4 text-rose-500" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-blue-500" />}
          </div>

          <div className="flex-1 min-w-0 text-xs">
            <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
              {toast.title}
            </h4>
            <p className="text-neutral-600 dark:text-neutral-400 mt-0.5 leading-relaxed">
              {toast.message}
            </p>
          </div>

          <button
            onClick={() => dismissToast(toast.id)}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-0.5 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
