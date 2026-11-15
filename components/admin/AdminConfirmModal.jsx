'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export default function AdminConfirmModal({
  isOpen,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmLabel = 'Confirm Delete',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape' && !loading) {
        onCancel?.();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loading, onCancel]);

  const isDanger = variant === 'danger';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-confirm-title"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-md bg-[#111115] border border-[#2A2A34] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-[#1E1E26] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                    isDanger
                      ? 'bg-[#2A1215] border-[#7F1D1D] text-[#F87171]'
                      : 'bg-[#2A2212] border-[#C8A464]/50 text-[#C8A464]'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3
                  id="admin-confirm-title"
                  className="text-sm font-bold tracking-wide text-[#F4F1EA]"
                >
                  {title}
                </h3>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={onCancel}
                aria-label="Close confirmation dialog"
                className="p-1.5 rounded text-[#8E8E96] hover:text-[#F4F1EA] hover:bg-[#1B1B22] transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-xs sm:text-sm text-[#D4D4D8] leading-relaxed">{message}</p>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={onCancel}
                  className="px-4 py-2 rounded-lg bg-[#18181F] hover:bg-[#22222A] border border-[#2C2C36] text-xs font-semibold text-[#E4E4E7] transition-colors disabled:opacity-50"
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={onConfirm}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-60 ${
                    isDanger
                      ? 'bg-[#DC2626] hover:bg-[#EF4444] text-white'
                      : 'bg-[#C8A464] hover:bg-[#D4B475] text-[#09090B]'
                  }`}
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{confirmLabel}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
