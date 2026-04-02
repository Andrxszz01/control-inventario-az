import React, { useEffect } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * Professional confirmation dialog.
 *
 * Props:
 *   isOpen       - boolean
 *   title        - string
 *   message      - string
 *   onConfirm    - () => void
 *   onCancel     - () => void
 *   confirmLabel - string (default "Confirmar")
 *   cancelLabel  - string (default "Cancelar")
 *   danger       - boolean  (red confirm button)
 */
export function ConfirmDialog({
  isOpen,
  title = '¿Está seguro?',
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
}) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className={`p-2 rounded-full shrink-0 ${danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {danger ? <AlertTriangle size={20} /> : <HelpCircle size={20} />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              {message && (
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{message}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-accent transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              danger
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
