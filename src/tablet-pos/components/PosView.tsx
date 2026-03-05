import React from "react";
import { PAGE_SIZE } from "../mockData";
import type { Category, OrderLine, Product } from "../types";
import OrderSummaryPanel from "./OrderSummaryPanel";

type PosViewProps = {
  loggedInUserName: string;
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
  getUnitPrice: (line: OrderLine) => number;
  getLineTotal: (line: OrderLine) => number;
  peso: (amount: number) => string;
};

export default function PosView({
  loggedInUserName,
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
  getUnitPrice,
  getLineTotal,
  peso,
}: PosViewProps) {
  return (
    <div className="min-h-screen bg-slate-100 p-3 md:p-4">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1600px] gap-4">
        <main className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <header className="flex items-center gap-2 overflow-x-auto pb-2 whitespace-nowrap">
            {categories.map((category) => {
              const selected = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 text-slate-700 hover:border-slate-400"
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
                            className="flex min-h-[110px] flex-col rounded-xl border border-slate-200 bg-white p-1 text-center transition hover:border-slate-300 hover:shadow-sm"
                            onClick={() => onProductClick(product)}
                          >
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-[74px] w-full rounded-lg object-cover"
                            />
                            <div className="flex flex-1 items-center justify-center px-1">
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

            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                onClick={onPrevPage}
                disabled={currentPage === 0}
              >
                Prev
              </button>

              {pagedProducts.map((_, index) => (
                <button
                  key={`dot-${index}`}
                  className={`h-2.5 rounded-full transition ${
                    currentPage === index ? "w-6 bg-slate-700" : "w-2.5 bg-slate-300"
                  }`}
                  onClick={() => onSetPage(index)}
                  aria-label={`Go to page ${index + 1}`}
                />
              ))}

              <button
                className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40"
                onClick={onNextPage}
                disabled={currentPage >= pagedProducts.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        </main>

        <aside className="flex w-[34%] flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Cashier</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{loggedInUserName}</p>
          </div>

          <OrderSummaryPanel
            title="Current Order"
            className="mt-4 flex min-h-0 flex-1 flex-col"
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
