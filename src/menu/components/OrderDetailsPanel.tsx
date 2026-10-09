import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
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

type StepConfig = {
  id: 'name' | 'dispatch' | 'delivery' | 'notes';
  prompt: string;
};

const STEP_TRANSITION = {
  initial: { opacity: 0, x: 28, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -28, scale: 0.98 },
  transition: { duration: 0.26, ease: [0.22, 1, 0.36, 1] as const },
};

type InlineFieldProps = {
  label: string;
  children: React.ReactNode;
};

const InlineField = ({ label, children }: InlineFieldProps) => (
  <label className="block">
    <span className="sr-only">{label}</span>
    <div className="rounded-2xl border border-gray-200 bg-white px-4 pt-3 pb-2 dark:border-gray-700 dark:bg-gray-900">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
        {label}
      </div>
      {children}
    </div>
  </label>
);

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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);

  const dispatchInfo = customer.dispatchInfo ?? { address: '', notes: '' };
  const selectedDispatch =
    dispatchOptions.find((option) => option.key === customer.dispatchType) ?? null;
  const showAddress = Boolean(selectedDispatch?.requiresAddress);
  const presetLocations = selectedDispatch?.presetLocations ?? [];
  const selectedPresetName =
    presetLocations.find((location) => location.address === dispatchInfo.address)?.name ?? '';
  const presetSelectValue = selectedPresetName || presetLocations[0]?.name || '';

  const steps = useMemo<StepConfig[]>(
    () => [
      {
        id: 'name',
        prompt: 'Who should we prepare this order for?',
      },
      {
        id: 'dispatch',
        prompt: 'How should we send it your way?',
      },
      ...(showAddress
        ? [
            {
              id: 'delivery' as const,
              prompt: 'Tell us where to send it.',
            },
          ]
        : []),
      {
        id: 'notes',
        prompt: 'Any last details before we send this through?',
      },
    ],
    [showAddress]
  );

  const currentStep = steps[Math.min(currentStepIndex, steps.length - 1)];
  const totalSteps = steps.length;
  const isLastStep = currentStepIndex === totalSteps - 1;

  useEffect(() => {
    if (currentStepIndex > steps.length - 1) {
      setCurrentStepIndex(steps.length - 1);
    }
  }, [currentStepIndex, steps.length]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
      setStepError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!stepError) return;
    setStepError(null);
  }, [
    customer.name,
    customer.phone,
    customer.dispatchType,
    dispatchInfo.address,
    dispatchInfo.notes,
    customer.notes,
    stepError,
  ]);

  const handleStepBack = () => {
    if (currentStepIndex === 0) {
      onBack();
      return;
    }
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  };

  const validateCurrentStep = () => {
    if (currentStep.id === 'name') {
      if (!customer.name.trim()) return 'Please enter your name.';
      if (!customer.phone.trim()) return 'Please add a phone number so we can reach you.';
      return null;
    }

    if (currentStep.id === 'dispatch') {
      if (!selectedDispatch) return 'Please choose a delivery method.';
      return null;
    }

    if (currentStep.id === 'delivery') {
      if (!dispatchInfo.address.trim()) return 'Please enter the delivery address.';
      return null;
    }

    return null;
  };

  const handleContinue = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setStepError(validationError);
      return;
    }
    if (isLastStep) {
      onSendOrder();
      return;
    }
    setCurrentStepIndex((prev) => Math.min(totalSteps - 1, prev + 1));
  };

  const renderStep = () => {
    if (currentStep.id === 'name') {
      return (
        <div className="space-y-4">
          <InlineField label="Your name">
            <input
              type="text"
              value={customer.name}
              onChange={(e) => onUpdateCustomer({ name: e.target.value })}
              placeholder="Type your name here"
              className="mt-1 w-full bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-300 dark:text-gray-100"
              autoFocus
            />
          </InlineField>
          <div>
            <InlineField label="Best phone number">
              <input
                type="tel"
                value={customer.phone}
                onChange={(e) => onUpdateCustomer({ phone: e.target.value })}
                placeholder="09xx xxx xxxx"
                className="mt-1 w-full bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-300 dark:text-gray-100"
              />
            </InlineField>
            <p className="mt-3 text-xs text-gray-500">
              We only use this if the kitchen or rider needs to reach you.
            </p>
          </div>
        </div>
      );
    }

    if (currentStep.id === 'dispatch') {
      return (
        <div className="space-y-3">
          {dispatchOptions.map((option, index) => {
            const isActive = customer.dispatchType === option.key;
            return (
              <motion.button
                key={option.key}
                type="button"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
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
                className={`w-full rounded-3xl border px-5 py-4 text-left transition ${
                  isActive
                    ? 'border-[#6f5a43] bg-[#6f5a43] text-white shadow-lg shadow-[#6f5a43]/15'
                    : 'border-[#d9cfbf] bg-[#fbf7f1] text-gray-800 hover:border-[#b8a58f]'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-base font-semibold">{option.label}</div>
                    <div
                      className={`mt-1 text-sm ${
                        isActive ? 'text-[#f3eadf]' : 'text-[#7c6b59]'
                      }`}
                    >
                      {option.instructions ||
                        (option.requiresAddress
                          ? 'We will ask for your delivery details next.'
                          : 'Fast and simple pickup flow.')}
                    </div>
                  </div>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                      isActive
                        ? 'border-white/30 bg-white/10'
                        : 'border-[#c9b9a5] bg-[#f2ebe1]'
                    }`}
                  >
                    {isActive ? <Check className="w-4 h-4" /> : null}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      );
    }

    if (currentStep.id === 'delivery') {
      return (
        <div className="space-y-4">
          {presetLocations.length > 0 ? (
            <InlineField label="Choose a location">
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
                className="mt-1 w-full bg-transparent text-base text-gray-800 outline-none dark:text-gray-100"
              >
                {presetLocations.map((location) => (
                  <option key={`${location.name}-${location.address}`} value={location.name}>
                    {location.name}
                  </option>
                ))}
              </select>
            </InlineField>
          ) : null}
          <InlineField label="Address">
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
              placeholder="House, building, street, landmark"
              className="mt-1 w-full bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-300 dark:text-gray-100"
              autoFocus
            />
          </InlineField>
          <InlineField label="Delivery notes">
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
              placeholder="Gate code, building instructions, rider tip-offs"
              className="mt-1 w-full resize-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-300 dark:text-gray-100"
              rows={4}
            />
          </InlineField>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-[#d8ccbb] bg-gradient-to-br from-[#f3ede3] via-[#f7f2ea] to-[#ece4d7] px-5 py-4 text-sm text-[#655544]">
          <div className="font-semibold text-[#4f4134]">Quick recap</div>
          <div className="mt-3 space-y-2">
            <p>
              <span className="font-semibold text-[#3d3127]">Name:</span> {customer.name || 'Not set'}
            </p>
            <p>
              <span className="font-semibold text-[#3d3127]">Method:</span>{' '}
              {selectedDispatch?.label || customer.dispatchType || 'Not set'}
            </p>
            {showAddress ? (
              <p>
                <span className="font-semibold text-[#3d3127]">Address:</span>{' '}
                {dispatchInfo.address || 'Not set'}
              </p>
            ) : null}
          </div>
        </div>

        <InlineField label="Notes for the team">
          <textarea
            value={customer.notes}
            onChange={(e) => onUpdateCustomer({ notes: e.target.value })}
            placeholder="Extra requests, timing notes, anything helpful"
            className="mt-1 w-full resize-none bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-300 dark:text-gray-100"
            rows={4}
            autoFocus
          />
        </InlineField>
      </div>
    );
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
            onClick={handleStepBack}
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
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Your Details
                </h2>
                <p className="text-sm text-gray-500">{currentStep.prompt}</p>
              </div>
            </div>

            <div className="menu-sheet-body bg-gradient-to-b from-[#fcfaf6] via-[#f8f4ed] to-[#efe7db] dark:from-gray-900 dark:to-gray-900">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={currentStep.id} {...STEP_TRANSITION}>
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {stepError ? (
                <p className="mt-4 text-sm text-red-500">{stepError}</p>
              ) : null}
              {submitError ? (
                <p className="mt-2 text-sm text-red-500">{submitError}</p>
              ) : null}
            </div>

            <div className="menu-sheet-footer">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleStepBack}
                  className="menu-secondary-button-flex"
                >
                  {currentStepIndex === 0 ? 'Back to Order' : 'Previous'}
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="menu-primary-button-flex"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Sending…'
                    : isLastStep
                    ? 'Send Order'
                    : 'Continue'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderDetailsPanel;
