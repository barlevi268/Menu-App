import React from "react";

export type AppStage = "login" | "pos" | "payment" | "done";
export type PaymentMethod = string;
export type PaymentMethodKind = "cash" | "card" | "qrph" | "gcash" | "other";

export type User = {
  id: string | number;
  username: string;
  password?: string;
  name?: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyId?: string | null;
  company?: {
    id: string;
    name?: string | null;
  } | null;
};

export type Category = {
  id: string;
  name: string;
};

export type ProductOptionChoice = {
  id: string;
  name: string;
  priceDelta: number;
};

export type ProductOptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  choices: ProductOptionChoice[];
};

export type ProductAddOn = {
  id: string;
  name: string;
  price: number;
};

export type ProductAddOnGroup = {
  id: string;
  name: string;
  addOns: ProductAddOn[];
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  image: string;
  price: number;
  options?: ProductOptionGroup[];
  addOnGroups?: ProductAddOnGroup[];
};

export type SelectedOption = {
  groupId: string;
  choiceId: string;
  groupName: string;
  choiceName: string;
  priceDelta: number;
};

export type SelectedAddOn = {
  groupId: string;
  addOnId: string;
  groupName: string;
  addOnName: string;
  price: number;
};

export type OrderLine = {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  basePrice: number;
  selectedOptions: SelectedOption[];
  selectedAddOns: SelectedAddOn[];
  quantity: number;
  notes: string;
};

export type ConfigDraft = {
  selectedOptionByGroup: Record<string, string>;
  selectedAddOnIds: string[];
  quantity: number;
  notes: string;
};

export type ConfigModalState = {
  product: Product;
  mode: "add" | "edit";
  orderLineId?: string;
  draft: ConfigDraft;
};

export type CompletedPayment = {
  methodId: PaymentMethod;
  methodLabel: string;
  methodKind: PaymentMethodKind;
  orderId: string;
  total: number;
  amountGiven: number;
  change: number;
};

export type PaymentMethodOption = {
  id: PaymentMethod;
  label: string;
  description: string;
  kind: PaymentMethodKind;
  icon: React.ReactNode;
};
