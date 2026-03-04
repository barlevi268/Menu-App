export type MenuCategory = { id: string; name: string };
export type CategoryGroup = {
  id: string;
  name: string;
  categories: string[];
  type?: string;
  images?: string[];
};

export type MenuPreferences = {
  menuTypes?: Record<
    string,
    {
      name?: string;
      type?: string;
      images?: string[];
      categorieArrangment?: Record<string, number | string>;
    }
  >;
  categories?: Record<string, { id: number | string; label?: string }>;
  themeColor?: string;
  coverPhotoUrl?: string | null;
  logoUrl?: string | null;
  footerText?: string | null;
  darkMode?: boolean;
  showPriceRange?: boolean;
  expandOptions?: boolean;
  paperView?: boolean;
  dispatchTyeps?: Record<
    string,
    {
      enabled?: boolean;
      instructions?: string | null;
      locations?: Record<
        string,
        {
          name?: string | null;
          address?: string | null;
        }
      >;
    }
  >;
  dispatchTypes?: Record<
    string,
    {
      enabled?: boolean;
      instructions?: string | null;
      locations?: Record<
        string,
        {
          name?: string | null;
          address?: string | null;
        }
      >;
    }
  >;
  resturantAddress?: string | null;
  resturantPhone?: string | null;
};

export type MenuItemOption = {
  name?: string;
  price?: number | string;
  variant?: string | null;
};

export type MenuAddOnItem = {
  id?: string;
  $id?: string;
  name?: string;
  price?: number | string;
  description?: string;
  image?: string | null;
  outofstock?: boolean;
  sequence?: number;
  addOnGroupId?: string | null;
  add_on_group_id?: string | null;
};

export type MenuAddOnGroup = {
  id?: string;
  groupName?: string;
  name?: string;
  sequence?: number;
  minSelect?: number;
  maxSelect?: number;
  required?: boolean;
  addOnItems?: MenuAddOnItem[];
  add_on_items?: MenuAddOnItem[];
};

export type MenuAddOnGroupAssignment = {
  id?: string;
  addOnGroupId?: string;
  add_on_group_id?: string;
  sequence?: number;
  addOnGroup?: MenuAddOnGroup | null;
};

export type MenuItemRow = {
  price?: number | string;
  pricePerUnit?: number | string;
  options?: MenuItemOption[];
};

export type MenuItem = MenuItemRow & {
  id?: string;
  $id?: string;
  name?: string;
  description?: string;
  image?: string | null;
  category?: string;
  menuType?: string;
  addOnGroupAssignments?: MenuAddOnGroupAssignment[];
  addOnGroups?: MenuAddOnGroup[];
};

export type OrderItemAddOn = {
  groupId: string;
  groupName: string;
  itemId: string;
  itemName: string;
  price: number;
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  image?: string | null;
  variant?: string | null;
  optionName?: string | null;
  selectedAddOns?: OrderItemAddOn[];
  note?: string;
  quantity: number;
  unitPrice: number;
};

export type OrderItemDraft = Omit<OrderItem, 'id'> & { id?: string };

export type CustomerDetails = {
  name: string;
  phone: string;
  notes: string;
  dispatchType: string;
  dispatchInfo: {
    address: string;
    notes: string;
  };
};

export type CustomerOrderState = {
  items: OrderItem[];
  customer: CustomerDetails;
  updatedAt: string | null;
};
