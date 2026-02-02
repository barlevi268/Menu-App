import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

type OrderSuccessPanelProps = {
  isOpen: boolean;
  orderId?: string | null;
  paymentLink?: string | null;
  statusLink?: string | null;
  onPay?: () => void;
  onViewStatus?: () => void;
  onBackToMenu: () => void;
  onClear: () => void;
};

const OrderSuccessPanel = ({
  isOpen,
  orderId,
  paymentLink,
  statusLink,
  onPay,
  onViewStatus,
  onBackToMenu,
  onClear,
}: OrderSuccessPanelProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!statusLink || typeof navigator === 'undefined') return;
    try {
      await navigator.clipboard.writeText(statusLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="menu-overlay" aria-hidden={!isOpen}>
          <motion.div
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onBackToMenu}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className="menu-sheet menu-sheet-md items-center text-center"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 25 }}
          >
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Your order has been accepted
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Complete payment and keep the status link for updates.
                </p>
              </div>
              <div className="w-full space-y-3">
                <button
                  type="button"
                  className="menu-primary-button"
                  onClick={onPay}
                  disabled={!paymentLink}
                >
                  Pay now
                </button>
                {!paymentLink && (
                  <p className="text-xs text-red-500 text-center">
                    Payment link is missing. Please try submitting again.
                  </p>
                )}
              </div>
              {statusLink && (
                <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-gray-500">Status link</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200 break-all">
                      {statusLink}
                    </div>
                    {orderId ? (
                      <div className="text-xs text-gray-400 mt-2">Order ID: {orderId}</div>
                    ) : null}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button type="button" onClick={handleCopy} className="menu-secondary-button-flex">
                      {copied ? 'Copied' : 'Copy status link'}
                    </button>
                    {onViewStatus && (
                      <button
                        type="button"
                        onClick={onViewStatus}
                        className="menu-secondary-button-flex"
                      >
                        View status
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="menu-sheet-footer-stack">
              <button
                type="button"
                onClick={onBackToMenu}
                className="menu-primary-button"
              >
                Back to menu
              </button>
              <button
                type="button"
                onClick={onClear}
                className="menu-secondary-button"
              >
                Clear order
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderSuccessPanel;
