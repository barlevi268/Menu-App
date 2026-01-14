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
  darkMode?: boolean;
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

const MenuApp = () => {
  const baseUrl = React.useMemo(
    () => import.meta.env.VITE_API_BASE_URL || 'https://api.orda.co',
    []
  );
  const [companyObject, setCompanyObject] = useState()
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
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [darkMode, setDarkMode] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const categoryButtonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const categorySectionRefs = React.useRef<Record<string, HTMLElement | null>>({});
  const categoryHeaderRefs = React.useRef<Record<string, HTMLHeadingElement | null>>({});
  const menuViewedSentRef = React.useRef(false);
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

  const postPublicEvent = React.useCallback(async (payload: Record<string, unknown>) => {
    try {
      await fetch(`${baseUrl}/public/analytics/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn('Failed to post public analytics event:', error);
    }
  }, [baseUrl]);

  const trackMenuViewed = React.useCallback((resolvedCompanyId: string | null) => {
    if (!resolvedCompanyId || menuViewedSentRef.current) return;
    menuViewedSentRef.current = true;
    void postPublicEvent({
      companyId: resolvedCompanyId,
      publicEventType: 'customer-menu-viewed',
      properties: { channel: 'web' },
    });
  }, [postPublicEvent]);

  const trackItemViewed = React.useCallback((entityId?: string | null) => {
    if (!companyId || !entityId) return;
    void postPublicEvent({
      companyId,
      publicEventType: 'customer-menu-item-viewd',
      entityId,
    });
  }, [companyId, postPublicEvent]);

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
      // if (prices.length === 2) {
      //   return `${formatPrice(prices[0])} / ${formatPrice(prices[1])}`;
      // }
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

  // Handle dark mode toggle
  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setMenuError(false);
        const requestCompanyId = getCompanyIdFromPath();
        const path = requestCompanyId
          ? `${baseUrl}/public/customer-menu/${requestCompanyId}`
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
        const resolvedCompanyId = data?.company?.id ?? null;
        setCompanyId(resolvedCompanyId);
        setCompanyName(
          data?.company?.name ??
            data?.companyName ??
            data?.company_name ??
            null
        );
        setCompanyObject(data?.company)
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
        if (preferences?.darkMode !== undefined) {
          setDarkMode(preferences.darkMode);
        }
        trackMenuViewed(resolvedCompanyId);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setMenuError(true);
        setProducts([]);
        setMenuCategories([]);
        setCategoryGroups([]);
        setCompanyId(null);
      }
    };
    fetchProducts();
  }, [baseUrl, trackMenuViewed]);

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
    setSelectedVariant(null);
  }

  const ProductCard = ({ product }: { product: any }) => {
    const productId = product?.$id ?? product?.id;

    return (
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-4 cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg"
        onClick={() => {
          setSelectedProduct(product);
          // show overlay
          setDetailVisible(true);
          trackItemViewed(productId);
          // Set first variant as selected
          const firstVariant = product.options?.[0]?.variant;
          setSelectedVariant(firstVariant || null);
        }}
      >
        <div className="flex items-start p-3">

          <div className="flex-1 min-w-0 justify-between flex flex-col">
            <div className='pl-1'>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">{product.name}</h3>
              <p className="text-gray-600 dark:text-gray-400 text-xs truncate-2">{product.description}</p>
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
  };

  const [activeGroup, setActiveGroup] = useState('');

  const getGroupFromCategory = (categoryId: string) => {
    const group = categoryGroups.find(group => group.categories.includes(categoryId));
    return group ? group.name : '';
  };

  // Check if color is a hex value
  const isHexColor = (color: string): boolean => /^#[0-9A-F]{6}$/i.test(color);

  // Generate theme from hex color with lighter/darker variants
  const generateThemeFromHex = (hexColor: string) => {
    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      } : { r: 139, g: 69, b: 19 }; // fallback to amber
    };

    const rgbToHex = (r: number, g: number, b: number): string => {
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };

    const darken = (hex: string, percent: number): string => {
      const rgb = hexToRgb(hex);
      const factor = 1 - (percent / 100);
      return rgbToHex(
        Math.max(0, Math.round(rgb.r * factor)),
        Math.max(0, Math.round(rgb.g * factor)),
        Math.max(0, Math.round(rgb.b * factor))
      );
    };

    const baseColor = hexColor.toUpperCase();
    const darkerColor = darken(baseColor, 20);

    return {
      header: baseColor,
      headerDarker: darkerColor,
      accentBg: baseColor,
      accentText: baseColor,
      border: baseColor,
      chipActive: baseColor,
      groupActive: baseColor,
      isCustom: true,
    };
  };

  const isCustomColor = isHexColor(themeColor);
  const activeTheme: any = isCustomColor
    ? generateThemeFromHex(themeColor)
    : (themeClasses[themeColor as keyof typeof themeClasses] ?? themeClasses.amber);


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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex items-center justify-center">
          <div className="text-center">
            <div 
              className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mb-4"
              style={isCustomColor ? { borderColor: activeTheme.border, borderTopColor: 'transparent' } : { borderColor: activeTheme.border }}
            ></div>
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
        className={`flex justify-center items-center relative text-white p-6 min-h-[10rem] shadow-lg bg-img ${coverPhotoUrl ? '' : (isCustomColor ? '' : `bg-gradient-to-r ${activeTheme.header}`)}`}
        style={
          isCustomColor && !coverPhotoUrl 
            ? { background: `linear-gradient(to right, ${activeTheme.header}, ${activeTheme.headerDarker})` }
            : coverPhotoUrl 
            ? { backgroundImage: `url(${coverPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : undefined
        }
      >
        {coverPhotoUrl && (
          <div 
            className="absolute inset-0 opacity-30"
            style={isCustomColor ? { background: `linear-gradient(to right, ${activeTheme.header}, ${activeTheme.headerDarker})` } : {}}
          />
        )}
        {/* <div className="absolute top-4 right-4 z-20">
          <div
            className="p-2 rounded-full bg-white/20"
            aria-label="Dark mode"
          >
            {darkMode ? (
              <Coffee className="w-6 h-6 text-white" />
            ) : (
              <span className="text-white font-bold text-lg">☀️</span>
            )}
          </div>
        </div> */}
        <div className="relative z-10 text-center">
          <img src={logoUrl || logoImgSrc} alt="Brand logo" className="max-w-32 mx-auto" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm ">
        <div className="flex max-w-4xl mx-auto overflow-x-auto text-gray-600 dark:text-gray-300 space-x-3 text-xs uppercase px-4 pt-3 pb-1 font-semibold tracking-wide">
          {categoryGroups.map((group) => {
            const isGroupActive = getGroupFromCategory(selectedCategory) === group.name;
            return (
              <div
                key={group.id}
                onClick={() => {
                  const firstCategory = group.categories[0];
                  setSelectedCategory(firstCategory);
                  // active group will update on scroll
                  categoryButtonRefs.current[firstCategory]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                  scrollToCategoryHeader(firstCategory);
                }}
                className={`cursor-pointer px-2 py-1 rounded-md transition-colors text-white ${
                  isGroupActive
                    ? (isCustomColor ? '' : activeTheme.groupActive)
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 bg-transparent'
                }`}
                style={isGroupActive && isCustomColor ? { backgroundColor: activeTheme.groupActive } : undefined}
              >
                {group.name}
              </div>
            );
          })}
        </div>
        <div className="flex max-w-4xl mx-auto overflow-x-auto p-4 space-x-3 scrollbar-hide">
          {menuCategories.map((category) => {
            const isActive = selectedCategory === category.id;
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
                className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all text-white shadow-md ${
                  isActive
                    ? (isCustomColor ? '' : activeTheme.chipActive)
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 shadow-none'
                }`}
                style={isActive && isCustomColor ? { backgroundColor: activeTheme.chipActive } : undefined}
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
            <div className="text-center text-gray-600 dark:text-gray-400 font-semibold py-12">
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
                    className="text-xl font-extrabold text-gray-700 dark:text-gray-200 mb-4 px-1 border-b dark:border-gray-700 pb-2"
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
              className="fixed max-w-[450px] left-0 right-0 top-12 bottom-0 mx-auto bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl overflow-auto"
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
                    className="p-2 rounded-full bg-white dark:bg-gray-700 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors shadow-lg"
                  >
                    <X className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-auto">
                {/* Description */}
                <div>
                  <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">{selectedProduct.name}</h1>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{selectedProduct.description}</p>
                  
                  {Array.isArray(selectedProduct.options) && selectedProduct.options.length > 0 ? (
                    <>
                      {/* Get unique variants */}
                      {(() => {
                        const variants = Array.from(new Set(
                          selectedProduct.options
                            .map((opt: any) => opt.variant)
                            .filter((v: any): v is string => Boolean(v))
                        ));
                        const filteredOptions = selectedVariant 
                          ? selectedProduct.options.filter((opt: any) => opt.variant === selectedVariant)
                          : selectedProduct.options;

                        return variants.length > 0 ? (
                          <div className="mt-4 space-y-4">
                            {/* Variant Selector */}
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Choose Type:</label>
                              <div className="flex flex-wrap gap-2">
                                {(variants as string[]).map((variant: string) => (
                                  <button
                                    key={variant}
                                    onClick={() => setSelectedVariant(variant)}
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

                            {/* Options for selected variant */}
                            <div className="space-y-1 border-t dark:border-gray-700 pt-4">
                              {filteredOptions.map((option: { name?: string; price?: number | string }, index: number) => (
                                <div key={`${option.name ?? 'option'}-${index}`} className="flex flex-row items-center text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 py-3 px-1">
                                  <span className="text-xs mr-2 text-gray-700 dark:text-gray-400">●</span>
                                  <span className="font-semibold">{option.name || 'Option'}</span>
                                  <span className="mx-2">-</span>
                                  <span>{buildDisplayPrice({ options: [option] })}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 space-y-1">
                            {selectedProduct.options.map((option: { name?: string; price?: number | string }, index: number) => (
                              <div key={`${option.name ?? 'option'}-${index}`} className="flex flex-row items-center text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 py-3 px-1">
                                <span className="text-xs mr-2 text-gray-700 dark:text-gray-400">●</span>
                                <span className="font-semibold">{option.name || 'Option'}</span>
                                <span className="mx-2">-</span>
                                <span>{buildDisplayPrice({ options: [option] })}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </>
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
      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-6 mt-8">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">{footerText || 'Thank you for choosing Oltre ☺️'}</p>
          {!footerText && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Beyond coffee, made with passion</p>}
        </div>
      </div>
    </div>
  );
};

export default MenuApp;
