import React, { useState } from 'react';
import { Coffee, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import themeClasses from './themeClasses';

const logoImgSrc = 'https://fra.cloud.appwrite.io/v1/storage/buckets/687dd5ef002a30eca0f9/files/687e5635002794eeec27/view?project=67d54dea00199fd0947e&mode=admin'

type MenuCategory = { id: string; name: string };
type CategoryGroup = { id: string; name: string; categories: string[] };
type MenuPreferences = {
  menuTypes?: Record<string, { name?: string; categorieArrangment?: Record<string, number | string> }>;
  categories?: Record<string, { id: number | string; label?: string }>;
  themeColor?: string;
  coverPhotoUrl?: string | null;
  logoUrl?: string | null;
  footerText?: string | null;
};
type MenuItemRow = {
  price?: number | string;
  pricePerUnit?: number | string;
  options?: Array<{ name?: string; price?: number | string }>;
};

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
  const [menuError, setMenuError] = useState(false);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [themeColor, setThemeColor] = useState('amber');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [footerText, setFooterText] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const categoryButtonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const categorySectionRefs = React.useRef<Record<string, HTMLElement | null>>({});
  const categoryHeaderRefs = React.useRef<Record<string, HTMLHeadingElement | null>>({});
  // Track programmatic scroll and ordered categories
  const isAutoScrollingRef = React.useRef(false);
  const orderedCategoryIds = React.useMemo(
    () => menuCategories.filter(c => c.id !== 'all').map(c => c.id),
    [menuCategories]
  );

  const STICKY_OFFSET = 130; // height of sticky selector
  const scrollToCategoryHeader = (id: string) => {
    if (id === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = categoryHeaderRefs.current[id];
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - STICKY_OFFSET;
    isAutoScrollingRef.current = true;
    window.scrollTo({ top: y, behavior: 'smooth' });
    window.setTimeout(() => { isAutoScrollingRef.current = false; }, 600);
  };

  // Scroll observer: update selectedCategory based on scroll position
  React.useEffect(() => {
    let ticking = false;
    const handle = () => {
      if (isAutoScrollingRef.current) return;
      const offset = STICKY_OFFSET + 8; // small extra spacing
      let candidateAbove: { id: string; dist: number } | null = null;
      let candidateBelow: { id: string; dist: number } | null = null;

      for (const id of orderedCategoryIds) {
        const el = categoryHeaderRefs.current[id];
        if (!el) continue;
        const top = el.getBoundingClientRect().top - offset;
        if (top <= 0) {
          const d = Math.abs(top);
          if (!candidateAbove || d < candidateAbove.dist) candidateAbove = { id, dist: d };
        } else {
          if (!candidateBelow || top < candidateBelow.dist) candidateBelow = { id, dist: top };
        }
      }

      const nextId = (candidateAbove?.id ?? candidateBelow?.id) || null;
      if (nextId && nextId !== selectedCategory) {
        setSelectedCategory(nextId);
        setActiveGroup(getGroupFromCategory(nextId));
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(handle);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // run once on mount to set initial category in view
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [STICKY_OFFSET, orderedCategoryIds, selectedCategory]);

  // Auto-center the active category chip when selection changes
  React.useEffect(() => {
    const btn = categoryButtonRefs.current[selectedCategory];
    if (btn && typeof btn.scrollIntoView === 'function') {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedCategory]);

  const getCompanyIdFromPath = () => {
    const params = new URLSearchParams(window.location.search);
    const paramId =
      params.get('companyId') ||
      params.get('id');
    
    const segments = window.location.pathname.split('/').filter(Boolean);
    if (paramId) return paramId;
    if (segments[0] === 'menu') {
      return segments[1];
    }
    return segments[0];
  };

  const normalizeValue = (value: unknown, fallback: string) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || fallback;
    }
    if (value === null || value === undefined) return fallback;
    return String(value).trim() || fallback;
  };

  const formatLabel = (value: string) => {
    return value
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const buildDisplayPrice = (row: MenuItemRow) => {
    const formatPrice = (price: number) => `₱${new Intl.NumberFormat('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)}`;
    if (Array.isArray(row.options) && row.options.length > 0) {
      const prices = row.options
        .map((opt) =>
          typeof opt.price === 'number' ? opt.price : parseFloat(String(opt.price || 0))
        )
        .filter((price) => !isNaN(price));
      if (prices.length === 0) {
        return '₱0.00';
      }
      // if there are two options separate with slash instead of dash
      if (prices.length === 2) {
        return `${formatPrice(prices[0])} / ${formatPrice(prices[1])}`;
      }
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (minPrice === maxPrice) {
        return formatPrice(minPrice);
      }
      return `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
    }
    const priceValue =
      typeof row.price === 'number'
        ? row.price
        : typeof row.pricePerUnit === 'number'
          ? row.pricePerUnit
          : parseFloat(String((row.price ?? row.pricePerUnit) || 0));
    return formatPrice(priceValue);
  };

  const sortNumericKeys = (obj?: Record<string, unknown>) =>
    Object.keys(obj ?? {}).sort((a, b) => Number(a) - Number(b));

  const getPreferences = (data: any): MenuPreferences | null => {
    return data?.prefrerences ?? data?.preferences ?? null;
  };

  const buildMenuMeta = (items: any[], preferences?: MenuPreferences | null) => {
    const categoryMap = new Map<string, string>();
    const groupMap = new Map<string, Set<string>>();
    const itemCategories = new Set<string>();

    items.forEach((item) => {
      const categoryKey = normalizeValue(item.category, 'uncategorized');
      const groupKey = normalizeValue(item.menuType, 'menu');
      itemCategories.add(categoryKey);
      if (!categoryMap.has(categoryKey)) {
        categoryMap.set(categoryKey, formatLabel(categoryKey));
      }
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, new Set());
      groupMap.get(groupKey)?.add(categoryKey);
    });

    const prefCategories = preferences?.categories ?? {};
    const prefMenuTypes = preferences?.menuTypes ?? {};
    const hasPrefOrder = Object.keys(prefMenuTypes).length > 0 && Object.keys(prefCategories).length > 0;

    if (hasPrefOrder) {
      const categoryIdToLabel = new Map<string, string>();
      Object.values(prefCategories).forEach((cat) => {
        const id = normalizeValue(cat?.id, '');
        const label = normalizeValue(cat?.label, id || 'uncategorized');
        if (id) categoryIdToLabel.set(id, label);
      });

      const orderedCategoryLabels: string[] = [];
      const orderedGroups: CategoryGroup[] = [];

      sortNumericKeys(prefMenuTypes).forEach((menuTypeKey) => {
        const menuType = prefMenuTypes[menuTypeKey];
        const arrangement = menuType?.categorieArrangment ?? {};
        const groupCategories: string[] = [];
        sortNumericKeys(arrangement).forEach((arrKey) => {
          const categoryId = normalizeValue(arrangement[arrKey], '');
          const label = categoryIdToLabel.get(categoryId);
          if (label && itemCategories.has(label)) {
            groupCategories.push(label);
            if (!orderedCategoryLabels.includes(label)) orderedCategoryLabels.push(label);
          }
        });

        if (groupCategories.length > 0) {
          orderedGroups.push({
            id: menuTypeKey,
            name: formatLabel(normalizeValue(menuType?.name, 'menu')),
            categories: groupCategories,
          });
        }
      });

      const remainingCategories = Array.from(categoryMap.keys()).filter(
        (categoryId) => !orderedCategoryLabels.includes(categoryId)
      );
      remainingCategories.forEach((categoryId) => orderedCategoryLabels.push(categoryId));

      const categories = orderedCategoryLabels.map((id) => ({
        id,
        name: categoryMap.get(id) ?? formatLabel(id),
      }));

      return { categories, groups: orderedGroups };
    }

    const categories = Array.from(categoryMap, ([id, name]) => ({ id, name }));
    const groups = Array.from(groupMap, ([id, categorySet]) => ({
      id,
      name: formatLabel(id),
      categories: Array.from(categorySet),
    }));

    return { categories, groups };
  };

  // Fetch products from API endpoint
  React.useEffect(() => {
    document.title = companyName ? `${companyName} Menu` : 'Menu';
  }, [companyName]);

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setMenuError(false);
        const companyId = getCompanyIdFromPath();
        if (!companyId) {
          setMenuError(true);
          setProducts([]);
          setMenuCategories([]);
          setCategoryGroups([]);
          setIsLoading(false);
          return;
        }
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.orda.co';
        const path = companyId
          ? `${baseUrl}/public/customer-menu/${companyId}`
          : `${baseUrl}/public/customer-menu`;
        const res = await fetch(path, { headers: { Accept: 'application/json' } });
        if (!res.ok) {
          throw new Error(`Failed to fetch products: ${res.status}`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const bodyText = await res.text();
          throw new Error(`Expected JSON but received: ${bodyText.slice(0, 120)}...`);
        }
        const data = await res.json();
        setCompanyName(
          data?.company?.name ??
            data?.companyName ??
            data?.company_name ??
            null
        );
        const preferences = getPreferences(data);
        const rawItems = Array.isArray(data)
          ? data
          : (data?.items ?? data?.documents ?? data?.data ?? []);
        const items = rawItems.map((item: any) => ({
          ...item,
          category: normalizeValue(item.category, 'uncategorized'),
          menuType: normalizeValue(item.menuType, 'menu'),
        }));
        setProducts(items);
        const { categories, groups } = buildMenuMeta(items, preferences);
        setMenuCategories(categories);
        setCategoryGroups(groups);
        if (preferences?.themeColor) {
          setThemeColor(normalizeValue(preferences.themeColor, 'amber'));
        }
        if (preferences?.coverPhotoUrl !== undefined) {
          setCoverPhotoUrl(preferences.coverPhotoUrl ?? null);
        }
        if (preferences?.logoUrl !== undefined) {
          setLogoUrl(preferences.logoUrl ?? null);
        }
        if (preferences?.footerText !== undefined) {
          setFooterText(preferences.footerText ?? null);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setMenuError(true);
        setProducts([]);
        setMenuCategories([]);
        setCategoryGroups([]);
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

  const closeDetailOverlay = () => {
    setDetailVisible(false);
    setSelectedProduct(null);
  }

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
              {buildDisplayPrice(product)}
            </div>
          </div>

        </div>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name || 'product image'}
            className={`w-32 h-24 object-cover rounded-md flex-shrink-0 ml-3 transition-opacity duration-300 ${loadedImages.has(product.image) ? 'opacity-100' : 'opacity-0'
              }`}
          />
        ) : (<div className="w-20 h-24 rounded-md flex-shrink-0 ml-3 overflow-hidden"></div>)}
      </div>


    </div>
  );

  const [activeGroup, setActiveGroup] = useState('');

  const getGroupFromCategory = (categoryId: string) => {
    const group = categoryGroups.find(group => group.categories.includes(categoryId));
    return group ? group.name : '';
  };


  const activeTheme = themeClasses[themeColor as keyof typeof themeClasses] ?? themeClasses.amber;


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
            <div className={`w-16 h-16 border-4 ${activeTheme.border} border-t-transparent rounded-full animate-spin mb-4`}></div>
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
      <div
        className={`flex justify-center items-center relative text-white p-6 min-h-[10rem] shadow-lg bg-img ${coverPhotoUrl ? '' : `bg-gradient-to-r ${activeTheme.header}`}`}
        style={coverPhotoUrl ? { backgroundImage: `url(${coverPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        {coverPhotoUrl && <div className={`absolute inset-0 bg-gradient-to-r ${activeTheme.header} opacity-30`} />}
        <div className="relative z-10 text-center">
          <img src={logoUrl || logoImgSrc} alt="Brand logo" className="max-w-32 mx-auto" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white sticky top-0 z-10 shadow-sm ">
        <div className="flex max-w-4xl mx-auto overflow-x-auto text-gray-600 space-x-3 text-xs uppercase px-4 pt-3 pb-1 font-semibold tracking-wide">
          {categoryGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => {
                const firstCategory = group.categories[0];
                setSelectedCategory(firstCategory);
                // active group will update on scroll
                categoryButtonRefs.current[firstCategory]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                scrollToCategoryHeader(firstCategory);
              }}
              className={`cursor-pointer px-2 py-1 rounded-md transition-colors ${getGroupFromCategory(selectedCategory) === group.name
                ? activeTheme.groupActive
                : 'text-gray-600 hover:bg-gray-200'
                }`}
            >
              {group.name}
            </div>
          ))}
        </div>
        <div className="flex max-w-4xl mx-auto overflow-x-auto p-4 space-x-3 scrollbar-hide">
          {menuCategories.map((category) => {
            return (
              <button
                key={category.id}
                ref={el => (categoryButtonRefs.current[category.id] = el)}
                onClick={() => {
                  setSelectedCategory(category.id);
                  // active group will update on scroll
                  categoryButtonRefs.current[category.id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  scrollToCategoryHeader(category.id);
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${selectedCategory === category.id
                  ? activeTheme.chipActive
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
      <div className="p-4 md:px-8 flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl gap-4 mx-auto min-h-[600px]">
          {menuError && !isLoading && (
            <div className="text-center text-gray-600 font-semibold py-12">
              Menu not Found
            </div>
          )}
          {menuCategories
            .filter(cat => cat.id !== 'all')
            .map(category => {
              const categoryProducts = products.filter(p => p.category === category.id);
              if (categoryProducts.length === 0) return null;
              return (
                <div key={category.id} ref={el => (categorySectionRefs.current[category.id] = el)} className="mb-6">
                  <h2
                    ref={el => (categoryHeaderRefs.current[category.id] = el)}
                    className="text-xl font-extrabold text-gray-700 mb-4 px-1 border-b pb-2"
                  >
                    {category.name}
                  </h2>
                  {categoryProducts.map(product => (
                    <ProductCard key={product.$id} product={product} />
                  ))}
                </div>
              );
            })}
        </div>
      </div>

      {/* Product Detail Overlay */}
      <AnimatePresence mode="wait">
        {detailVisible && (
          // overlay wrapper
          <div className="fixed inset-0 z-50" aria-hidden={!detailVisible}>
            {/* backdrop */}
            <motion.div
              className="absolute inset-0 bg-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.20 }}
              onClick={closeDetailOverlay}
            />

            {/* sliding panel (full-height with top offset) */}
            <motion.div
              role="dialog"
              aria-modal="true"
              className="fixed max-w-[450px] left-0 right-0 top-12 bottom-0 mx-auto bg-white rounded-t-2xl shadow-xl overflow-auto"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: selectedProduct.image ? 0 : 288, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 25 }}
            >
              {/* Product Image */}
              <div className="relative">
                {selectedProduct.image && (
                  <img
                    src={selectedProduct.image}
                    alt={selectedProduct.name}
                    className="w-full h-72 object-cover rounded-t-2xl cursor-zoom-in"
                    onClick={(e) => {
                      e.stopPropagation();
                      setImageViewerVisible(true);
                    }}
                  />
                )}
                <div className="absolute top-4 right-4 ">
                  <button
                    onClick={closeDetailOverlay}
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
                  <h1 className="text-3xl font-bold text-gray-800">{selectedProduct.name}</h1>
                  <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
                  {Array.isArray(selectedProduct.options) && selectedProduct.options.length > 0 ? (
                    <div className="mt-4 space-y-1">

                      {selectedProduct.options.map((option: { name?: string; price?: number | string }, index: number) => (
                        <div key={`${option.name ?? 'option'}-${index}`} className="flex flex-row items-center text-gray-700 border-b py-3 px-1">
                          <span className="text-xs mr-2 text-gray-700">●</span>
                          <span className="font-semibold">{option.name || 'Option'}</span>
                          <span className="mx-2">-</span>
                          <span>{buildDisplayPrice({ options: [option] })}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`${activeTheme.accentText} mb-4`}>
                      {buildDisplayPrice(selectedProduct)}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="bg-white border-t p-6 mt-8">
        <div className="text-center text-gray-600">
          <p className="text-sm">{footerText || 'Thank you for choosing Oltre ☺️'}</p>
          {!footerText && <p className="text-xs text-gray-500 mt-1">Beyond coffee, made with passion</p>}
        </div>
      </div>
    </div>
  );
};

export default MenuApp;
