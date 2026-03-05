import React from "react";

type ClosedShiftSummaryEntry = {
  paymentMethodId: string;
  paymentMethodName: string;
  totalAmount: number;
};

type ClosedShiftSummaryModalProps = {
  isOpen: boolean;
  summary: {
    shiftId: string;
    startDate: string;
    endDate: string;
    openingAmount: number;
    totals: ClosedShiftSummaryEntry[];
  } | null;
  onClose: () => void;
  onOpenNewShift: () => void;
  peso: (value: number) => string;
};

const formatDateTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ClosedShiftSummaryModal({
  isOpen,
  summary,
  onClose,
  onOpenNewShift,
  peso,
}: ClosedShiftSummaryModalProps) {
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">POS Shift</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Shift Closed</h2>
        <p className="mt-1 text-sm text-slate-600">Shift ID: {summary.shiftId}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
          <div>
            <p className="text-slate-500">Started</p>
            <p className="font-medium text-slate-900">{formatDateTime(summary.startDate)}</p>
          </div>
          <div>
            <p className="text-slate-500">Ended</p>
            <p className="font-medium text-slate-900">{formatDateTime(summary.endDate)}</p>
          </div>
          <div className="col-span-2">
            <p className="text-slate-500">Opening Amount</p>
            <p className="font-semibold text-slate-900">{peso(summary.openingAmount)}</p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Payment Totals</p>
          </div>
          <div className="max-h-56 overflow-auto px-4 py-2">
            {summary.totals.length === 0 ? (
              <p className="py-3 text-sm text-slate-500">No paid transactions in this shift.</p>
            ) : (
              <div className="space-y-2 py-1">
                {summary.totals.map((entry) => (
                  <div
                    key={`${summary.shiftId}-${entry.paymentMethodId}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                  >
                    <span className="text-sm text-slate-700">{entry.paymentMethodName}</span>
                    <span className="text-sm font-semibold text-slate-900">
                      {peso(entry.totalAmount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Done
          </button>
          <button
            type="button"
            onClick={onOpenNewShift}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Open New Shift
          </button>
        </div>
      </div>
    </div>
  );
}
