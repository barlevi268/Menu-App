import React from "react";
import type { CompletedPayment } from "../types";

type DoneViewProps = {
  completedPayment: CompletedPayment | null;
  doneCountdown: number;
  onStartNewTransaction: () => void;
  peso: (amount: number) => string;
};

export default function DoneView({
  completedPayment,
  doneCountdown,
  onStartNewTransaction,
  peso,
}: DoneViewProps) {
  return (
    <div className="min-h-screen bg-emerald-50 p-6">
      <div className="mx-auto flex h-[calc(100vh-3rem)] max-w-3xl items-center justify-center">
        <div className="w-full rounded-3xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-600">
            Transaction Completed
          </p>
          <h1 className="mt-2 text-4xl font-semibold text-slate-900">Payment Successful</h1>

          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Method</span>
              <span className="font-semibold text-slate-900">
                {completedPayment?.methodLabel ?? "-"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">Total Paid</span>
              <span className="font-semibold text-slate-900">{peso(completedPayment?.total ?? 0)}</span>
            </div>
            {completedPayment?.methodKind === "cash" && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Change</span>
                <span className="font-semibold text-emerald-600">
                  {peso(completedPayment?.change ?? 0)}
                </span>
              </div>
            )}
          </div>

          <button
            className="mt-8 rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white"
            onClick={onStartNewTransaction}
          >
            Start New Transaction ({doneCountdown})
          </button>
        </div>
      </div>
    </div>
  );
}
