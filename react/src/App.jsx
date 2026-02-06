import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Import Lucide React Icons ---
import { 
    Map, 
    MapPin, 
    Warehouse, 
    Truck, 
    UserCircle, 
    Coffee,
    ArrowRight,
    Check,
    X,
    Package,
    Home,
    KeyRound,
    Loader2,
    CheckCircle2, // <-- ADDED MISSING ICON
    Navigation, // <-- NEW ICON
    ListOrdered // <-- NEW ICON
} from 'lucide-react';


// !!! IMPORTANT: Replace YOUR_API_KEY with your actual Google Maps API Key !!!
const API_KEY = "AIzaSyB4PH9dWNZIjDphW7q7g2LRvzr4wFzoE0A"; 

// --- Google Map Dark Theme Style ---
const DARK_MAP_STYLE = [
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
    // --- FIX: Added missing transit features ---
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    // --- FIX: Added missing water features ---
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
];

// --- DUMMY DATA FOR AGENT ---
const AGENT_START_LOCATION = { lat: 12.9279, lng: 77.6271 }; // Agent's "current" location (e.g., BTM Layout)
const CORRECT_OTP = "1357";

// --- NEW: Dummy route with multiple stops ---
const DUMMY_ROUTE_STOPS = [
    { type: 'pickup', name: "Truffles - Koramangala", address: "St. Marks Road, Bangalore", items: "1x Truffle Signature Burger", lat: 12.935192, lng: 77.624481 },
    { type: 'delivery', name: "Priya's Home", address: "Indiranagar, Bangalore", items: "1x Truffle Signature Burger", lat: 12.9784, lng: 77.6408 },
    { type: 'warehouse', name: "Return to Hub", address: "BTM Layout, Bangalore", items: "End Shift", lat: 12.9279, lng: 77.6271 }
];


