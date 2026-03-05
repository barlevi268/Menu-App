const buildUrl = (baseUrl: string, path: string) =>
  `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

const parseJsonSafely = (value: string) => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const extractMessage = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== "object") return fallback;
  const data = payload as Record<string, unknown>;
  if (typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }
  if (typeof data.error === "string" && data.error.trim()) {
    return data.error.trim();
  }
  return fallback;
};

const readErrorMessage = async (res: Response) => {
  const fallback = `${res.status} ${res.statusText || "Request failed"}`.trim();
  const text = await res.text();
  if (!text) return fallback;

  const parsed = parseJsonSafely(text);
  if (parsed !== null) {
    return extractMessage(parsed, fallback);
  }

  return text.slice(0, 200).trim() || fallback;
};

const requestJson = async <T>(
  url: string,
  init?: RequestInit
): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(await readErrorMessage(res));
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text();
    if (!text.trim()) return undefined as T;
    const parsed = parseJsonSafely(text);
    if (parsed !== null) return parsed as T;
    throw new Error("Expected JSON response from server.");
  }

  return (await res.json()) as T;
};

const withBearer = (token: string) => ({
  Accept: "application/json",
  Authorization: `Bearer ${token}`,
});

export type AuthLoginResponse = {
  token: string;
  requiresPasswordChange?: boolean;
  user: {
    id: string | number;
    username: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    companyId?: string | null;
    company?: {
      id: string;
      name?: string | null;
    } | null;
  };
};

export type PosApiPaymentMethod = {
  id: string;
  name: string;
  companyId?: string | null;
};

export type PosApiShift = {
  id: string;
  companyId: string;
  startDate: string;
  endDate?: string | null;
  openingAmount: number;
  totals?: PosApiShiftTotal[];
};

export type PosApiShiftTotal = {
  id: string;
  paymentMethodId: string;
  totalAmount: number;
  paymentMethod?: {
    id: string;
    name: string;
  } | null;
};

export type PosOrderLineInput = {
  customerMenuItemId: string;
  quantity: number;
  notes?: string;
};

export const loginPos = async (
  baseUrl: string,
  identifier: string,
  password: string
): Promise<AuthLoginResponse> => {
  return requestJson<AuthLoginResponse>(buildUrl(baseUrl, "/auth/login"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ identifier, password }),
  });
};

export const fetchPosPaymentMethods = async (
  baseUrl: string,
  token: string
): Promise<PosApiPaymentMethod[]> => {
  return requestJson<PosApiPaymentMethod[]>(buildUrl(baseUrl, "/pos/payment-methods"), {
    headers: withBearer(token),
  });
};

export const fetchOpenPosShift = async (
  baseUrl: string,
  token: string
): Promise<PosApiShift | null> => {
  return requestJson<PosApiShift | null>(buildUrl(baseUrl, "/pos/shifts/open"), {
    headers: withBearer(token),
  });
};

export const openPosShift = async (
  baseUrl: string,
  token: string,
  openingAmount: number
): Promise<PosApiShift> => {
  return requestJson<PosApiShift>(buildUrl(baseUrl, "/pos/shifts/open"), {
    method: "POST",
    headers: {
      ...withBearer(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      openingAmount,
      startDate: new Date().toISOString(),
    }),
  });
};

export const closePosShift = async (
  baseUrl: string,
  token: string,
  shiftId: string
): Promise<PosApiShift> => {
  return requestJson<PosApiShift>(buildUrl(baseUrl, `/pos/shifts/${shiftId}/close`), {
    method: "POST",
    headers: {
      ...withBearer(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      endDate: new Date().toISOString(),
    }),
  });
};

export const createPosDraftOrder = async (
  baseUrl: string,
  payload: {
    customerOrderLines: PosOrderLineInput[];
    totalAmount: number;
    orderNotes?: string;
    customerName: string;
    customerPhone: string;
    companyId?: string;
  }
): Promise<{ id: string }> => {
  return requestJson<{ id: string }>(buildUrl(baseUrl, "/public/customer-orders"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerOrderLines: payload.customerOrderLines,
      status: "draft",
      totalAmount: payload.totalAmount,
      orderNotes: payload.orderNotes,
      dispatchType: "Pickup",
      ...(payload.companyId ? { companyId: payload.companyId } : {}),
    }),
  });
};

export const updatePosOrder = async (
  baseUrl: string,
  token: string,
  orderId: string,
  payload: {
    customerOrderLines: PosOrderLineInput[];
    totalAmount: number;
    posShiftId: string;
    orderNotes?: string;
  }
) => {
  return requestJson(
    buildUrl(baseUrl, `/customer-orders/${orderId}`),
    {
      method: "PUT",
      headers: {
        ...withBearer(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "done",
        source: "pos",
        posShiftId: payload.posShiftId,
        totalAmount: payload.totalAmount,
        orderNotes: payload.orderNotes,
        dispatchType: "Pickup",
        customerOrderLines: payload.customerOrderLines,
      }),
    }
  );
};

export const createPosOrderPayment = async (
  baseUrl: string,
  token: string,
  payload: {
    customerOrderId: string;
    amount: number;
    posPaymentMethodId: string;
    paymentGatewayInfo?: Record<string, unknown>;
  }
) => {
  const endpoints = [
    buildUrl(baseUrl, "/customer-order-payments"),
    buildUrl(baseUrl, `/customer-orders/${payload.customerOrderId}/payments`),
    buildUrl(baseUrl, "/pos/customer-order-payments"),
  ];

  let lastError: Error | null = null;

  for (const endpoint of endpoints) {
    try {
      return await requestJson(endpoint, {
        method: "POST",
        headers: {
          ...withBearer(token),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerOrderId: payload.customerOrderId,
          amount: payload.amount,
          status: "paid",
          posPaymentMethodId: payload.posPaymentMethodId,
          ...(payload.paymentGatewayInfo
            ? { paymentGatewayInfo: payload.paymentGatewayInfo }
            : {}),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isNotFound = /\b404\b/.test(message) || /not found/i.test(message);
      if (!isNotFound) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error(message);
    }
  }

  throw new Error(
    lastError?.message ||
      "No customer order payment endpoint is available on the current backend."
  );
};
