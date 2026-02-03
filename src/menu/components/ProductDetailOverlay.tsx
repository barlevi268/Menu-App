import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';
import type { MenuItem, MenuItemOption, OrderItemDraft } from '../types';
import { buildDisplayPrice, formatPrice, getOptionPrice, getRowBasePrice } from '../utils/pricing';

type ProductDetailOverlayProps = {
  isOpen: boolean;
  product: MenuItem | null;
  imageSrc?: string | null;
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
  imageSrc,
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
  const [isMorphing, setIsMorphing] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const morphOuterRef = useRef<HTMLDivElement | null>(null);
  const morphTimeoutsRef = useRef<number[]>([]);
  const isAnimatingRef = useRef(false);
  const isMountedRef = useRef(true);

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

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (!isAnimatingRef.current) {
        morphTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
        morphTimeoutsRef.current = [];
        if (morphOuterRef.current) {
          morphOuterRef.current.remove();
          morphOuterRef.current = null;
        }
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen) return;
    if (isMountedRef.current) {
      setIsMorphing(false);
    }
    isAnimatingRef.current = false;
    if (addButtonRef.current) {
      addButtonRef.current.classList.remove('success');
    }
  }, [isOpen]);

  if (!product) return null;
  const resolvedImage = imageSrc ?? product.image ?? null;

  const selectedOption: MenuItemOption | null =
    filteredOptions[selectedOptionIndex] ?? null;
  const unitPrice = selectedOption
    ? getOptionPrice(selectedOption)
    : getRowBasePrice(product);
  const lineTotal = unitPrice * quantity;

  const pushTimeout = (cb: () => void, delay: number) => {
    const id = window.setTimeout(cb, delay);
    morphTimeoutsRef.current.push(id);
  };

  const createRipple = (
    btn: HTMLButtonElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('div');
    ripple.className = 'menu-ripple';
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${clientX - rect.left - size / 2}px`;
    ripple.style.top = `${clientY - rect.top - size / 2}px`;
    btn.appendChild(ripple);
    pushTimeout(() => ripple.remove(), 600);
  };

  const spawnParticles = (cx: number, cy: number) => {
    const palette = ['#e8d5b0', '#c9a96e', '#f0e6cc', '#b8895a', '#efe0c2', '#dcc899'];
    for (let i = 0; i < 12; i += 1) {
      const particle = document.createElement('div');
      particle.className = 'menu-particle';
      document.body.appendChild(particle);
      const angle = (Math.PI * 2 / 12) * i + (Math.random() - 0.5) * 0.5;
      const distance = 28 + Math.random() * 38;
      const size = 3 + Math.random() * 5;
      const duration = 400 + Math.random() * 250;
      particle.style.left = `${cx - size / 2}px`;
      particle.style.top = `${cy - size / 2}px`;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.background = palette[i % palette.length];
      const animation = particle.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: '1' },
          {
            transform: `translate(${Math.cos(angle) * distance}px, ${
              Math.sin(angle) * distance
            }px) scale(0)`,
            opacity: '0',
          },
        ],
        { duration, easing: 'cubic-bezier(0,.8,.5,1)', fill: 'forwards' }
      );
      animation.onfinish = () => particle.remove();
    }
  };

  const runMorphAnimation = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    if (isAnimatingRef.current) return false;
    const panel = panelRef.current;
    const btn = addButtonRef.current;
    const cartBtn = document.querySelector('[data-order-fab]') as HTMLElement | null;
    if (!panel || !btn || !cartBtn) return false;

    try {
      isAnimatingRef.current = true;
      setIsMorphing(true);

      createRipple(btn, event.clientX, event.clientY);
      btn.classList.add('success');

      const panelRect = panel.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const cartRect = cartBtn.getBoundingClientRect();
      const targetSize = Math.min(cartRect.width, cartRect.height);
      const targetCenterX = cartRect.left + cartRect.width / 2;
      const targetCenterY = cartRect.top + cartRect.height / 2;
      const panelCenterX = panelRect.left + panelRect.width / 2;
      const panelCenterY = panelRect.top + panelRect.height / 2;
      const totalTx = targetCenterX - panelCenterX;
      const totalTy = targetCenterY - panelCenterY;
      const endScale = targetSize / panelRect.width;
      const phaseBStartScale = endScale * 3.8;

      const clone = panel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('*').forEach((el) => {
        const element = el as HTMLElement;
        element.style.transition = 'none';
        element.style.animation = 'none';
      });

      const scrollEl = panel.querySelector('.menu-detail-scroll') as HTMLElement | null;
      const scrollTop = scrollEl?.scrollTop ?? 0;
      const cloneScroll = clone.querySelector('.menu-detail-scroll') as HTMLElement | null;
      if (cloneScroll) {
        cloneScroll.style.overflow = 'visible';
        cloneScroll.style.paddingBottom = '0';
        const shifter = document.createElement('div');
        shifter.style.marginTop = `${-scrollTop}px`;
        while (cloneScroll.firstChild) {
          shifter.appendChild(cloneScroll.firstChild);
        }
        cloneScroll.appendChild(shifter);
      }

      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));

      const outer = document.createElement('div');
      outer.className = 'menu-morph-outer';
      outer.style.left = `${panelRect.left}px`;
      outer.style.top = `${panelRect.top}px`;
      outer.style.width = `${panelRect.width}px`;
      outer.style.height = `${panelRect.height}px`;

      const inner = document.createElement('div');
      inner.className = 'menu-morph-inner';
      inner.style.width = `${panelRect.width}px`;
      inner.style.height = `${panelRect.height}px`;

      clone.style.position = 'absolute';
      clone.style.top = '0';
      clone.style.left = '0';
      clone.style.width = `${panelRect.width}px`;
      clone.style.height = `${panelRect.height}px`;
      clone.style.overflow = 'hidden';

      inner.appendChild(clone);
      outer.appendChild(inner);
      document.body.appendChild(outer);
      morphOuterRef.current = outer;

      outer.animate(
        [
          { transform: 'translate(0px, 0px)', offset: 0 },
          { transform: 'translate(0px, 0px)', offset: 0.42 },
          { transform: `translate(${totalTx}px, ${totalTy * 0.7}px)`, offset: 0.78 },
          { transform: `translate(${totalTx}px, ${totalTy}px)`, offset: 1 },
        ],
        { duration: 680, easing: 'linear', fill: 'forwards' }
      );

      inner.animate(
        [
          { transform: 'scale(1)', borderRadius: '0px', opacity: '1', offset: 0 },
          { transform: 'scale(0.88)', borderRadius: '4%', opacity: '1', offset: 0.18 },
          {
            transform: `scale(${phaseBStartScale})`,
            borderRadius: '14%',
            opacity: '1',
            offset: 0.42,
          },
          {
            transform: `scale(${endScale * 2.0})`,
            borderRadius: '30%',
            opacity: '0.85',
            offset: 0.68,
          },
          {
            transform: `scale(${endScale * 1.25})`,
            borderRadius: '44%',
            opacity: '0.5',
            offset: 0.85,
          },
          {
            transform: `scale(${endScale})`,
            borderRadius: '50%',
            opacity: '0',
            offset: 1,
          },
        ],
        {
          duration: 680,
          easing: 'cubic-bezier(.4, 0, .2, 1)',
          fill: 'forwards',
        }
      );

      spawnParticles(btnRect.left + btnRect.width / 2, btnRect.top + btnRect.height / 2);

      const cartBadge = document.querySelector('[data-order-fab-count]') as HTMLElement | null;
      pushTimeout(() => {
        cartBtn.classList.add('pop');
        if (cartBadge) cartBadge.classList.add('pop');
        pushTimeout(() => {
          cartBtn.classList.remove('pop');
          if (cartBadge) cartBadge.classList.remove('pop');
        }, 340);
      }, 600);

      pushTimeout(() => {
        if (morphOuterRef.current) {
          morphOuterRef.current.remove();
          morphOuterRef.current = null;
        }
        if (btn) btn.classList.remove('success');
        if (isMountedRef.current) {
          setIsMorphing(false);
        }
        isAnimatingRef.current = false;
        morphTimeoutsRef.current = [];
      }, 1600);

      return true;
    } catch (error) {
      if (morphOuterRef.current) {
        morphOuterRef.current.remove();
        morphOuterRef.current = null;
      }
      if (btn) btn.classList.remove('success');
      if (isMountedRef.current) {
        setIsMorphing(false);
      }
      isAnimatingRef.current = false;
      morphTimeoutsRef.current = [];
      return false;
    }
  };

  const handleAdd = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (!onAddToOrder) return;
    const draft = {
      productId: String(product.$id ?? product.id ?? product.name ?? 'item'),
      name: product.name ?? 'Item',
      image: product.image ?? null,
      variant: selectedVariant ?? null,
      optionName: selectedOption?.name ?? null,
      note,
      quantity,
      unitPrice,
    };
    const didAnimate = runMorphAnimation(event);
    if (didAnimate) {
      pushTimeout(() => onAddToOrder(draft), 560);
    } else {
      onAddToOrder(draft);
    }
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div
          className="menu-overlay"
          aria-hidden={!isOpen}
          style={{ pointerEvents: isMorphing ? 'none' : 'auto' }}
        >
          <motion.div
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: isMorphing ? 0 : 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={isMorphing ? undefined : onClose}
            style={{ pointerEvents: isMorphing ? 'none' : 'auto' }}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={`${paperView ? 'bg-[#FFFBF7] dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800'} menu-detail-panel max-w-[450px]`}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: isMorphing ? 0 : 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 25, opacity: { duration: 0.22 } }}
            style={{ pointerEvents: isMorphing ? 'none' : 'auto' }}
            ref={panelRef}
          >
            <div className="relative">
              {resolvedImage && (
                <img
                  src={resolvedImage}
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

            <div className="menu-detail-scroll">
              <div
                className={`menu-detail-content ${customerOrdersMode ? 'pb-32' : ''}`}
              >
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-7">
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
                  <div className="mt-6 space-y-4">
                    {/* <div className="flex items-center justify-between">
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
                    </div> */}

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
                  </div>
                )}
              </div>
            </div>
            </div>
            {customerOrdersMode && onAddToOrder && (
              <div className="menu-detail-cta">
                <button
                  type="button"
                  onClick={handleAdd}
                  className="menu-primary-button-cta menu-add-btn"
                  ref={addButtonRef}
                  disabled={isMorphing}
                >
                  <span className="menu-add-btn-text">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                    </svg>
                    Add to order · {formatPrice(lineTotal, { paperView })}
                  </span>
                  <span className="menu-add-btn-check">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Added!
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ProductDetailOverlay;
