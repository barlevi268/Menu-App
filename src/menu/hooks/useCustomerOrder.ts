import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CustomerDetails, CustomerOrderState, OrderItem, OrderItemDraft } from '../types';

const EMPTY_CUSTOMER: CustomerDetails = {
  name: '',
  phone: '',
  notes: '',
  dispatchType: 'Pickup',
  dispatchInfo: {
    address: '',
    notes: '',
  },
};

const EMPTY_STATE: CustomerOrderState = {
  items: [],
  customer: EMPTY_CUSTOMER,
  updatedAt: null,
};

const safeParse = (value: string | null): CustomerOrderState | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as CustomerOrderState;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      customer: {
        name: parsed.customer?.name ?? '',
        phone: parsed.customer?.phone ?? '',
        notes: parsed.customer?.notes ?? '',
        dispatchType:
          typeof parsed.customer?.dispatchType === 'string' &&
          parsed.customer.dispatchType.trim()
            ? parsed.customer.dispatchType.trim()
            : 'Pickup',
        dispatchInfo: {
          address: parsed.customer?.dispatchInfo?.address ?? '',
          notes: parsed.customer?.dispatchInfo?.notes ?? '',
        },
      },
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return null;
  }
};

const loadState = (key: string): CustomerOrderState => {
  if (typeof window === 'undefined') return { ...EMPTY_STATE };
  const stored = safeParse(window.localStorage.getItem(key));
  return stored ?? { ...EMPTY_STATE };
};

const createLineItemId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `item_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const isSameItem = (a: OrderItem, b: OrderItemDraft) => {
  return (
    a.productId === b.productId &&
    (a.optionName ?? '') === (b.optionName ?? '') &&
    (a.variant ?? '') === (b.variant ?? '') &&
    (a.note ?? '') === (b.note ?? '')
  );
};

export type CustomerOrderActions = {
  addItem: (item: OrderItemDraft) => void;
  updateItemQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
  updateCustomer: (patch: Partial<CustomerDetails>) => void;
  updateItemNote: (id: string, note: string) => void;
};

export const useCustomerOrder = (companyId?: string | null) => {
  const storageKey = useMemo(
    () => (companyId ? `customer-order:${companyId}` : 'customer-order:pending'),
    [companyId]
  );
  const [state, setState] = useState<CustomerOrderState>(() => loadState(storageKey));
  const activeKeyRef = useRef(storageKey);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (activeKeyRef.current === storageKey) return;

    const nextState = loadState(storageKey);
    const pendingKey = 'customer-order:pending';
    if (storageKey !== pendingKey && activeKeyRef.current === pendingKey) {
      const pendingState = loadState(pendingKey);
      const hasPending =
        pendingState.items.length > 0 ||
        pendingState.customer.name ||
        pendingState.customer.phone ||
        pendingState.customer.notes;

      if (hasPending && nextState.items.length === 0) {
        setState(pendingState);
        try {
          window.localStorage.removeItem(pendingKey);
        } catch {
          // ignore
        }
      } else {
        setState(nextState);
      }
    } else {
      setState(nextState);
    }

    activeKeyRef.current = storageKey;
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [state, storageKey]);

  const addItem = useCallback((draft: OrderItemDraft) => {
    setState((prev) => {
      const existing = prev.items.find((item) => isSameItem(item, draft));
      const updatedItems = existing
        ? prev.items.map((item) =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + draft.quantity }
              : item
          )
        : [
            ...prev.items,
            {
              id: draft.id ?? createLineItemId(),
              productId: draft.productId,
              name: draft.name,
              image: draft.image ?? null,
              variant: draft.variant ?? null,
              optionName: draft.optionName ?? null,
              note: draft.note ?? '',
              quantity: draft.quantity,
              unitPrice: draft.unitPrice,
            },
          ];

      return {
        ...prev,
        items: updatedItems,
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateItemQuantity = useCallback((id: string, quantity: number) => {
    setState((prev) => {
      if (quantity <= 0) {
        return {
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
          updatedAt: new Date().toISOString(),
        };
      }
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const clearItems = useCallback(() => {
    setState((prev) => ({
      ...prev,
      items: [],
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateCustomer = useCallback((patch: Partial<CustomerDetails>) => {
    setState((prev) => ({
      ...prev,
      customer: {
        ...prev.customer,
        ...patch,
        dispatchInfo: patch.dispatchInfo
          ? {
              ...(prev.customer.dispatchInfo ?? { address: '', notes: '' }),
              ...patch.dispatchInfo,
            }
          : prev.customer.dispatchInfo ?? { address: '', notes: '' },
      },
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const updateItemNote = useCallback((id: string, note: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, note } : item
      ),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const actions: CustomerOrderActions = {
    addItem,
    updateItemQuantity,
    removeItem,
    clearItems,
    updateCustomer,
    updateItemNote,
  };

  return {
    state,
    actions,
    storageKey,
  };
};
