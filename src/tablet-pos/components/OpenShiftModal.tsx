import React from "react";

type OpenShiftModalProps = {
  isOpen: boolean;
  canClose: boolean;
  openingAmountInput: string;
  error: string;
  isSubmitting: boolean;
  onOpeningAmountChange: (value: string) => void;
  onOpenShift: () => void;
  onClose: () => void;
};

export default function OpenShiftModal({
  isOpen,
  canClose,
  openingAmountInput,
  error,
  isSubmitting,
  onOpeningAmountChange,
  onOpenShift,
  onClose,
}: OpenShiftModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">POS Shift</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Open Shift</h2>
            <p className="mt-1 text-sm text-slate-600">
              Enter the opening cash amount to start this shift.
            </p>
          </div>
          {canClose ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
              disabled={isSubmitting}
            >
              Close
            </button>
          ) : null}
        </div>

        <div className="mt-5">
          <label className="block text-sm font-medium text-slate-700">
            Opening Amount
            <input
              inputMode="decimal"
              value={openingAmountInput}
              onChange={(event) => onOpeningAmountChange(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold text-slate-900 outline-none transition focus:border-blue-500"
              placeholder="0.00"
              disabled={isSubmitting}
            />
          </label>
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onOpenShift}
            disabled={isSubmitting}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? "Opening..." : "Open Shift"}
          </button>
        </div>
      </div>
    </div>
  );
}
