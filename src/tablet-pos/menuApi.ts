import type {
  Category,
  Product,
  ProductAddOn,
  ProductAddOnGroup,
  ProductOptionGroup,
} from "./types";

const normalizeText = (value: unknown, fallback = "") => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (value === null || value === undefined) return fallback;
  const asString = String(value).trim();
  return asString || fallback;
};

const normalizeId = (value: unknown) => normalizeText(value, "");

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const formatLabel = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toList = (value: unknown) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
};

const uniqueAddOns = (items: ProductAddOn[]) => {
  const byId = new Map<string, ProductAddOn>();
  items.forEach((item) => {
    if (!item.id) return;
    if (!byId.has(item.id)) byId.set(item.id, item);
  });
  return Array.from(byId.values());
};

const normalizeAddOnItems = (rawItems: unknown, groupId: string): ProductAddOn[] =>
  toList(rawItems)
    .map((raw, index): ProductAddOn | null => {
      if (!raw || typeof raw !== "object") return null;
      const data = raw as Record<string, unknown>;
      if (Boolean(data.outofstock)) return null;
      const id =
        normalizeId(data.id ?? data.$id) ||
        `${groupId}-addon-${index + 1}`;
      const name = normalizeText(data.name, "Add-on");
      return {
        id,
        name,
        price: toNumber(data.price, 0),
      };
    })
    .filter((item): item is ProductAddOn => Boolean(item));

const buildGlobalGroupCatalog = (data: unknown) => {
  const payload = (data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const groupsRaw = toList(
    payload.addOnGroups ?? payload.addonGroups ?? payload.add_on_groups ?? payload.groups
  );
  const addOnItemsRaw = toList(
    payload.addOnItems ?? payload.addonItems ?? payload.add_on_items ?? payload.groupedAddOnItems
  ).flatMap((entry) => (Array.isArray(entry) ? entry : [entry]));

  const addOnsByGroup = new Map<string, ProductAddOn[]>();

  addOnItemsRaw.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const dataItem = raw as Record<string, unknown>;
    if (Boolean(dataItem.outofstock)) return;
    const groupId = normalizeId(dataItem.addOnGroupId ?? dataItem.add_on_group_id);
    if (!groupId) return;

    const addOn: ProductAddOn = {
      id: normalizeId(dataItem.id ?? dataItem.$id) || `${groupId}-addon-${index + 1}`,
      name: normalizeText(dataItem.name, "Add-on"),
      price: toNumber(dataItem.price, 0),
    };

    if (!addOnsByGroup.has(groupId)) addOnsByGroup.set(groupId, []);
    addOnsByGroup.get(groupId)?.push(addOn);
  });

  const groupsById = new Map<string, ProductAddOnGroup>();

  groupsRaw.forEach((raw) => {
    if (!raw || typeof raw !== "object") return;
    const groupData = raw as Record<string, unknown>;
    const groupId = normalizeId(groupData.id);
    if (!groupId) return;

    const nestedItems = normalizeAddOnItems(
      groupData.addOnItems ?? groupData.add_on_items ?? groupData.items,
      groupId
    );
    const mergedAddOns = uniqueAddOns([
      ...nestedItems,
      ...(addOnsByGroup.get(groupId) ?? []),
    ]);

    groupsById.set(groupId, {
      id: groupId,
      name: normalizeText(groupData.groupName ?? groupData.name, "Add-ons"),
      addOns: mergedAddOns,
    });
  });

  addOnsByGroup.forEach((groupItems, groupId) => {
    if (groupsById.has(groupId)) return;
    groupsById.set(groupId, {
      id: groupId,
      name: "Add-ons",
      addOns: uniqueAddOns(groupItems),
    });
  });

  return groupsById;
};

const resolveProductAddOnGroups = (
  rawItem: Record<string, unknown>,
  groupsById: Map<string, ProductAddOnGroup>
): ProductAddOnGroup[] | undefined => {
  const assignmentRaw = rawItem.addOnGroupAssignments ?? rawItem.addOnGroups;
  const assignments = toList(assignmentRaw);
  if (assignments.length === 0) return undefined;

  const resolved: ProductAddOnGroup[] = [];
  const seen = new Set<string>();

  assignments.forEach((assignment, index) => {
    if (!assignment || typeof assignment !== "object") return;
    const assignmentData = assignment as Record<string, unknown>;
    const groupSource =
      assignmentData.addOnGroup && typeof assignmentData.addOnGroup === "object"
        ? (assignmentData.addOnGroup as Record<string, unknown>)
        : assignmentData;

    const groupId = normalizeId(
      assignmentData.addOnGroupId ??
        assignmentData.add_on_group_id ??
        groupSource.id
    );
    if (!groupId || seen.has(groupId)) return;

    const nestedAddOns = normalizeAddOnItems(
      groupSource.addOnItems ?? groupSource.add_on_items ?? groupSource.items,
      groupId
    );
    const catalogGroup = groupsById.get(groupId);
    const addOns = uniqueAddOns([
      ...nestedAddOns,
      ...(catalogGroup?.addOns ?? []),
    ]);

    if (addOns.length === 0) return;

    resolved.push({
      id: groupId,
      name:
        normalizeText(groupSource.groupName ?? groupSource.name, "") ||
        catalogGroup?.name ||
        `Add-ons ${index + 1}`,
      addOns,
    });
    seen.add(groupId);
  });

  return resolved.length > 0 ? resolved : undefined;
};

