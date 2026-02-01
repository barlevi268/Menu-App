import React from 'react';
import type { MenuItem } from '../types';
import { buildDisplayPrice } from '../utils/pricing';

type ProductLineProps = {
  product: MenuItem;
  expandOptions: boolean;
  showPriceRange: boolean;
  paperView: boolean;
  onSelect: (product: MenuItem) => void;
};

const ProductLine = ({
  product,
  expandOptions,
  showPriceRange,
  paperView,
  onSelect,
}: ProductLineProps) => {
  const optionList = product.options ?? [];
  const showExpandedOptions = expandOptions && optionList.length > 0;
  const displayPrice = showExpandedOptions
    ? ''
    : buildDisplayPrice(product, { showPriceRange, paperView });
  const hasPrice = displayPrice.trim().length > 0;

  return (
    <div className="pt-2 cursor-pointer group" onClick={() => onSelect(product)}>
      <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1">
        <h3 className="text-lg text-gray-800 dark:text-gray-100">{product.name}</h3>
        {hasPrice && (
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            - {displayPrice}
            <span className="text-xs align-text-top">₱</span>
          </span>
        )}
      </div>
      {product.description ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">{product.description}</p>
      ) : null}
      {showExpandedOptions && (
        <div className="mt-2 space-y-2">
          {(() => {
            const variantGroups = new Map<string | null, typeof optionList>();
            optionList.forEach((option) => {
              const variant = option.variant ?? null;
              if (!variantGroups.has(variant)) {
                variantGroups.set(variant, []);
              }
              variantGroups.get(variant)?.push(option);
            });

            return Array.from(variantGroups.entries()).map(([variant, options]) => (
              <div key={variant ?? 'default'} className="space-y-1">
                {variant ? (
                  <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {variant}
                  </div>
                ) : null}
                {options.map((option, index) => (
                  <div
                    key={`${variant ?? 'option'}-${option.name ?? 'option'}-${index}`}
                    className="text-sm text-gray-700 dark:text-gray-300 flex justify-between pl-2"
                  >
                    <span>
                      {option.name?.replace(' Bottle', '').replace(' Shot', '') || 'Option'}
                    </span>
                    <span className="font-semibold">
                      {buildDisplayPrice({ options: [option] }, { paperView })}
                    </span>
                  </div>
                ))}
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
};

export default ProductLine;
