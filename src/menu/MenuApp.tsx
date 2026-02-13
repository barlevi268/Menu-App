import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pointer, Settings } from 'lucide-react';
import themeClasses from './themeClasses';
import type { CategoryGroup, MenuCategory, MenuItem, MenuPreferences, OrderItem, OrderItemDraft } from './types';
import ImageViewer from './components/ImageViewer';
import ProductCard from './components/ProductCard';
import ProductLine from './components/ProductLine';
import ProductDetailOverlay from './components/ProductDetailOverlay';
import GalleryModal from './components/GalleryModal';
import OrderFloatingButton from './components/OrderFloatingButton';
import OrderSummaryPanel from './components/OrderSummaryPanel';
import OrderDetailsPanel, { type DispatchOption } from './components/OrderDetailsPanel';
import OrderSuccessPanel from './components/OrderSuccessPanel';
import OrderStatusPanel from './components/OrderStatusPanel';
import { useCustomerOrder } from './hooks/useCustomerOrder';

const logoImgSrc =
  'https://fra.cloud.appwrite.io/v1/storage/buckets/687dd5ef002a30eca0f9/files/687e5635002794eeec27/view?project=67d54dea00199fd0947e&mode=admin';

const MENU_CACHE_VERSION = 1;
const MENU_CACHE_PREFIX = 'menu-cache-v1';
const MENU_IMAGE_CACHE = 'menu-images-v1';
const DEFAULT_DISPATCH_OPTIONS: DispatchOption[] = [
  { key: 'Pickup', label: 'Pickup', requiresAddress: false },
  { key: 'Delivery', label: 'Delivery', requiresAddress: true },
];

const formatDispatchLabel = (value: string) =>
  value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getDispatchDisplayLabel = (key: string) => {
  if (key.trim().toLowerCase() === 'presetdelivery') return 'Delivery';
  return formatDispatchLabel(key);
};

const parseDispatchOptions = (preferences: MenuPreferences | null): DispatchOption[] => {
  const dispatchMap = preferences?.dispatchTyeps ?? preferences?.dispatchTypes;
  if (!dispatchMap || typeof dispatchMap !== 'object') {
    return DEFAULT_DISPATCH_OPTIONS;
  }

  const parsed = Object.entries(dispatchMap)
    .filter(([, config]) => config?.enabled !== false)
    .map(([key, config]) => {
      const rawLocations = config?.locations;
      const locationValues = Array.isArray(rawLocations)
        ? rawLocations
        : Object.values(rawLocations ?? {});
      const presetLocations = locationValues
        .map((location) => {
          const name = typeof location?.name === 'string' ? location.name.trim() : '';
          const address =
            typeof location?.address === 'string' ? location.address.trim() : '';
          if (!name || !address) return null;
          return { name, address };
        })
        .filter((location): location is { name: string; address: string } => Boolean(location));

      const normalizedKey = key.trim();
      const requiresAddress =
        presetLocations.length > 0 || normalizedKey.toLowerCase().includes('delivery');

      return {
        key: normalizedKey,
        label: getDispatchDisplayLabel(normalizedKey),
        instructions: config?.instructions ?? null,
        requiresAddress,
        presetLocations,
      };
    })
    .filter((option) => option.key.length > 0);

  return parsed.length > 0 ? parsed : DEFAULT_DISPATCH_OPTIONS;
};

type MenuAppProps = {
  customerOrdersMode?: boolean;
};

type OrderStage = 'menu' | 'summary' | 'details' | 'success' | 'status';

type MenuCachePayload = {
  version: number;
  cachedAt: string;
  companyId: string | null;
  companyName: string | null;
  company?: any | null;
  preferences: MenuPreferences | null;
  items: MenuItem[];
};

const getMenuCacheKey = (companyKey: string | null) =>
  `${MENU_CACHE_PREFIX}:${companyKey ?? 'default'}`;

const readMenuCache = (cacheKey: string): MenuCachePayload | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MenuCachePayload;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.version !== MENU_CACHE_VERSION) return null;
    if (!Array.isArray(parsed.items)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeMenuCache = (cacheKey: string, payload: MenuCachePayload) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
};

const collectImageUrls = (
  items: MenuItem[],
  preferences: MenuPreferences | null,
  fallbackLogoUrl?: string | null
) => {
  const urls = new Set<string>();
  items.forEach((item) => {
    if (item.image) urls.add(item.image);
  });

  if (preferences?.coverPhotoUrl) urls.add(preferences.coverPhotoUrl);
  if (preferences?.logoUrl) urls.add(preferences.logoUrl);
  if (fallbackLogoUrl) urls.add(fallbackLogoUrl);

  if (preferences?.menuTypes) {
    Object.values(preferences.menuTypes).forEach((menuType) => {
      if (Array.isArray(menuType?.images)) {
        menuType.images.forEach((url) => {
          if (url) urls.add(url);
        });
      }
    });
  }

  return Array.from(urls);
};

