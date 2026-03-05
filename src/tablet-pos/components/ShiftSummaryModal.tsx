import React from "react";

type ShiftSummaryModalProps = {
  isOpen: boolean;
  summary: {
    shiftId: string;
    startDate: string;
    openingAmount: number;
  } | null;
  onClose: () => void;
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

export default function ShiftSummaryModal({
  isOpen,
  summary,
  onClose,
  peso,
}: ShiftSummaryModalProps) {
  if (!isOpen || !summary) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">POS Shift</p>
        <h2 className="mt-1 text-2xl font-semibold text-slate-900">Shift Summary</h2>

        <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
          <div>
            <p className="text-slate-500">Shift ID</p>
            <p className="font-medium text-slate-900 break-all">{summary.shiftId}</p>
          </div>
          <div>
            <p className="text-slate-500">Started</p>
            <p className="font-medium text-slate-900">{formatDateTime(summary.startDate)}</p>
          </div>
          <div>
            <p className="text-slate-500">Opening Amount</p>
            <p className="font-semibold text-slate-900">{peso(summary.openingAmount)}</p>
          </div>
          <div>
            <p className="text-slate-500">Status</p>
            <p className="font-semibold text-emerald-700">Open</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
