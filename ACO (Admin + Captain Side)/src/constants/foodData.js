export const RESTAURANTS = [
  {
    id: 'r1',
    name: 'Biryani House',
    cuisine: 'North Indian, Biryani',
    rating: 4.5,
    deliveryTime: '30-40 min',
    image: 'https://images.unsplash.com/photo-1716550781939-beb7d7247aae?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnJpeWFuaXxlbnwwfHwwfHx8MA%3D%3D',
    items: [
      { id: 'i1', name: 'Chicken Biryani', price: 250, image: 'https://images.unsplash.com/photo-1716550781939-beb7d7247aae?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnJpeWFuaXxlbnwwfHwwfHx8MA%3D%3D', description: 'Fragrant basmati rice with tender chicken pieces' },
      { id: 'i2', name: 'Mutton Biryani', price: 350, image: 'https://images.unsplash.com/photo-1716550781939-beb7d7247aae?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnJpeWFuaXxlbnwwfHwwfHx8MA%3D%3D', description: 'Rich mutton biryani with aromatic spices' },
      { id: 'i3', name: 'Veg Biryani', price: 180, image: 'https://images.unsplash.com/photo-1716550781939-beb7d7247aae?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnJpeWFuaXxlbnwwfHwwfHx8MA%3D%3D', description: 'Delicious vegetable biryani' },
      { id: 'i4', name: 'Chicken Kebab', price: 200, image: 'https://images.unsplash.com/photo-1716550781939-beb7d7247aae?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8YnJpeWFuaXxlbnwwfHwwfHx8MA%3D%3D', description: 'Tender grilled chicken kebabs' }
    ]
  },
  {
    id: 'r2',
    name: 'Pizza Corner',
    cuisine: 'Italian, Pizza',
    rating: 4.3,
    deliveryTime: '25-35 min',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
    items: [
      { id: 'i5', name: 'Margherita Pizza', price: 299, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200', description: 'Classic cheese and tomato pizza' },
      { id: 'i6', name: 'Pepperoni Pizza', price: 399, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200', description: 'Spicy pepperoni with mozzarella' },
      { id: 'i7', name: 'Veg Supreme Pizza', price: 349, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200', description: 'Loaded with vegetables' },
      { id: 'i8', name: 'Chicken BBQ Pizza', price: 449, image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200', description: 'BBQ chicken with onions' }
    ]
  },
  {
    id: 'r3',
    name: 'Burger King',
    cuisine: 'American, Fast Food',
    rating: 4.2,
    deliveryTime: '20-30 min',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    items: [
      { id: 'i9', name: 'Classic Burger', price: 149, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200', description: 'Juicy beef patty with fresh veggies' },
      { id: 'i10', name: 'Chicken Burger', price: 179, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200', description: 'Crispy chicken burger' },
      { id: 'i11', name: 'Veg Burger', price: 129, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200', description: 'Delicious veggie patty' },
      { id: 'i12', name: 'French Fries', price: 99, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=200', description: 'Crispy golden fries' }
    ]
  },
  {
    id: 'r4',
    name: 'Sushi Express',
    cuisine: 'Japanese, Sushi',
    rating: 4.7,
    deliveryTime: '35-45 min',
    image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=400',
    items: [
      { id: 'i13', name: 'Salmon Sushi Roll', price: 450, image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200', description: 'Fresh salmon with rice' },
      { id: 'i14', name: 'Tuna Sashimi', price: 550, image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200', description: 'Premium tuna slices' },
      { id: 'i15', name: 'California Roll', price: 350, image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200', description: 'Crab and avocado roll' },
      { id: 'i16', name: 'Miso Soup', price: 150, image: 'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=200', description: 'Traditional Japanese soup' }
    ]
  },
  {
    id: 'r5',
    name: 'Dosa Plaza',
    cuisine: 'South Indian',
    rating: 4.4,
    deliveryTime: '25-35 min',
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400',
    items: [
      { id: 'i17', name: 'Masala Dosa', price: 120, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200', description: 'Crispy dosa with potato filling' },
      { id: 'i18', name: 'Rava Dosa', price: 110, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200', description: 'Crispy semolina dosa' },
      { id: 'i19', name: 'Idli Sambar', price: 80, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200', description: 'Soft idlis with sambar' },
      { id: 'i20', name: 'Vada', price: 60, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=200', description: 'Crispy lentil fritters' }
    ]
  },
  {
    id: 'r6',
    name: 'Chinese Wok',
    cuisine: 'Chinese, Asian',
    rating: 4.1,
    deliveryTime: '30-40 min',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
    items: [
      { id: 'i21', name: 'Chicken Fried Rice', price: 220, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200', description: 'Wok-tossed rice with chicken' },
      { id: 'i22', name: 'Veg Noodles', price: 180, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200', description: 'Stir-fried vegetable noodles' },
      { id: 'i23', name: 'Chicken Manchurian', price: 250, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200', description: 'Spicy chicken in tangy sauce' },
      { id: 'i24', name: 'Spring Rolls', price: 150, image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200', description: 'Crispy vegetable spring rolls' }
    ]
  }
];

