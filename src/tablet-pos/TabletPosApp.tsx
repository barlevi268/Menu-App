import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, QrCode, Smartphone, Wallet } from "lucide-react";
import ClosedShiftSummaryModal from "./components/ClosedShiftSummaryModal";
import DoneView from "./components/DoneView";
import ItemConfigModal from "./components/ItemConfigModal";
import LoginView from "./components/LoginView";
import OpenShiftModal from "./components/OpenShiftModal";
import PaymentView from "./components/PaymentView";
import PosView from "./components/PosView";
import ShiftSummaryModal from "./components/ShiftSummaryModal";
import { CATEGORIES, PAGE_SIZE, PRODUCTS } from "./mockData";
import { fetchPosMenuCatalog, getCompanyIdFromPath } from "./menuApi";
import {
  closePosShift,
  createPosDraftOrder,
  createPosOrderPayment,
  fetchOpenPosShift,
  fetchPosPaymentMethods,
  loginPos,
  openPosShift,
  type PosApiShift,
  updatePosOrder,
} from "./posApi";
import type {
  AppStage,
  Category,
  CompletedPayment,
  ConfigDraft,
  ConfigModalState,
  OrderLine,
  PaymentMethod,
  PaymentMethodKind,
  PaymentMethodOption,
  Product,
  User,
} from "./types";
import {
  canSaveConfig,
  defaultDraftFromProduct,
  draftFromOrderLine,
  getLineTotal,
  getOrderTotal,
  getUnitPrice,
  isProductConfigurable,
  orderLineSignature,
  parseAmountToNumber,
  peso,
  selectedAddOnsFromDraft,
  selectedOptionsFromDraft,
  uid,
} from "./utils";

const OPENING_AMOUNT = 0;
const WALK_IN_CUSTOMER_NAME = "Walk-in Customer";
const WALK_IN_CUSTOMER_PHONE = "0000000000";

type ClosedShiftSummary = {
  shiftId: string;
  startDate: string;
  endDate: string;
  openingAmount: number;
  totals: Array<{
    paymentMethodId: string;
    paymentMethodName: string;
    totalAmount: number;
  }>;
};

