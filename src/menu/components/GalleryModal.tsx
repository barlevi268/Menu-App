import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

type Gallery = { name: string; images: string[] };

type GalleryModalProps = {
  gallery: Gallery | null;
  imageIndex: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onOpenViewer: () => void;
  activeTheme: any;
  isCustomColor: boolean;
};

const GalleryModal = ({
  gallery,
  imageIndex,
  onIndexChange,
  onClose,
  onOpenViewer,
  activeTheme,
  isCustomColor,
}: GalleryModalProps) => {
  return (
    <AnimatePresence mode="wait">
      {gallery && (
        <div className="menu-overlay" aria-hidden={!gallery}>
          <motion.div
            className="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed max-w-2xl left-0 right-0 top-1/2 bottom-auto mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden"
            initial={{ y: '100%', opacity: 0, scale: 0.9 }}
            animate={{ y: '-50%', opacity: 1, scale: 1 }}
            exit={{ y: '100%', opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 240, damping: 25 }}
          >
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold pt-5 pb-3 text-gray-800 dark:text-gray-100 text-center mb-4">
                {gallery.name}
              </h2>

              <div className="relative w-full px-5 h-100 bg-gray-100 dark:bg-gray-800 overflow-hidden group">
                <motion.div
                  key={imageIndex}
                  drag="x"
                  dragElastic={0.2}
                  dragMomentum
                  onDragEnd={(e, info) => {
                    const swipeThreshold = 50;
                    const swipeVelocityThreshold = 500;
                    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > swipeVelocityThreshold) {
                      if (info.offset.x > 0) {
                        onIndexChange(
                          imageIndex === 0 ? gallery.images.length - 1 : imageIndex - 1
                        );
                      } else {
                        onIndexChange((imageIndex + 1) % gallery.images.length);
                      }
                    }
                  }}
                  initial={{ x: 0 }}
                  animate={{ x: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className="flex w-full h-full gap-5"
                >
                  <div className="w-full h-full flex-shrink-0">
                    <img
                      src={gallery.images[imageIndex]}
                      alt={`Gallery ${imageIndex + 1}`}
                      className="w-full h-full object-contain cursor-zoom-in"
                      onClick={onOpenViewer}
                      draggable={false}
                    />
                  </div>

                  <div className="w-full h-full flex-shrink-0">
                    <img
                      src={gallery.images[(imageIndex + 1) % gallery.images.length]}
                      alt={`Gallery ${(imageIndex + 2) % gallery.images.length}`}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  </div>
                </motion.div>

                <button
                  onClick={() =>
                    onIndexChange(
                      imageIndex === 0 ? gallery.images.length - 1 : imageIndex - 1
                    )
                  }
                  className="absolute left-8 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-all duration-200"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>

                <button
                  onClick={() => onIndexChange((imageIndex + 1) % gallery.images.length)}
                  className="absolute right-8 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-all duration-200"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </div>

              <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                {imageIndex + 1} / {gallery.images.length}
              </div>

              {gallery.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-4">
                  {gallery.images.map((image, index) => (
                    <button
                      key={image}
                      onClick={() => onIndexChange(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === imageIndex
                          ? `border-gray-800 dark:border-gray-200 ${isCustomColor ? '' : `${activeTheme.border}`}`
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                      style={
                        index === imageIndex && isCustomColor
                          ? { borderColor: activeTheme.border }
                          : undefined
                      }
                    >
                      <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GalleryModal;
