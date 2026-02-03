import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatPrice } from '../utils/pricing';

type OrderFloatingButtonProps = {
  totalItems: number;
  totalPrice: number;
  onClick: () => void;
  paperView: boolean;
  mode?: 'cart' | 'ongoing';
  statusLabel?: string | null;
  isHidden?: boolean;
};

const formatStatusLabel = (value: string | null | undefined) => {
  if (!value) return 'Unknown';
  return value
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const OrderFloatingButton = ({
  totalItems,
  totalPrice,
  onClick,
  paperView,
  mode = 'cart',
  statusLabel,
  isHidden,
}: OrderFloatingButtonProps) => {
  const isOngoing = mode === 'ongoing';
  const shouldHide = isHidden ?? (!isOngoing && totalItems <= 0);

  return (
    <div className="menu-fab-wrapper">
      <button
        data-order-fab
        type="button"
        onClick={onClick}
        className="menu-fab-button"
        aria-hidden={shouldHide ? true : undefined}
        tabIndex={shouldHide ? -1 : undefined}
        style={shouldHide ? { opacity: 0, pointerEvents: 'none' } : undefined}
      >
        {isOngoing ? (
          <>
            <span className="menu-fab-text">
              <span className="relative flex h-3 w-3 items-center justify-center mr-1">
                <span className="absolute inline-flex h-full w-full animate-ping animate-ping-slow rounded-full bg-sky-300 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
              </span>
              <div className='text-left'>
                <span className="text-sm font-semibold text-gray-50">
                  Your order is being processed.
                </span>
                <div className="text-xs text-gray-200">
                  Status: {formatStatusLabel(statusLabel)}
                </div>
              </div>
            </span>
            <span className="menu-fab-text">
              <ChevronRight className="w-5 h-5" />
            </span>
          </>
        ) : (
          <>
            <span className="menu-fab-text">
              <span className="menu-fab-count" data-order-fab-count>
                {totalItems}
              </span>
              My Order
            </span>
            <span className="menu-fab-text">
              {formatPrice(totalPrice, { paperView })}
              <ChevronRight className="w-6 h-6" />
            </span>
          </>
        )}
      </button>
    </div>
  );
};

export default OrderFloatingButton;
