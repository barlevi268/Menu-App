import { Client, Databases, ID, Query } from "appwrite";
import React, { useState } from 'react';
import 'react-toastify/dist/ReactToastify.css';
import { ArrowLeft, Star, Clock, Coffee, Zap, Milk } from 'lucide-react';

const dbclient = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('67d54dea00199fd0947e');

const databases = new Databases(dbclient);

const databaseId = '67d54e3c0008c2ac6a81';
const ingredientsCollection = '6862046a002f4f6f8a5b';
const menuItemsCollection = '6862047d00215e1f89b9';

const CoffeeMenuApp = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Sample menu data
  const menuData = {
    categories: [
      { id: 'all', name: 'All Items', icon: Coffee },
      { id: 'hot-coffee', name: 'Hot Coffee', icon: Coffee },
      { id: 'cold-coffee', name: 'Cold Coffee', icon: Zap },
      { id: 'specialty', name: 'Specialty', icon: Star },
      { id: 'pastries', name: 'Pastries', icon: Milk }
    ],
    products: [
      {
        id: 1,
        name: 'Classic Espresso',
        category: 'hot-coffee',
        price: 2.50,
        image: 'https://images.unsplash.com/photo-1510707577719-ae7c14805e3a?w=300&h=300&fit=crop&crop=center',
        description: 'Rich, bold espresso shot with perfect crema',
        details: 'Our signature espresso blend, carefully crafted from premium arabica beans sourced from Colombian highlands. Roasted to perfection for a full-bodied flavor with notes of dark chocolate and caramel.',
        prepTime: '2-3 min',
        rating: 4.8,
        ingredients: ['Premium Arabica Beans', 'Filtered Water'],
        nutritionInfo: { calories: 5, caffeine: '64mg' }
      },
      {
        id: 2,
        name: 'Cappuccino Supreme',
        category: 'hot-coffee',
        price: 4.25,
        image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=300&h=300&fit=crop&crop=center',
        description: 'Perfect balance of espresso and steamed milk foam',
        details: 'A harmonious blend of our signature espresso with velvety steamed milk, topped with a thick layer of microfoam. Dusted with a hint of cocoa powder for the perfect finish.',
        prepTime: '4-5 min',
        rating: 4.9,
        ingredients: ['Espresso', 'Whole Milk', 'Cocoa Powder'],
        nutritionInfo: { calories: 120, caffeine: '64mg' }
      },
      {
        id: 3,
        name: 'Iced Americano',
        category: 'cold-coffee',
        price: 3.75,
        image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=300&h=300&fit=crop&crop=center',
        description: 'Refreshing cold espresso with ice and water',
        details: 'Double shot of our premium espresso served over ice with cold filtered water. Simple, clean, and refreshing - perfect for hot days when you need that caffeine kick.',
        prepTime: '2 min',
        rating: 4.6,
        ingredients: ['Double Espresso', 'Filtered Water', 'Ice'],
        nutritionInfo: { calories: 10, caffeine: '128mg' }
      },
      {
        id: 4,
        name: 'Vanilla Latte',
        category: 'specialty',
        price: 5.50,
        image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop&crop=center',
        description: 'Smooth espresso with vanilla syrup and steamed milk',
        details: 'Our signature espresso combined with house-made vanilla syrup and perfectly steamed milk. Topped with delicate latte art and a sprinkle of vanilla bean.',
        prepTime: '5-6 min',
        rating: 4.7,
        ingredients: ['Espresso', 'Whole Milk', 'Vanilla Syrup', 'Vanilla Bean'],
        nutritionInfo: { calories: 190, caffeine: '64mg' }
      },
      {
        id: 5,
        name: 'Chocolate Croissant',
        category: 'pastries',
        price: 3.25,
        image: 'https://images.unsplash.com/photo-1555507036-ab794f4afe6a?w=300&h=300&fit=crop&crop=center',
        description: 'Buttery pastry filled with rich dark chocolate',
        details: 'Freshly baked croissant with layers of flaky, buttery pastry wrapped around premium Belgian dark chocolate. Baked fresh every morning in our kitchen.',
        prepTime: '1 min',
        rating: 4.8,
        ingredients: ['Butter', 'Flour', 'Belgian Dark Chocolate', 'Eggs'],
        nutritionInfo: { calories: 280, caffeine: '0mg' }
      },
      {
        id: 6,
        name: 'Cold Brew Float',
        category: 'specialty',
        price: 6.25,
        image: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=300&h=300&fit=crop&crop=center',
        description: 'Cold brew coffee with vanilla ice cream float',
        details: 'Smooth, slow-brewed cold coffee served with a scoop of premium vanilla ice cream floating on top. A perfect blend of bitter and sweet that creates a unique coffee experience.',
        prepTime: '3 min',
        rating: 4.9,
        ingredients: ['Cold Brew Coffee', 'Vanilla Ice Cream', 'Whipped Cream'],
        nutritionInfo: { calories: 240, caffeine: '150mg' }
      }
    ]
  };

  const filteredProducts = selectedCategory === 'all' 
    ? menuData.products 
    : menuData.products.filter(product => product.category === selectedCategory);

  const ProductCard = ({ product }) => (
    <div 
      className="bg-white rounded-xl shadow-md overflow-hidden mb-4 cursor-pointer transform transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={() => setSelectedProduct(product)}
    >
      <div className="relative">
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-sm font-medium">
          ${product.price.toFixed(2)}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-800 mb-2">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3">{product.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Star className="w-4 h-4 text-yellow-500 fill-current" />
            <span className="text-sm text-gray-700">{product.rating}</span>
          </div>
          <div className="flex items-center space-x-1 text-gray-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{product.prepTime}</span>
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
        <img 
          src={product.image} 
          alt={product.name}
          className="w-full h-64 object-cover"
        />
        <div className="absolute bottom-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-full text-xl font-bold shadow-lg">
          ${product.price.toFixed(2)}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-6 space-y-6">
        {/* Rating and Time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            <span className="text-lg font-semibold text-gray-800">{product.rating}</span>
            <span className="text-gray-600">Rating</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <Clock className="w-5 h-5" />
            <span>{product.prepTime}</span>
          </div>
        </div>

        {/* Description */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Description</h2>
          <p className="text-gray-700 leading-relaxed">{product.details}</p>
        </div>

        {/* Ingredients */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Ingredients</h2>
          <div className="flex flex-wrap gap-2">
            {product.ingredients.map((ingredient, index) => (
              <span 
                key={index}
                className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium"
              >
                {ingredient}
              </span>
            ))}
          </div>
        </div>

        {/* Nutrition Info */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-3">Nutrition Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-gray-800">{product.nutritionInfo.calories}</p>
              <p className="text-gray-600 text-sm">Calories</p>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <p className="text-2xl font-bold text-gray-800">{product.nutritionInfo.caffeine}</p>
              <p className="text-gray-600 text-sm">Caffeine</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button className="w-full bg-amber-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-amber-600 transition-colors">
          Add to Order - ${product.price.toFixed(2)}
        </button>
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
          {menuData.categories.map((category) => {
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
                <IconComponent className="w-4 h-4" />
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
            <ProductCard key={product.id} product={product} />
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