const resolveProductOptions = (
  rawItem: Record<string, unknown>,
  basePrice: number,
  productId: string
): ProductOptionGroup[] | undefined => {
  const rawOptions = toList(rawItem.options).filter(
    (entry) => entry && typeof entry === "object"
  ) as Array<Record<string, unknown>>;

  if (rawOptions.length === 0) return undefined;

  const choices = rawOptions.map((option, index) => {
    const optionId = normalizeId(option.variant ?? option.name) || `${productId}-opt-${index + 1}`;
    const optionName = normalizeText(option.name ?? option.variant, `Option ${index + 1}`);
    const optionPrice = toNumber(option.price, basePrice);

    return {
      id: optionId,
      name: optionName,
      priceDelta: optionPrice - basePrice,
    };
  });

  return [
    {
      id: `options-${productId}`,
      name: "Options",
      required: true,
      choices,
    },
  ];
};

const mapMenuResponseToCatalog = (data: unknown) => {
  const payload = (data && typeof data === "object"
    ? (data as Record<string, unknown>)
    : {}) as Record<string, unknown>;

  const rawItems = Array.isArray(data)
    ? data
    : toList(payload.items ?? payload.documents ?? payload.data);

  const groupsById = buildGlobalGroupCatalog(payload);

  const categories: Category[] = [];
  const categorySet = new Set<string>();
  const products: Product[] = [];

  rawItems.forEach((rawEntry, index) => {
    if (!rawEntry || typeof rawEntry !== "object") return;
    const rawItem = rawEntry as Record<string, unknown>;
    if (rawItem.type === "add_on") return;

    const productId = normalizeId(rawItem.id ?? rawItem.$id);
    if (!productId) return;

    const productName = normalizeText(rawItem.name, `Item ${index + 1}`);
    const categoryId = normalizeText(rawItem.category, "uncategorized");
    const basePrice = toNumber(rawItem.pricePerUnit ?? rawItem.price, 0);

    if (!categorySet.has(categoryId)) {
      categorySet.add(categoryId);
      categories.push({
        id: categoryId,
        name: formatLabel(categoryId),
      });
    }

    const options = resolveProductOptions(rawItem, basePrice, productId);
    const addOnGroups = resolveProductAddOnGroups(rawItem, groupsById);

    products.push({
      id: productId,
      categoryId,
      name: productName,
      image:
        normalizeText(rawItem.image, "") ||
        `https://picsum.photos/seed/menu-${productId}/200/200`,
      price: basePrice,
      options,
      addOnGroups,
    });
  });

  return {
    categories,
    products,
    companyName: normalizeText(
      payload.company && typeof payload.company === "object"
        ? (payload.company as Record<string, unknown>).name
        : payload.companyName ?? payload.company_name,
      ""
    ) || null,
    companyId: normalizeText(
      payload.company && typeof payload.company === "object"
        ? (payload.company as Record<string, unknown>).id
        : "",
      ""
    ) || null,
  };
};

export const getCompanyIdFromPath = () => {
  const params = new URLSearchParams(window.location.search);
  const paramId = params.get("companyId") || params.get("id");

  const segments = window.location.pathname.split("/").filter(Boolean);
  if (paramId) return paramId;
  if (segments[0] === "o") return null;
  if (segments[0] === "menu" || segments[0] === "order" || segments[0] === "tablet-pos") {
    return segments[1] || null;
  }
  return segments[0] ?? null;
};

export const fetchPosMenuCatalog = async (
  baseUrl: string,
  companyIdOrSlug: string
): Promise<{
  categories: Category[];
  products: Product[];
  companyName: string | null;
  companyId: string | null;
}> => {
  const path = `${baseUrl}/public/customer-menu/${companyIdOrSlug}`;
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch menu: ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const bodyText = await res.text();
    throw new Error(`Expected JSON but received: ${bodyText.slice(0, 120)}...`);
  }

  const data = await res.json();
  return mapMenuResponseToCatalog(data);
};
