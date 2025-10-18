import React, { useState } from 'react';
import { Client, Databases, Query } from "appwrite";
import { Coffee, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const dbclient = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('67d54dea00199fd0947e');

const databases = new Databases(dbclient);

const databaseId = '67d54e3c0008c2ac6a81';
const customerMenuCollection = '687dc62900071ec92f07';
const logoImgSrc = 'https://fra.cloud.appwrite.io/v1/storage/buckets/687dd5ef002a30eca0f9/files/687e5635002794eeec27/view?project=67d54dea00199fd0947e&mode=admin'

const menuCategories = [
  { id: 'all', name: 'All Items' },
  { id: 'tradition', name: 'Tradition' },
  { id: 'brews', name: 'Brews' },
  { id: 'signature', name: 'Signature' },
  { id: 'iced', name: 'Cold & Iced' },
  { id: 'coffeeless', name: 'Coffeeless' },
  { id: 'breakfast', name: 'Breakfast' },
  { id: 'lunch', name: 'Lunch' },
  { id: 'sandwiches', name: 'Sandwiches' },
  { id: 'pastries', name: 'Pastries' },
  { id: 'cookies', name: 'Cookies' },
  { id: 'cakes', name: 'Cakes' },
]

const categoryGroups = [
  { id: 'drinks', name: 'Drinks', categories: ['tradition', 'brews', 'signature', 'iced', 'coffeeless'] },
  { id: 'food', name: 'Food', categories: ['breakfast', 'lunch', 'sandwiches'] },
  { id: 'sweets', name: 'Sweets', categories: ['pastries', 'cookies', 'cakes'] }
];

const ImageViewer = ({ src, visible, onClose }: { src: string; visible: boolean; onClose: () => void }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
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
            transition: initialTouchDistance ? 'none' : 'transform 0.2s'
          }}
        />
      </div>
    </div>
  );
};

