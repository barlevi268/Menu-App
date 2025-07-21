import React, { useState } from 'react';
import { Client, Databases, ID, Query } from "appwrite";
import { ArrowLeft, Coffee, Zap, Milk, Star } from 'lucide-react';

const dbclient = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('67d54dea00199fd0947e');

const databases = new Databases(dbclient);

const databaseId = '67d54e3c0008c2ac6a81';
const customerMenuCollection = '687dc62900071ec92f07';

const CoffeeMenuApp = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);

  // Fetch products from Appwrite DB
  React.useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await databases.listDocuments(databaseId, customerMenuCollection);
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
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  allergen === 'None' 
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

  if (selectedProduct) {
    return <ProductDetailPage product={selectedProduct} onBack={() => setSelectedProduct(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 shadow-lg">
        <div className="text-center">
          <Coffee className="w-12 h-12 mx-auto mb-2" />
          <h1 className="text-2xl font-bold">Bean & Brew Café</h1>
          <p className="text-amber-100 mt-1">Crafted with love, served with care</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex overflow-x-auto p-4 space-x-3">
          {[
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
          ].map((category) => {
            const IconComponent = category.icon;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  selectedCategory === category.id
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
        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
          {filteredProducts.map((product) => (
            <ProductCard key={product.$id} product={product} />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t p-6 mt-8">
        <div className="text-center text-gray-600">
          <Coffee className="w-6 h-6 mx-auto mb-2 text-amber-500" />
          <p className="text-sm">Thank you for choosing Bean & Brew Café</p>
          <p className="text-xs text-gray-500 mt-1">Fresh coffee, made with passion</p>
        </div>
      </div>
    </div>
  );
};

export default CoffeeMenuApp;