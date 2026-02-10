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
};

export type OrderItem = {
  id: string;
  productId: string;
  name: string;
  image?: string | null;
  variant?: string | null;
  optionName?: string | null;
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
