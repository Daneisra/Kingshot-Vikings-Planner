import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export interface ToastItem {
  id: number;
  message: string;
  tone: "success" | "error";
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-3 sm:left-auto sm:right-6 sm:w-full sm:max-w-sm">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}

function ToastCard({ toast, onDismiss }: ToastCardProps) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(toast.id);
    }, toast.tone === "error" ? 5500 : 3500);

    return () => window.clearTimeout(timeoutId);
  }, [onDismiss, toast.id, toast.tone]);

  return (
    <section
      className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-panel backdrop-blur ${
        toast.tone === "error"
          ? "border-rose-500/30 bg-rose-500/12 text-rose-100"
          : "border-emerald-500/30 bg-emerald-500/12 text-emerald-100"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {toast.tone === "error" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </div>

        <p className="flex-1 text-sm leading-6">{toast.message}</p>

        <button
          type="button"
          className="rounded-full p-1 text-current/80 transition hover:bg-white/10 hover:text-current"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </section>
  );
}
