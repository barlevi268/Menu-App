import React, { useState } from 'react';
import { X } from 'lucide-react';

type ImageViewerProps = {
  src: string;
  visible: boolean;
  onClose: () => void;
};

const ImageViewer = ({ src, visible, onClose }: ImageViewerProps) => {
  const [scale, setScale] = useState(1);
  const [position] = useState({ x: 0, y: 0 });
  const [initialTouchDistance, setInitialTouchDistance] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialTouchDistance(distance);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialTouchDistance !== null) {
      e.preventDefault();
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newScale = Math.min(Math.max(scale * (distance / initialTouchDistance), 1), 4);
      setScale(newScale);
      setInitialTouchDistance(distance);
    }
  };

  const handleTouchEnd = () => {
    setInitialTouchDistance(null);
  };

  return (
    <div
      className={`fixed inset-0 z-[60] bg-black ${visible ? '' : 'pointer-events-none opacity-0'}`}
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 z-[61]">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={src}
          alt="Full size view"
          className="max-w-full max-h-full object-contain"
          style={{
            transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
            transition: initialTouchDistance ? 'none' : 'transform 0.2s',
          }}
        />
      </div>
    </div>
  );
};

export default ImageViewer;
