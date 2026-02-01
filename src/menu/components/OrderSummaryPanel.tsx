import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import type { OrderItem } from '../types';
import { formatPrice } from '../utils/pricing';

type OrderSummaryPanelProps = {
  isOpen: boolean;
  items: OrderItem[];
  totalPrice: number;
  onClose: () => void;
  onPlaceOrder: () => void;
  onClear: () => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  paperView: boolean;
};

const OrderSummaryPanel = ({
  isOpen,
  items,
  totalPrice,
  onClose,
  onPlaceOrder,
  onClear,
  onUpdateQuantity,
  onRemove,
  paperView,
}: OrderSummaryPanelProps) => {
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
            className="menu-sheet menu-sheet-lg"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 25 }}
          >
            <div className="menu-sheet-header-split">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">My Order</h2>
                <p className="text-sm text-gray-500">{items.length} items in your order</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="menu-icon-button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="menu-sheet-body-compact">
              {items.length === 0 ? (
                <div className="text-center text-gray-500 py-10">Your order is empty.</div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className="border border-gray-200 dark:border-gray-800 rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          {item.name}
                        </h3>
                        {item.variant || item.optionName ? (
                          <p className="text-sm text-gray-500">
                            {[item.variant, item.optionName].filter(Boolean).join(' · ')}
                          </p>
                        ) : null}
                        {item.note ? (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Note: {item.note}</p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Line total</div>
                        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          {formatPrice(item.unitPrice * item.quantity, { paperView })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="menu-stepper-button"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-base font-semibold text-gray-800 dark:text-gray-100">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="menu-stepper-button"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="flex items-center gap-2 text-sm text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="menu-sheet-footer space-y-3">
              <div className="flex items-center justify-between text-lg font-semibold text-gray-800 dark:text-gray-100">
                <span>Total</span>
                <span>{formatPrice(totalPrice, { paperView })}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {/* <button
                  type="button"
                  onClick={onClear}
                  className="menu-secondary-button-flex"
                >
                  Clear order bin
                </button> */}
                <button
                  type="button"
                  onClick={onPlaceOrder}
                  disabled={items.length === 0}
                  className="menu-primary-button-flex"
                >
                  Place order
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderSummaryPanel;
