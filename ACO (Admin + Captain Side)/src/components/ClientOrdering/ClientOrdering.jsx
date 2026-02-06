import React, { useState, useEffect } from 'react';
import { ShoppingCart, Search, Star, Clock, MapPin, Plus, Minus, X, CheckCircle2, ArrowLeft } from 'lucide-react';
import { RESTAURANTS } from '../../constants/foodData';
import { orderService } from '../../services/orderService';
import { API_KEY, WAREHOUSE_LOCATION } from '../../constants/config';

const DEFAULT_CLIENT_LOCATION = {
  lat: WAREHOUSE_LOCATION.lat,
  lng: WAREHOUSE_LOCATION.lng,
  name: 'Indiranagar, Bangalore', // Changed from Koramangala
  formatted: 'Indiranagar, Bangalore' // Changed from Koramangala
};

const ClientOrdering = ({ onBack, userLocation, setUserLocation }) => {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [addressInput, setAddressInput] = useState('');
  const [geocoder, setGeocoder] = useState(null);

  // Initialize geocoder
  useEffect(() => {
    if (window.google && window.google.maps && !geocoder) {
      setGeocoder(new window.google.maps.Geocoder());
    }
  }, [geocoder]);

  // Geocode address
  const geocodeAddress = (address) => {
    return new Promise((resolve, reject) => {
      if (!geocoder) {
        console.warn('Geocoder not initialized, using default location');
        resolve(DEFAULT_CLIENT_LOCATION);
        return;
      }
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            lat: location.lat(),
            lng: location.lng(),
            name: address,
            formatted: results[0].formatted_address
          });
        } else {
          reject(new Error(`Geocode failed: ${status}`));
        }
      });
    });
  };

  const handleAddressSubmit = async () => {
    if (!addressInput.trim()) {
      alert('Please enter a delivery address');
      return;
    }
    try {
      const location = await geocodeAddress(addressInput);
      setUserLocation(location);
      alert('Address set successfully!');
    } catch (error) {
      console.error(error);
      alert('Could not find address. Using default location.');
      setUserLocation(DEFAULT_CLIENT_LOCATION);
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateQuantity = (itemId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      const newQuantity = item.quantity + delta;
      if (newQuantity <= 0) {
        return prev.filter(i => i.id !== itemId);
      }
      return prev.map(i =>
        i.id === itemId ? { ...i, quantity: newQuantity } : i
      );
    });
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    if (!userLocation) {
      alert('Please set your delivery address first!');
      return;
    }

    try {
      // Create order with proper structure that AdminDashboard expects
      const order = orderService.createOrder({
        items: cart,
        restaurant: selectedRestaurant || RESTAURANTS[0],
        deliveryAddress: userLocation,
        totalPrice: getTotalPrice(),
        customerName: 'Customer',
        phone: '+91-XXXXX-XXXXX',
        // Add name field for AdminDashboard compatibility
        name: userLocation.name || userLocation.formatted || 'Delivery Address'
      });

      console.log('Order created:', order);
      setOrderId(order.id);
      setOrderPlaced(true);
      setCart([]);
      setSelectedRestaurant(null);

      // Reset after 5 seconds
      setTimeout(() => {
        setOrderPlaced(false);
        setOrderId(null);
      }, 5000);
    } catch (error) {
      alert('Failed to place order. Please try again.');
      console.error('Order placement error:', error);
    }
  };

  const filteredRestaurants = RESTAURANTS.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!userLocation) {
      setUserLocation(DEFAULT_CLIENT_LOCATION);
    }
  }, [userLocation, setUserLocation]);

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h2>
          <p className="text-gray-600 mb-4">Your order has been received and will be processed shortly.</p>
          <p className="text-sm text-gray-500 mb-6">Order ID: {orderId}</p>
          <button
            onClick={() => {
              setOrderPlaced(false);
              setOrderId(null);
            }}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    );
  }

  if (selectedRestaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-md sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => setSelectedRestaurant(null)}
              className="flex items-center text-gray-700 hover:text-red-500"
            >
              <ArrowLeft size={24} className="mr-2" />
              Back
            </button>
            <h2 className="text-xl font-bold text-gray-800">{selectedRestaurant.name}</h2>
            <div className="w-24"></div>
          </div>
        </div>

        {/* Restaurant Info */}
        <div className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                <Star size={20} className="text-yellow-400 fill-yellow-400 mr-1" />
                <span className="font-semibold">{selectedRestaurant.rating}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock size={18} className="mr-1" />
                <span>{selectedRestaurant.deliveryTime}</span>
              </div>
              <span className="text-gray-500">{selectedRestaurant.cuisine}</span>
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {selectedRestaurant.items.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-48 object-cover bg-gray-200"
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Food+Item';
                    e.target.onerror = null; // Prevent infinite loop
                  }}
                />
                <div className="p-4">
                  <h3 className="font-bold text-lg text-gray-800 mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-800">₹{item.price}</span>
                    <button
                      onClick={() => addToCart(item)}
                      className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center transition"
                    >
                      <Plus size={18} className="mr-1" />
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cart Summary (Fixed Bottom) */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-2xl z-20">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{cart.length} items</p>
                  <p className="text-2xl font-bold text-red-500">₹{getTotalPrice()}</p>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-lg transition"
                >
                  Place Order
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-500 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Zomato</h1>
            <button
              onClick={onBack}
              className="bg-white text-red-500 hover:bg-gray-100 px-6 py-2 rounded-lg font-semibold transition shadow-md"
            >
              Admin Dashboard
            </button>
          </div>

          {/* Address Input */}
          <div className="flex items-center space-x-2">
            <MapPin size={20} />
            <input
              type="text"
              placeholder="Enter delivery address (e.g., Koramangala, Bangalore)"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              className="flex-1 px-4 py-2 rounded-lg text-gray-800"
              onKeyPress={(e) => e.key === 'Enter' && handleAddressSubmit()}
            />
            <button
              onClick={handleAddressSubmit}
              className="bg-white text-red-500 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition"
            >
              Set
            </button>
          </div>
          {userLocation && (
            <p className="text-sm mt-2 text-red-100">
              Delivering to: {userLocation.formatted || userLocation.name}
            </p>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search for restaurants, cuisines, or dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </div>

      {/* Restaurants Grid */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Restaurants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map(restaurant => (
            <div
              key={restaurant.id}
              onClick={() => setSelectedRestaurant(restaurant)}
              className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition transform hover:scale-105"
            >
              <img
                src={restaurant.image}
                alt={restaurant.name}
                className="w-full h-48 object-cover bg-gray-200"
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Restaurant';
                  e.target.onerror = null; // Prevent infinite loop
                }}
              />
              <div className="p-4">
                <h3 className="font-bold text-xl text-gray-800 mb-2">{restaurant.name}</h3>
                <p className="text-gray-600 text-sm mb-3">{restaurant.cuisine}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <Star size={18} className="text-yellow-400 fill-yellow-400 mr-1" />
                      <span className="font-semibold">{restaurant.rating}</span>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <Clock size={16} className="mr-1" />
                      <span>{restaurant.deliveryTime}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Icon (Floating) */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 right-6 bg-red-500 text-white rounded-full p-4 shadow-2xl cursor-pointer hover:bg-red-600 transition z-20">
          <div className="relative">
            <ShoppingCart size={28} />
            <span className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
        </div>
      )}

      {/* Cart Sidebar */}
      {cart.length > 0 && (
        <div className="fixed right-0 top-0 bottom-0 w-96 bg-white shadow-2xl z-30 transform transition-transform">
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Your Cart</h2>
              <button
                onClick={() => setCart([])}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-red-500 font-bold">₹{item.price}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="font-semibold w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="bg-gray-200 hover:bg-gray-300 rounded-full p-1"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xl font-bold text-gray-800">Total:</span>
                <span className="text-2xl font-bold text-red-500">₹{getTotalPrice()}</span>
              </div>
              <button
                onClick={handlePlaceOrder}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientOrdering;

