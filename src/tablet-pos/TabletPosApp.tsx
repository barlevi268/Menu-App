import React, { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, QrCode, Smartphone, Wallet } from "lucide-react";
import DoneView from "./components/DoneView";
import ItemConfigModal from "./components/ItemConfigModal";
import LoginView from "./components/LoginView";
import PaymentView from "./components/PaymentView";
import PosView from "./components/PosView";
import { CATEGORIES, MOCK_USERS, PAGE_SIZE, PRODUCTS } from "./mockData";
import { fetchPosMenuCatalog, getCompanyIdFromPath } from "./menuApi";
import type {
  AppStage,
  Category,
  CompletedPayment,
  ConfigDraft,
  ConfigModalState,
  OrderLine,
  PaymentMethod,
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

const paymentMethods: PaymentMethodOption[] = [
  {
    id: "cash",
    label: "Cash",
    description: "Enter amount given and tender",
    icon: <Wallet size={18} />,
  },
  {
    id: "card",
    label: "Credit Card",
    description: "Mark as paid by card",
    icon: <CreditCard size={18} />,
  },
  {
    id: "qrph",
    label: "QRPH",
    description: "Mark as paid via QRPH",
    icon: <QrCode size={18} />,
  },
  {
    id: "gcash",
    label: "GCash",
    description: "Mark as paid via GCash",
    icon: <Smartphone size={18} />,
  },
];

export default function TabletPosApp() {
  const baseUrl = useMemo(
    () => import.meta.env.VITE_API_BASE_URL || "https://api.orda.co",
    []
  );

  const [stage, setStage] = useState<AppStage>("login");
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [menuCategories, setMenuCategories] = useState<Category[]>(CATEGORIES);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(CATEGORIES[0].id);
  const [categoryPageIndex, setCategoryPageIndex] = useState(0);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [configModal, setConfigModal] = useState<ConfigModalState | null>(null);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");
  const [completedPayment, setCompletedPayment] = useState<CompletedPayment | null>(null);
  const [doneCountdown, setDoneCountdown] = useState(5);

  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = "Tablet POS";
  }, []);

  useEffect(() => {
    let ignore = false;

    const loadMenu = async () => {
      const requestCompanyId =
        (getCompanyIdFromPath() ?? import.meta.env.VITE_COMPANY_ID ?? "").trim();

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
  }, [baseUrl]);

  useEffect(() => {
    setCategoryPageIndex(0);
  }, [selectedCategoryId]);

  useEffect(() => {
    if (menuCategories.length === 0) return;
    if (menuCategories.some((category) => category.id === selectedCategoryId)) return;
    setSelectedCategoryId(menuCategories[0].id);
  }, [menuCategories, selectedCategoryId]);

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
  }, [stage]);

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

  const resetForNewTransaction = () => {
    setOrderLines([]);
    setConfigModal(null);
    setSelectedCategoryId(menuCategories[0]?.id ?? CATEGORIES[0].id);
    setCategoryPageIndex(0);
    setSelectedPaymentMethod("cash");
    setCashInput("");
    setCompletedPayment(null);
    setStage("pos");
  };

  const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const user = MOCK_USERS.find(
      (candidate) => candidate.username === username.trim() && candidate.password === password
    );

    if (!user) {
      setLoginError("Invalid username or password.");
      return;
    }

    setLoginError("");
    setLoggedInUser(user);
    setStage("pos");
    setUsername("");
    setPassword("");
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

  const startPayment = () => {
    if (orderLines.length === 0) return;
    setStage("payment");
  };

  const settleCash = () => {
    if (cashAmount < orderTotal) return;

    setCompletedPayment({
      method: "cash",
      total: orderTotal,
      amountGiven: cashAmount,
      change: Math.max(0, cashAmount - orderTotal),
    });
    setStage("done");
  };

  const settleDigitalPayment = (method: Exclude<PaymentMethod, "cash">) => {
    setCompletedPayment({
      method,
      total: orderTotal,
      amountGiven: orderTotal,
      change: 0,
    });
    setStage("done");
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
      <LoginView
        username={username}
        password={password}
        loginError={loginError}
        onUsernameChange={setUsername}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    );
  }

  if (stage === "payment") {
    return (
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
        canTenderCash={cashAmount >= orderTotal}
        onSettleDigitalPayment={settleDigitalPayment}
        orderLines={orderLines}
        getUnitPrice={getUnitPrice}
        getLineTotal={getLineTotal}
        peso={peso}
      />
    );
  }

  if (stage === "done") {
    return (
      <DoneView
        completedPayment={completedPayment}
        paymentMethods={paymentMethods}
        doneCountdown={doneCountdown}
        onStartNewTransaction={resetForNewTransaction}
        peso={peso}
      />
    );
  }

  return (
    <>
      <PosView
        loggedInUserName={loggedInUser?.name ?? "Cashier"}
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
        canPay={orderLines.length > 0}
        onPayNow={startPayment}
        getUnitPrice={getUnitPrice}
        getLineTotal={getLineTotal}
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
    </>
  );
}
