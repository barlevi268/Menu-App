import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

type OrderSuccessPanelProps = {
  isOpen: boolean;
  onBackToMenu: () => void;
  onClear: () => void;
};

const qrPattern = [
  '111111111111111',
  '100000100000001',
  '101110101110101',
  '101110101110101',
  '101110101110101',
  '100000100000001',
  '111111111111111',
  '000100011001000',
  '111010111010111',
  '001001000100100',
  '110111010111011',
  '000010001000010',
  '111011101110111',
  '100000100000001',
  '111111111111111',
];

const PaymentQRCode = () => {
  const cells = qrPattern.flatMap((row) => row.split(''));
  return (
    <div className="bg-white rounded-3xl p-5 shadow-lg">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
      >
        {cells.map((cell, index) => (
          <span
            key={`qr-${index}`}
            className={`block w-2.5 h-2.5 ${cell === '1' ? 'bg-black' : 'bg-transparent'}`}
          />
        ))}
      </div>
    </div>
  );
};

const OrderSuccessPanel = ({ isOpen, onBackToMenu, onClear }: OrderSuccessPanelProps) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="menu-overlay" aria-hidden={!isOpen}>
          <motion.div
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onBackToMenu}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className="menu-sheet menu-sheet-md items-center text-center"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 240, damping: 25 }}
          >
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-5">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Your order has been accepted
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  Please scan the QR code below to complete payment.
                </p>
              </div>
              <PaymentQRCode />
            </div>
            <div className="menu-sheet-footer-stack">
              <button
                type="button"
                onClick={onBackToMenu}
                className="menu-primary-button"
              >
                Back to menu
              </button>
              <button
                type="button"
                onClick={onClear}
                className="menu-secondary-button"
              >
                Clear order
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default OrderSuccessPanel;