const getCompanyIdFromPath = () => {
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get('companyId') || params.get('id');

  const segments = window.location.pathname.split('/').filter(Boolean);
  if (paramId) return paramId;
  if (segments[0] === 'o') return null;
  if (segments[0] === 'menu' || segments[0] === 'order') {
    if (segments[1] === 'status') return null;
    return segments[1];
  }
  return segments[0];
};

const getOrderIdFromPath = () => {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments[0] === 'o') return segments[1] || null;
  const statusIndex = segments.indexOf('status');
  if (statusIndex === -1) return null;
  return segments[statusIndex + 1] || null;
};

const getReservationCustomerIdFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('reservationCustomerId') || params.get('customerId') || null;
};

const getReservationSlotIdFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('reservationSlotId') || params.get('slotId') || null;
};

const getReservationPaxFromQuery = () => {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('pax');
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return Math.floor(parsed);
};

const getActiveOrderStorageKey = (companyId?: string | null) =>
  companyId ? `customer-order:active:${companyId}` : 'customer-order:active:pending';

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
  const [imageOverrides, setImageOverrides] = useState<Record<string, string>>({});
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [selectedGallery, setSelectedGallery] = useState<{ name: string; images: string[] } | null>(null);
  const [galleryImageIndex, setGalleryImageIndex] = useState(0);
  const [galleryImageViewerVisible, setGalleryImageViewerVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showMenuScrollHint, setShowMenuScrollHint] = useState(false);

  const categoryButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const categoryHeaderRefs = useRef<Record<string, HTMLHeadingElement | null>>({});
  const menuViewedSentRef = useRef(false);
  const isAutoScrollingRef = useRef(false);
  const statusRequestRef = useRef(false);
  const statusCheckRef = useRef<string | null>(null);
  const menuScrollHintTimeoutRef = useRef<number | null>(null);
  const hasShownMenuScrollHintRef = useRef(false);
  const hasHydratedFromCacheRef = useRef(false);
  const hydratedCacheKeyRef = useRef<string | null>(null);
  const requestCompanyIdRef = useRef<string | null>(null);
  const imageOverridesRef = useRef<Record<string, string>>({});
  const companyDetailsRef = useRef<any | null>(null);
  const menuPreferencesRef = useRef<MenuPreferences | null>(null);
  const productsRef = useRef<MenuItem[]>([]);

  const orderedCategoryIds = useMemo(
    () => menuCategories.filter((c) => c.id !== 'all').map((c) => c.id),
    [menuCategories]
  );

  const { state: orderState, actions: orderActions } = useCustomerOrder(companyId);
  const [orderStage, setOrderStage] = useState<OrderStage>('menu');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [reservationCustomerId, setReservationCustomerId] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [statusData, setStatusData] = useState<{
    status: string | null;
    updatedAt: string | null;
    paymentStatus: string | null;
    paymentAmount: number | null;
    paymentLink: string | null;
  } | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const orderTotal = useMemo(
    () => orderState.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [orderState.items]
  );
  const dispatchOptions = useMemo(
    () => parseDispatchOptions(menuPreferences),
    [menuPreferences]
  );
  const orderItemsCount = useMemo(
    () => orderState.items.reduce((sum, item) => sum + item.quantity, 0),
    [orderState.items]
  );
  const ongoingStatus = statusData?.status ?? null;
  const hasOngoingOrder =
    Boolean(orderId && ongoingStatus) && ongoingStatus !== 'draft' && ongoingStatus !== 'deleted';
  const statusLink = useMemo(() => {
    if (!orderId || typeof window === 'undefined') return null;
    const url = new URL(window.location.href);
    url.pathname = `/o/${orderId}`;
    url.search = '';
    return url.toString();
  }, [orderId]);

  const getStoredActiveOrderId = React.useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const key = getActiveOrderStorageKey(companyId);
      const stored = window.localStorage.getItem(key);
      if (stored) return stored;
      if (companyId) {
        return window.localStorage.getItem(getActiveOrderStorageKey(null));
      }
    } catch {
      // ignore
    }
    return null;
  }, [companyId]);

  const setStoredActiveOrderId = React.useCallback(
    (id: string) => {
      if (typeof window === 'undefined') return;
      try {
        const key = getActiveOrderStorageKey(companyId);
        window.localStorage.setItem(key, id);
        if (companyId) {
          window.localStorage.removeItem(getActiveOrderStorageKey(null));
        }
      } catch {
        // ignore
      }
    },
    [companyId]
  );

  const clearStoredActiveOrderId = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(getActiveOrderStorageKey(companyId));
      window.localStorage.removeItem(getActiveOrderStorageKey(null));
    } catch {
      // ignore
    }
  }, [companyId]);

  useEffect(() => {
    if (!customerOrdersMode && orderStage !== 'menu') {
      setOrderStage('menu');
    }
  }, [customerOrdersMode, orderStage]);

  useEffect(() => {
    if (orderStage !== 'details' && submitError) {
      setSubmitError(null);
    }
  }, [orderStage, submitError]);

  useEffect(() => {
    if (
      customerOrdersMode &&
      orderStage !== 'menu' &&
      orderStage !== 'status' &&
      orderState.items.length === 0
    ) {
      setOrderStage('menu');
    }
  }, [customerOrdersMode, orderStage, orderState.items.length]);

  useEffect(() => {
    if (!customerOrdersMode) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const linkedOrderId = params.get('orderId') || params.get('status') || getOrderIdFromPath();
    const linkedCustomerId = getReservationCustomerIdFromQuery();
    if (linkedOrderId) {
      setOrderId(linkedOrderId);
      setOrderStage('status');
      setStoredActiveOrderId(linkedOrderId);
    }
    if (linkedCustomerId) {
      setReservationCustomerId(linkedCustomerId);
    }
  }, [customerOrdersMode, setStoredActiveOrderId]);

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

      if (
        customerOrdersMode &&
        orderStage === 'menu' &&
        !hasShownMenuScrollHintRef.current &&
        window.scrollY > 0
      ) {
        hasShownMenuScrollHintRef.current = true;
        if (menuScrollHintTimeoutRef.current) {
          window.clearTimeout(menuScrollHintTimeoutRef.current);
        }
        menuScrollHintTimeoutRef.current = window.setTimeout(() => {
          setShowMenuScrollHint(true);
          menuScrollHintTimeoutRef.current = window.setTimeout(() => {
            setShowMenuScrollHint(false);
          }, 4000);
        }, 500);
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
  }, [STICKY_OFFSET, orderedCategoryIds, selectedCategory, customerOrdersMode, orderStage]);

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

  const buildLineNotes = (item: OrderItem) => {
    const parts: string[] = [];
    if (item.variant) parts.push(`Variant: ${item.variant}`);
    if (item.optionName) parts.push(`Option: ${item.optionName}`);
    if (item.note) parts.push(item.note);
    return parts.length > 0 ? parts.join(' | ') : undefined;
  };

  type DraftOrderLine = {
    id?: string | null;
    customerOrderLineId?: string | null;
    customer_order_line_id?: string | null;
    orderLineId?: string | null;
    lineId?: string | null;
    customerMenuItemId?: string | null;
    customerMenuId?: string | null;
    menuItemId?: string | null;
    itemId?: string | null;
    customerMenuItem?: { id?: string | null } | null;
    quantity?: number | null;
    notes?: string | null;
  };

  type CustomerOrderLinePayload = {
    customerMenuItemId: string;
    quantity: number;
    notes?: string;
    customerOrderLineId?: string;
  };

  const normalizeNote = (value?: string | null) => (value ?? '').trim();

  const buildCustomerOrderLines = (items: OrderItem[]): CustomerOrderLinePayload[] =>
    items.map((item) => ({
      customerMenuItemId: item.productId,
      quantity: item.quantity,
      notes: buildLineNotes(item),
    }));

  const extractDraftLines = (draftData: Record<string, unknown> | null): DraftOrderLine[] => {
    if (!draftData || typeof draftData !== 'object') return [];
    const lines =
      (draftData as { customerOrderLines?: DraftOrderLine[] }).customerOrderLines ??
      (draftData as { orderLines?: DraftOrderLine[] }).orderLines ??
      (draftData as { lines?: DraftOrderLine[] }).lines ??
      (draftData as { customerOrder?: { customerOrderLines?: DraftOrderLine[] } }).customerOrder
        ?.customerOrderLines ??
      (draftData as { order?: { customerOrderLines?: DraftOrderLine[] } }).order
        ?.customerOrderLines ??
      (draftData as { data?: { customerOrderLines?: DraftOrderLine[] } }).data
        ?.customerOrderLines ??
      (draftData as { items?: DraftOrderLine[] }).items ??
      [];
    return Array.isArray(lines) ? lines : [];
  };

  const getDraftLineId = (line: DraftOrderLine): string | null => {
    return (
      line.customerOrderLineId ??
      line.customer_order_line_id ??
      line.id ??
      line.orderLineId ??
      line.lineId ??
      null
    );
  };

  const getDraftProductId = (line: DraftOrderLine): string | null => {
    return (
      line.customerMenuItemId ??
      line.customerMenuId ??
      line.menuItemId ??
      line.itemId ??
      line.customerMenuItem?.id ??
      null
    );
  };

  const attachDraftLineIds = (
    lines: CustomerOrderLinePayload[],
    draftLines: DraftOrderLine[]
  ): CustomerOrderLinePayload[] => {
    if (draftLines.length === 0) return lines;
    const available = [...draftLines];

    const consumeMatch = (
      line: CustomerOrderLinePayload,
      predicate: (draft: DraftOrderLine) => boolean
    ) => {
      const matchIndex = available.findIndex(predicate);
      if (matchIndex < 0) return line;
      const [matched] = available.splice(matchIndex, 1);
      const lineId = matched ? getDraftLineId(matched) : null;
      if (!lineId) return line;
      return { ...line, customerOrderLineId: lineId };
    };

    const strictMatched = lines.map((line) =>
      consumeMatch(line, (draft) => {
        const draftProductId = getDraftProductId(draft);
        if (!draftProductId || draftProductId !== line.customerMenuItemId) return false;
        const draftNotes = normalizeNote(draft.notes);
        const lineNotes = normalizeNote(line.notes);
        if (draftNotes !== lineNotes) return false;
        if (typeof draft.quantity === 'number' && draft.quantity !== line.quantity) {
          return false;
        }
        return true;
      })
    );

    const relaxedMatched = strictMatched.map((line) => {
      if (line.customerOrderLineId) return line;
      return consumeMatch(line, (draft) => {
        const draftProductId = getDraftProductId(draft);
        if (!draftProductId || draftProductId !== line.customerMenuItemId) return false;
        if (typeof draft.quantity === 'number' && draft.quantity !== line.quantity) {
          return false;
        }
        return true;
      });
    });

    return relaxedMatched.map((line, index) => {
      if (line.customerOrderLineId) return line;
      const fallback = draftLines[index];
      const fallbackId = fallback ? getDraftLineId(fallback) : null;
      if (!fallbackId) return line;
      return { ...line, customerOrderLineId: fallbackId };
    });
  };

  const buildOrderNotes = () => {
    const trimmed = orderState.customer.notes.trim();
    return trimmed ? trimmed : undefined;
  };

  const getResponseError = async (res: Response) => {
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const data = await res.json();
        if (data?.message) return String(data.message);
        return JSON.stringify(data);
      } catch {
        // ignore
      }
    }
    try {
      const text = await res.text();
      if (text) return text.slice(0, 200);
    } catch {
      // ignore
    }
    return `Request failed with status ${res.status}`;
  };

  const createReservationCustomer = React.useCallback(async () => {
    if (reservationCustomerId) return reservationCustomerId;
    if (typeof window === 'undefined') return null;
    const slotId = getReservationSlotIdFromQuery();
    if (!slotId) return null;

    const name = orderState.customer.name.trim();
    if (!name) {
      throw new Error('Please enter your name to continue.');
    }

    const payload = {
      slotId,
      pax: getReservationPaxFromQuery() ?? 1,
      customerName: name,
      customerMobileNumber: orderState.customer.phone.trim() || undefined,
    };

    const res = await fetch(`${baseUrl}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(await getResponseError(res));
    }

    const data = await res.json();
    const createdId = data?.customerId ?? data?.customer?.id ?? null;
    if (!createdId) {
      throw new Error('Failed to create customer profile.');
    }
    setReservationCustomerId(createdId);
    return createdId;
  }, [
    baseUrl,
    reservationCustomerId,
    orderState.customer.name,
    orderState.customer.phone,
  ]);

  useEffect(() => {
    const selected = dispatchOptions.find(
      (option) => option.key === orderState.customer.dispatchType
    );
    const fallback = dispatchOptions[0];
    const currentAddress = (orderState.customer.dispatchInfo?.address ?? '').trim();

    if (!selected) {
      if (!fallback) return;
      orderActions.updateCustomer({
        dispatchType: fallback.key,
        dispatchInfo: {
          ...(orderState.customer.dispatchInfo ?? { address: '', notes: '' }),
          address: fallback.presetLocations?.[0]?.address ?? '',
        },
      });
      return;
    }

    if (selected.presetLocations && selected.presetLocations.length > 0) {
      const hasMatchingPreset = selected.presetLocations.some(
        (location) => location.address === currentAddress
      );
      if (!hasMatchingPreset) {
        orderActions.updateCustomer({
          dispatchInfo: {
            ...(orderState.customer.dispatchInfo ?? { address: '', notes: '' }),
            address: selected.presetLocations[0].address,
          },
        });
      }
    }
  }, [dispatchOptions, orderActions, orderState.customer.dispatchInfo, orderState.customer.dispatchType]);

  const handleSubmitOrder = React.useCallback(async () => {
    if (isSubmittingOrder) return;
    setSubmitError(null);

    if (!companyId) {
      setSubmitError('Missing company information. Please refresh the page.');
      return;
    }
    if (orderState.items.length === 0) {
      setSubmitError('Your order is empty.');
      return;
    }
    const customerName = orderState.customer.name.trim();
    const customerPhone = orderState.customer.phone.trim();
    const dispatchType = orderState.customer.dispatchType;
    const selectedDispatchOption =
      dispatchOptions.find((option) => option.key === dispatchType) ?? null;
    const requiresDispatchAddress = Boolean(selectedDispatchOption?.requiresAddress);
    const dispatchInfo = orderState.customer.dispatchInfo ?? { address: '', notes: '' };
    const dispatchAddress = dispatchInfo.address.trim();
    const dispatchNotes = dispatchInfo.notes.trim();
    if (!customerName || !customerPhone) {
      setSubmitError('Please enter your name and phone number.');
      return;
    }
    if (requiresDispatchAddress && !dispatchAddress) {
      setSubmitError('Please enter your delivery address.');
      return;
    }

    const totalAmount = Number(orderTotal.toFixed(2));
    const customerOrderLines = buildCustomerOrderLines(orderState.items);
    const orderNotes = buildOrderNotes();

    try {
      setIsSubmittingOrder(true);
      const reservationId = await createReservationCustomer();

      const draftPayload: Record<string, unknown> = {
        customerName,
        customerPhone,
        customerOrderLines,
        status: 'draft',
        totalAmount,
        orderNotes,
      };
      draftPayload.dispatchType = dispatchType;
      if (requiresDispatchAddress) {
        draftPayload.dispatchInfo = {
          address: dispatchAddress,
          notes: dispatchNotes || undefined,
        };
      }
      if (reservationId) {
        draftPayload.customerId = reservationId;
      }

      const draftRes = await fetch(`${baseUrl}/public/customer-orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(draftPayload),
      });

      if (!draftRes.ok) {
        throw new Error(await getResponseError(draftRes));
      }

      const draftData = await draftRes.json();
      const draftId = draftData?.id ?? draftData?.orderId ?? null;
      if (!draftId) {
        throw new Error('Failed to create a draft order.');
      }

      const draftLines = extractDraftLines(draftData ?? null);
      const submitLines = attachDraftLineIds(customerOrderLines, draftLines);

      const submitPayload: Record<string, unknown> = {
        customerOrderLines: submitLines,
        status: 'received',
        totalAmount,
        orderNotes,
      };
      submitPayload.dispatchType = dispatchType;
      if (requiresDispatchAddress) {
        submitPayload.dispatchInfo = {
          address: dispatchAddress,
          notes: dispatchNotes || undefined,
        };
      }
      if (reservationId) {
        submitPayload.reservationCustomerId = reservationId;
      }

      const submitRes = await fetch(`${baseUrl}/public/customer-orders/${draftId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(submitPayload),
      });

      if (!submitRes.ok) {
        throw new Error(await getResponseError(submitRes));
      }

      const submitData = await submitRes.json();
      const resolvedOrderId = submitData?.id ?? draftId;
      const paymentUrl = submitData?.payment?.paymentLink ?? submitData?.paymentLink ?? null;

      if (!paymentUrl) {
        throw new Error('Payment link was not returned. Please try again.');
      }

      setOrderId(resolvedOrderId);
      setPaymentLink(paymentUrl);
      setStoredActiveOrderId(resolvedOrderId);
      setStatusData({
        status: submitData?.status ?? 'received',
        updatedAt: submitData?.updatedAt ?? new Date().toISOString(),
        paymentStatus: submitData?.payment?.status ?? null,
        paymentAmount:
          typeof submitData?.payment?.amount === 'number' ? submitData.payment.amount : null,
        paymentLink: paymentUrl,
      });
      setOrderStage('success');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Failed to submit order. Please try again.'
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  }, [
    baseUrl,
    companyId,
    createReservationCustomer,
    dispatchOptions,
    isSubmittingOrder,
    orderState.items,
    orderState.customer,
    orderTotal,
    setStoredActiveOrderId,
  ]);

  const handleOpenPayment = React.useCallback(() => {
    if (!paymentLink || typeof window === 'undefined') return;
    window.open(paymentLink, '_blank', 'noopener,noreferrer');
  }, [paymentLink]);

  const fetchOrderStatus = React.useCallback(
    async (targetId: string) => {
      if (statusRequestRef.current) return null;
      statusRequestRef.current = true;
      setStatusError(null);
      setIsStatusLoading(true);
      try {
        const res = await fetch(`${baseUrl}/public/customer-orders/${targetId}/status`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) {
          throw new Error(await getResponseError(res));
        }
        const data = await res.json();
        const paymentFromStatus = data?.payment ?? null;
        const paymentUrl =
          paymentFromStatus?.paymentLink ??
          paymentFromStatus?.payment_link ??
          data?.paymentLink ??
          null;

        setStatusData({
          status: data?.status ?? null,
          updatedAt: data?.updatedAt ?? null,
          paymentStatus: paymentFromStatus?.status ?? null,
          paymentAmount:
            typeof paymentFromStatus?.amount === 'number' ? paymentFromStatus.amount : null,
          paymentLink: paymentUrl,
        });

        if (paymentUrl) {
          setPaymentLink(paymentUrl);
        }
        return data;
      } catch (error) {
        setStatusError(
          error instanceof Error ? error.message : 'Failed to fetch status. Please retry.'
        );
        return null;
      } finally {
        setIsStatusLoading(false);
        statusRequestRef.current = false;
      }
    },
    [baseUrl]
  );

  const clearLocalOrderState = React.useCallback(() => {
    const defaultDispatch = dispatchOptions[0] ?? DEFAULT_DISPATCH_OPTIONS[0];
    orderActions.clearItems();
    orderActions.updateCustomer({
      name: '',
      phone: '',
      notes: '',
      dispatchType: defaultDispatch.key,
      dispatchInfo: {
        address: defaultDispatch.presetLocations?.[0]?.address ?? '',
        notes: '',
      },
    });
    setOrderId(null);
    setPaymentLink(null);
    setStatusData(null);
    setOrderStage('menu');
    clearStoredActiveOrderId();
  }, [dispatchOptions, orderActions, clearStoredActiveOrderId]);

  const checkExistingOrderStatus = React.useCallback(
    async (existingId: string) => {
      const data = await fetchOrderStatus(existingId);
      const status = data?.status ?? null;
      if (!status) return;
      if (status === 'draft') return;
      if (status === 'deleted') {
        clearLocalOrderState();
        return;
      }
      setOrderId(existingId);
    },
    [fetchOrderStatus, clearLocalOrderState]
  );

  useEffect(() => {
    if (!customerOrdersMode) return;
    if (orderStage !== 'menu') return;
    const storedId = getStoredActiveOrderId();
    if (!storedId) return;
    if (statusCheckRef.current === storedId) return;
    statusCheckRef.current = storedId;
    void checkExistingOrderStatus(storedId);
  }, [customerOrdersMode, orderStage, getStoredActiveOrderId, checkExistingOrderStatus]);

  const fetchOrderInfo = React.useCallback(
    async (targetId: string) => {
      if (paymentLink) return;
      try {
        const res = await fetch(`${baseUrl}/public/customer-orders/${targetId}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const paymentUrl = data?.payment?.paymentLink ?? data?.paymentLink ?? null;
        if (paymentUrl) setPaymentLink(paymentUrl);
      } catch {
        // ignore
      }
    },
    [baseUrl, paymentLink]
  );

  useEffect(() => {
    imageOverridesRef.current = imageOverrides;
  }, [imageOverrides]);

  useEffect(() => {
    menuPreferencesRef.current = menuPreferences;
  }, [menuPreferences]);

  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  useEffect(() => {
    return () => {
      Object.values(imageOverridesRef.current).forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const getImageSrc = React.useCallback(
    (url?: string | null) => {
      if (!url) return null;
      return imageOverrides[url] ?? url;
    },
    [imageOverrides]
  );

  const matchCachedImage = React.useCallback(async (cache: Cache, url: string) => {
    const corsRequest = new Request(url, { mode: 'cors' });
    const cachedCors = await cache.match(corsRequest);
    if (cachedCors) return cachedCors;
    const noCorsRequest = new Request(url, { mode: 'no-cors' });
    return cache.match(noCorsRequest);
  }, []);

  const warmImageCache = React.useCallback(async (urls: string[]) => {
    if (typeof window === 'undefined' || !('caches' in window)) return;
    if (urls.length === 0) return;
    const cache = await caches.open(MENU_IMAGE_CACHE);
    await Promise.all(
      urls.map(async (url) => {
        if (!url) return;
        try {
          const existing = await matchCachedImage(cache, url);
          if (existing) return;
          try {
            await cache.add(new Request(url, { mode: 'cors' }));
          } catch {
            await cache.add(new Request(url, { mode: 'no-cors' }));
          }
        } catch {
          // ignore cache failures
        }
      })
    );
  }, [matchCachedImage]);

  const hydrateCachedImages = React.useCallback(
    async (urls: string[]) => {
      if (typeof window === 'undefined' || !('caches' in window)) return;
      if (urls.length === 0) return;
      const cache = await caches.open(MENU_IMAGE_CACHE);
      const overrides: Record<string, string> = {};

      await Promise.all(
        urls.map(async (url) => {
          if (!url || imageOverridesRef.current[url]) return;
          try {
            const match = await matchCachedImage(cache, url);
            if (!match) return;
            const blob = await match.blob();
            const objectUrl = URL.createObjectURL(blob);
            overrides[url] = objectUrl;
          } catch {
            // ignore invalid cached entries
          }
        })
      );

      if (Object.keys(overrides).length > 0) {
        setImageOverrides((prev) => ({ ...prev, ...overrides }));
        setLoadedImages((prev) => new Set([...prev, ...Object.values(overrides)]));
      }
    },
    [matchCachedImage]
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
      'paperView' in value ||
      'dispatchTyeps' in value ||
      'dispatchTypes' in value ||
      'resturantAddress' in value ||
      'resturantPhone' in value
    );
  };

  const applyPreferences = React.useCallback(
    (preferences: MenuPreferences | null, items?: MenuItem[], options?: { merge?: boolean }) => {
      const mergedPreferences = options?.merge
        ? { ...(menuPreferencesRef.current ?? {}), ...(preferences ?? {}) }
        : preferences;

      setMenuPreferences(mergedPreferences);

      const sourceItems = items ?? productsRef.current;
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
    []
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

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const requestCompanyId =
      (getCompanyIdFromPath() ?? import.meta.env.VITE_COMPANY_ID) || null;
    requestCompanyIdRef.current = requestCompanyId;
    const cacheKey = getMenuCacheKey(requestCompanyId);
    if (hydratedCacheKeyRef.current === cacheKey) return;
    const cached = readMenuCache(cacheKey);
    if (!cached) return;

    hydratedCacheKeyRef.current = cacheKey;
    hasHydratedFromCacheRef.current = true;
    setMenuError(false);
    setIsLoading(false);
    setCompanyId(cached.companyId ?? requestCompanyId);
    setCompanyName(
      cached.companyName ??
        cached.company?.name ??
        cached.company?.companyName ??
        cached.company?.company_name ??
        null
    );
    companyDetailsRef.current = cached.company ?? null;
    setProducts(cached.items);
    applyPreferences(cached.preferences, cached.items);

    const cachedImageUrls = collectImageUrls(
      cached.items,
      cached.preferences,
      logoImgSrc
    );
    void hydrateCachedImages(cachedImageUrls);
  }, [applyPreferences, hydrateCachedImages]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        if (!hasHydratedFromCacheRef.current) {
          setIsLoading(true);
        }
        setMenuError(false);
        const requestCompanyId =
          (requestCompanyIdRef.current ??
            getCompanyIdFromPath() ??
            import.meta.env.VITE_COMPANY_ID) ||
          null;
        requestCompanyIdRef.current = requestCompanyId;
        const companyIdOrSlug = requestCompanyId ?? import.meta.env.VITE_COMPANY_ID ?? '';
        const path = `${baseUrl}/public/customer-menu/${companyIdOrSlug}`;
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
        companyDetailsRef.current = data?.company ?? null;
        const preferences = getPreferences(data);
        let orderPreferences: MenuPreferences | null = null;

        if (customerOrdersMode && companyIdOrSlug) {
          const orderPrefsPath = `${baseUrl}/public/customer-orders/preferences/${companyIdOrSlug}`;
          try {
            const orderPrefsRes = await fetch(orderPrefsPath, {
              headers: { Accept: 'application/json' },
            });
            if (orderPrefsRes.ok) {
              const orderPrefsData = await orderPrefsRes.json();
              orderPreferences =
                orderPrefsData?.preferences ??
                orderPrefsData?.customerOrdersPreferences ??
                null;
            } else {
              console.warn('Failed to fetch order preferences:', orderPrefsRes.status);
            }
          } catch (prefsError) {
            console.warn('Failed to fetch order preferences:', prefsError);
          }
        }

        const mergedPreferences: MenuPreferences | null =
          preferences || orderPreferences
            ? {
                ...(preferences ?? {}),
                ...(orderPreferences ?? {}),
              }
            : null;
        const rawItems = Array.isArray(data)
          ? data
          : data?.items ?? data?.documents ?? data?.data ?? [];
        const items = rawItems.map((item: MenuItem) => ({
          ...item,
          category: normalizeValue(item.category, 'uncategorized'),
          menuType: normalizeValue(item.menuType, 'menu'),
        }));
        setProducts(items);
        applyPreferences(mergedPreferences, items);
        const cacheKey = getMenuCacheKey(requestCompanyId);
        writeMenuCache(cacheKey, {
          version: MENU_CACHE_VERSION,
          cachedAt: new Date().toISOString(),
          companyId: resolvedCompanyId,
          companyName: data?.company?.name ?? data?.companyName ?? data?.company_name ?? null,
          company: data?.company ?? null,
          preferences: mergedPreferences,
          items,
        });
        const imageUrls = collectImageUrls(items, mergedPreferences, logoImgSrc);
        void warmImageCache(imageUrls);
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
  }, [baseUrl, trackMenuViewed, warmImageCache, applyPreferences, customerOrdersMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (products.length === 0) return;
    const requestCompanyId =
      (requestCompanyIdRef.current ??
        getCompanyIdFromPath() ??
        import.meta.env.VITE_COMPANY_ID) ||
      null;
    const cacheKey = getMenuCacheKey(requestCompanyId);
    writeMenuCache(cacheKey, {
      version: MENU_CACHE_VERSION,
      cachedAt: new Date().toISOString(),
      companyId,
      companyName,
      company: companyDetailsRef.current,
      preferences: menuPreferences,
      items: products,
    });
  }, [products, menuPreferences, companyId, companyName]);

  const imageUrls = useMemo(
    () => collectImageUrls(products, menuPreferences, logoImgSrc),
    [products, menuPreferences]
  );

  useEffect(() => {
    if (imageUrls.length === 0) {
      return;
    }

    const preloadImage = (url: string) => {
      if (!url || url.startsWith('blob:')) {
        return Promise.resolve(url);
      }
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
    void warmImageCache(imageUrls);
    void hydrateCachedImages(imageUrls);
  }, [imageUrls, warmImageCache, hydrateCachedImages]);

  useEffect(() => {
    if (!customerOrdersMode || orderStage !== 'status' || !orderId) return;
    void fetchOrderStatus(orderId);
    const interval = window.setInterval(() => {
      void fetchOrderStatus(orderId);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [customerOrdersMode, orderStage, orderId, fetchOrderStatus]);

  useEffect(() => {
    if (!customerOrdersMode || orderStage !== 'status' || !orderId) return;
    void fetchOrderInfo(orderId);
  }, [customerOrdersMode, orderStage, orderId, fetchOrderInfo]);

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

  useEffect(() => {
    return () => {
      if (menuScrollHintTimeoutRef.current) {
        window.clearTimeout(menuScrollHintTimeoutRef.current);
      }
    };
  }, []);

  const resolvedLogoUrl = getImageSrc(logoUrl ?? logoImgSrc) ?? logoImgSrc;
  const resolvedCoverPhotoUrl = getImageSrc(coverPhotoUrl);
  const resolvedSelectedProductImage = getImageSrc(selectedProduct?.image ?? null);
  const resolvedGalleryImage = selectedGallery
    ? getImageSrc(selectedGallery.images[galleryImageIndex])
    : null;

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

      <AnimatePresence>
        {customerOrdersMode && orderStage === 'menu' && showMenuScrollHint && (
          <motion.div
            className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex flex-col items-center gap-3 text-sm font-semibold text-white py-4 px-6 bg-gray-800/70 rounded-2xl shadow-lg pointer-events-auto">
              <Pointer className="h-7 w-7 menu-pointer-float" />
              <div className='text-xl'>Select an option</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {resolvedSelectedProductImage && (
        <ImageViewer
          src={resolvedSelectedProductImage}
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
              ? { backgroundImage: `url(${resolvedCoverPhotoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
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
          <img src={resolvedLogoUrl} alt="Brand logo" className="max-w-32 mx-auto" />
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
                        imageSrc={getImageSrc(product.image)}
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
        imageSrc={resolvedSelectedProductImage}
        selectedVariant={selectedVariant}
        onVariantChange={setSelectedVariant}
        onClose={closeDetailOverlay}
        onOpenImageViewer={() => setImageViewerVisible(true)}
        activeTheme={activeTheme}
        isCustomColor={isCustomColor}
        customerOrdersMode={customerOrdersMode}
        onAddToOrder={hasOngoingOrder ? undefined : handleAddToOrder}
        paperView={paperView}
      />

      {selectedGallery && resolvedGalleryImage && (
        <ImageViewer
          src={resolvedGalleryImage}
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
        resolveImage={getImageSrc}
      />

      {customerOrdersMode && orderStage === 'menu' && (
        <OrderFloatingButton
          totalItems={orderItemsCount}
          totalPrice={orderTotal}
          onClick={() => setOrderStage(hasOngoingOrder ? 'status' : 'summary')}
          paperView={paperView}
          mode={hasOngoingOrder ? 'ongoing' : 'cart'}
          statusLabel={hasOngoingOrder ? ongoingStatus : null}
          isHidden={!hasOngoingOrder && orderItemsCount <= 0}
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
            dispatchOptions={dispatchOptions}
            onUpdateCustomer={orderActions.updateCustomer}
            onBack={() => setOrderStage('summary')}
            onSendOrder={handleSubmitOrder}
            isSubmitting={isSubmittingOrder}
            submitError={submitError}
          />
          <OrderSuccessPanel
            isOpen={orderStage === 'success'}
            orderId={orderId}
            paymentLink={paymentLink}
            statusLink={statusLink}
            onPay={handleOpenPayment}
            onViewStatus={() => setOrderStage('status')}
            onBackToMenu={() => setOrderStage('menu')}
            onClear={() => {
              orderActions.clearItems();
              setOrderStage('menu');
            }}
          />
          <OrderStatusPanel
            isOpen={orderStage === 'status'}
            orderId={orderId}
            status={statusData?.status ?? null}
            updatedAt={statusData?.updatedAt ?? null}
            paymentStatus={statusData?.paymentStatus ?? null}
            paymentAmount={statusData?.paymentAmount ?? null}
            isLoading={isStatusLoading}
            error={statusError}
            paymentLink={paymentLink}
            onPay={handleOpenPayment}
            onClose={() => setOrderStage('menu')}
            onRefresh={() => {
              if (orderId) void fetchOrderStatus(orderId);
            }}
            onBackToMenu={() => setOrderStage('menu')}
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
