import React, { useState } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import type { OrderLine } from "../types";

// Add CSS animations for order items
const animationStyles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;

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
  onClearCart?: () => void;
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
  onClearCart,
}: OrderSummaryPanelProps) {
  const [slideStates, setSlideStates] = useState<{ [key: string]: number }>({});
  const [touchStartX, setTouchStartX] = useState<{ [key: string]: number }>({});
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const handleTouchStart = (lineId: string, e: React.TouchEvent) => {
    setTouchStartX((prev) => ({ ...prev, [lineId]: e.touches[0].clientX }));
  };

  const handleTouchMove = (lineId: string, e: React.TouchEvent) => {
    const startX = touchStartX[lineId];
    if (startX === undefined) return;

    const currentX = e.touches[0].clientX;
    const diff = startX - currentX;
    const maxSwipe = 80;
    const slide = Math.min(Math.max(diff, 0), maxSwipe);

    setSlideStates((prev) => ({ ...prev, [lineId]: slide }));
  };

  const handleTouchEnd = (lineId: string) => {
    const slide = slideStates[lineId] ?? 0;
    if (slide > 40) {
      setSlideStates((prev) => ({ ...prev, [lineId]: 80 }));
    } else {
      setSlideStates((prev) => ({ ...prev, [lineId]: 0 }));
    }
    setTouchStartX((prev) => ({ ...prev, [lineId]: 0 }));
  };

  const resetSlide = (lineId: string) => {
    setSlideStates((prev) => ({ ...prev, [lineId]: 0 }));
  };

  const handleRemoveWithAnimation = (lineId: string) => {
    setRemovingIds((prev) => new Set([...prev, lineId]));
    setTimeout(() => {
      onRemoveOrderLine?.(lineId);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(lineId);
        return next;
      });
    }, 200);
  };

  const handleClearCart = () => {
    if (!onClearCart || orderLines.length === 0) return;
    const confirmed = window.confirm("Are you sure you want to clear the cart?");
    if (!confirmed) return;
    onClearCart();
  };

  React.useEffect(() => {
    if (!document.getElementById("order-item-animations")) {
      const style = document.createElement("style");
      style.id = "order-item-animations";
      style.textContent = animationStyles;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className={className}>


        {onClearCart && (
                <div className="mb-4 flex items-center justify-between gap-3">
          <button
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={handleClearCart}
            disabled={orderLines.length === 0}
            aria-label="Clear cart"
            title="Clear cart"
          >
            <Trash2 size={16} />
          </button>
          </div>
        )}
      

      <div className={listClassName ?? "mt-3 min-h-0 flex-1 overflow-auto pr-1"}>
        {orderLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
            <ShoppingCart size={40} className="mb-3 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orderLines.map((line, index) => {
              const unitPrice = getUnitPrice(line);
              const hasDetails =
                line.selectedOptions.length > 0 ||
                line.selectedAddOns.length > 0 ||
                line.notes;
              const lineContent = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                          {line.quantity}
                        </span>
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {line.productName}
                        </p>
                      </div>
                      {line.quantity > 1 && (
                        <p className="mt-1 text-xs text-slate-500">Unit: {peso(unitPrice)}</p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-bold text-slate-900">{peso(getLineTotal(line))}</p>
                  </div>

                  {hasDetails && (
                    <div className="mt-2 space-y-1 rounded-lg bg-slate-100 p-2.5 text-xs text-slate-700">
                      {line.selectedOptions.map((option) => (
                        <div
                          key={`${line.id}-opt-${option.groupId}`}
                          className="flex gap-2"
                        >
                          <span className="font-semibold text-slate-600">
                            {option.groupName}:
                          </span>
                          <span>{option.choiceName}</span>
                        </div>
                      ))}
                      {line.selectedAddOns.map((addOn) => (
                        <div
                          key={`${line.id}-addon-${addOn.addOnId}`}
                          className="pl-2"
                        >
                          <span className="text-emerald-600">+</span> {addOn.addOnName}
                        </div>
                      ))}
                      {line.notes && (
                        <div className="border-t border-slate-300 pt-2 italic">
                          "{line.notes}"
                        </div>
                      )}
                    </div>
                  )}
                </>
              );

              return (
                <div
                  key={line.id}
                  className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-200 ${
                    removingIds.has(line.id)
                      ? "slide-out-to-right opacity-0 translate-x-full"
                      : "opacity-100 translate-x-0"
                  }`}
                  style={{
                    animation: removingIds.has(line.id)
                      ? undefined
                      : `slideIn 0.3s ease-out ${index * 50}ms both`,
                  } as React.CSSProperties}
                  onTouchStart={(e) => handleTouchStart(line.id, e)}
                  onTouchMove={(e) => handleTouchMove(line.id, e)}
                  onTouchEnd={() => handleTouchEnd(line.id)}
                >
                  {/* Hidden delete button revealed on swipe */}
                  {editable && onRemoveOrderLine && (
                    <button
                      className="absolute right-0 top-0 h-full w-20 flex items-center justify-center bg-red-600 hover:bg-red-700 transition"
                      onClick={() => {
                        handleRemoveWithAnimation(line.id);
                        resetSlide(line.id);
                      }}
                    >
                      <Trash2 size={20} className="text-white" />
                    </button>
                  )}

                  {/* Sliding content */}
                  <div
                    className="transition-transform duration-200"
                    style={{ transform: `translateX(-${slideStates[line.id] ?? 0}px)` }}
                  >
                    {editable && onEditOrderLine ? (
                      <button
                        className="w-full bg-white p-3 text-left transition active:scale-95"
                        onClick={() => {
                          onEditOrderLine(line);
                          resetSlide(line.id);
                        }}
                      >
                        {lineContent}
                      </button>
                    ) : (
                      <div className="bg-white p-3">
                        {lineContent}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {actionLabel && onAction ? (
        <button
          className="mt-4 flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-4 text-base font-bold text-white shadow-md transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-400 disabled:to-slate-500 disabled:shadow-none active:scale-95"
          onClick={onAction}
          disabled={actionDisabled}
        >
          <span>{actionLabel}</span>
          <span>{peso(orderTotal)}</span>
        </button>
      ) : (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 px-5 py-5 text-white shadow-lg">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-slate-300">{totalLabel}</span>
            <span className="text-3xl font-bold">{peso(orderTotal)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
