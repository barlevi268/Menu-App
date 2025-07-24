import React, { useState } from 'react';
import { Client, Databases, ID, Query } from "appwrite";
import { ArrowLeft, Coffee, Zap, Milk, Star } from 'lucide-react';

const dbclient = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('67d54dea00199fd0947e');

const databases = new Databases(dbclient);

const databaseId = '67d54e3c0008c2ac6a81';
const customerMenuCollection = '687dc62900071ec92f07';
const logoImgSrc = 'https://fra.cloud.appwrite.io/v1/storage/buckets/687dd5ef002a30eca0f9/files/687e5635002794eeec27/view?project=67d54dea00199fd0947e&mode=admin'
const headerBgImgSrc = 'https://fra.cloud.appwrite.io/v1/storage/buckets/687dd5ef002a30eca0f9/files/687e557c001416d2d97b/view?project=67d54dea00199fd0947e&mode=admin'

const menuCategories = [
  { id: 'all', name: 'All Items', icon: Coffee, color: 'amber' },
  { id: 'tradition', name: 'Tradition', icon: Coffee, color: 'amber' },
  { id: 'brews', name: 'Brews', icon: Coffee, color: 'amber' },
  { id: 'signature', name: 'Signature', icon: Star, color: 'amber' },
  { id: 'iced', name: 'Cold & Iced', icon: Zap, color: 'amber' },
  { id: 'coffeeless', name: 'Coffeeless', icon: Zap, color: 'amber' },
  { id: 'breakfast', name: 'Breakfast', icon: Milk, color: 'blue' },
  { id: 'lunch', name: 'Lunch', icon: Milk, color: 'blue' },
  { id: 'sandwiches', name: 'Sandwiches', icon: Milk, color: 'blue' },
  { id: 'pastries', name: 'Pastries', icon: Milk, color: 'orange' },
  { id: 'cookies', name: 'Cookies', icon: Milk, color: 'orange' },
  { id: 'cakes', name: 'Cakes', icon: Milk, color: 'orange' },
]

const categoryGroups = [
  { id: 'drinks', name: 'Drinks', categories: ['tradition', 'brews', 'signature', 'iced', 'coffeeless'] },
  { id: 'food', name: 'Food', categories: ['breakfast', 'lunch', 'sandwiches'] },
  { id: 'sweets', name: 'Sweets', categories: ['pastries', 'cookies', 'cakes'] }
];

const CoffeeMenuApp = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const categoryRefs = React.useRef({});

  // Fetch products from Appwrite DB
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await databases.listDocuments(databaseId, customerMenuCollection,[Query.limit(100), Query.offset(0)]);
        setProducts(res.documents);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(product => product.category === selectedCategory);

  const ProductCard = ({ product }) => (
    <div
      className="bg-white rounded-xl shadow-md overflow-hidden mb-4 cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={() => setSelectedProduct(product)}
    >
      <div className="relative">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-48 object-cover"
          />
        )}
        <div className="absolute top-5 right-4 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-sm font-medium">
          ₱{product.price.toFixed(2)}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-800 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm">{product.description}</p>
      </div>
    </div>
  );

  const ProductDetailPage = ({ product, onBack }) => (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-sm z-10">
        <div className="flex items-center p-4">
          <button
            onClick={onBack}
            className="mr-3 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">{product.name}</h1>
        </div>
      </div>

      {/* Product Image */}
      <div className="relative">
        {product.image && (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-64 object-cover"
          />
        )}
        {/* Price in php Badge */}
        <div className="absolute bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-full text-xl font-bold shadow-lg">
          ₱{product.price.toFixed(2)}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6 space-y-6">

        {/* Description */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Description</h2>
          <p className="text-gray-700 leading-relaxed">{product.description}</p>
        </div>

        {/* Allergens */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Allergens</h2>
          <div className="flex flex-wrap gap-2">
            {product.allergens.map((allergen, index) => (
              <span
                key={index}
                className={`px-3 py-1 rounded-full text-sm font-medium ${allergen === 'None'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                  }`}
              >
                {allergen}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  const [activeGroup, setActiveGroup] = useState('drinks');

  const getGroupFromCategory = (categoryId) => {
    const group = categoryGroups.find(group => group.categories.includes(categoryId));
    return group ? group.name : '';
  };

  if (selectedProduct) {
    return <ProductDetailPage product={selectedProduct} onBack={() => setSelectedProduct(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 shadow-lg bg-img">
        <div className="text-center">
          <img src={logoImgSrc} alt="Bean & Brew Café" className="w-32 mx-auto mb-2" />
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex overflow-x-auto text-gray-600 space-x-3 text-xs uppercase px-4 pt-3 pb-1 font-semibold tracking-wide">
          {categoryGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => {
                const firstCategory = group.categories[0];
                setSelectedCategory(firstCategory);
                setActiveGroup(group.name);
                categoryRefs.current[firstCategory]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
              }}
              className={`cursor-pointer px-2 py-1 rounded-md transition-colors ${getGroupFromCategory(selectedCategory) === group.name
                ? 'bg-amber-500 text-white'
                : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {group.name}
            </div>
          ))}
        </div>
        <div className="flex overflow-x-auto p-4 space-x-3 scrollbar-hide">
          {menuCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                ref={el => (categoryRefs.current[category.id] = el)}
                onClick={() => {
                  setSelectedCategory(category.id);
                  setActiveGroup(getGroupFromCategory(category.id));
                  categoryRefs.current[category.id]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${selectedCategory === category.id
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <span className="font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 gap-2 max-w-md mx-auto">
          {menuCategories
            .filter(cat => cat.id !== 'all')
            .map(category => {
              const categoryProducts = filteredProducts.filter(p => p.category === category.id);
              if (categoryProducts.length === 0) return null;
              return (
                <div key={category.id} ref={el => (categoryRefs.current[category.id] = el)} className="mb-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-2 px-1">{category.name}</h2>
                  {categoryProducts.map(product => (
                    <ProductCard key={product.$id} product={product} />
                  ))}
                </div>
              );
            })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t p-6 mt-8">
        <div className="text-center text-gray-600">
          <Coffee className="w-6 h-6 mx-auto mb-2 text-amber-500" />
          <p className="text-sm">Thank you for choosing Oltre ☺️</p>
          <p className="text-xs text-gray-500 mt-1">Beyond coffee, made with passion</p>
        </div>
      </div>
    </div>
  );
};

export default CoffeeMenuApp;