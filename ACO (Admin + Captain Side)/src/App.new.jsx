import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PackageCheck, XCircle, ListPlus, Loader2 } from 'lucide-react';

// Import Components
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import ClientOrdering from './components/ClientOrdering/ClientOrdering';

// Import Constants
import { API_KEY, WAREHOUSE_LOCATION, INITIAL_AGENTS } from './constants/config';

// Import Services
import { orderService } from './services/orderService';

// Import RouteOptimizer and DeliveryAgentApp from original file (will be extracted later)
// For now, we'll keep them inline or import from a shared location

const App = () => {
  const [view, setView] = useState('client'); // 'client', 'dashboard', 'optimizer', or 'agent'
  const [orderBatch, setOrderBatch] = useState([]);
  const [agentRoutes, setAgentRoutes] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bulkAddressInput, setBulkAddressInput] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodingStatus, setGeocodingStatus] = useState("");
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [currentAgentId, setCurrentAgentId] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  const geocoderRef = useRef(null);
  const [googleReady, setGoogleReady] = useState(false);

  // Geocoding helper function
  const geocodeAddress = useCallback((address) => {
    return new Promise((resolve, reject) => {
      if (!geocoderRef.current) {
        if (window.google && window.google.maps) {
          geocoderRef.current = new window.google.maps.Geocoder();
        } else {
          return reject(new Error("Geocoder not initialized."));
        }
      }
      geocoderRef.current.geocode({ address: address }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          const lat = results[0].geometry.location.lat();
          const lng = results[0].geometry.location.lng();
          const name = results[0].formatted_address.split(',')[0];
          resolve({ lat, lng, name, formatted: results[0].formatted_address });
        } else {
          reject(new Error(`Geocode failed for "${address}": ${status}`));
        }
      });
    });
  }, []);

  // Load Google Maps script
  useEffect(() => {
    const initGoogle = () => {
      if (window.google && window.google.maps) {
        geocoderRef.current = new window.google.maps.Geocoder();
        setGoogleReady(true);
      }
    };

    window.initGoogleDashboard = initGoogle;

    if (window.google && window.google.maps) {
      initGoogle();
    } else {
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
      if (!existingScript) {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,routes&callback=initGoogleDashboard`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      } else if (!googleReady) {
        const checkGoogle = setInterval(() => {
          if (window.google && window.google.maps) {
            initGoogle();
            clearInterval(checkGoogle);
          }
        }, 100);
      }
    }

    return () => {
      if (window.initGoogleDashboard) delete window.initGoogleDashboard;
    };
  }, [googleReady]);

  // Handle view switching
  const handleViewChange = (newView) => {
    setView(newView);
  };

  // Handle optimize batch
  const handleOptimizeBatch = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;

    setOrderBatch([WAREHOUSE_LOCATION, ...agent.batch]);
    setCurrentAgentId(agentId);
    setAgents(prev => prev.map(a =>
      a.id === agentId ? { ...a, status: 'routing', batch: [] } : a
    ));
    setView('optimizer');
  };

  // Handle back to dashboard
  const handleBackToDashboard = (didDispatch, optimizedRoute = null) => {
    if (currentAgentId) {
      if (didDispatch && optimizedRoute && optimizedRoute.route && optimizedRoute.locations) {
        const orderedLocations = optimizedRoute.route.map(idx => optimizedRoute.locations[idx]).filter(Boolean);
        setAgentRoutes(prev => ({
          ...prev,
          [currentAgentId]: {
            route: optimizedRoute.route,
            locations: orderedLocations,
            length: optimizedRoute.length
          }
        }));
      }
      setAgents(prev => prev.map(a =>
        a.id === currentAgentId
          ? { ...a, status: didDispatch ? 'delivering' : 'idle', batch: [] }
          : a
      ));
    }
    setOrderBatch([]);
    setCurrentAgentId(null);
    setView('dashboard');
  };

  // Handle track route
  const handleTrackRoute = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    const route = agentRoutes[agentId];
    if (!agent || !route) {
      alert("No route found for this agent. Please dispatch a route first.");
      return;
    }
    setCurrentAgentId(agentId);
    setView('agent');
  };

  // Bulk add handler
  const handleBulkAdd = async (warehouseAddress) => {
    if (isGeocoding) return;
    const addresses = bulkAddressInput.split('\n').map(addr => addr.trim()).filter(addr => addr.length > 0);
    if (addresses.length === 0) {
      alert("Please paste a list of addresses, one per line.");
      return;
    }

    setIsGeocoding(true);
    const newCities = [];
    let warehouseLocation;

    try {
      setGeocodingStatus("Finding Warehouse...");
      const whAddress = warehouseAddress.trim() || addresses[0] || WAREHOUSE_LOCATION.name;
      warehouseLocation = await geocodeAddress(whAddress);
      newCities.push({ ...warehouseLocation, name: "Warehouse" });
    } catch (error) {
      console.warn(error);
      setIsGeocoding(false);
      setGeocodingStatus("Error: Could not find warehouse address.");
      return;
    }

    const stops = warehouseAddress ? addresses : addresses.slice(1);
    for (let i = 0; i < stops.length; i++) {
      setGeocodingStatus(`Finding ${i + 1}/${stops.length}: ${stops[i]}...`);
      try {
        const location = await geocodeAddress(stops[i]);
        if (location) {
          newCities.push({ ...location, name: location.name || `Stop ${i + 1}` });
        }
      } catch (error) {
        console.warn(error);
      }
    }

    setIsGeocoding(false);
    setGeocodingStatus("");
    setBulkAddressInput("");
    setIsModalOpen(false);

    const targetAgent = agents.find(a => a.status === 'idle');
    if (targetAgent) {
      setAgents(prev => prev.map(a =>
        a.id === targetAgent.id ? { ...a, status: 'routing', batch: [] } : a
      ));
      setCurrentAgentId(targetAgent.id);
      setOrderBatch(newCities);
      setView('optimizer');
    } else {
      alert("All agents are currently busy.");
    }
  };

  // Render based on view
  if (view === 'client') {
    return (
      <ClientOrdering
        onBack={() => setView('dashboard')}
        userLocation={userLocation}
        setUserLocation={setUserLocation}
      />
    );
  }

  return (
    <div id="app-wrapper" className="w-full min-h-screen bg-gray-900 bg-gradient-to-b from-gray-900 to-black text-gray-200">
      <style jsx="true">{`
                .header-zomato { background-color: #EE4266; }
                .text-zomato { color: #EE4266; }
                #map-optimizer { 
                    flex: 1;
                    min-height: 400px;
                    width: 100%;
                    border-radius: 0.75rem;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
                    position: relative; 
                    z-index: 1;
                    background-color: #242f3e;
                }
                .location-input-container {
                    z-index: 10;
                    width: 100%; 
                    max-width: 450px;
                    margin-bottom: 1.5rem; 
                    margin-left: auto;
                    margin-right: auto;
                }
                .location-input-container input {
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
                    background-color: #38414e;
                    color: #e2e8f0;
                    border-color: #4a5568;
                }
                .location-input-container input::placeholder { color: #a0aec0; }
                .pac-container {
                    z-index: 9999 !important;
                    background-color: #2d3748;
                    border-color: #4a5568;
                }
                .pac-item { color: #e2e8f0; }
                .pac-item-query { color: #e2e8f0; }
                .pac-item:hover { background-color: #4a5568; }
                .pac-item-selected { background-color: #63b3ed; }
                .pac-icon { filter: invert(1); }
                .debug-data { font-size: 0.9rem; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #2d3748; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #EE4266; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e51d36; }
                html, body, #root {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                }
                #app-wrapper {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                .main-content {
                    flex: 1;
                    overflow: auto;
                }
            `}</style>

      <header className="p-5 sm:p-6 header-zomato text-white flex items-center justify-between shadow-lg z-20">
        <div className="flex items-center space-x-4">
          <PackageCheck size={40} className="hidden sm:block" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ACO Logistics Platform</h1>
            <p className="text-sm font-light opacity-90">
              {view === 'dashboard' ? 'Admin Dashboard' : view === 'optimizer' ? 'Route Optimization' : 'Delivery Agent View'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setView('client')}
          className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition"
        >
          Client View
        </button>
      </header>

      <main className="main-content custom-scrollbar">
        {view === 'dashboard' ? (
          <AdminDashboard
            agents={agents}
            setAgents={setAgents}
            onOptimizeBatch={handleOptimizeBatch}
            onOpenBulkAdd={() => setIsModalOpen(true)}
            onTrackRoute={handleTrackRoute}
          />
        ) : view === 'optimizer' ? (
          <div className="p-4 text-white">
            <p>Route Optimizer - To be imported from original file</p>
            <button onClick={() => handleBackToDashboard(false)} className="mt-4 bg-gray-600 px-4 py-2 rounded">
              Go Back
            </button>
          </div>
        ) : (
          <div className="p-4 text-white">
            <p>Delivery Agent App - To be imported from original file</p>
            <button onClick={() => setView('dashboard')} className="mt-4 bg-gray-600 px-4 py-2 rounded">
              Go Back
            </button>
          </div>
        )}
      </main>

      {/* Bulk Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-800 p-6 rounded-2xl shadow-2xl w-full max-w-lg border border-purple-800">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-purple-400">Add Multiple Stops</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>
            <p className="text-gray-400 mb-4 text-sm">
              Paste your list of delivery addresses below, one per line.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Warehouse Address</label>
              <input
                id="warehouse-input"
                type="text"
                placeholder="e.g., Koramangala, Bangalore"
                className="w-full p-3 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-pink-500"
                disabled={isGeocoding}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Delivery Stops (One per line)</label>
              <textarea
                value={bulkAddressInput}
                onChange={(e) => setBulkAddressInput(e.target.value)}
                placeholder="Indiranagar, Bangalore&#10;Whitefield, Bangalore"
                rows="8"
                className="w-full p-3 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-purple-500 custom-scrollbar"
                disabled={isGeocoding}
              />
            </div>
            <div className="mt-4 flex flex-col sm:flex-row-reverse sm:items-center">
              <button
                onClick={() => handleBulkAdd(document.getElementById('warehouse-input').value)}
                disabled={isGeocoding || bulkAddressInput.trim() === ""}
                className="w-full sm:w-auto flex items-center justify-center bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:bg-gray-600"
              >
                {isGeocoding ? (
                  <Loader2 size={20} className="mr-2 animate-spin" />
                ) : (
                  <ListPlus size={20} className="mr-2" />
                )}
                {isGeocoding ? 'Adding...' : `Add ${bulkAddressInput.split('\n').filter(Boolean).length} Stops`}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isGeocoding}
                className="w-full sm:w-auto mt-2 sm:mt-0 sm:mr-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition"
              >
                Cancel
              </button>
              {isGeocoding && (
                <span className="text-sm text-yellow-500 mt-2 sm:mt-0 sm:mr-auto animate-pulse">
                  {geocodingStatus}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

