import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, ShoppingBag, Trash2 } from "lucide-react";
import { PAGE_SIZE } from "../mockData";
import type { Category, OrderLine, Product } from "../types";
import OrderSummaryPanel from "./OrderSummaryPanel";

type PosViewProps = {
  loggedInUserName: string;
  hasOpenShift: boolean;
  shiftStartDate: string | null;
  isShiftActionBusy: boolean;
  onOpenShift: () => void;
  onViewShiftSummary: () => void;
  onCloseShift: () => void;
  shiftError: string;
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
  pagedProducts: Product[][];
  currentPage: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onSetPage: (index: number) => void;
  onGridTouchStart: (event: React.TouchEvent<HTMLDivElement>) => void;
  onGridTouchEnd: (event: React.TouchEvent<HTMLDivElement>) => void;
  orderLines: OrderLine[];
  onEditOrderLine: (line: OrderLine) => void;
  onRemoveOrderLine: (lineId: string) => void;
  onProductClick: (product: Product) => void;
  orderTotal: number;
  canPay: boolean;
  onPayNow: () => void;
  onClearCart: () => void;
  getUnitPrice: (line: OrderLine) => number;
  getLineTotal: (line: OrderLine) => number;
  peso: (amount: number) => string;
  loadedImageUrls: Set<string>;
};

export default function PosView({
  loggedInUserName,
  hasOpenShift,
  shiftStartDate,
  isShiftActionBusy,
  onOpenShift,
  onViewShiftSummary,
  onCloseShift,
  shiftError,
  categories,
  selectedCategoryId,
  onSelectCategory,
  pagedProducts,
  currentPage,
  onPrevPage,
  onNextPage,
  onSetPage,
  onGridTouchStart,
  onGridTouchEnd,
  orderLines,
  onEditOrderLine,
  onRemoveOrderLine,
  onProductClick,
  orderTotal,
  canPay,
  onPayNow,
  onClearCart,
  getUnitPrice,
  getLineTotal,
  peso,
  loadedImageUrls,
}: PosViewProps) {
  const [isShiftMenuOpen, setIsShiftMenuOpen] = useState(false);
  const shiftMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isShiftMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!shiftMenuRef.current?.contains(target)) {
        setIsShiftMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isShiftMenuOpen]);

  useEffect(() => {
    if (!hasOpenShift) {
      setIsShiftMenuOpen(false);
    }
  }, [hasOpenShift]);

  const formatShiftTime = (value: string | null) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shiftStartedLabel = formatShiftTime(shiftStartDate);

  const handleClearCartFromHeader = () => {
    if (orderLines.length === 0) return;
    const confirmed = window.confirm("Are you sure you want to clear the cart?");
    if (!confirmed) return;
    onClearCart();
  };

  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-4">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1600px] gap-4">
        <main className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="flex items-center gap-2 overflow-x-auto pb-3 whitespace-nowrap [&::-webkit-scrollbar]:hidden">
            {categories.map((category) => {
              const selected = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                  }`}
                  onClick={() => onSelectCategory(category.id)}
                >
                  {category.name}
                </button>
              );
            })}
          </header>

          <div className="mt-3 flex h-[calc(100%-4rem)] flex-col">
            <div
              className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3"
              onTouchStart={onGridTouchStart}
              onTouchEnd={onGridTouchEnd}
            >
              <div
                className="flex h-full transition-transform duration-300"
                style={{ transform: `translateX(-${currentPage * 100}%)` }}
              >
                {pagedProducts.map((pageItems, pageIndex) => {
                  const emptyCells = Array.from({
                    length: Math.max(0, PAGE_SIZE - pageItems.length),
                  });
                  return (
                    <div key={`page-${pageIndex}`} className="h-full min-w-full">
                      <div className="grid h-full grid-cols-5 grid-rows-5 gap-2">
                        {pageItems.map((product) => (
                          <button
                            key={product.id}
                            className="flex min-h-[110px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:border-slate-400 hover:shadow-md active:scale-95"
                            onClick={() => onProductClick(product)}
                            title={product.name}
                          >
                            {product.image && loadedImageUrls.has(product.image) ? (
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-[74px] w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-[74px] w-full items-center justify-center bg-slate-100 text-slate-400">
                                <ShoppingBag size={22} />
                              </div>
                            )}
                            <div className="flex flex-1 flex-col items-center justify-center px-1">
                              <p className="truncate-2 text-xs font-medium text-slate-700">
                                {product.name}
                              </p>
                            </div>
                          </button>
                        ))}
                        {emptyCells.map((_, index) => (
                          <div
                            key={`empty-${pageIndex}-${index}`}
                            className="rounded-xl border border-dashed border-slate-200"
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={onPrevPage}
                disabled={currentPage === 0}
              >
                « Prev
              </button>

              <div className="flex items-center gap-2">
                {pagedProducts.map((_, index) => (
                  <button
                    key={`dot-${index}`}
                    className={`rounded-full transition ${
                      currentPage === index
                        ? "h-3 w-8 bg-slate-700"
                        : "h-3 w-3 bg-slate-300 hover:bg-slate-400"
                    }`}
                    onClick={() => onSetPage(index)}
                    aria-label={`Go to page ${index + 1}`}
                  />
                ))}
              </div>

              <button
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={onNextPage}
                disabled={currentPage >= pagedProducts.length - 1}
              >
                Next »
              </button>
            </div>
          </div>
        </main>

        <aside className="flex w-[34%] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="border-b mb-4 pb-4">

            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                Cashier: {loggedInUserName}
              </p>
              <div className="flex items-center gap-2">
                {hasOpenShift ? (
                  <div className="relative" ref={shiftMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsShiftMenuOpen((current) => !current)}
                      disabled={isShiftActionBusy}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span>Shift Open</span>
                      <ChevronDown
                        size={14}
                        className={`transition ${isShiftMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isShiftMenuOpen ? (
                      <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                          onClick={() => {
                            setIsShiftMenuOpen(false);
                            onViewShiftSummary();
                          }}
                        >
                          Shift Summary
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                          onClick={() => {
                            setIsShiftMenuOpen(false);
                            onCloseShift();
                          }}
                        >
                          Close Shift
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenShift}
                    disabled={isShiftActionBusy}
                    className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isShiftActionBusy ? "Opening..." : "Open Shift"}
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleClearCartFromHeader}
                  disabled={orderLines.length === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Clear cart"
                  title="Clear cart"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {shiftError ? (
              <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {shiftError}
              </p>
            ) : null}
          </div>

          <OrderSummaryPanel
            title="Current Order"
            className="mt-1 flex min-h-0 flex-1 flex-col"
            orderLines={orderLines}
            getUnitPrice={getUnitPrice}
            getLineTotal={getLineTotal}
            orderTotal={orderTotal}
            peso={peso}
            editable
            onEditOrderLine={onEditOrderLine}
            onRemoveOrderLine={onRemoveOrderLine}
            actionLabel="Pay Now"
            onAction={onPayNow}
            actionDisabled={!canPay}
            totalLabel="Total"
          />
        </aside>
      </div>
    </div>
  );
}
