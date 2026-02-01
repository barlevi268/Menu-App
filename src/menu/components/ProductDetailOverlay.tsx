import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import type { MenuItem, MenuItemOption, OrderItemDraft } from '../types';
import { buildDisplayPrice, formatPrice, getOptionPrice, getRowBasePrice } from '../utils/pricing';

type ProductDetailOverlayProps = {
  isOpen: boolean;
  product: MenuItem | null;
  selectedVariant: string | null;
  onVariantChange: (variant: string | null) => void;
  onClose: () => void;
  onOpenImageViewer: () => void;
  activeTheme: any;
  isCustomColor: boolean;
  customerOrdersMode: boolean;
  onAddToOrder?: (item: OrderItemDraft) => void;
  paperView: boolean;
};

const ProductDetailOverlay = ({
  isOpen,
  product,
  selectedVariant,
  onVariantChange,
  onClose,
  onOpenImageViewer,
  activeTheme,
  isCustomColor,
  customerOrdersMode,
  onAddToOrder,
  paperView,
}: ProductDetailOverlayProps) => {
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);

  const options = useMemo(() => product?.options ?? [], [product]);
  const variants = useMemo(
    () =>
      Array.from(
        new Set(
          options
            .map((opt) => opt.variant)
            .filter((variant): variant is string => Boolean(variant))
        )
      ),
    [options]
  );

  const filteredOptions = useMemo(() => {
    if (!selectedVariant) return options;
    return options.filter((opt) => opt.variant === selectedVariant);
  }, [options, selectedVariant]);

  useEffect(() => {
    setSelectedOptionIndex(0);
  }, [selectedVariant, product?.$id, product?.id]);

  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setNote('');
      setSelectedOptionIndex(0);
    }
  }, [isOpen]);

  if (!product) return null;

  const selectedOption: MenuItemOption | null =
    filteredOptions[selectedOptionIndex] ?? null;
  const unitPrice = selectedOption
    ? getOptionPrice(selectedOption)
    : getRowBasePrice(product);
  const lineTotal = unitPrice * quantity;

  const handleAdd = () => {
    if (!onAddToOrder) return;
    onAddToOrder({
      productId: String(product.$id ?? product.id ?? product.name ?? 'item'),
      name: product.name ?? 'Item',
      image: product.image ?? null,
      variant: selectedVariant ?? null,
      optionName: selectedOption?.name ?? null,
      note,
      quantity,
      unitPrice,
    });
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="menu-overlay" aria-hidden={!isOpen}>
          <motion.div
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={`${paperView ? 'bg-[#FFFBF7] dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'} menu-detail-panel max-w-[450px]`}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: product.image ? 0 : 288, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 25 }}
          >
            <div className="relative">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name ?? 'Product image'}
                  className="menu-detail-image"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenImageViewer();
                  }}
                />
              )}
              <div className="absolute top-4 right-4">
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="menu-detail-close"
                >
                  <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                </button>
              </div>
            </div>

            <div className="menu-detail-content max-h-[60vh]">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {product.name}
                </h1>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {product.description}
                </p>

                {Array.isArray(product.options) && product.options.length > 0 ? (
                  <>
                    {(() => {
                      const hasVariants = variants.length > 0;
                      const filtered = filteredOptions;

                      return hasVariants ? (
                        <div className="mt-4 space-y-4">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Choose Type:
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {variants.map((variant) => (
                                <button
                                  key={variant}
                                  onClick={() => onVariantChange(variant)}
                                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                    selectedVariant === variant
                                      ? ('isCustom' in activeTheme && activeTheme.isCustom)
                                        ? 'text-white'
                                        : (activeTheme as any).chipActive
                                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}
                                  style={
                                    selectedVariant === variant && isCustomColor
                                      ? { backgroundColor: (activeTheme as any).chipActive }
                                      : undefined
                                  }
                                >
                                  {variant}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1 border-t dark:border-gray-700 pt-4">
                            {filtered.map((option, index) => {
                              const key = `${option.name ?? 'option'}-${index}`;
                              if (customerOrdersMode) {
                                const isSelected = index === selectedOptionIndex;
                                return (
                                  <button
                                    key={key}
                                    type="button"
                                    onClick={() => setSelectedOptionIndex(index)}
                                    className={`w-full flex items-center justify-between rounded-lg border px-3 py-3 text-sm transition ${
                                      isSelected
                                        ? 'border-gray-800 dark:border-gray-200 bg-gray-100 dark:bg-gray-700'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    <span className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">●</span>
                                      <span className="font-semibold text-gray-700 dark:text-gray-200">
                                        {option.name || 'Option'}
                                      </span>
                                    </span>
                                    <span className="text-gray-700 dark:text-gray-300">
                                      {buildDisplayPrice({ options: [option] }, { paperView })}
                                    </span>
                                  </button>
                                );
                              }

                              return (
                                <div
                                  key={key}
                                  className="flex flex-row items-center text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 py-3 px-1"
                                >
                                  <span className="text-xs mr-2 text-gray-700 dark:text-gray-400">
                                    ●
                                  </span>
                                  <span className="font-semibold">
                                    {option.name || 'Option'}
                                  </span>
                                  <span className="mx-2">-</span>
                                  <span>{buildDisplayPrice({ options: [option] }, { paperView })}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 space-y-1">
                          {product.options.map((option, index) => {
                            const key = `${option.name ?? 'option'}-${index}`;
                            if (customerOrdersMode) {
                              const isSelected = index === selectedOptionIndex;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setSelectedOptionIndex(index)}
                                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-3 text-sm transition ${
                                    isSelected
                                      ? 'border-gray-800 dark:border-gray-200 bg-gray-100 dark:bg-gray-700'
                                      : 'border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">●</span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                                      {option.name || 'Option'}
                                    </span>
                                  </span>
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {buildDisplayPrice({ options: [option] }, { paperView })}
                                  </span>
                                </button>
                              );
                            }

                            return (
                              <div
                                key={key}
                                className="flex flex-row items-center text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 py-3 px-1"
                              >
                                <span className="text-xs mr-2 text-gray-700 dark:text-gray-400">●</span>
                                <span className="font-semibold">{option.name || 'Option'}</span>
                                <span className="mx-2">-</span>
                                <span>{buildDisplayPrice({ options: [option] }, { paperView })}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                ) : (
                  <div className={`${activeTheme.accentText} mb-4`}>
                    {buildDisplayPrice(product, { paperView })}
                  </div>
                )}

                {customerOrdersMode && (
                  <div className="menu-detail-sticky">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                          className="menu-stepper-button-muted"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQuantity((prev) => prev + 1)}
                          className="menu-stepper-button-muted"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Item total</div>
                        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          {formatPrice(lineTotal, { paperView })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Add a note (optional)
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Extra ice, no sugar, etc."
                        className="menu-input"
                        rows={3}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAdd}
                      className="menu-primary-button-cta"
                    >
                      Add to order · {formatPrice(lineTotal, { paperView })}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailOverlay;
