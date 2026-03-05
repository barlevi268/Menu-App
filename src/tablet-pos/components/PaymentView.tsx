import React from "react";
import type { OrderLine, PaymentMethod, PaymentMethodOption } from "../types";
import OrderSummaryPanel from "./OrderSummaryPanel";

type PaymentViewProps = {
  paymentMethods: PaymentMethodOption[];
  selectedPaymentMethod: PaymentMethod;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onBackToPos: () => void;
  cashAmount: number;
  orderTotal: number;
  changeAmount: number;
  onAddPresetBill: (bill: number) => void;
  onAppendCashInput: (char: string) => void;
  onBackspaceCashInput: () => void;
  onSettleCash: () => void;
  canTenderCash: boolean;
  onSettleDigitalPayment: () => void;
  canSettleDigital: boolean;
  isSubmitting: boolean;
  paymentError: string;
  orderLines: OrderLine[];
  getUnitPrice: (line: OrderLine) => number;
  getLineTotal: (line: OrderLine) => number;
  peso: (amount: number) => string;
};

export default function PaymentView({
  paymentMethods,
  selectedPaymentMethod,
  onSelectPaymentMethod,
  onBackToPos,
  cashAmount,
  orderTotal,
  changeAmount,
  onAddPresetBill,
  onAppendCashInput,
  onBackspaceCashInput,
  onSettleCash,
  canTenderCash,
  onSettleDigitalPayment,
  canSettleDigital,
  isSubmitting,
  paymentError,
  orderLines,
  getUnitPrice,
  getLineTotal,
  peso,
}: PaymentViewProps) {
  const selectedMethod = paymentMethods.find((method) => method.id === selectedPaymentMethod) ?? null;
  const isCashSelected = selectedMethod?.kind === "cash";

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mx-auto flex h-[calc(100vh-2rem)] max-w-[1400px] gap-4 md:gap-6">
        <section className="w-[62%] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-900">Payment</h2>
            <button
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onBackToPos}
              disabled={isSubmitting}
            >
              Back to POS
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                className={`min-w-[140px] shrink-0 rounded-xl border px-3 py-3 text-center transition ${
                  selectedPaymentMethod === method.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
                onClick={() => onSelectPaymentMethod(method.id)}
                disabled={isSubmitting}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-slate-700">{method.icon}</span>
                  <p className="text-sm font-semibold text-slate-900">{method.label}</p>
                </div>
              </button>
            ))}
          </div>

          {paymentError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {paymentError}
            </div>
          )}

          {isCashSelected ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-700">Amount Given</p>
              <div className="mt-2 rounded-xl bg-white px-3 py-3 text-2xl font-semibold text-slate-900">
                {peso(cashAmount || 0)}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[20, 50, 100, 200, 500, 1000].map((bill) => (
                  <button
                    key={bill}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => onAddPresetBill(bill)}
                    disabled={isSubmitting}
                  >
                    +{bill}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
                  <button
                    key={key}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-3 text-base font-semibold text-slate-800 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => onAppendCashInput(key)}
                    disabled={isSubmitting}
                  >
                    {key}
                  </button>
                ))}
                <button
                  className="rounded-lg border border-slate-300 bg-white px-2 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onBackspaceCashInput}
                  disabled={isSubmitting}
                >
                  Del
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Total Due</span>
                  <span className="font-semibold text-slate-900">{peso(orderTotal)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Change</span>
                  <span className="font-semibold text-green-600">{peso(changeAmount)}</span>
                </div>
              </div>

              <button
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
                onClick={onSettleCash}
                disabled={!canTenderCash}
              >
                {isSubmitting ? "Processing..." : "Tender Cash"}
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-600">
                Confirm payment and mark this transaction as paid via{" "}
                <span className="font-semibold text-slate-900">{selectedMethod?.label ?? "Selected method"}</span>.
              </p>
              <button
                className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
                onClick={onSettleDigitalPayment}
                disabled={!canSettleDigital}
              >
                {isSubmitting ? "Processing..." : "Confirm Payment"}
              </button>
            </div>
          )}
        </section>

        <section className="flex-1 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <OrderSummaryPanel
            title="Current Order"
            className="flex h-full flex-col"
            listClassName="mt-3 min-h-0 flex-1 overflow-auto pr-2"
            orderLines={orderLines}
            getUnitPrice={getUnitPrice}
            getLineTotal={getLineTotal}
            orderTotal={orderTotal}
            peso={peso}
            totalLabel="Total"
          />
        </section>
      </div>
    </div>
  );
}
