import type { MenuItemRow, MenuItemOption } from '../types';

type PriceOptions = {
  showPriceRange?: boolean;
  paperView?: boolean;
};

export const parsePriceValue = (value: number | string | undefined | null): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const formatPrice = (value: number, options: PriceOptions = {}) => {
  const currencyPrefix = options.paperView ? '' : '₱';
  const formatted = new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${currencyPrefix}${formatted}`;
};

export const getOptionPrice = (option?: MenuItemOption | null): number => {
  if (!option) return 0;
  return parsePriceValue(option.price);
};

export const getRowBasePrice = (row: MenuItemRow): number => {
  if (typeof row.price === 'number') return row.price;
  if (typeof row.pricePerUnit === 'number') return row.pricePerUnit;
  return parsePriceValue(row.price ?? row.pricePerUnit ?? 0);
};

export const buildDisplayPrice = (row: MenuItemRow, options: PriceOptions = {}) => {
  const { showPriceRange = true, paperView = false } = options;

  if (Array.isArray(row.options) && row.options.length > 0) {
    if (!showPriceRange) return '';
    const prices = row.options
      .map((opt) => getOptionPrice(opt))
      .filter((price) => Number.isFinite(price));
    if (prices.length === 0) return formatPrice(0, { paperView });
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === maxPrice) return formatPrice(minPrice, { paperView });
    return `${formatPrice(minPrice, { paperView })} - ${formatPrice(maxPrice, { paperView })}`;
  }

  const priceValue = getRowBasePrice(row);
  return formatPrice(priceValue, { paperView });
};
