import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, RefreshCcw } from 'lucide-react';

type OrderStatusPanelProps = {
  isOpen: boolean;
  orderId: string | null;
  status: string | null;
  updatedAt: string | null;
  paymentStatus?: string | null;
  paymentAmount?: number | null;
  isLoading: boolean;
  error: string | null;
  paymentLink?: string | null;
  onPay?: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onBackToMenu: () => void;
};

const formatStatus = (value: string | null) => {
  if (!value) return 'Unknown';
  return value.replace(/[-_]+/g, ' ').trim();
};

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const OrderStatusPanel = ({
  isOpen,
  orderId,
  status,
  updatedAt,
  paymentStatus,
  paymentAmount,
  isLoading,
  error,
  paymentLink,
  onPay,
  onClose,
  onRefresh,
  onBackToMenu,
}: OrderStatusPanelProps) => {
  const displayStatus = isLoading && !status ? 'Checking...' : formatStatus(status);
  const displayPaymentStatus = paymentStatus ? formatStatus(paymentStatus) : 'Unknown';
  const isPaid = paymentStatus === 'paid';

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
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className="menu-sheet menu-sheet-md"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 25 }}
          >
            <div className="menu-sheet-header">
              <button type="button" onClick={onClose} className="menu-icon-button">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Order Status</h2>
                <p className="text-sm text-gray-500">Live updates for your order.</p>
              </div>
            </div>

            <div className="menu-sheet-body">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">Order ID</div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100 break-all">
                  {orderId || '—'}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">Status</div>
                <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {displayStatus}
                </div>
                <div className="text-xs text-gray-500">Updated {formatDateTime(updatedAt)}</div>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-2">
                <div className="text-xs uppercase tracking-wide text-gray-500">Payment</div>
                <div className="flex items-center justify-between">
                  <div className={`text-lg font-semibold ${isPaid ? 'text-emerald-600' : 'text-gray-800 dark:text-gray-100'}`}>
                    {displayPaymentStatus}
                  </div>
                  {typeof paymentAmount === 'number' && (
                    <div className="text-sm text-gray-500">₱{paymentAmount.toFixed(2)}</div>
                  )}
                </div>
                {!isPaid && paymentLink && onPay && (
                  <button type="button" className="menu-primary-button" onClick={onPay}>
                    Pay now
                  </button>
                )}
                {isPaid && (
                  <div className="text-xs text-emerald-600">Payment received</div>
                )}
              </div>

              
            </div>

            <div className="menu-sheet-footer space-y-3">
              <button
                type="button"
                onClick={onRefresh}
                className="menu-secondary-button"
                disabled={isLoading}
              >
                <span className="inline-flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Refresh status
                </span>
              </button>
              <button type="button" onClick={onBackToMenu} className="menu-primary-button">
                Back to menu
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderStatusPanel;
