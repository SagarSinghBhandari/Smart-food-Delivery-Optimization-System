// Google Maps API Key
export const API_KEY = "AIzaSyB4PH9dWNZIjDphW7q7g2LRvzr4wFzoE0A";

// Google Map Dark Theme Style
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#17263c" }],
  },
];

// ACO Algorithm Initial Parameters
export const initialParams = {
  numAnts: 25,
  alpha: 1.0, // Pheromone Influence
  beta: 2.0,  // Distance/Visibility Influence
  evaporationRate: 0.3, // Rho (ρ)
  pheromoneDeposit: 100, // Q
  initialPheromone: 1,
  maxIterations: 100,
};

// Warehouse Location
export const WAREHOUSE_LOCATION = {
  name: "Warehouse (Koramangala)",
  lat: 12.935192,
  lng: 77.624481,
  id: "WH-001"
};

// Fake Addresses for Testing
export const FAKE_ADDRESSES = [
  { name: "Koramangala, Bangalore", lat: 12.935192, lng: 77.624481 },
  { name: "Indiranagar, Bangalore", lat: 12.9784, lng: 77.6408 },
  { name: "Whitefield, Bangalore", lat: 12.9698, lng: 77.7499 },
  { name: "Jayanagar, Bangalore", lat: 12.9253, lng: 77.5826 },
  { name: "MG Road, Bangalore", lat: 12.9745, lng: 77.6072 },
  { name: "HSR Layout, Bangalore", lat: 12.9121, lng: 77.6446 },
  { name: "Electronic City, Bangalore", lat: 12.8452, lng: 77.6602 }
];

// Initial Agents
export const INITIAL_AGENTS = [
  { id: 'a1', name: 'Rohan', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] },
  { id: 'a2', name: 'Priya', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] },
  { id: 'a3', name: 'Amit', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] },
  { id: 'a4', name: 'Sunita', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] },
  { id: 'a5', name: 'Vikram', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] }
];

