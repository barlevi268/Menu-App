import React from "react";
import type { OrderLine } from "../types";

type OrderSummaryPanelProps = {
  title: string;
  orderLines: OrderLine[];
  getUnitPrice: (line: OrderLine) => number;
  getLineTotal: (line: OrderLine) => number;
  orderTotal: number;
  peso: (amount: number) => string;
  editable?: boolean;
  onEditOrderLine?: (line: OrderLine) => void;
  onRemoveOrderLine?: (lineId: string) => void;
  emptyText?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  className?: string;
  listClassName?: string;
  totalLabel?: string;
};

export default function OrderSummaryPanel({
  title,
  orderLines,
  getUnitPrice,
  getLineTotal,
  orderTotal,
  peso,
  editable = false,
  onEditOrderLine,
  onRemoveOrderLine,
  emptyText = "Tap items to build the order.",
  actionLabel,
  onAction,
  actionDisabled = false,
  className,
  listClassName,
  totalLabel = "Total",
}: OrderSummaryPanelProps) {
  return (
    <div className={className}>
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>

      <div className={listClassName ?? "mt-3 min-h-0 flex-1 overflow-auto pr-1"}>
        {orderLines.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-2">
            {orderLines.map((line) => {
              const unitPrice = getUnitPrice(line);
              const lineContent = (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      {line.quantity}x {line.productName}
                    </p>
                    <p className="text-sm font-semibold text-slate-900">{peso(getLineTotal(line))}</p>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">Unit: {peso(unitPrice)}</p>

                  {(line.selectedOptions.length > 0 ||
                    line.selectedAddOns.length > 0 ||
                    line.notes) && (
                    <div className="mt-1 space-y-1 text-xs text-slate-600">
                      {line.selectedOptions.map((option) => (
                        <p key={`${line.id}-opt-${option.groupId}`}>
                          {option.groupName}: {option.choiceName}
                        </p>
                      ))}
                      {line.selectedAddOns.map((addOn) => (
                        <p key={`${line.id}-addon-${addOn.addOnId}`}>+ {addOn.addOnName}</p>
                      ))}
                      {line.notes && <p>Note: {line.notes}</p>}
                    </div>
                  )}
                </>
              );

              return (
                <div
                  key={line.id}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-slate-300"
                >
                  {editable && onEditOrderLine ? (
                    <button className="w-full text-left" onClick={() => onEditOrderLine(line)}>
                      {lineContent}
                    </button>
                  ) : (
                    <div>{lineContent}</div>
                  )}

                  {editable && onRemoveOrderLine && (
                    <button
                      className="mt-2 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600"
                      onClick={() => onRemoveOrderLine(line.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-xl bg-slate-900 px-4 py-4 text-white">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-200">{totalLabel}</span>
          <span className="text-2xl font-semibold">{peso(orderTotal)}</span>
        </div>

        {actionLabel && onAction && (
          <button
            className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
            onClick={onAction}
            disabled={actionDisabled}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