const toErrorMessage = (value: unknown, fallback: string) => {
  if (value instanceof Error && value.message.trim()) {
    return value.message.trim();
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
};

const formatUserName = (user: User | null) => {
  if (!user) return "Cashier";
  if (user.name && user.name.trim()) return user.name.trim();

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  if (fullName) return fullName;
  if (user.username.trim()) return user.username.trim();

  return "Cashier";
};

const resolvePaymentKind = (name: string): PaymentMethodKind => {
  const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();

  if (normalized.includes("gcash") || normalized.includes("g cash")) return "gcash";
  if (normalized === "cash" || normalized.startsWith("cash ")) return "cash";
  if (normalized.includes("card")) return "card";
  if (normalized.includes("qrph") || normalized === "qr" || normalized.includes("qr ")) return "qrph";

  return "other";
};

const paymentDescription = (kind: PaymentMethodKind) => {
  if (kind === "cash") return "Enter amount given and tender";
  if (kind === "card") return "Mark as paid by card";
  if (kind === "qrph") return "Mark as paid via QRPH";
  if (kind === "gcash") return "Mark as paid via GCash";
  return "Mark as paid";
};

const iconForPaymentKind = (kind: PaymentMethodKind) => {
  if (kind === "cash") return <Wallet size={18} />;
  if (kind === "card") return <CreditCard size={18} />;
  if (kind === "qrph") return <QrCode size={18} />;
  if (kind === "gcash") return <Smartphone size={18} />;
  return <Wallet size={18} />;
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const composeLineNotes = (line: OrderLine) => {
  const parts: string[] = [];

  if (line.selectedOptions.length > 0) {
    const optionsText = line.selectedOptions
      .map((option) => `${option.groupName}: ${option.choiceName}`)
      .join(", ");
    parts.push(`Options: ${optionsText}`);
  }

  if (line.selectedAddOns.length > 0) {
    const addOnText = line.selectedAddOns.map((addOn) => addOn.addOnName).join(", ");
    parts.push(`Add-ons: ${addOnText}`);
  }

  if (line.notes.trim()) {
    parts.push(`Notes: ${line.notes.trim()}`);
  }

  const joined = parts.join(" | ").trim();
  if (!joined) return undefined;
  return joined.slice(0, 1000);
};

const toClosedShiftSummary = (shift: PosApiShift): ClosedShiftSummary => {
  const totals = (shift.totals ?? []).map((entry) => ({
    paymentMethodId: entry.paymentMethodId,
    paymentMethodName: entry.paymentMethod?.name ?? "Payment Method",
    totalAmount:
      typeof entry.totalAmount === "number"
        ? entry.totalAmount
        : Number(entry.totalAmount) || 0,
  }));

  return {
    shiftId: shift.id,
    startDate: shift.startDate,
    endDate: shift.endDate ?? new Date().toISOString(),
    openingAmount: shift.openingAmount ?? 0,
    totals,
  };
};

export default function TabletPosApp() {
  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "https://api.orda.co",
    []
  );

  const requestCompanyId = useMemo(
    () => (getCompanyIdFromPath() ?? import.meta.env.VITE_COMPANY_ID ?? "").trim(),
    []
  );

  const [stage, setStage] = useState<AppStage>("login");
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState("");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [menuCategories, setMenuCategories] = useState<Category[]>(CATEGORIES);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [loadedImageUrls, setLoadedImageUrls] = useState<Set<string>>(new Set());

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(CATEGORIES[0].id);
  const [categoryPageIndex, setCategoryPageIndex] = useState(0);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [configModal, setConfigModal] = useState<ConfigModalState | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodOption[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("");
  const [openShiftId, setOpenShiftId] = useState<string | null>(null);
  const [openShiftStartDate, setOpenShiftStartDate] = useState<string | null>(null);
  const [openShiftOpeningAmount, setOpenShiftOpeningAmount] = useState<number>(
    OPENING_AMOUNT
  );
  const [openingAmountInput, setOpeningAmountInput] = useState(
    OPENING_AMOUNT.toFixed(2)
  );
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showShiftSummaryModal, setShowShiftSummaryModal] = useState(false);
  const [closedShiftSummary, setClosedShiftSummary] = useState<ClosedShiftSummary | null>(null);
  const [shiftError, setShiftError] = useState("");
  const [isShiftActionSubmitting, setIsShiftActionSubmitting] = useState(false);

  const [cashInput, setCashInput] = useState("");
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);
  const [doneCountdown, setDoneCountdown] = useState(5);
  const [paymentError, setPaymentError] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const loadedImageUrlsRef = useRef<Set<string>>(new Set());

  const loggedInUserName = useMemo(() => formatUserName(loggedInUser), [loggedInUser]);

  const selectedPaymentOption = useMemo(
    () => paymentMethods.find((method) => method.id === selectedPaymentMethod) ?? null,
    [paymentMethods, selectedPaymentMethod]
  );

  useEffect(() => {
    document.title = "Tablet POS";
  }, []);

  const markImageLoaded = useCallback((url: string) => {
    const trimmed = url.trim();
    if (!trimmed || loadedImageUrlsRef.current.has(trimmed)) return;
    loadedImageUrlsRef.current.add(trimmed);
    setLoadedImageUrls(new Set(loadedImageUrlsRef.current));
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadMenu = async () => {
      if (!requestCompanyId) {
        setProducts(PRODUCTS);
        setMenuCategories(CATEGORIES);
        return;
      }

      try {
        const catalog = await fetchPosMenuCatalog(baseUrl, requestCompanyId);
        if (ignore) return;

        const nextProducts = catalog.products.length > 0 ? catalog.products : PRODUCTS;
        const nextCategories =
          catalog.categories.length > 0 ? catalog.categories : CATEGORIES;

        setProducts(nextProducts);
        setMenuCategories(nextCategories);
      } catch (error) {
        if (ignore) return;
        console.error("Failed to fetch POS menu, falling back to mock data:", error);
        setProducts(PRODUCTS);
        setMenuCategories(CATEGORIES);
      }
    };

    void loadMenu();

    return () => {
      ignore = true;
    };
  }, [baseUrl, requestCompanyId]);

  useEffect(() => {
    setCategoryPageIndex(0);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (menuCategories.length === 0) return;
    if (menuCategories.some((category) => category.id === selectedCategoryId)) return;
    setSelectedCategoryId(menuCategories[0].id);
  }, [menuCategories, selectedCategoryId]);

  useEffect(() => {
    const uniqueUrls = Array.from(
      new Set(
        products
          .map((product) => product.image.trim())
          .filter((url) => url.length > 0)
      )
    );

    uniqueUrls.forEach((url) => {
      if (loadedImageUrlsRef.current.has(url)) return;
      const image = new Image();
      image.onload = () => markImageLoaded(url);
      image.onerror = () => undefined;
      image.src = url;
    });
  }, [products, markImageLoaded]);

  const resetForNewTransaction = useCallback(() => {
    setOrderLines([]);
    setConfigModal(null);
    setSelectedCategoryId(menuCategories[0]?.id ?? CATEGORIES[0].id);
    setCategoryPageIndex(0);
    setCashInput("");
    setCompletedPayment(null);
    setPaymentError("");
    setShiftError("");
    setShowShiftSummaryModal(false);
    setIsSubmittingPayment(false);
    setStage("pos");
  }, [menuCategories]);

  useEffect(() => {
    if (stage !== "done") return;

    setDoneCountdown(5);
    const timer = window.setInterval(() => {
      setDoneCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          resetForNewTransaction();
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resetForNewTransaction, stage]);

  useEffect(() => {
    if (paymentMethods.length === 0) {
      setSelectedPaymentMethod("");
      return;
    }

    setSelectedPaymentMethod((current) => {
      if (paymentMethods.some((method) => method.id === current)) {
        return current;
      }
      const defaultMethod =
        paymentMethods.find((method) => method.kind === "cash") ?? paymentMethods[0];
      return defaultMethod.id;
    });
  }, [paymentMethods]);

  const productsByCategory = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    menuCategories.forEach((category) => {
      grouped[category.id] = products.filter((product) => product.categoryId === category.id);
    });
    return grouped;
  }, [menuCategories, products]);

  const selectedCategoryProducts = productsByCategory[selectedCategoryId] ?? [];

  const pagedProducts = useMemo(() => {
    const pages: Product[][] = [];
    for (let i = 0; i < selectedCategoryProducts.length; i += PAGE_SIZE) {
      pages.push(selectedCategoryProducts.slice(i, i + PAGE_SIZE));
    }
    return pages.length > 0 ? pages : [[]];
  }, [selectedCategoryProducts]);

  const currentPage = Math.min(categoryPageIndex, pagedProducts.length - 1);

  const orderTotal = useMemo(() => getOrderTotal(orderLines), [orderLines]);
  const cashAmount = parseAmountToNumber(cashInput);
  const changeAmount = Math.max(0, cashAmount - orderTotal);

  const mapPaymentMethods = useCallback(
    (methods: Array<{ id: string; name: string }>): PaymentMethodOption[] => {
      return methods
        .filter((method) => method.id && method.name)
        .map((method) => {
          const kind = resolvePaymentKind(method.name);
          return {
            id: method.id,
            label: method.name,
            description: paymentDescription(kind),
            kind,
            icon: iconForPaymentKind(kind),
          };
        });
    },
    []
  );

  const initializeSession = useCallback(
    async (token: string) => {
      const [methods, openShift] = await Promise.all([
        fetchPosPaymentMethods(baseUrl, token),
        fetchOpenPosShift(baseUrl, token),
      ]);

      const mappedMethods = mapPaymentMethods(methods);
      if (mappedMethods.length === 0) {
        throw new Error("No POS payment methods are configured for this company.");
      }

      setPaymentMethods(mappedMethods);
      setOpenShiftId(openShift?.id ?? null);
      setOpenShiftStartDate(openShift?.startDate ?? null);
      setOpenShiftOpeningAmount(openShift?.openingAmount ?? OPENING_AMOUNT);
      setShiftError("");
      setShowOpenShiftModal(!openShift?.id);
    },
    [baseUrl, mapPaymentMethods]
  );

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoggingIn) return;

    setLoginError("");
    setIsLoggingIn(true);

    try {
      const response = await loginPos(baseUrl, username.trim(), password);
      await initializeSession(response.token);

      setAuthToken(response.token);
      setLoggedInUser(response.user);
      setClosedShiftSummary(null);
      setStage("pos");
      setUsername("");
      setPassword("");

      if (response.requiresPasswordChange) {
        console.warn("Logged in with default admin password. A password update is required.");
      }
    } catch (error) {
      setAuthToken("");
      setLoggedInUser(null);
      setOpenShiftId(null);
      setOpenShiftStartDate(null);
      setOpenShiftOpeningAmount(OPENING_AMOUNT);
      setShowOpenShiftModal(false);
      setShowShiftSummaryModal(false);
      setClosedShiftSummary(null);
      setStage("login");
      setLoginError(toErrorMessage(error, "Unable to sign in. Please try again."));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const startOpenShiftFlow = () => {
    setShiftError("");
    setOpeningAmountInput(OPENING_AMOUNT.toFixed(2));
    setShowShiftSummaryModal(false);
    setShowOpenShiftModal(true);
  };

  const handleOpenShift = async () => {
    if (!authToken) {
      setLoginError("Your session has expired. Please sign in again.");
      setStage("login");
      return;
    }

    const openingAmount = parseAmountToNumber(openingAmountInput);
    if (openingAmount < 0) {
      setShiftError("Opening amount cannot be negative.");
      return;
    }

    setIsShiftActionSubmitting(true);
    setShiftError("");

    try {
      const opened = await openPosShift(baseUrl, authToken, Number(openingAmount.toFixed(2)));
      setOpenShiftId(opened.id);
      setOpenShiftStartDate(opened.startDate);
      setOpenShiftOpeningAmount(opened.openingAmount ?? Number(openingAmount.toFixed(2)));
      setShowOpenShiftModal(false);
      setShowShiftSummaryModal(false);
      setOpeningAmountInput(OPENING_AMOUNT.toFixed(2));
    } catch (error) {
      const message = toErrorMessage(error, "Failed to open POS shift.");
      const alreadyOpen = /open pos shift already exists/i.test(message);
      if (alreadyOpen) {
        const existing = await fetchOpenPosShift(baseUrl, authToken);
        if (existing?.id) {
          setOpenShiftId(existing.id);
          setOpenShiftStartDate(existing.startDate);
          setOpenShiftOpeningAmount(existing.openingAmount ?? OPENING_AMOUNT);
          setShowOpenShiftModal(false);
          setShowShiftSummaryModal(false);
          setShiftError("");
          setIsShiftActionSubmitting(false);
          return;
        }
      }
      setShiftError(message);
    } finally {
      setIsShiftActionSubmitting(false);
    }
  };

  const handleCloseShift = async () => {
    if (!authToken) {
      setLoginError("Your session has expired. Please sign in again.");
      setStage("login");
      return;
    }
    if (!openShiftId) {
      startOpenShiftFlow();
      return;
    }
    if (orderLines.length > 0) {
      setShiftError("Clear the current order before closing the shift.");
      return;
    }

    const confirmed = window.confirm("Close the current shift now?");
    if (!confirmed) return;

    setIsShiftActionSubmitting(true);
    setShiftError("");

    try {
      const closed = await closePosShift(baseUrl, authToken, openShiftId);
      setOpenShiftId(null);
      setOpenShiftStartDate(null);
      setOpenShiftOpeningAmount(OPENING_AMOUNT);
      setShowShiftSummaryModal(false);
      setClosedShiftSummary(toClosedShiftSummary(closed));
      setShowOpenShiftModal(false);
      setStage("pos");
    } catch (error) {
      setShiftError(toErrorMessage(error, "Failed to close POS shift."));
    } finally {
      setIsShiftActionSubmitting(false);
    }
  };

  const handleViewShiftSummary = () => {
    if (!openShiftId || !openShiftStartDate) return;
    setShowOpenShiftModal(false);
    setShowShiftSummaryModal(true);
  };

  const addQuickItem = (product: Product) => {
    const plainSignature = `${product.id}::::`;

    setOrderLines((current) => {
      const existingIndex = current.findIndex(
        (line) => orderLineSignature(line) === plainSignature
      );

      if (existingIndex === -1) {
        return [
          ...current,
          {
            id: uid(),
            productId: product.id,
            productName: product.name,
            productImage: product.image,
            basePrice: product.price,
            selectedOptions: [],
            selectedAddOns: [],
            quantity: 1,
            notes: "",
          },
        ];
      }

      return current.map((line, index) =>
        index === existingIndex ? { ...line, quantity: line.quantity + 1 } : line
      );
    });
  };

  const openAddConfigModal = (product: Product) => {
    setConfigModal({
      product,
      mode: "add",
      draft: defaultDraftFromProduct(product),
    });
  };

  const openEditConfigModal = (line: OrderLine) => {
    const product = products.find((candidate) => candidate.id === line.productId);
    if (!product) return;

    setConfigModal({
      product,
      mode: "edit",
      orderLineId: line.id,
      draft: draftFromOrderLine(line),
    });
  };

  const handleProductClick = (product: Product) => {
    if (!isProductConfigurable(product)) {
      addQuickItem(product);
      return;
    }
    openAddConfigModal(product);
  };

  const updateModalDraft = (updater: (draft: ConfigDraft) => ConfigDraft) => {
    setConfigModal((current) => {
      if (!current) return current;
      return { ...current, draft: updater(current.draft) };
    });
  };

  const saveModal = () => {
    if (!configModal) return;
    const { product, mode, orderLineId, draft } = configModal;

    if (!canSaveConfig(product, draft)) return;

    const selectedOptions = selectedOptionsFromDraft(product, draft);
    const selectedAddOns = selectedAddOnsFromDraft(product, draft);

    if (mode === "edit" && orderLineId) {
      setOrderLines((current) =>
        current.map((line) =>
          line.id === orderLineId
            ? {
                ...line,
                basePrice: product.price,
                selectedOptions,
                selectedAddOns,
                quantity: Math.max(1, Math.floor(draft.quantity)),
                notes: draft.notes.trim(),
              }
            : line
        )
      );
      setConfigModal(null);
      return;
    }

    const newLine: OrderLine = {
      id: uid(),
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      basePrice: product.price,
      selectedOptions,
      selectedAddOns,
      quantity: Math.max(1, Math.floor(draft.quantity)),
      notes: draft.notes.trim(),
    };

    const newLineSignature = orderLineSignature(newLine);

    setOrderLines((current) => {
      const existingIndex = current.findIndex(
        (line) => orderLineSignature(line) === newLineSignature
      );

      if (existingIndex === -1) return [...current, newLine];

      return current.map((line, index) =>
        index === existingIndex
          ? { ...line, quantity: line.quantity + newLine.quantity }
          : line
      );
    });

    setConfigModal(null);
  };

  const removeOrderLine = (lineId: string) => {
    setOrderLines((current) => current.filter((line) => line.id !== lineId));
  };

  const clearCart = () => {
    setOrderLines([]);
    setConfigModal(null);
  };

  const startPayment = () => {
    if (orderLines.length === 0) return;
    if (!authToken) {
      setLoginError("Your session has expired. Please sign in again.");
      setStage("login");
      return;
    }
    if (!openShiftId) {
      setShiftError("Open a shift before taking payments.");
      setShowOpenShiftModal(true);
      return;
    }
    if (paymentMethods.length === 0) {
      setPaymentError("No payment methods available. Re-login and try again.");
      return;
    }

    setPaymentError("");
    setCashInput("");
    setStage("payment");
  };

  const settleTransaction = useCallback(
    async (method: PaymentMethodOption, amountGiven: number) => {
      if (!authToken) {
        setPaymentError("Your session has expired. Please sign in again.");
        setStage("login");
        return;
      }

      let orderId: string | null = null;
      setIsSubmittingPayment(true);
      setPaymentError("");

      try {
        if (!openShiftId) {
          throw new Error("No open shift. Open a shift before settling payments.");
        }

        const orderPayloadLines = orderLines.map((line) => {
          const notes = composeLineNotes(line);
          return {
            customerMenuItemId: line.productId,
            quantity: Math.max(1, Math.floor(line.quantity)),
            ...(notes ? { notes } : {}),
          };
        });

        if (orderPayloadLines.length === 0) {
          throw new Error("Cannot submit an empty order.");
        }

        const companyIdCandidate =
          typeof loggedInUser?.companyId === "string" && loggedInUser.companyId.trim()
            ? loggedInUser.companyId.trim()
            : typeof loggedInUser?.company?.id === "string" && loggedInUser.company.id.trim()
            ? loggedInUser.company.id.trim()
            : "";

        const companyId =
          companyIdCandidate && isUuid(companyIdCandidate) ? companyIdCandidate : undefined;

        const roundedTotal = Number(orderTotal.toFixed(2));
        const orderNotes = `POS sale via ${method.label}`;

        const createdOrder = await createPosDraftOrder(baseUrl, {
          customerOrderLines: orderPayloadLines,
          totalAmount: roundedTotal,
          orderNotes,
          customerName: WALK_IN_CUSTOMER_NAME,
          customerPhone: WALK_IN_CUSTOMER_PHONE,
          companyId,
        });

        orderId = createdOrder.id;

        await updatePosOrder(baseUrl, authToken, orderId, {
          customerOrderLines: orderPayloadLines,
          totalAmount: roundedTotal,
          posShiftId: openShiftId,
          orderNotes,
        });

        const roundedAmountGiven = Number(amountGiven.toFixed(2));
        const roundedChange = Number(Math.max(0, roundedAmountGiven - roundedTotal).toFixed(2));

        await createPosOrderPayment(baseUrl, authToken, {
          customerOrderId: orderId,
          amount: roundedTotal,
          posPaymentMethodId: method.id,
          paymentGatewayInfo:
            method.kind === "cash"
              ? {
                  source: "tablet-pos",
                  cash: {
                    amountGiven: roundedAmountGiven,
                    change: roundedChange,
                  },
                }
              : {
                  source: "tablet-pos",
                  channel: method.label,
                },
        });

        setCompletedPayment({
          methodId: method.id,
          methodLabel: method.label,
          methodKind: method.kind,
          orderId,
          total: roundedTotal,
          amountGiven: roundedAmountGiven,
          change: roundedChange,
        });

        setStage("done");
      } catch (error) {
        const message = toErrorMessage(error, "Failed to settle this payment.");
        if (orderId) {
          setPaymentError(`Order ${orderId} was saved, but payment sync failed: ${message}`);
        } else {
          setPaymentError(message);
        }
      } finally {
        setIsSubmittingPayment(false);
      }
    },
    [authToken, baseUrl, loggedInUser, openShiftId, orderLines, orderTotal]
  );

  const settleCash = () => {
    if (!selectedPaymentOption || selectedPaymentOption.kind !== "cash") return;
    if (cashAmount < orderTotal || isSubmittingPayment) return;
    void settleTransaction(selectedPaymentOption, cashAmount);
  };

  const settleDigitalPayment = () => {
    if (!selectedPaymentOption || selectedPaymentOption.kind === "cash") return;
    if (isSubmittingPayment) return;
    void settleTransaction(selectedPaymentOption, orderTotal);
  };

  const appendCashInput = (char: string) => {
    setCashInput((current) => {
      if (char === ".") {
        if (current.includes(".")) return current;
        if (!current) return "0.";
      }

      const next = `${current}${char}`;
      const parts = next.split(".");
      if (parts.length === 2 && parts[1].length > 2) return current;
      return next;
    });
  };

  const backspaceCashInput = () => {
    setCashInput((current) => current.slice(0, -1));
  };

  const addPresetBill = (bill: number) => {
    const combined = parseAmountToNumber(cashInput) + bill;
    setCashInput(combined.toFixed(2));
  };

  const handleGridTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleGridTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;
    touchStartXRef.current = null;
    if (startX === null || typeof endX !== "number") return;

    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;

    if (delta < 0) {
      setCategoryPageIndex((currentIndex) =>
        Math.min(currentIndex + 1, pagedProducts.length - 1)
      );
    } else {
      setCategoryPageIndex((currentIndex) => Math.max(currentIndex - 1, 0));
    }
  };

  if (stage === "login") {
    return (
      <div className="animate-in fade-in duration-300">
        <LoginView
          username={username}
          password={password}
          loginError={loginError}
          isSubmitting={isLoggingIn}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onSubmit={handleLogin}
        />
      </div>
    );
  }

  if (stage === "payment") {
    const canTenderCash =
      selectedPaymentOption?.kind === "cash" &&
      cashAmount >= orderTotal &&
      !isSubmittingPayment;

    const canSettleDigital =
      Boolean(selectedPaymentOption && selectedPaymentOption.kind !== "cash") &&
      !isSubmittingPayment;

    return (
      <div className="animate-in fade-in duration-300">
        <PaymentView
          paymentMethods={paymentMethods}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={setSelectedPaymentMethod}
          onBackToPos={() => setStage("pos")}
          cashAmount={cashAmount}
          orderTotal={orderTotal}
          changeAmount={changeAmount}
          onAddPresetBill={addPresetBill}
          onAppendCashInput={appendCashInput}
          onBackspaceCashInput={backspaceCashInput}
          onSettleCash={settleCash}
          canTenderCash={canTenderCash}
          onSettleDigitalPayment={settleDigitalPayment}
          canSettleDigital={canSettleDigital}
          isSubmitting={isSubmittingPayment}
          paymentError={paymentError}
          orderLines={orderLines}
          getUnitPrice={getUnitPrice}
          getLineTotal={getLineTotal}
          peso={peso}
        />
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="animate-in fade-in duration-300">
        <DoneView
          completedPayment={completedPayment}
          doneCountdown={doneCountdown}
          onStartNewTransaction={resetForNewTransaction}
          peso={peso}
        />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <PosView
        loggedInUserName={loggedInUserName}
        hasOpenShift={Boolean(openShiftId)}
        shiftStartDate={openShiftStartDate}
        isShiftActionBusy={isShiftActionSubmitting}
        onOpenShift={startOpenShiftFlow}
        onViewShiftSummary={handleViewShiftSummary}
        onCloseShift={handleCloseShift}
        shiftError={shiftError}
        categories={menuCategories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={setSelectedCategoryId}
        pagedProducts={pagedProducts}
        currentPage={currentPage}
        onPrevPage={() => setCategoryPageIndex((currentIndex) => Math.max(0, currentIndex - 1))}
        onNextPage={() =>
          setCategoryPageIndex((currentIndex) =>
            Math.min(pagedProducts.length - 1, currentIndex + 1)
          )
        }
        onSetPage={setCategoryPageIndex}
        onGridTouchStart={handleGridTouchStart}
        onGridTouchEnd={handleGridTouchEnd}
        orderLines={orderLines}
        onEditOrderLine={openEditConfigModal}
        onRemoveOrderLine={removeOrderLine}
        onProductClick={handleProductClick}
        orderTotal={orderTotal}
        canPay={orderLines.length > 0 && Boolean(openShiftId)}
        onPayNow={startPayment}
        onClearCart={clearCart}
        getUnitPrice={getUnitPrice}
        getLineTotal={getLineTotal}
        peso={peso}
        loadedImageUrls={loadedImageUrls}
      />

      <OpenShiftModal
        isOpen={(showOpenShiftModal || !openShiftId) && !closedShiftSummary}
        canClose={Boolean(openShiftId)}
        openingAmountInput={openingAmountInput}
        error={shiftError}
        isSubmitting={isShiftActionSubmitting}
        onOpeningAmountChange={setOpeningAmountInput}
        onOpenShift={handleOpenShift}
        onClose={() => setShowOpenShiftModal(false)}
      />

      <ShiftSummaryModal
        isOpen={showShiftSummaryModal}
        summary={
          openShiftId && openShiftStartDate
            ? {
                shiftId: openShiftId,
                startDate: openShiftStartDate,
                openingAmount: openShiftOpeningAmount,
              }
            : null
        }
        onClose={() => setShowShiftSummaryModal(false)}
        peso={peso}
      />

      <ClosedShiftSummaryModal
        isOpen={Boolean(closedShiftSummary)}
        summary={closedShiftSummary}
        onClose={() => setClosedShiftSummary(null)}
        onOpenNewShift={() => {
          setClosedShiftSummary(null);
          startOpenShiftFlow();
        }}
        peso={peso}
      />

      {configModal && (
        <ItemConfigModal
          configModal={configModal}
          canSave={canSaveConfig(configModal.product, configModal.draft)}
          onClose={() => setConfigModal(null)}
          onSave={saveModal}
          onUpdateDraft={updateModalDraft}
          peso={peso}
        />
      )}
    </div>
  );
}
