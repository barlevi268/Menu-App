import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import type { CustomerDetails } from '../types';

export type DispatchOption = {
  key: string;
  label: string;
  instructions?: string | null;
  requiresAddress?: boolean;
  presetLocations?: Array<{
    name: string;
    address: string;
  }>;
};

type OrderDetailsPanelProps = {
  isOpen: boolean;
  customer: CustomerDetails;
  dispatchOptions: DispatchOption[];
  onUpdateCustomer: (patch: Partial<CustomerDetails>) => void;
  onBack: () => void;
  onSendOrder: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
};

const OrderDetailsPanel = ({
  isOpen,
  customer,
  dispatchOptions,
  onUpdateCustomer,
  onBack,
  onSendOrder,
  isSubmitting,
  submitError,
}: OrderDetailsPanelProps) => {
  const dispatchInfo = customer.dispatchInfo ?? { address: '', notes: '' };
  const selectedDispatch =
    dispatchOptions.find((option) => option.key === customer.dispatchType) ?? null;
  const showAddress = Boolean(selectedDispatch?.requiresAddress);
  const presetLocations = selectedDispatch?.presetLocations ?? [];
  const selectedPresetName =
    presetLocations.find((location) => location.address === dispatchInfo.address)?.name ?? '';
  const presetSelectValue = selectedPresetName || presetLocations[0]?.name || '';

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
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Dispatch type
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {dispatchOptions.map((option) => {
                    const isActive = customer.dispatchType === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() =>
                          onUpdateCustomer({
                            dispatchType: option.key,
                            dispatchInfo: {
                              ...dispatchInfo,
                              address:
                                option.presetLocations && option.presetLocations.length > 0
                                  ? option.presetLocations[0].address
                                  : dispatchInfo.address,
                            },
                          })
                        }
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                            : 'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-200'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {selectedDispatch?.instructions ? (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {selectedDispatch.instructions}
                  </p>
                ) : null}
              </div>
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
              {showAddress && (
                <>
                  {presetLocations.length > 0 ? (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Delivery location
                      </label>
                      <select
                        value={presetSelectValue}
                        onChange={(e) => {
                          const selected = presetLocations.find(
                            (location) => location.name === e.target.value
                          );
                          if (!selected) return;
                          onUpdateCustomer({
                            dispatchInfo: {
                              ...dispatchInfo,
                              address: selected.address,
                            },
                          });
                        }}
                        className="menu-input"
                      >
                        {presetLocations.map((location) => (
                          <option key={`${location.name}-${location.address}`} value={location.name}>
                            {location.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Address
                    </label>
                    <input
                      type="text"
                      value={dispatchInfo.address}
                      onChange={(e) =>
                        onUpdateCustomer({
                          dispatchInfo: {
                            ...dispatchInfo,
                            address: e.target.value,
                          },
                        })
                      }
                      placeholder="Enter delivery address"
                      className="menu-input"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Delivery notes
                    </label>
                    <textarea
                      value={dispatchInfo.notes}
                      onChange={(e) =>
                        onUpdateCustomer({
                          dispatchInfo: {
                            ...dispatchInfo,
                            notes: e.target.value,
                          },
                        })
                      }
                      placeholder="Gate code, landmark, etc."
                      className="menu-input"
                      rows={3}
                    />
                  </div>
                </>
              )}
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
