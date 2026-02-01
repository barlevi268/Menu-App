import React from 'react';
import type { MenuItem } from '../types';
import { buildDisplayPrice } from '../utils/pricing';

type ProductCardProps = {
  product: MenuItem;
  expandOptions: boolean;
  showPriceRange: boolean;
  paperView: boolean;
  loadedImages: Set<string>;
  onSelect: (product: MenuItem) => void;
};

const ProductCard = ({
  product,
  expandOptions,
  showPriceRange,
  paperView,
  loadedImages,
  onSelect,
}: ProductCardProps) => {
  return (
    <div
      className="relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden mb-4 cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={() => onSelect(product)}
    >
      <div className="flex items-start p-3">
        <div className="flex-1 min-w-0 justify-between flex flex-col">
          <div className="pl-1">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 truncate">
              {product.name}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs truncate-2">
              {product.description}
            </p>
            {expandOptions && Array.isArray(product.options) && product.options.length > 0 ? (
              <div className="mt-2 space-y-2">
                {(() => {
                  const variantGroups = new Map<string | null, typeof product.options>();
                  product.options.forEach((option) => {
                    const variant = option.variant ?? null;
                    if (!variantGroups.has(variant)) {
                      variantGroups.set(variant, []);
                    }
                    variantGroups.get(variant)?.push(option);
                  });

                  return Array.from(variantGroups.entries()).map(([variant, options]) => (
                    <div key={variant ?? 'default'} className="space-y-1">
                      {variant ? (
                        <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {variant}
                        </div>
                      ) : null}
                      {options.map((option, index) => (
                        <div
                          key={`${variant ?? 'option'}-${option.name ?? 'option'}-${index}`}
                          className="text-xs text-gray-700 dark:text-gray-300 flex justify-between pl-2"
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
            ) : (
              <div className="bottom-3 text-sm font-bold">
                {buildDisplayPrice(product, { showPriceRange, paperView })}
              </div>
            )}
          </div>
        </div>
        {product.image ? (
          <img
            src={product.image}
            alt={product.name || 'product image'}
            className={`w-32 h-24 object-cover rounded-md flex-shrink-0 ml-3 transition-opacity duration-300 ${
              loadedImages.has(product.image) ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : null}
      </div>
    </div>
  );
};

export default ProductCard;