const MenuApp = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const categoryRefs = React.useRef<Record<string, HTMLElement | null>>({});

  // Fetch products from Appwrite DB
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const res = await databases.listDocuments(databaseId, customerMenuCollection, [Query.limit(500), Query.offset(0)]);
        setProducts(res.documents);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
    fetchProducts();
  }, []);

  // Track image loading
  React.useEffect(() => {
    if (products.length === 0) return;
    
    const imageUrls = products
      .map(product => product.image)
      .filter((url): url is string => Boolean(url));

    if (imageUrls.length === 0) {
      setIsLoading(false);
      return;
    }

    const preloadImage = (url: string) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setLoadedImages(prev => new Set([...prev, url]));
          resolve(url);
        };
        img.onerror = () => {
          resolve(url); // Resolve anyway to not block loading on error
        };
      });
    };

    Promise.all(imageUrls.map(preloadImage)).then(() => {
      setIsLoading(false);
    });
  }, [products]);

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter((product: any) => product.category === selectedCategory);

  const ProductCard = ({ product }: { product: any }) => (
    <div
      className="relative bg-white rounded-xl shadow-md overflow-hidden mb-4 cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={() => {
        setSelectedProduct(product);
        // show overlay
        setDetailVisible(true);
      }}
    >
      <div className="flex items-start p-3">

        <div className="flex-1 min-w-0 justify-between flex flex-col">
          <div className='pl-1'>
            <h3 className="font-bold text-gray-800 truncate">{product.name}</h3>
            <p className="text-gray-600 text-xs truncate-2">{product.description}</p>
            <div className="absolute bottom-3 text-sm font-bold">
              ₱{((product.price ?? product.pricePerUnit) ?? 0).toFixed(2)}
            </div>
          </div>

        </div>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name || 'product image'}
            className={`w-32 h-24 object-cover rounded-md flex-shrink-0 ml-3 transition-opacity duration-300 ${
              loadedImages.has(product.image) ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (<div className="w-20 h-24 rounded-md flex-shrink-0 ml-3 overflow-hidden"></div>)}
      </div>


    </div>
  );

  const ProductDetailPage = ({ product, visible, onClose }: { product: any; visible: boolean; onClose: () => void }) => (
    <AnimatePresence>
      {visible && (
        // overlay wrapper
        <div className="fixed inset-0 z-50" aria-hidden={!visible}>
          {/* backdrop */}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.50 }}
            onClick={onClose}
          />

          {/* sliding panel (full-height with top offset) */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="fixed max-w-[450px] left-0 right-0 top-12 bottom-0 mx-auto bg-white rounded-t-2xl shadow-xl overflow-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 200, damping: 32 }}
          >
            {/* Product Image */}
            <div className="relative">
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-72 object-cover rounded-t-2xl cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    setImageViewerVisible(true);
                  }}
                />
              )}
              <div className="absolute top-4 right-4 ">
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="p-2 rounded-full bg-white shadow-sm hover:bg-gray-100 transition-colors shadow-lg"
                >
                  <X className="w-6 h-6 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Product Info */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-auto">
              {/* Description */}
              <div>
                <h1 className="text-xl font-bold text-gray-800">{product.name}</h1>
                <div className="text-amber-500 mb-4">
                  ₱{((product.price ?? product.pricePerUnit) ?? 0).toFixed(2)}
                </div>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  const [activeGroup, setActiveGroup] = useState('drinks');

  const getGroupFromCategory = (categoryId: string) => {
    const group = categoryGroups.find(group => group.categories.includes(categoryId));
    return group ? group.name : '';
  };

  const scrollToHeader = () => {
    window.scrollTo({ top: 133, behavior: 'smooth' });
  }

  // close overlay with Escape
  React.useEffect(() => {
    if (!detailVisible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailVisible(false);
        setSelectedProduct(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [detailVisible]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            {/* <p className="text-gray-600">Loading menu...</p> */}
          </div>
        </div>
      )}
      {selectedProduct && (
        <ImageViewer
          src={selectedProduct.image}
          visible={imageViewerVisible}
          onClose={() => setImageViewerVisible(false)}
        />
      )}
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 shadow-lg bg-img">
        <div className="text-center">
          <img src={logoImgSrc} alt="Bean & Brew Café" className="w-32 mx-auto mb-2" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex overflow-x-auto text-gray-600 space-x-3 text-xs uppercase px-4 pt-3 pb-1 font-semibold tracking-wide">
          {categoryGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => {
                const firstCategory = group.categories[0];
                setSelectedCategory(firstCategory);
                setActiveGroup(group.name);
                categoryRefs.current[firstCategory]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                scrollToHeader();
              }}
              className={`cursor-pointer px-2 py-1 rounded-md transition-colors ${getGroupFromCategory(selectedCategory) === group.name
                ? 'bg-amber-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
              {group.name}
            </div>
          ))}
        </div>
        <div className="flex overflow-x-auto p-4 space-x-3 scrollbar-hide">
          {menuCategories.map((category) => {
            return (
              <button
                key={category.id}
                ref={el => (categoryRefs.current[category.id] = el)}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setActiveGroup(getGroupFromCategory(category.id));
                  categoryRefs.current[category.id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  scrollToHeader();
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${selectedCategory === category.id
                  ? 'bg-amber-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <span className="font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-2 max-w-md mx-auto min-h-[600px]">
          {menuCategories
            .filter(cat => cat.id !== 'all')
            .map(category => {
              const categoryProducts = filteredProducts.filter(p => p.category === category.id);
              if (categoryProducts.length === 0) return null;
              return (
                <div key={category.id} ref={el => (categoryRefs.current[category.id] = el)} className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-2 px-1">{category.name}</h2>
                  {categoryProducts.map(product => (
                    <ProductCard key={product.$id} product={product} />
                  ))}
                </div>
              );
            })}
        </div>
      </div>

      {/* Product Detail Overlay */}
      {selectedProduct && (
        <ProductDetailPage
          product={selectedProduct}
          visible={detailVisible}
          onClose={() => {
            // start hide animation
            setDetailVisible(false);
            // clear product after animation completes
            setTimeout(() => setSelectedProduct(null), 300);
          }}
        />
      )}

      {/* Footer */}
      <div className="bg-white border-t p-6 mt-8">
        <div className="text-center text-gray-600">
          <Coffee className="w-6 h-6 mx-auto mb-2 text-amber-500" />
          <p className="text-sm">Thank you for choosing Oltre ☺️</p>
          <p className="text-xs text-gray-500 mt-1">Beyond coffee, made with passion</p>
        </div>
      </div>
    </div>
  );
};

export default MenuApp;