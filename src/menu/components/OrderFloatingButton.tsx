import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatPrice } from '../utils/pricing';

type OrderFloatingButtonProps = {
  totalItems: number;
  totalPrice: number;
  onClick: () => void;
  paperView: boolean;
};

const OrderFloatingButton = ({ totalItems, totalPrice, onClick, paperView }: OrderFloatingButtonProps) => {
  if (totalItems <= 0) return null;

  return (
    <div className="menu-fab-wrapper">
      <button
        type="button"
        onClick={onClick}
        className="menu-fab-button"
      >
        <span className="menu-fab-text">
          <span className="menu-fab-count">{totalItems}</span>
          My Order
        </span>
        <span className="menu-fab-text">
          {formatPrice(totalPrice, { paperView })}
          <ChevronRight className="w-6 h-6" />
        </span>
      </button>
    </div>
  );
};

export default OrderFloatingButton;
