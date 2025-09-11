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
        const res = await databases.listDocuments(databaseId, customerMenuCollection, [Query.limit(100), Query.offset(0)]);
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
      className="relative bg-white rounded-xl shadow-md overflow-hidden mb-4 cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={() => setSelectedProduct(product)}
    >
      <div className="flex items-start p-3">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name || 'product image'}
            className="w-24 h-24 object-cover rounded-md flex-shrink-0 mr-3"
          />
        ) : (
          <div className="w-24 h-24 rounded-md flex-shrink-0 mr-3 overflow-hidden">
            <svg width="100%" height="100%" viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="180" height="180" fill="#F1F1F1" />
              <path d="M116.457 116.457C120.632 112.281 123.896 107.647 126.245 102.557C128.595 97.4666 129.965 92.3459 130.356 87.1886C130.748 82.0347 130.161 77.0759 128.595 72.3103C127.028 67.5472 124.416 63.3381 120.764 59.6826C117.5 56.422 113.747 53.9751 109.507 52.341C105.264 50.711 100.859 49.8942 96.2923 49.8942C90.6792 49.8942 85.0661 51.1028 79.4558 53.5159C73.843 55.9324 68.6882 59.4225 63.9902 63.9896C59.8113 68.2969 56.5507 72.995 54.2017 78.0854C51.852 83.1752 50.4821 88.2656 50.0904 93.3553C49.6987 98.4458 50.3167 103.373 51.9499 108.136C53.5805 112.902 56.1593 117.111 59.6832 120.763C62.9438 124.027 66.6971 126.474 70.94 128.105C75.1798 129.738 79.5843 130.552 84.1545 130.552C89.7648 130.552 95.4117 129.346 101.089 126.931C106.766 124.517 111.887 121.027 116.457 116.457ZM122.33 58.3124C126.766 62.7507 130.094 67.7433 132.315 73.2888C134.532 78.8376 135.643 84.4816 135.643 90.2229C135.643 95.9676 134.532 101.645 132.315 107.255C130.094 112.868 126.766 117.894 122.33 122.33C117.892 126.768 112.933 130.096 107.451 132.314C101.97 134.535 96.2923 135.642 90.4191 135.642C84.5462 135.642 78.8353 134.535 73.2891 132.314C67.7403 130.096 62.7478 126.768 58.3123 122.33C53.8744 117.894 50.5462 112.868 48.3282 107.255C46.1073 101.645 45 95.9676 45 90.2229C45 84.4816 46.1073 78.8376 48.3282 73.2888C50.5462 67.7433 53.8744 62.7507 58.3123 58.3124C62.7478 53.7453 67.7403 50.3837 73.2891 48.2304C78.8353 46.0764 84.5462 45.0001 90.4191 45.0001C96.2923 45.0001 101.97 46.0764 107.451 48.2304C112.933 50.3837 117.892 53.7453 122.33 58.3124Z" fill="#B9B9B9" />
              <path d="M111.047 60.696C111.94 67.8397 110.712 77.3276 104.238 83.8012C95.1969 92.8425 86.9371 91.9496 78.0078 100.879C73.3195 105.567 70.4181 112.041 70.4175 118.292C69.5252 111.148 70.8641 101.549 77.338 95.0748C86.3793 86.0335 94.5277 87.0381 103.457 78.1089C108.257 73.3092 111.047 66.9464 111.047 60.696Z" fill="#B9B9B9" />
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0 justify-between flex flex-col">
          <div>
            <h3 className="font-bold text-sm text-gray-800 truncate">{product.name}</h3>
            <p className="text-gray-600 text-xs">{product.description}</p>
            <div className="absolute bottom-3 right-3 text-sm font-bold">
              ₱{((product.price ?? product.pricePerUnit) ?? 0).toFixed(2)}
            </div>
          </div>

        </div>
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
        {/* <div>
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
        </div> */}

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