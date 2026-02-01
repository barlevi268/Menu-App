import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Settings } from 'lucide-react';
import themeClasses from './themeClasses';
import type { CategoryGroup, MenuCategory, MenuItem, MenuPreferences, OrderItemDraft } from './types';
import ImageViewer from './components/ImageViewer';
import ProductCard from './components/ProductCard';
import ProductLine from './components/ProductLine';
import ProductDetailOverlay from './components/ProductDetailOverlay';
import GalleryModal from './components/GalleryModal';
import OrderFloatingButton from './components/OrderFloatingButton';
import OrderSummaryPanel from './components/OrderSummaryPanel';
import OrderDetailsPanel from './components/OrderDetailsPanel';
import OrderSuccessPanel from './components/OrderSuccessPanel';
import { useCustomerOrder } from './hooks/useCustomerOrder';

const logoImgSrc =
  'https://fra.cloud.appwrite.io/v1/storage/buckets/687dd5ef002a30eca0f9/files/687e5635002794eeec27/view?project=67d54dea00199fd0947e&mode=admin';

type MenuAppProps = {
  customerOrdersMode?: boolean;
};

type OrderStage = 'menu' | 'summary' | 'details' | 'success';

const getCompanyIdFromPath = () => {
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get('companyId') || params.get('id');

  const segments = window.location.pathname.split('/').filter(Boolean);
  if (paramId) return paramId;
  if (segments[0] === 'menu' || segments[0] === 'order') {
    return segments[1];
  }
  return segments[0];
};

