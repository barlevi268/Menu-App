import React from "react";

export type AppStage = "login" | "pos" | "payment" | "done";
export type PaymentMethod = "cash" | "card" | "qrph" | "gcash";

export type User = {
  id: string;
  username: string;
  password: string;
  name: string;
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
  method: PaymentMethod;
  total: number;
  amountGiven: number;
  change: number;
};

export type PaymentMethodOption = {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ReactNode;
};
