import type {
  ConfigDraft,
  OrderLine,
  Product,
  SelectedAddOn,
  SelectedOption,
} from "./types";

export const peso = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(amount);

export const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const parseAmountToNumber = (value: string) => {
  const normalized = value.replace(/[^\d.]/g, "");
  if (!normalized) return 0;
  const parts = normalized.split(".");
  const safe = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : parts[0];
  const parsed = Number(safe);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isProductConfigurable = (product: Product) => {
  const hasOptions = Array.isArray(product.options) && product.options.length > 0;
  const hasAddOns = Array.isArray(product.addOnGroups) && product.addOnGroups.length > 0;
  return hasOptions || hasAddOns;
};

export const defaultDraftFromProduct = (product: Product): ConfigDraft => {
  const selectedOptionByGroup: Record<string, string> = {};
  product.options?.forEach((group) => {
    if (group.required && group.choices.length > 0) {
      selectedOptionByGroup[group.id] = group.choices[0].id;
    }
  });

  return {
    selectedOptionByGroup,
    selectedAddOnIds: [],
    quantity: 1,
    notes: "",
  };
};

export const draftFromOrderLine = (line: OrderLine): ConfigDraft => {
  const selectedOptionByGroup: Record<string, string> = {};
  line.selectedOptions.forEach((option) => {
    selectedOptionByGroup[option.groupId] = option.choiceId;
  });

  return {
    selectedOptionByGroup,
    selectedAddOnIds: line.selectedAddOns.map((addOn) => addOn.addOnId),
    quantity: line.quantity,
    notes: line.notes,
  };
};

export const selectedOptionsFromDraft = (
  product: Product,
  draft: ConfigDraft
): SelectedOption[] => {
  const selected: SelectedOption[] = [];

  product.options?.forEach((group) => {
    const choiceId = draft.selectedOptionByGroup[group.id];
    if (!choiceId) return;
    const choice = group.choices.find((candidate) => candidate.id === choiceId);
    if (!choice) return;
    selected.push({
      groupId: group.id,
      choiceId: choice.id,
      groupName: group.name,
      choiceName: choice.name,
      priceDelta: choice.priceDelta,
    });
  });

  return selected;
};

export const selectedAddOnsFromDraft = (
  product: Product,
  draft: ConfigDraft
): SelectedAddOn[] => {
  const lookup = new Set(draft.selectedAddOnIds);
  const selected: SelectedAddOn[] = [];

  product.addOnGroups?.forEach((group) => {
    group.addOns.forEach((addOn) => {
      if (!lookup.has(addOn.id)) return;
      selected.push({
        groupId: group.id,
        addOnId: addOn.id,
        groupName: group.name,
        addOnName: addOn.name,
        price: addOn.price,
      });
    });
  });

  return selected;
};

export const getUnitPrice = (line: OrderLine) =>
  line.basePrice +
  line.selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0) +
  line.selectedAddOns.reduce((sum, addOn) => sum + addOn.price, 0);

export const getLineTotal = (line: OrderLine) => getUnitPrice(line) * line.quantity;

export const getOrderTotal = (lines: OrderLine[]) =>
  lines.reduce((sum, line) => sum + getLineTotal(line), 0);

export const orderLineSignature = (
  line: Pick<OrderLine, "productId" | "selectedOptions" | "selectedAddOns" | "notes">
) => {
  const optionsPart = [...line.selectedOptions]
    .map((item) => `${item.groupId}:${item.choiceId}`)
    .sort()
    .join("|");
  const addOnsPart = [...line.selectedAddOns]
    .map((item) => `${item.groupId}:${item.addOnId}`)
    .sort()
    .join("|");

  return `${line.productId}::${optionsPart}::${addOnsPart}::${line.notes.trim()}`;
};

export const canSaveConfig = (product: Product, draft: ConfigDraft) => {
  const options = product.options ?? [];
  return options.every((group) => {
    if (!group.required) return true;
    const selected = draft.selectedOptionByGroup[group.id];
    if (!selected) return false;
    return group.choices.some((choice) => choice.id === selected);
  });
};