// --- MAIN AGENT APP COMPONENT ---
const App = () => {
    // 'ASSIGNED', 'ON_ROUTE', 'AT_STOP', 'COMPLETED_ROUTE'
    const [appState, setAppState] = useState('ASSIGNED');
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [agentLocation, setAgentLocation] = useState(AGENT_START_LOCATION);
    const [routeStops] = useState(DUMMY_ROUTE_STOPS); // This would come from props in a real app
    
    const [otpInput, setOtpInput] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [statusText, setStatusText] = useState("Initializing...");
    const [currentLegDetails, setCurrentLegDetails] = useState(null); 

    // Refs for Google Maps objects
    const mapRef = useRef(null);
    const directionsServiceRef = useRef(null);
    const directionsRendererRef = useRef(null); // --- NEW: Only one renderer needed
    const agentMarkerRef = useRef(null);
    const initMapCallbackRef = useRef(null);
    
    // --- Helper function to get current stop ---
    const getCurrentStop = () => {
        return routeStops[currentStopIndex];
    };

    // --- Map Drawing Functions ---

    const drawRoute = useCallback((origin, destination, routeColor) => {
        if (!window.google || !directionsServiceRef.current) return;
        
        directionsRendererRef.current.setOptions({
             polylineOptions: {
                strokeColor: routeColor,
                strokeWeight: 6,
                strokeOpacity: 0.8,
                zIndex: 5
            }
        });
        
        directionsServiceRef.current.route({
            origin: origin,
            destination: destination,
            travelMode: window.google.maps.TravelMode.DRIVING,
        }, (response, status) => {
            if (status === "OK") {
                directionsRendererRef.current.setDirections(response);
                if (response.routes[0] && response.routes[0].legs[0]) {
                    setCurrentLegDetails(response.routes[0].legs[0]);
                }
            } else {
                console.error("Directions request failed due to " + status);
            }
        });
    }, []);

    const updateAgentMarker = useCallback((position) => {
        if (!mapRef.current || !window.google) return;
        
        if (!agentMarkerRef.current) {
            // Create the agent marker if it doesn't exist
            agentMarkerRef.current = new window.google.maps.Marker({
                map: mapRef.current,
                icon: {
                    path: 'M-1.54,2.16l-3.46-3.46c-0.2-0.2-0.2-0.51,0-0.71l3.46-3.46c0.39-0.39,1.02-0.39,1.41,0l3.46,3.46 c0.2,0.2,0.2,0.51,0,0.71l-3.46,3.46C0.48,2.55-0.15,2.55-0.54,2.16z', // Simple diamond shape
                    fillColor: '#FFFFFF',
                    fillOpacity: 1,
                    strokeColor: '#000000',
                    strokeWeight: 1,
                    scale: 2.5,
                },
                zIndex: 100
            });
        }
        agentMarkerRef.current.setPosition(position);
        mapRef.current.panTo(position);

    }, []);

    // --- State-based Map Logic ---
    useEffect(() => {
        if (!mapRef.current || !window.google) return; // Map not ready

        // Clear previous route
        directionsRendererRef.current.setDirections({ routes: [] });
        setCurrentLegDetails(null);
        
        const stop = routeStops[currentStopIndex];
        
        if (appState === 'ASSIGNED') {
            updateAgentMarker(agentLocation);
            mapRef.current.setZoom(15);
        } else if (appState === 'ON_ROUTE') {
            const origin = agentLocation;
            const destination = { lat: stop.lat, lng: stop.lng };
            const color = stop.type === 'pickup' ? '#22D3EE' : '#EE4266'; // Cyan for pickup, Pink for delivery
            drawRoute(origin, destination, color);
            updateAgentMarker(origin);
        } else if (appState === 'AT_STOP') {
            const stopLocation = { lat: stop.lat, lng: stop.lng };
            // --- FIX: Add condition to prevent loop ---
            if (agentLocation.lat !== stopLocation.lat || agentLocation.lng !== stopLocation.lng) {
                setAgentLocation(stopLocation); // "Teleport" agent to stop on arrival
            }
            // --- END FIX ---
            updateAgentMarker(stopLocation);
            mapRef.current.setZoom(16);
            mapRef.current.panTo(stopLocation);
        } else if (appState === 'COMPLETED_ROUTE') {
            const lastStopLocation = { lat: stop.lat, lng: stop.lng };
            updateAgentMarker(lastStopLocation);
            mapRef.current.setZoom(16);
            mapRef.current.panTo(lastStopLocation);
        }

    }, [appState, currentStopIndex, routeStops, drawRoute, updateAgentMarker, agentLocation]);

    // --- Map Initialization ---
    const initMap = useCallback(() => {
        console.log("initMap callback triggered for Agent.");
        if (!window.google || !window.google.maps) return;
        
        const mapDiv = document.getElementById('map');
        if (!mapDiv || mapRef.current) return;

        try {
            const map = new window.google.maps.Map(mapDiv, {
                center: AGENT_START_LOCATION,
                zoom: 15,
                disableDefaultUI: true,
                zoomControl: true,
                styles: DARK_MAP_STYLE,
            });
            mapRef.current = map;
            
            directionsServiceRef.current = new window.google.maps.DirectionsService();
            
            // --- NEW: Single Renderer ---
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
            });
            
            // Set initial agent marker
            updateAgentMarker(AGENT_START_LOCATION);
            
            setStatusText("New Task Assigned");

        } catch (error) {
            console.error("Error during Agent Map initialization:", error);
            setStatusText("Error initializing map.");
        }
    }, [updateAgentMarker]); 

    // Store the initMap callback in a ref
    useEffect(() => {
        initMapCallbackRef.current = initMap;
    });

    // This useEffect is solely for initiating the script loading process
    useEffect(() => {
        window.initGoogleMapsAgent = () => {
            if (initMapCallbackRef.current) initMapCallbackRef.current();
        };
        if (window.google && window.google.maps) {
            initMap();
        } else {
            const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
            if (!existingScript) {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,routes&callback=initGoogleMapsAgent`;
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            } else if (existingScript && !mapRef.current) {
                setTimeout(initMap, 500);
            }
        }
        return () => {
            if (window.initGoogleMapsAgent) delete window.initGoogleMapsAgent;
        };
    }, [initMap]);
    
    // --- Event Handlers ---
    
    const handleAccept = () => setAppState('ON_ROUTE');
    
    const handleArrived = () => setAppState('AT_STOP');
    
    const handleConfirmPickup = () => {
        if (otpInput === CORRECT_OTP) {
            setErrorMessage("");
            setOtpInput("");
            // Move to next stop
            if (currentStopIndex + 1 < routeStops.length) {
                setCurrentStopIndex(currentStopIndex + 1);
                setAppState('ON_ROUTE');
            } else {
                setAppState('COMPLETED_ROUTE');
            }
        } else {
            setErrorMessage("Invalid OTP. Please try again.");
        }
    };
    
    const handleConfirmDelivery = () => {
        // Move to next stop
        if (currentStopIndex + 1 < routeStops.length) {
            setCurrentStopIndex(currentStopIndex + 1);
            setAppState('ON_ROUTE');
        } else {
            setAppState('COMPLETED_ROUTE');
        }
    };
    
    const handleGoOnline = () => {
        setAppState('ASSIGNED');
        setCurrentStopIndex(0);
        setAgentLocation(AGENT_START_LOCATION);
        setErrorMessage("");
        setOtpInput("");
    };

    // --- Conditional UI Rendering ---
    
    const renderStopIcon = (stop, index) => {
        let Icon = MapPin;
        let color = "text-gray-500"; // Upcoming
        let isCurrent = (index === currentStopIndex);
        let isCompleted = (index < currentStopIndex);

        if (stop.type === 'pickup') Icon = Warehouse;
        if (stop.type === 'delivery') Icon = Home;
        if (stop.type === 'warehouse') Icon = Truck;

        if (isCurrent) {
            color = stop.type === 'pickup' ? "text-blue-400" : "text-pink-400";
        }
        if (isCompleted) {
            color = "text-green-500";
        }

        return isCompleted 
            ? <CheckCircle2 size={24} className="text-green-500 flex-shrink-0" />
            : <Icon size={24} className={`${color} flex-shrink-0`} />;
    };

    const renderActionCard = () => {
        const stop = getCurrentStop();
        
        // 1. Initial State: Show "Accept"
        if (appState === 'ASSIGNED') {
            return (
                <div className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-2">New Delivery Task!</h2>
                    <p className="text-gray-400 mb-6">{routeStops.length - 1} stops. Total time approx. 15 min.</p>
                    <button 
                        onClick={handleAccept}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95 text-lg flex items-center justify-center">
                        <Check size={24} className="mr-2" />
                        Accept Task
                    </button>
                </div>
            );
        }
        
        // 2. Completed State: Show "Go Online"
        if (appState === 'COMPLETED_ROUTE') {
            return (
                <div className="p-6 text-center">
                    <CheckCircle2 size={60} className="text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Route Complete!</h2>
                    <p className="text-gray-400 mb-6">Great job! You've earned ₹120 for this batch.</p>
                    <button 
                        onClick={handleGoOnline}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95 text-lg flex items-center justify-center">
                        <Coffee size={24} className="mr-2" />
                        Go Online for New Tasks
                    </button>
                </div>
            );
        }

        // 3. Main State: Show stops and actions
        return (
            <div className="p-6">
                {/* --- Current Leg Details --- */}
                {appState === 'ON_ROUTE' && currentLegDetails && (
                    <div className="mb-4 text-center animate-fade-in">
                        <p className="text-lg font-bold text-cyan-300">
                            Next stop in {currentLegDetails.distance.text}
                        </p>
                        <p className="text-sm text-gray-400">
                            (Est. {currentLegDetails.duration.text})
                        </p>
                    </div>
                )}
                
                {/* --- Stop List --- */}
                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2 mb-4">
                    {routeStops.map((stop, index) => {
                        const isCurrent = (index === currentStopIndex);
                        const isCompleted = (index < currentStopIndex);
                        
                        return (
                            <div 
                                key={index}
                                className={`flex items-start space-x-3 p-3 rounded-lg ${isCurrent ? 'bg-gray-700' : 'bg-gray-800 opacity-70'}`}
                            >
                                {renderStopIcon(stop, index)}
                                <div className="flex-1">
                                    <p className={`font-semibold ${isCurrent ? 'text-white' : 'text-gray-400'} ${isCompleted && 'line-through'}`}>
                                        {stop.name}
                                    </p>
                                    <p className={`text-sm ${isCurrent ? 'text-gray-300' : 'text-gray-500'} ${isCompleted && 'line-through'}`}>
                                        {stop.address}
                                    </p>
                                </div>
                                {isCompleted && <Check size={20} className="text-green-500 flex-shrink-0" />}
                            </div>
                        );
                    })}
                </div>

                {/* --- Action Panel --- */}
                {appState === 'ON_ROUTE' && (
                    <button 
                        onClick={handleArrived}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95 text-lg flex items-center justify-center">
                        <ArrowRight size={24} className="mr-2" />
                        I Have Arrived
                    </button>
                )}
                
                {appState === 'AT_STOP' && getCurrentStop().type === 'pickup' && (
                    <div className="animate-fade-in">
                        <label htmlFor="otp" className="text-sm font-medium text-gray-400">Enter Pickup OTP (1357)</label>
                        <input
                            id="otp" type="tel" value={otpInput}
                            onChange={(e) => setOtpInput(e.target.value)}
                            maxLength="4"
                            className="w-full p-4 my-2 bg-gray-900 border-2 border-gray-700 rounded-lg text-white text-2xl tracking-[1em] text-center font-bold focus:border-pink-500 focus:ring-pink-500 focus:outline-none"
                        />
                        {errorMessage && <p className="text-red-500 text-sm mt-2">{errorMessage}</p>}
                        <button 
                            onClick={handleConfirmPickup}
                            className="w-full mt-2 bg-pink-600 hover:bg-pink-700 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95 text-lg flex items-center justify-center">
                            <KeyRound size={24} className="mr-2" />
                            Confirm Pickup
                        </button>
                    </div>
                )}
                
                {appState === 'AT_STOP' && getCurrentStop().type === 'delivery' && (
                    <div className="animate-fade-in">
                        <p className="text-lg text-center font-bold text-white mb-4">Confirm drop-off at {getCurrentStop().name}.</p>
                        <button 
                            onClick={handleConfirmDelivery}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95 text-lg flex items-center justify-center">
                            <Check size={24} className="mr-2" />
                            Mark as Delivered
                        </button>
                    </div>
                )}

                {appState === 'AT_STOP' && getCurrentStop().type === 'warehouse' && (
                    <div className="animate-fade-in">
                        <p className="text-lg text-center font-bold text-white mb-4">You have returned to the hub.</p>
                        <button 
                            onClick={handleConfirmDelivery} // Re-use same logic
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95 text-lg flex items-center justify-center">
                            <Check size={24} className="mr-2" />
                            End Shift
                        </button>
                    </div>
                )}
            </div>
        );
    };


    return (
        <div id="app-wrapper" className="w-full h-screen flex flex-col bg-gray-900 text-gray-200">
            
            <style jsx="true">{`
                /* Global styles for full-screen mobile app */
                html, body, #root {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow: hidden; /* Prevent body scroll */
                }
                #app-wrapper {
                    height: 100vh; /* Full viewport height */
                }
                
                /* Map Styling */
                #map {
                    flex: 1; /* Map takes remaining space */
                    width: 100%;
                    background-color: #242f3e; /* Dark map fallback */
                }

                /* Task Card Styling */
                .task-card {
                    flex-shrink: 0; /* Card doesn't shrink */
                    background-color: #1f2937; /* bg-gray-800 */
                    border-top-left-radius: 1.5rem; /* rounded-t-3xl */
                    border-top-right-radius: 1.5rem;
                    box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.3);
                    z-index: 20;
                    
                    /* --- NEW: Responsive max-height --- */
                    max-height: 70vh; /* Max 70% of viewport */
                    display: flex;
                    flex-direction: column;
                }
                
                .task-card-content {
                    overflow-y: auto;
                }
                
                /* This is for the Google Places Autocomplete dropdown */
                .pac-container {
                    z-index: 9999 !important;
                }
                
                /* Animation for the card appearing */
                @keyframes slide-up {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.5s ease-out forwards;
                }

                /* Custom scrollbar for dark theme */
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: #374151; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #6b7280; border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
            `}</style>
            
            {/* Map Container - fills remaining space */}
            <div id="map" className="flex-1"></div>

            {/* Task Card - fixed at bottom */}
            <div className="task-card animate-slide-up">
                <div className="task-card-content custom-scrollbar">
                    {renderActionCard()}
                </div>
            </div>
            
        </div>
    );
};

export default App;