const MenuApp = ({ customerOrdersMode = false }: MenuAppProps) => {
  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || 'https://api.orda.co',
    []
  );
  const isDev = useMemo(() => import.meta.env.VITE_IS_DEV === 'true', []);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [products, setProducts] = useState<MenuItem[]>([]);
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
  const [showPriceRange, setShowPriceRange] = useState(true);
  const [expandOptions, setExpandOptions] = useState(false);
  const [paperView, setPaperView] = useState(false);
  const [menuPreferences, setMenuPreferences] = useState<MenuPreferences | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedGallery, setSelectedGallery] = useState<{ name: string; images: string[] } | null>(null);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [galleryImageViewerVisible, setGalleryImageViewerVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const categoryHeaderRefs = useRef<Record<string, HTMLHeadingElement | null>>({});
  const menuViewedSentRef = useRef(false);
  const isAutoScrollingRef = useRef(false);

  const orderedCategoryIds = useMemo(
    () => menuCategories.filter((c) => c.id !== 'all').map((c) => c.id),
    [menuCategories]
  );

  const { state: orderState, actions: orderActions } = useCustomerOrder(companyId);
  const [orderStage, setOrderStage] = useState<OrderStage>('menu');

  const orderTotal = useMemo(
    () => orderState.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [orderState.items]
  );
  const orderItemsCount = useMemo(
    () => orderState.items.reduce((sum, item) => sum + item.quantity, 0),
    [orderState.items]
  );

  useEffect(() => {
    if (!customerOrdersMode && orderStage !== 'menu') {
      setOrderStage('menu');
    }
  }, [customerOrdersMode, orderStage]);

  useEffect(() => {
    if (customerOrdersMode && orderStage !== 'menu' && orderState.items.length === 0) {
      setOrderStage('menu');
    }
  }, [customerOrdersMode, orderStage, orderState.items.length]);

  const STICKY_OFFSET = 130;
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
    window.setTimeout(() => {
      isAutoScrollingRef.current = false;
    }, 600);
  };

  useEffect(() => {
    let ticking = false;
    const handle = () => {
      if (isAutoScrollingRef.current) return;
      const offset = STICKY_OFFSET + 8;
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
    onScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [STICKY_OFFSET, orderedCategoryIds, selectedCategory]);

  useEffect(() => {
    const btn = categoryButtonRefs.current[selectedCategory];
    if (btn && typeof btn.scrollIntoView === 'function') {
      btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedCategory]);

  const postPublicEvent = React.useCallback(
    async (payload: Record<string, unknown>) => {
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
    },
    [baseUrl]
  );

  const trackMenuViewed = React.useCallback(
    (resolvedCompanyId: string | null) => {
      if (!resolvedCompanyId || menuViewedSentRef.current) return;
      menuViewedSentRef.current = true;
      void postPublicEvent({
        companyId: resolvedCompanyId,
        publicEventType: 'customer-menu-viewed',
        properties: { channel: 'web' },
      });
    },
    [postPublicEvent]
  );

  const trackItemViewed = React.useCallback(
    (entityId?: string | null) => {
      if (!companyId || !entityId) return;
      void postPublicEvent({
        companyId,
        publicEventType: 'customer-menu-item-viewd',
        entityId,
      });
    },
    [companyId, postPublicEvent]
  );

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

  const sortNumericKeys = (obj?: Record<string, unknown>) =>
    Object.keys(obj ?? {}).sort((a, b) => Number(a) - Number(b));

  const getPreferences = (data: any): MenuPreferences | null => {
    return data?.prefrerences ?? data?.preferences ?? null;
  };

  const buildMenuMeta = (items: MenuItem[], preferences?: MenuPreferences | null) => {
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
        const groupName = formatLabel(normalizeValue(menuType?.name, 'menu'));

        if (menuType?.type === 'gallery' && Array.isArray(menuType?.images)) {
          orderedGroups.push({
            id: menuTypeKey,
            name: groupName,
            categories: [],
            type: 'gallery',
            images: menuType.images,
          });
          return;
        }

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
            name: groupName,
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

  const isMenuPreferences = (value: any): value is MenuPreferences => {
    if (!value || typeof value !== 'object') return false;
    return (
      'menuTypes' in value ||
      'categories' in value ||
      'themeColor' in value ||
      'coverPhotoUrl' in value ||
      'logoUrl' in value ||
      'footerText' in value ||
      'darkMode' in value ||
      'showPriceRange' in value ||
      'expandOptions' in value ||
      'paperView' in value
    );
  };

  const applyPreferences = React.useCallback(
    (preferences: MenuPreferences | null, items?: MenuItem[], options?: { merge?: boolean }) => {
      const mergedPreferences = options?.merge
        ? { ...(menuPreferences ?? {}), ...(preferences ?? {}) }
        : preferences;

      setMenuPreferences(mergedPreferences);

      const sourceItems = items ?? products;
      if (sourceItems.length > 0) {
        const { categories, groups } = buildMenuMeta(sourceItems, mergedPreferences);
        setMenuCategories(categories);
        setCategoryGroups(groups);
      }

      if (!mergedPreferences) return;
      if (mergedPreferences.themeColor !== undefined) {
        setThemeColor(normalizeValue(mergedPreferences.themeColor, 'amber'));
      }
      if (mergedPreferences.coverPhotoUrl !== undefined) {
        setCoverPhotoUrl(mergedPreferences.coverPhotoUrl ?? null);
      }
      if (mergedPreferences.logoUrl !== undefined) {
        setLogoUrl(mergedPreferences.logoUrl ?? null);
      }
      if (mergedPreferences.footerText !== undefined) {
        setFooterText(mergedPreferences.footerText ?? null);
      }
      if (mergedPreferences.darkMode !== undefined) {
        setDarkMode(mergedPreferences.darkMode);
      }
      if (mergedPreferences.showPriceRange !== undefined) {
        setShowPriceRange(mergedPreferences.showPriceRange);
      }
      if (mergedPreferences.expandOptions !== undefined) {
        setExpandOptions(mergedPreferences.expandOptions);
      }
      if (mergedPreferences.paperView !== undefined) {
        setPaperView(mergedPreferences.paperView);
      }
    },
    [menuPreferences, products]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== 'object') return;

      let preferences: any = null;
      if (data.type === 'menuPreferences') {
        preferences = data.preferences ?? data.menuPreferences ?? data.payload ?? data.value;
      } else if (data.menuPreferences) {
        preferences = data.menuPreferences;
      } else if (data.preferences && isMenuPreferences(data.preferences)) {
        preferences = data.preferences;
      } else if (isMenuPreferences(data)) {
        preferences = data;
      }

      if (isMenuPreferences(preferences)) {
        console.log('[menu] received menuPreferences message', preferences);
        applyPreferences(preferences, undefined, { merge: true });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [applyPreferences]);

  useEffect(() => {
    document.title = companyName ? `${companyName} Menu` : 'Menu';
  }, [companyName]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setMenuError(false);
        const requestCompanyId = getCompanyIdFromPath();
        const path = requestCompanyId
          ? `${baseUrl}/public/customer-menu/${requestCompanyId}`
          : `${baseUrl}/public/customer-menu/${import.meta.env.VITE_COMPANY_ID || ''}`;
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
        setCompanyName(data?.company?.name ?? data?.companyName ?? data?.company_name ?? null);
        const preferences = getPreferences(data);
        const rawItems = Array.isArray(data)
          ? data
          : data?.items ?? data?.documents ?? data?.data ?? [];
        const items = rawItems.map((item: MenuItem) => ({
          ...item,
          category: normalizeValue(item.category, 'uncategorized'),
          menuType: normalizeValue(item.menuType, 'menu'),
        }));
        setProducts(items);
        applyPreferences(preferences, items);
        trackMenuViewed(resolvedCompanyId);
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setMenuError(true);
        setProducts([]);
        setMenuCategories([]);
        setCategoryGroups([]);
        setCompanyId(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, [baseUrl, trackMenuViewed]);

  useEffect(() => {
    if (products.length === 0) {
      return;
    }

    const imageUrls = products
      .map((product) => product.image)
      .filter((url): url is string => Boolean(url));

    if (imageUrls.length === 0) return;

    const preloadImage = (url: string) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          setLoadedImages((prev) => new Set([...prev, url]));
          resolve(url);
        };
        img.onerror = () => {
          resolve(url);
        };
      });
    };

    Promise.all(imageUrls.map(preloadImage)).then(() => undefined);
  }, [products]);

  const closeDetailOverlay = () => {
    setDetailVisible(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
  };

  const openProductDetail = (product: MenuItem) => {
    const productId = (product as any)?.$id ?? (product as any)?.id;
    setSelectedProduct(product);
    setDetailVisible(true);
    trackItemViewed(productId);
    const firstVariant = product.options?.[0]?.variant;
    setSelectedVariant(firstVariant || null);
  };

  const handleAddToOrder = (draft: OrderItemDraft) => {
    orderActions.addItem(draft);
  };

  const getGroupFromCategory = (categoryId: string) => {
    const group = categoryGroups.find((group) => group.categories.includes(categoryId));
    return group ? group.name : '';
  };

  const isHexColor = (color: string): boolean => /^#[0-9A-F]{6}$/i.test(color);

  const generateThemeFromHex = (hexColor: string) => {
    const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 139, g: 69, b: 19 };
    };

    const rgbToHex = (r: number, g: number, b: number): string => {
      return (
        '#' +
        [r, g, b]
          .map((x) => {
            const hex = x.toString(16);
            return hex.length === 1 ? '0' + hex : hex;
          })
          .join('')
      );
    };

    const darken = (hex: string, percent: number): string => {
      const rgb = hexToRgb(hex);
      const factor = 1 - percent / 100;
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
    : themeClasses[themeColor as keyof typeof themeClasses] ?? themeClasses.amber;
  const tabTextClass = 'text-gray-700 dark:text-gray-200';
  const tabHoverClass = 'hover:bg-gray-200 dark:hover:bg-gray-700';

  const getGroupTabClasses = (isActive: boolean) => {
    const classes = [
      'flex-shrink-0',
      'whitespace-nowrap',
      'cursor-pointer',
      'px-2',
      'py-1',
      'rounded-md',
      'transition-colors',
    ];

    if (paperView) {
      if (isActive) {
        if (!isCustomColor) classes.push(activeTheme.groupActive);
        classes.push('text-white');
      } else {
        classes.push(tabTextClass, tabHoverClass);
      }
    } else {
      if (isActive) {
        if (!isCustomColor) classes.push(activeTheme.groupActive);
        classes.push('text-white');
      } else {
        classes.push(tabTextClass, tabHoverClass, 'bg-transparent');
      }
    }

    return classes.join(' ');
  };

  const getGroupTabStyle = (isActive: boolean) => {
    if (isActive && isCustomColor) {
      return { backgroundColor: activeTheme.groupActive };
    }
    return undefined;
  };

  const getCategoryTabClasses = (isActive: boolean) => {
    const classes = ['flex', 'items-center', 'space-x-2', 'whitespace-nowrap', 'transition-all'];

    if (paperView) {
      classes.push('px-2', 'py-1', 'rounded-none', 'border-b-2', tabTextClass);
      if (!isActive) {
        classes.push('border-transparent');
      } else if (!isCustomColor) {
        classes.push(activeTheme.border);
      }
    } else {
      classes.push('px-4', 'py-2', 'rounded-full', 'shadow-md');
      if (isActive) {
        if (!isCustomColor) classes.push(activeTheme.chipActive);
        classes.push(tabTextClass);
      } else {
        classes.push('bg-gray-100', 'dark:bg-gray-700', tabHoverClass, 'shadow-none', tabTextClass);
      }
    }

    return classes.join(' ');
  };

  const getCategoryTabStyle = (isActive: boolean) => {
    if (!isActive || !isCustomColor) return undefined;
    if (paperView) {
      return { borderColor: activeTheme.chipActive };
    }
    return { backgroundColor: activeTheme.chipActive };
  };

  useEffect(() => {
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
    <div
      className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col ${
        paperView ? 'font-caudex' : ''
      }`}
    >
      {isLoading && (
        <div className="fixed inset-0 bg-white dark:bg-gray-800 z-50 flex items-center justify-center">
          <div className="text-center">
            <div
              className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mb-4"
              style={
                isCustomColor
                  ? { borderColor: activeTheme.border, borderTopColor: 'transparent' }
                  : { borderColor: activeTheme.border }
              }
            ></div>
          </div>
        </div>
      )}

      {selectedProduct?.image && (
        <ImageViewer
          src={selectedProduct.image}
          visible={imageViewerVisible}
          onClose={() => setImageViewerVisible(false)}
        />
      )}

      <div
        className={`flex justify-center items-center relative text-white p-6 min-h-[10rem] shadow-lg bg-img ${
          coverPhotoUrl ? '' : isCustomColor ? '' : `bg-gradient-to-r ${activeTheme.header}`
        }`}
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
            style={
              isCustomColor
                ? { background: `linear-gradient(to right, ${activeTheme.header}, ${activeTheme.headerDarker})` }
                : {}
            }
          />
        )}
        <div className="relative z-10 text-center">
          <img src={logoUrl || logoImgSrc} alt="Brand logo" className="max-w-32 mx-auto" />
        </div>
      </div>

      <div
        className={`${paperView ? 'bg-orange-50' : 'bg-gray-50'} dark:bg-gray-800 sticky top-0 z-10 shadow-sm `}
      >
        <div className="flex flex-nowrap max-w-4xl mx-auto overflow-x-auto text-gray-600 dark:text-gray-300 space-x-3 text-xs uppercase px-4 pt-3 pb-1 font-semibold tracking-wide scrollbar-hide">
          {categoryGroups.map((group) => {
            const isGroupActive =
              getGroupFromCategory(selectedCategory) === group.name || selectedGallery?.name === group.name;
            return (
              <div
                key={group.id}
                onClick={() => {
                  if (group.type === 'gallery' && group.images) {
                    setSelectedGallery({ name: group.name, images: group.images });
                    setGalleryImageIndex(0);
                  } else {
                    const firstCategory = group.categories[0];
                    setSelectedCategory(firstCategory);
                    setSelectedGallery(null);
                    categoryButtonRefs.current[firstCategory]?.scrollIntoView({
                      behavior: 'smooth',
                      inline: 'center',
                      block: 'nearest',
                    });
                    scrollToCategoryHeader(firstCategory);
                  }
                }}
                className={getGroupTabClasses(isGroupActive)}
                style={getGroupTabStyle(isGroupActive)}
              >
                {group.name}
              </div>
            );
          })}
        </div>
        <div
          className={`flex max-w-4xl mx-auto overflow-x-auto  space-x-3 scrollbar-hide ${
            paperView ? 'px-4 pt-3' : 'p-4'
          }`}
        >
          {menuCategories.map((category) => {
            const isActive = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                ref={(el) => (categoryButtonRefs.current[category.id] = el)}
                onClick={() => {
                  setSelectedCategory(category.id);
                  categoryButtonRefs.current[category.id]?.scrollIntoView({
                    behavior: 'smooth',
                    inline: 'center',
                    block: 'nearest',
                  });
                  scrollToCategoryHeader(category.id);
                }}
                className={getCategoryTabClasses(isActive)}
                style={getCategoryTabStyle(isActive)}
              >
                <span className="font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${paperView ? 'bg-orange-50/25 px-8 py-4' : 'bg-white p-4'} dark:bg-gray-900 md:px-8 flex-1`}>
        <div
          className={
            paperView
              ? 'max-w-3xl mx-auto min-h-[600px] space-y-10'
              : 'grid grid-cols-1 md:grid-cols-2 max-w-4xl gap-4 mx-auto min-h-[600px]'
          }
        >
          {menuError && !isLoading && (
            <div className="text-center text-gray-600 dark:text-gray-400 font-semibold py-12">
              Menu not Found
            </div>
          )}
          {menuCategories
            .filter((cat) => cat.id !== 'all')
            .map((category) => {
              const categoryProducts = products.filter((p) => p.category === category.id);
              if (categoryProducts.length === 0) return null;
              return (
                <div key={category.id} className="mt-6">
                  <h2
                    ref={(el) => (categoryHeaderRefs.current[category.id] = el)}
                    className={`${
                      paperView
                        ? 'font-italiana text-5xl tracking-wide text-gray-800 dark:text-gray-100 mb-2'
                        : 'text-xl font-extrabold text-gray-700 dark:text-gray-200 mb-4'
                    } px-1 border-b dark:border-gray-700 pb-1`}
                  >
                    {category.name}
                  </h2>
                  {categoryProducts.map((product) =>
                    paperView ? (
                      <ProductLine
                        key={product.$id ?? product.id}
                        product={product}
                        expandOptions={expandOptions}
                        showPriceRange={showPriceRange}
                        paperView={paperView}
                        onSelect={openProductDetail}
                      />
                    ) : (
                      <ProductCard
                        key={product.$id ?? product.id}
                        product={product}
                        expandOptions={expandOptions}
                        showPriceRange={showPriceRange}
                        paperView={paperView}
                        loadedImages={loadedImages}
                        onSelect={openProductDetail}
                      />
                    )
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {isDev && (
        <div className="justify-items-end fixed bottom-5 right-5 z-40">
          {settingsOpen && (
            <div className="mb-3 w-64 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-sm text-gray-700 dark:text-gray-200">
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span>paperView</span>
                  <input
                    type="checkbox"
                    checked={paperView}
                    onChange={(e) => setPaperView(e.target.checked)}
                    className="h-4 w-4 accent-amber-600"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>expandOptions</span>
                  <input
                    type="checkbox"
                    checked={expandOptions}
                    onChange={(e) => setExpandOptions(e.target.checked)}
                    className="h-4 w-4 accent-amber-600"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>showPriceRange</span>
                  <input
                    type="checkbox"
                    checked={showPriceRange}
                    onChange={(e) => setShowPriceRange(e.target.checked)}
                    className="h-4 w-4 accent-amber-600"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>darkMode</span>
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                    className="h-4 w-4 accent-amber-600"
                  />
                </label>
              </div>
            </div>
          )}
          <button
            type="button"
            aria-label="Menu settings"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="w-12 h-12 rounded-full shadow-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 flex items-center justify-center hover:shadow-xl transition"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      )}

      <ProductDetailOverlay
        isOpen={detailVisible}
        product={selectedProduct}
        selectedVariant={selectedVariant}
        onVariantChange={setSelectedVariant}
        onClose={closeDetailOverlay}
        onOpenImageViewer={() => setImageViewerVisible(true)}
        activeTheme={activeTheme}
        isCustomColor={isCustomColor}
        customerOrdersMode={customerOrdersMode}
        onAddToOrder={handleAddToOrder}
        paperView={paperView}
      />

      {selectedGallery && (
        <ImageViewer
          src={selectedGallery.images[galleryImageIndex]}
          visible={galleryImageViewerVisible}
          onClose={() => setGalleryImageViewerVisible(false)}
        />
      )}

      <GalleryModal
        gallery={selectedGallery}
        imageIndex={galleryImageIndex}
        onIndexChange={setGalleryImageIndex}
        onClose={() => setSelectedGallery(null)}
        onOpenViewer={() => setGalleryImageViewerVisible(true)}
        activeTheme={activeTheme}
        isCustomColor={isCustomColor}
      />

      {customerOrdersMode && orderStage === 'menu' && (
        <OrderFloatingButton
          totalItems={orderItemsCount}
          totalPrice={orderTotal}
          onClick={() => setOrderStage('summary')}
          paperView={paperView}
        />
      )}

      {customerOrdersMode && (
        <>
          <OrderSummaryPanel
            isOpen={orderStage === 'summary'}
            items={orderState.items}
            totalPrice={orderTotal}
            onClose={() => setOrderStage('menu')}
            onPlaceOrder={() => setOrderStage('details')}
            onClear={orderActions.clearItems}
            onUpdateQuantity={orderActions.updateItemQuantity}
            onRemove={orderActions.removeItem}
            paperView={paperView}
          />
          <OrderDetailsPanel
            isOpen={orderStage === 'details'}
            customer={orderState.customer}
            onUpdateCustomer={orderActions.updateCustomer}
            onBack={() => setOrderStage('summary')}
            onSendOrder={() => setOrderStage('success')}
          />
          <OrderSuccessPanel
            isOpen={orderStage === 'success'}
            onBackToMenu={() => setOrderStage('menu')}
            onClear={() => {
              orderActions.clearItems();
              setOrderStage('menu');
            }}
          />
        </>
      )}

      <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-6 mt-8">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">{footerText || 'Thank you for choosing Oltre ☺️'}</p>
          {!footerText && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Beyond coffee, made with passion
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuApp;
