import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import type { CustomerDetails } from '../types';

type OrderDetailsPanelProps = {
  isOpen: boolean;
  customer: CustomerDetails;
  onUpdateCustomer: (patch: Partial<CustomerDetails>) => void;
  onBack: () => void;
  onSendOrder: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
};

const OrderDetailsPanel = ({
  isOpen,
  customer,
  onUpdateCustomer,
  onBack,
  onSendOrder,
  isSubmitting,
  submitError,
}: OrderDetailsPanelProps) => {
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
            onClick={onBack}
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
              <button
                type="button"
                onClick={onBack}
                className="menu-icon-button"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Your Details</h2>
                <p className="text-sm text-gray-500">We need this to confirm your order.</p>
              </div>
            </div>

            <div className="menu-sheet-body">
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Full name</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => onUpdateCustomer({ name: e.target.value })}
                  placeholder="Enter your name"
                  className="menu-input"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Phone number</label>
                <input
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => onUpdateCustomer({ phone: e.target.value })}
                  placeholder="09xx xxx xxxx"
                  className="menu-input"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Order notes</label>
                <textarea
                  value={customer.notes}
                  onChange={(e) => onUpdateCustomer({ notes: e.target.value })}
                  placeholder="Delivery details, special requests, etc."
                  className="menu-input"
                  rows={4}
                />
              </div>
            </div>

            <div className="menu-sheet-footer">
              <button
                type="button"
                onClick={onSendOrder}
                className="menu-primary-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending…' : 'Send order'}
              </button>
              {submitError ? (
                <p className="mt-2 text-sm text-red-500">{submitError}</p>
              ) : null}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderDetailsPanel;
