import React from "react";
import { ImageOff, X } from "lucide-react";
import type { ConfigDraft, ConfigModalState } from "../types";

type ItemConfigModalProps = {
  configModal: ConfigModalState;
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateDraft: (updater: (draft: ConfigDraft) => ConfigDraft) => void;
  peso: (amount: number) => string;
};

export default function ItemConfigModal({
  configModal,
  canSave,
  onClose,
  onSave,
  onUpdateDraft,
  peso,
}: ItemConfigModalProps) {
  const [isClosing, setIsClosing] = React.useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 200);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-5 transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
    >
      <div 
        className={`max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl transition-all duration-300 ${
          isClosing 
            ? "scale-95 opacity-0 translate-y-4" 
            : "scale-100 opacity-100 translate-y-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Item Configuration</p>
            <h3 className="text-lg font-semibold text-slate-900">{configModal.product.name}</h3>
          </div>
          <button
            className="rounded-full border border-slate-300 p-2 text-slate-600"
            onClick={handleClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(92vh-6.5rem)] overflow-auto p-4">
          <div className="flex gap-4">
            {configModal.product.image ? (
              <img
                src={configModal.product.image}
                alt={configModal.product.name}
                className="h-24 w-24 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <ImageOff size={28} />
              </div>
            )}
            <div>
              <p className="text-sm text-slate-600">Base Price</p>
              <p className="text-xl font-semibold text-slate-900">{peso(configModal.product.price)}</p>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {(configModal.product.options ?? []).map((group) => (
              <section key={group.id} className="rounded-xl border border-slate-200 p-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  {group.name} {group.required && <span className="text-red-500">*</span>}
                </h4>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {group.choices.map((choice) => {
                    const selected = configModal.draft.selectedOptionByGroup[group.id] === choice.id;
                    return (
                      <button
                        key={choice.id}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                        }`}
                        onClick={() =>
                          onUpdateDraft((draft) => ({
                            ...draft,
                            selectedOptionByGroup: {
                              ...draft.selectedOptionByGroup,
                              [group.id]: choice.id,
                            },
                          }))
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{choice.name}</span>
                          <span className="font-medium text-slate-900">
                            {choice.priceDelta > 0 ? `+${peso(choice.priceDelta)}` : "Included"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            {(configModal.product.addOnGroups ?? []).map((group) => (
              <section key={group.id} className="rounded-xl border border-slate-200 p-3">
                <h4 className="text-sm font-semibold text-slate-900">{group.name}</h4>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {group.addOns.map((addOn) => {
                    const selected = configModal.draft.selectedAddOnIds.includes(addOn.id);
                    return (
                      <button
                        key={addOn.id}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                        }`}
                        onClick={() =>
                          onUpdateDraft((draft) => {
                            const selectedIds = draft.selectedAddOnIds.includes(addOn.id)
                              ? draft.selectedAddOnIds.filter((id) => id !== addOn.id)
                              : [...draft.selectedAddOnIds, addOn.id];
                            return {
                              ...draft,
                              selectedAddOnIds: selectedIds,
                            };
                          })
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{addOn.name}</span>
                          <span className="font-medium text-slate-900">+{peso(addOn.price)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}

            <section className="rounded-xl border border-slate-200 p-3">
              <h4 className="text-sm font-semibold text-slate-900">Quantity</h4>
              <div className="mt-2 flex items-center gap-2">
                <button
                  className="h-10 w-10 rounded-lg border border-slate-300 text-xl text-slate-700"
                  onClick={() =>
                    onUpdateDraft((draft) => ({
                      ...draft,
                      quantity: Math.max(1, draft.quantity - 1),
                    }))
                  }
                >
                  -
                </button>
                <div className="h-10 min-w-16 rounded-lg border border-slate-300 px-4 py-2 text-center text-lg font-semibold">
                  {configModal.draft.quantity}
                </div>
                <button
                  className="h-10 w-10 rounded-lg border border-slate-300 text-xl text-slate-700"
                  onClick={() =>
                    onUpdateDraft((draft) => ({
                      ...draft,
                      quantity: Math.min(99, draft.quantity + 1),
                    }))
                  }
                >
                  +
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 p-3">
              <h4 className="text-sm font-semibold text-slate-900">Notes</h4>
              <textarea
                className="mt-2 h-20 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
                placeholder="Special instructions"
                value={configModal.draft.notes}
                onChange={(event) =>
                  onUpdateDraft((draft) => ({
                    ...draft,
                    notes: event.target.value,
                  }))
                }
              />
            </section>
          </div>
        </div>

        <div className="border-t border-slate-200 p-4">
          <button
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-400"
            onClick={onSave}
            disabled={!canSave}
          >
            {configModal.mode === "edit" ? "Save" : "Add"} Item
          </button>
        </div>
      </div>
    </div>
  );
}
