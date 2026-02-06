import React, { useState, useEffect, useRef, useCallback } from 'react';

// --- Import Lucide React Icons ---
import {
    Map, MapPin, Warehouse, Plus, Trash2, Play, Pause, Calculator,
    Loader2, CheckCircle2, Target, Gauge, FlaskConical, Network,
    PackageCheck, Search, ChevronRight, MapPinned, ListPlus, XCircle,
    ArrowLeft, // Back icon
    ShoppingCart, // Order icon
    ClipboardCheck, // Confirm icon
    Truck, // Dispatch icon
    UserCircle, // Agent icon
    Coffee, // Idle icon
    Navigation, // Navigation icon
    CheckCircle, // Complete icon
    Clock, // Time icon
    Navigation2 // Direction icon
} from 'lucide-react';

// Import Modular Components
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import ClientOrdering from './components/ClientOrdering/ClientOrdering';

// Import Constants
import { API_KEY, WAREHOUSE_LOCATION, DARK_MAP_STYLE, initialParams, FAKE_ADDRESSES } from './constants/config';

// Import Utilities
import { toMinutes, getCost, runAntTour } from './utils/aco';

// Import Services
import { orderService } from './services/orderService';

// ===============================================
// --- 1. ROUTE OPTIMIZER COMPONENT ---
// ===============================================
const RouteOptimizer = ({ initialLocations, onBack }) => {
    const [cities, setCities] = useState([]);
    const [travelTimeMatrix, setTravelTimeMatrix] = useState([]);
    const [bestTour, setBestTour] = useState({ route: [], length: Infinity });
    const [iteration, setIteration] = useState(0);
    const [running, setRunning] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [statusText, setStatusText] = useState("Loading...");
    const [params, setParams] = useState(initialParams);
    const [finalRoute, setFinalRoute] = useState(null);

    // State to control button disabled status
    const [controlDisabled, setControlDisabled] = useState({
        start: true,
        stop: false,
    });

    // Refs for external objects
    const mapRef = useRef(null);
    const directionsServiceRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const geocoderRef = useRef(null);
    const markersRef = useRef([]);
    const pheromonesRef = useRef([]);
    const simulationIntervalRef = useRef(null);
    const antPolylinesRef = useRef([]);
    const initMapCallbackRef = useRef(null);
    const addressInputRef = useRef(null); // Ref for search bar
    const autocompleteRef = useRef(null); // Ref for autocomplete instance

    // --- FUNCTION DEFINITIONS (REORDERED) ---

    // Geocoding (needed for bulk add)
    const geocodeAddress = useCallback((address) => {
        return new Promise((resolve, reject) => {
            if (!geocoderRef.current) {
                return reject(new Error("Geocoder not initialized."));
            }
            geocoderRef.current.geocode({ address: address }, (results, status) => {
                if (status === "OK" && results && results[0]) {
                    const lat = results[0].geometry.location.lat();
                    const lng = results[0].geometry.location.lng();
                    const name = results[0].formatted_address.split(',')[0];
                    resolve({ lat, lng, name });
                } else {
                    reject(new Error(`Geocode failed for "${address}": ${status}`));
                }
            });
        });
    }, []);

    // Route Drawing
    const updateDirectionsRoute = useCallback((route) => {
        if (!window.google || !directionsServiceRef.current || !directionsRendererRef.current || route.length < 2) return;
        const waypoints = route.slice(1).map(index => ({ location: cities[index], stopover: true }));
        directionsServiceRef.current.route({
            origin: cities[route[0]],
            destination: cities[route[0]],
            waypoints: waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
            optimizeWaypoints: false,
        }, (response, status) => {
            if (status === "OK") directionsRendererRef.current.setDirections(response);
            else console.error("Directions request failed due to " + status);
        });
    }, [cities]);

    // Simulation Controls
    const stopSimulation = useCallback((forceFinish = false) => {
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        setRunning(false);
        const isFinished = forceFinish || iteration >= params.maxIterations;
        setStatusText(isFinished ? "Optimization Complete" : "Paused");
        setControlDisabled({ start: !isFinished, stop: true });
        antPolylinesRef.current.forEach(poly => poly.setMap(null));
        antPolylinesRef.current = [];

        if (isFinished) {
            setBestTour(currentBestTour => {
                if (currentBestTour.route.length > 0) {
                    updateDirectionsRoute(currentBestTour.route);
                    setFinalRoute(currentBestTour);
                }
                return currentBestTour;
            });
        }
    }, [iteration, params.maxIterations, updateDirectionsRoute]);

    const drawAntRoutes = useCallback((antTours) => {
        if (!mapRef.current || !window.google) return;
        antPolylinesRef.current.forEach(poly => poly.setMap(null));
        antPolylinesRef.current = [];
        for (const tour of antTours) {
            if (tour.tour.length !== cities.length) continue;
            const path = tour.tour.map(index => cities[index]);
            path.push(cities[tour.tour[0]]);
            const polyline = new window.google.maps.Polyline({
                path: path, map: mapRef.current, strokeColor: '#A16EE3',
                strokeOpacity: 0.15, strokeWeight: 2, zIndex: 1
            });
            antPolylinesRef.current.push(polyline);
        }
    }, [cities]);

    const updatePheromones = useCallback((currentTTM) => {
        const currentPheromones = pheromonesRef.current;
        const N = cities.length;
        const antTours = [];
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (i !== j) currentPheromones[i][j] *= (1 - params.evaporationRate);
            }
        }
        for (let k = 0; k < params.numAnts; k++) {
            const antTour = runAntTour(0, cities, currentTTM, currentPheromones, params);
            antTours.push(antTour);
            if (antTour.tourLength !== Infinity && antTour.tour.length === N) {
                const pheromoneAmount = params.pheromoneDeposit / antTour.tourLength;
                for (let r = 0; r < antTour.tour.length; r++) {
                    const i = antTour.tour[r];
                    const j = antTour.tour[(r + 1) % antTour.tour.length];
                    currentPheromones[i][j] += pheromoneAmount;
                    currentPheromones[j][i] += pheromoneAmount;
                }
                setBestTour(prevBest => (antTour.tourLength < prevBest.length) ? { route: antTour.tour, length: antTour.tourLength } : prevBest);
            }
        }
        pheromonesRef.current = currentPheromones;
        return antTours;
    }, [cities, params]);

    const runIteration = useCallback(() => {
        if (!running || travelTimeMatrix.length === 0) return;
        const antTours = updatePheromones(travelTimeMatrix);
        drawAntRoutes(antTours);
        setIteration(prev => {
            const nextIter = prev + 1;
            if (nextIter >= params.maxIterations) {
                stopSimulation(true);
                return nextIter;
            }
            return nextIter;
        });
    }, [running, travelTimeMatrix, params, updatePheromones, stopSimulation, drawAntRoutes]);

    const startSimulation = () => {
        if (isCalculating || travelTimeMatrix.length === 0) {
            alert("Please wait for TTM calculation.");
            return;
        }
        if (directionsRendererRef.current) directionsRendererRef.current.setDirections({ routes: [] });
        antPolylinesRef.current.forEach(poly => poly.setMap(null));
        antPolylinesRef.current = [];
        setFinalRoute(null);
        setRunning(true);
        setStatusText("Running");
        setControlDisabled({ start: true, stop: false });
    };

    const geocodeAndAddLocation = useCallback((latLng, namePrefix) => {
        if (!geocoderRef.current) {
            console.error("Geocoder not ready.");
            return;
        }
        geocoderRef.current.geocode({ location: latLng }, (results, status) => {
            let name = `${namePrefix} ${cities.length}`;
            if (status === "OK" && results && results[0]) {
                name = results[0].formatted_address.split(',')[0] || name;
            } else if (cities.length === 0) {
                name = "Warehouse";
            }
            setCities(prevCities => [...prevCities, { lat: latLng.lat(), lng: latLng.lng(), name: name }]);
            setStatusText(`Added: ${name}`);
        });
    }, [cities.length]);

    const handleMapClick = useCallback((e) => {
        if (isCalculating || running) {
            alert("Please wait until the current calculation is finished or paused.");
            return;
        }
        console.log("Map clicked, adding location:", e.latLng);
        geocodeAndAddLocation(e.latLng, "Stop");
    }, [isCalculating, running, geocodeAndAddLocation]);

    const initializeACO = useCallback((ttm) => {
        if (cities.length < 2 || ttm.length === 0) return;
        const N = cities.length;
        const initialPheromones = Array(N).fill(0).map(() => Array(N).fill(params.initialPheromone));
        pheromonesRef.current = initialPheromones;
        setBestTour({ route: [], length: Infinity });
        setIteration(0);
        setControlDisabled({ start: false, stop: true });
    }, [cities.length, params]);

    const getTravelTime = useCallback(async (origin, destination) => {
        if (!directionsServiceRef.current || !window.google) {
            console.error("Directions service not ready.");
            return 999999;
        }
        try {
            const response = await directionsServiceRef.current.route({
                origin: origin,
                destination: destination,
                travelMode: window.google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(Date.now()),
                    trafficModel: window.google.maps.TrafficModel.BEST_GUESS
                }
            });
            if (response.status === "OK" && response.routes[0] && response.routes[0].legs[0]) {
                const duration = response.routes[0].legs[0].duration_in_traffic || response.routes[0].legs[0].duration;
                return duration.value;
            } else {
                console.warn(`Directions request failed: ${response.status}`, "for", origin, "to", destination);
            }
        } catch (error) {
            console.error("Directions API Error, returning high cost:", error);
        }
        return 999999;
    }, []);

    const calculateTravelTimeMatrix = useCallback(async () => {
        if (cities.length < 2 || isCalculating) return;

        setIsCalculating(true);
        setStatusText("Calculating TTM... (Making API Calls)");
        setControlDisabled({ start: true, stop: true, calculateTTM: true, addLocation: true });
        setFinalRoute(null);

        const N = cities.length;
        const newMatrix = Array(N).fill(0).map(() => Array(N).fill(0));

        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (i === j) continue;
                const origin = { lat: cities[i].lat, lng: cities[i].lng };
                const destination = { lat: cities[j].lat, lng: cities[j].lng };
                const durationSeconds = await getTravelTime(origin, destination);
                newMatrix[i][j] = toMinutes(durationSeconds);
                setStatusText(`Calculating TTM... (${i * N + j + 1} / ${N * N} routes)`);
            }
        }

        setTravelTimeMatrix(newMatrix);
        setIsCalculating(false);
        setStatusText("TTM Ready. Click Start.");
        setControlDisabled({ start: false, stop: true, calculateTTM: false, addLocation: true }); // Re-enable addLocation

        initializeACO(newMatrix);
    }, [cities, isCalculating, getTravelTime, initializeACO]);

    // --- FIX: Added updateMarkers function definition ---
    const updateMarkers = useCallback(() => {
        if (!mapRef.current || !window.google) return;

        // Clear existing markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        cities.forEach((city, index) => {
            const isWarehouse = index === 0;

            const marker = new window.google.maps.Marker({
                position: city,
                map: mapRef.current,
                label: {
                    text: isWarehouse ? "W" : String(index),
                    color: "white",
                    fontWeight: "bold",
                },
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 12,
                    fillColor: isWarehouse ? '#EC4899' : '#22D3EE', // NEW: Pink for Warehouse, Cyan for stops
                    fillOpacity: 1.0,
                    strokeColor: "#1f2937",
                    strokeWeight: 2,
                },
                title: `<b>${city.name}</b> (${index === 0 ? 'Warehouse' : 'Stop ' + index})`
            });

            markersRef.current.push(marker);
        });
    }, [cities]);
    // --- END FIX ---


    const initMap = useCallback(() => {
        console.log("initMap callback triggered.");
        if (!window.google || !window.google.maps) {
            console.error("Google Maps script loaded but window.google.maps is not available.");
            return;
        }

        const mapDiv = document.getElementById('map-optimizer');
        if (!mapDiv || mapRef.current) return;

        const defaultCenter = { lat: 12.9716, lng: 77.5946 };

        try {
            const map = new window.google.maps.Map(mapDiv, {
                center: defaultCenter,
                zoom: 13,
                mapId: "ACO_ROUTE_MAP",
                disableDefaultUI: true,
                zoomControl: true,
                streetViewControl: false,
                clickableIcons: false,
                styles: DARK_MAP_STYLE,
            });
            mapRef.current = map;
            console.log("Google Map object created.");

            // Add click listener
            map.addListener("click", handleMapClick);

            directionsServiceRef.current = new window.google.maps.DirectionsService();
            geocoderRef.current = new window.google.maps.Geocoder();
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: true,
                polylineOptions: {
                    strokeColor: '#EE4266',
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                    zIndex: 10
                },
            });
            console.log("Google Maps services initialized.");

            // --- NEW: Initialize Autocomplete for THIS view ---
            if (addressInputRef.current && !autocompleteRef.current) {
                autocompleteRef.current = new window.google.maps.places.Autocomplete(
                    addressInputRef.current,
                    { types: ["geocode"] }
                );
                autocompleteRef.current.bindTo("bounds", map);
                autocompleteRef.current.addListener("place_changed", () => {
                    const place = autocompleteRef.current.getPlace();
                    if (place.geometry && place.geometry.location && mapRef.current) {
                        mapRef.current.panTo(place.geometry.location);
                        mapRef.current.setZoom(16);
                    }
                });
                console.log("Google Places Autocomplete initialized for Optimizer.");
            }

            // --- Auto-load cities from props ---
            if (initialLocations && initialLocations.length > 0) {
                setCities(initialLocations);
                setStatusText("Loaded batch. Calculating TTM...");
            } else {
                setStatusText("Map Ready. Click to add stops.");
                setControlDisabled({ start: true, stop: true, calculateTTM: true, addLocation: false });
            }

        } catch (error) {
            console.error("Error during Google Map initialization:", error);
            setStatusText("Error initializing map.");
        }
    }, [initialLocations, handleMapClick]); // Dependency

    const addLocationFromCenter = () => {
        if (!mapRef.current || isCalculating || running || !geocoderRef.current) {
            alert("Map or Routing Services not fully initialized.");
            return;
        }
        const center = mapRef.current.getCenter();
        if (!center) return;
        geocodeAndAddLocation(center, "Stop");
    };

    // --- END FUNCTION DEFINITIONS ---

    // Auto-calculate TTM when cities are loaded from props
    useEffect(() => {
        if (cities.length > 0 && !isCalculating && travelTimeMatrix.length === 0) {
            calculateTravelTimeMatrix();
        }
    }, [cities, isCalculating, travelTimeMatrix, calculateTravelTimeMatrix]);

    // Store the initMap callback in a ref
    useEffect(() => {
        initMapCallbackRef.current = initMap;
    });

    // This useEffect is solely for initiating the script loading process
    useEffect(() => {
        window.initGoogleMapsOptimizer = () => {
            if (initMapCallbackRef.current) initMapCallbackRef.current();
        };
        if (window.google && window.google.maps) {
            console.log("Google Maps script already loaded.");
            initMap();
        } else {
            const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
            if (!existingScript) {
                console.log("Attempting to load Google Maps script...");
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,routes&callback=initGoogleMapsOptimizer`;
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);
            } else if (existingScript && !mapRef.current) {
                setTimeout(initMap, 500);
            }
        }
        return () => {
            if (window.initGoogleMapsOptimizer) delete window.initGoogleMapsOptimizer;
        };
    }, [initMap]);

    // Update Markers
    useEffect(() => {
        if (mapRef.current && cities.length > 0) {
            updateMarkers();
        }
    }, [cities, updateMarkers]);

    // Effect to manage the simulation loop
    useEffect(() => {
        let intervalId;
        if (running && travelTimeMatrix.length > 0) {
            intervalId = setInterval(runIteration, 100);
            simulationIntervalRef.current = intervalId;
        }
        return () => clearInterval(intervalId);
    }, [running, travelTimeMatrix, runIteration]);

    const handleParamChange = (paramName, value) => {
        setParams(prev => ({
            ...prev,
            [paramName]: parseFloat(value)
        }));
    };

    const StatusIcon = () => {
        if (running) return <Loader2 className="inline-block w-5 h-5 text-purple-400 animate-spin" />;
        if (isCalculating) return <Loader2 className="inline-block w-5 h-5 text-yellow-500 animate-spin" />;
        if (statusText === "Optimization Complete") return <CheckCircle2 className="inline-block w-5 h-5 text-green-500" />;
        return null;
    };


    return (
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
            {/* Map Section */}
            <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-100 border-b border-gray-700 pb-2 flex items-center">
                        <Map size={20} className="mr-2 text-purple-400" />
                        Delivery Route Map
                    </h2>
                    {/* --- MODIFIED: This is now a CANCEL button --- */}
                    <button
                        onClick={() => onBack(false)} // Pass false: "did not dispatch"
                        className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95"
                    >
                        <ArrowLeft size={18} className="mr-2" />
                        Cancel & Go Back
                    </button>
                </div>

                {/* --- MODIFIED: Search Input (Moved Here) --- */}
                <div className="location-input-container">
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={20} className="text-gray-400" />
                        </div>
                        <input
                            id="addressInput"
                            ref={addressInputRef}
                            type="text"
                            placeholder="Search or click on the map to add a location"
                            className="w-full p-3 pl-10 border rounded-lg focus:ring-2 focus:ring-zomato focus:border-zomato" />
                    </div>
                </div>

                <div id="map-optimizer" className="flex-1 w-full rounded-lg shadow-lg" style={{ minHeight: '500px', backgroundColor: '#242f3e' }}></div>

                {(iteration > 0) && (
                    <div className="my-2 animate-fade-in">
                        <div className="flex justify-between text-sm font-medium text-gray-300 mb-1">
                            <span>Optimization Progress</span>
                            <span className="font-bold text-purple-300">{`${Math.round((iteration / params.maxIterations) * 100)}%`}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-4 shadow-inner">
                            <div
                                className="bg-purple-600 h-4 rounded-full transition-all duration-300 ease-out flex items-center justify-center text-xs font-bold text-white"
                                style={{ width: `${(iteration / params.maxIterations) * 100}%` }}
                            >
                                {(iteration / params.maxIterations) > 0.1 && `${Math.round((iteration / params.maxIterations) * 100)}%`}
                            </div>
                        </div>
                        <p className="text-xs text-right text-gray-400 mt-1">
                            {iteration} / {params.maxIterations} Iterations
                        </p>
                    </div>
                )}

                {finalRoute && (
                    <div className="p-5 border-2 border-purple-500 rounded-xl bg-gray-800 shadow-lg animate-fade-in space-y-3">
                        <h3 className="text-lg font-bold text-purple-400 flex items-center">
                            <MapPinned size={20} className="mr-2" />
                            Final Optimized Route
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-gray-300 mb-2 sm:mb-0">
                                Total Time: <span className="font-bold text-lg text-green-500">{finalRoute.length.toFixed(1)} minutes</span>
                            </p>
                            {/* --- NEW: Dispatch Button --- */}
                            <button
                                onClick={() => onBack(true, { route: finalRoute.route, locations: cities, length: finalRoute.length })} // Pass route data
                                className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95"
                            >
                                <Truck size={20} className="mr-2" />
                                Dispatch This Route
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto custom-scrollbar pr-2 pt-2">
                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-100">
                                {finalRoute.route.map((cityIndex, i) => (
                                    <li key={i} className="font-medium flex items-center">
                                        <ChevronRight size={16} className="inline-block mr-1 text-purple-400" />
                                        {cities[cityIndex]?.name || `Stop ${cityIndex}`}
                                        {i === 0 && <span className="text-xs font-normal text-red-400 ml-2">(Warehouse)</span>}
                                    </li>
                                ))}
                                <li className="font-medium flex items-center">
                                    <ChevronRight size={16} className="inline-block mr-1 text-purple-400" />
                                    Return to Warehouse
                                </li>
                            </ol>
                        </div>
                    </div>
                )}
            </div>

            {/* Sidebar (Controls & Metrics) */}
            <div className="lg:col-span-1 space-y-6 lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto custom-scrollbar pr-2">
                {/* Location Management (Now in Optimizer) */}
                <div className="p-5 border border-purple-800 rounded-xl bg-gray-800 space-y-3 shadow-md">
                    <h3 className="text-lg font-bold text-zomato flex items-center">
                        <Warehouse size={20} className="mr-2" />
                        Manage Locations
                    </h3>
                    <div className="flex flex-col space-y-2">
                        <button
                            id="addLocationButton"
                            onClick={addLocationFromCenter}
                            disabled={controlDisabled.addLocation || isCalculating || running}
                            className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:text-gray-400 transform hover:scale-105 active:scale-95">
                            <Target size={18} className="mr-2" />
                            Add Current Map Center
                        </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                        <span className="font-bold text-gray-100">{cities.length}</span> locations added. (First stop is **Warehouse**)
                    </p>
                </div>

                <div className="p-5 border border-purple-800 rounded-xl bg-gray-800 space-y-4 shadow-md">
                    <h3 className="text-lg font-bold text-purple-400 flex items-center">
                        <Network size={20} className="mr-2" />
                        Optimization Controls
                    </h3>

                    {/* --- MODIFIED: Calculate button only appears if needed --- */}
                    {travelTimeMatrix.length === 0 && (
                        <button
                            id="calculateTTMButton"
                            onClick={calculateTravelTimeMatrix}
                            disabled={controlDisabled.calculateTTM || isCalculating || running}
                            className={`w-full flex items-center justify-center text-white font-bold py-3 px-4 rounded-lg transition duration-300 ${isCalculating ? 'bg-yellow-500' : 'bg-pink-600 hover:bg-pink-700'} disabled:bg-gray-600 disabled:text-gray-400 transform hover:scale-105 active:scale-95`}>

                            {isCalculating ? (
                                <Loader2 size={20} className="mr-2 animate-spin" />
                            ) : (
                                <Calculator size={20} className="mr-2" />
                            )}
                            <span id="calculateTTMText">
                                {isCalculating ? 'Calculating TTM...' : 'Calculate Travel Times'}
                            </span>
                        </button>
                    )}

                    <div className="flex space-x-4">
                        <button
                            id="startButton"
                            onClick={startSimulation}
                            disabled={controlDisabled.start || travelTimeMatrix.length === 0 || isCalculating}
                            className="w-1/2 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-600 disabled:text-gray-400 transform hover:scale-105 active:scale-95">
                            <Play size={18} className="mr-1" />
                            Start
                        </button>
                        <button
                            id="stopButton"
                            onClick={() => stopSimulation(false)}
                            disabled={!running}
                            className="w-1/2 flex items-center justify-center bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg disabled:bg-gray-600 disabled:text-gray-400 transform hover:scale-105 active:scale-95">
                            <Pause size={18} className="mr-1" />
                            Pause
                        </button>
                    </div>
                </div>

                <div className="p-5 border border-gray-700 rounded-xl bg-gray-800 shadow-md">
                    <h3 className="text-lg font-bold text-gray-100 border-b border-gray-700 pb-2 mb-3 flex items-center">
                        <Gauge size={20} className="mr-2 text-purple-400" />
                        Optimization Status
                    </h3>
                    <div className="space-y-3 debug-data text-gray-300">
                        <p className="flex items-center">
                            <strong className="w-28">Status:</strong>
                            <span className={`font-bold flex items-center ${running ? 'text-purple-400' : (statusText === 'Optimization Complete' ? 'text-green-500' : 'text-red-400')
                                }`}>
                                <StatusIcon />
                                <span className="ml-2">{statusText}</span>
                            </span>
                        </p>
                        <p><strong>Total Stops (N):</strong> {cities.length}</p>
                        <p>
                            <strong>Best Time (min):</strong>
                            <span className="font-bold text-green-500 ml-2">
                                {bestTour.length === Infinity ? 'N/A' : bestTour.length.toFixed(1)}
                            </span>
                        </p>
                    </div>
                </div>

                <div className="p-5 border border-gray-700 rounded-xl bg-gray-800 shadow-md space-y-3">
                    <h3 className="font-semibold text-gray-100 flex items-center">
                        <FlaskConical size={20} className="mr-2 text-purple-400" />
                        ACO Parameters
                    </h3>
                    <div>
                        <label htmlFor="antCount" className="block text-sm font-medium text-gray-300">Ants: <span className="font-mono text-purple-300">{params.numAnts}</span></label>
                        <input type="range" id="antCount" min="5" max="50" value={params.numAnts} onChange={(e) => handleParamChange('numAnts', e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                    </div>
                    <div>
                        <label htmlFor="alphaSlider" className="block text-sm font-medium text-gray-300">Pheromone ($\alpha$): <span className="font-mono text-purple-300">{params.alpha}</span></label>
                        <input type="range" id="alphaSlider" min="0.5" max="5" step="0.5" value={params.alpha} onChange={(e) => handleParamChange('alpha', e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ===============================================
// --- 3. DELIVERY AGENT APP COMPONENT ---
// ===============================================
const DeliveryAgentApp = ({ agent, route, onBack }) => {
    const [currentStopIndex, setCurrentStopIndex] = useState(0);
    const [isNavigating, setIsNavigating] = useState(false);
    const [directions, setDirections] = useState(null);

    const mapRef = useRef(null);
    const directionsServiceRef = useRef(null);
    const directionsRendererRef = useRef(null);
    const markersRef = useRef([]);
    const initMapCallbackRef = useRef(null);

    const initMap = useCallback(() => {
        if (!window.google || !window.google.maps || mapRef.current) return;

        const mapDiv = document.getElementById('map-agent');
        if (!mapDiv) return;

        const defaultCenter = route && route.length > 0
            ? { lat: route[0].lat, lng: route[0].lng }
            : { lat: 12.9716, lng: 77.5946 };

        try {
            const map = new window.google.maps.Map(mapDiv, {
                center: defaultCenter,
                zoom: 14,
                mapId: "AGENT_MAP",
                disableDefaultUI: false,
                zoomControl: true,
                streetViewControl: false,
                fullscreenControl: true,
                styles: DARK_MAP_STYLE,
            });
            mapRef.current = map;

            directionsServiceRef.current = new window.google.maps.DirectionsService();
            directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                map: map,
                suppressMarkers: false,
                polylineOptions: {
                    strokeColor: '#10B981',
                    strokeWeight: 5,
                    strokeOpacity: 0.8,
                },
            });
        } catch (error) {
            console.error("Error initializing agent map:", error);
        }
    }, []);

    const updateRouteDisplay = useCallback(() => {
        if (!mapRef.current || !directionsServiceRef.current || !directionsRendererRef.current || !route || route.length < 2) return;

        const currentStop = route[currentStopIndex];
        const nextStop = route[(currentStopIndex + 1) % route.length];
        const isLastStop = currentStopIndex === route.length - 1;

        // Update markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        route.forEach((stop, index) => {
            const isCurrent = index === currentStopIndex;
            const isCompleted = index < currentStopIndex;
            const isWarehouse = index === 0;

            const marker = new window.google.maps.Marker({
                position: stop,
                map: mapRef.current,
                label: {
                    text: isWarehouse ? "W" : String(index),
                    color: "white",
                    fontWeight: "bold",
                },
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: isCurrent ? 16 : 12,
                    fillColor: isWarehouse ? '#EC4899' : (isCurrent ? '#10B981' : (isCompleted ? '#6B7280' : '#22D3EE')),
                    fillOpacity: 1.0,
                    strokeColor: "#1f2937",
                    strokeWeight: isCurrent ? 3 : 2,
                },
                title: stop.name || `Stop ${index}`,
                zIndex: isCurrent ? 1000 : (isCompleted ? 100 : 500),
            });
            markersRef.current.push(marker);
        });

        // Show directions to next stop
        if (!isLastStop && nextStop) {
            directionsServiceRef.current.route({
                origin: currentStop,
                destination: nextStop,
                travelMode: window.google.maps.TravelMode.DRIVING,
                drivingOptions: {
                    departureTime: new Date(Date.now()),
                    trafficModel: window.google.maps.TrafficModel.BEST_GUESS
                }
            }, (response, status) => {
                if (status === "OK") {
                    directionsRendererRef.current.setDirections(response);
                    const leg = response.routes[0].legs[0];
                    setDirections({
                        distance: leg.distance.text,
                        duration: leg.duration_in_traffic?.text || leg.duration.text,
                        instructions: leg.steps.map(step => step.instructions).filter(Boolean)
                    });
                    mapRef.current.panTo(currentStop);
                } else {
                    console.error("Directions request failed:", status);
                }
            });
        } else if (isLastStop) {
            // Return to warehouse
            directionsServiceRef.current.route({
                origin: currentStop,
                destination: route[0],
                travelMode: window.google.maps.TravelMode.DRIVING,
            }, (response, status) => {
                if (status === "OK") {
                    directionsRendererRef.current.setDirections(response);
                    const leg = response.routes[0].legs[0];
                    setDirections({
                        distance: leg.distance.text,
                        duration: leg.duration.text,
                        instructions: ["Return to warehouse"]
                    });
                }
            });
        }
    }, [route, currentStopIndex]);

    useEffect(() => {
        initMapCallbackRef.current = initMap;
    });

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
            } else if (!mapRef.current) {
                setTimeout(initMap, 500);
            }
        }
        return () => {
            if (window.initGoogleMapsAgent) delete window.initGoogleMapsAgent;
        };
    }, [initMap]);

    useEffect(() => {
        if (mapRef.current && route && route.length > 0) {
            updateRouteDisplay();
        }
    }, [currentStopIndex, route, updateRouteDisplay]);

    const handleCompleteStop = () => {
        if (currentStopIndex < route.length - 1) {
            setCurrentStopIndex(prev => prev + 1);
        }
    };

    const handleStartNavigation = () => {
        setIsNavigating(true);
        if (route && route.length > 0 && mapRef.current) {
            mapRef.current.panTo(route[currentStopIndex]);
        }
    };

    const currentStop = route && route[currentStopIndex] ? route[currentStopIndex] : null;
    const nextStop = route && route[(currentStopIndex + 1) % route.length] ? route[(currentStopIndex + 1) % route.length] : null;
    const isLastStop = route && currentStopIndex === route.length - 1;
    const allCompleted = route && currentStopIndex >= route.length;

    return (
        <div className="flex flex-col h-full bg-gray-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-4 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                        <UserCircle size={32} className="text-white" />
                        <div>
                            <h1 className="text-xl font-bold text-white">{agent?.name || 'Delivery Agent'}</h1>
                            <p className="text-sm text-green-100">On Route</p>
                        </div>
                    </div>
                    <button
                        onClick={onBack}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-2 rounded-lg transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Map Section */}
                <div className="flex-1 relative">
                    <div id="map-agent" className="w-full h-full" style={{ minHeight: '400px' }}></div>

                    {/* Navigation Overlay */}
                    {isNavigating && currentStop && (
                        <div className="absolute top-4 left-4 right-4 bg-gray-800 bg-opacity-95 rounded-lg p-4 shadow-xl border border-green-500">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <Navigation2 size={24} className="text-green-400" />
                                    <div>
                                        <p className="text-sm text-gray-400">Next Stop</p>
                                        <p className="text-lg font-bold text-white">{nextStop?.name || currentStop.name}</p>
                                    </div>
                                </div>
                                {directions && (
                                    <div className="text-right">
                                        <p className="text-sm text-gray-400">Distance</p>
                                        <p className="text-lg font-bold text-green-400">{directions.distance}</p>
                                        <p className="text-xs text-gray-400">{directions.duration}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar - Stop List */}
                <div className="w-full md:w-96 bg-gray-800 border-t md:border-t-0 md:border-l border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700">
                        <h2 className="text-lg font-bold text-white flex items-center">
                            <MapPin size={20} className="mr-2 text-green-400" />
                            Delivery Route
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            {route ? `${currentStopIndex + 1} of ${route.length} stops` : 'No route assigned'}
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                        {route && route.map((stop, index) => {
                            const isCurrent = index === currentStopIndex;
                            const isCompleted = index < currentStopIndex;
                            const isWarehouse = index === 0;

                            return (
                                <div
                                    key={index}
                                    className={`p-4 rounded-lg border-2 transition-all ${isCurrent
                                        ? 'bg-green-900 border-green-500 shadow-lg'
                                        : isCompleted
                                            ? 'bg-gray-700 border-gray-600 opacity-60'
                                            : 'bg-gray-900 border-gray-700'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-3 flex-1">
                                            <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold ${isCurrent
                                                ? 'bg-green-500 text-white'
                                                : isCompleted
                                                    ? 'bg-gray-600 text-gray-300'
                                                    : 'bg-gray-700 text-gray-400'
                                                }`}>
                                                {isCompleted ? (
                                                    <CheckCircle size={20} className="text-green-400" />
                                                ) : (
                                                    index
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    {isWarehouse && (
                                                        <Warehouse size={16} className="text-pink-400" />
                                                    )}
                                                    <p className={`font-semibold ${isCurrent ? 'text-white' : isCompleted ? 'text-gray-400' : 'text-gray-300'
                                                        }`}>
                                                        {stop.name || `Stop ${index}`}
                                                    </p>
                                                </div>
                                                {isWarehouse && (
                                                    <p className="text-xs text-pink-400">Warehouse</p>
                                                )}
                                                {isCurrent && directions && (
                                                    <div className="mt-2 pt-2 border-t border-green-700">
                                                        <div className="flex items-center space-x-4 text-xs">
                                                            <span className="text-gray-400">
                                                                <Navigation2 size={14} className="inline mr-1" />
                                                                {directions.distance}
                                                            </span>
                                                            <span className="text-gray-400">
                                                                <Clock size={14} className="inline mr-1" />
                                                                {directions.duration}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {isCurrent && (
                                            <div className="ml-2">
                                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="p-4 border-t border-gray-700 space-y-2">
                        {!isNavigating && currentStop && (
                            <button
                                onClick={handleStartNavigation}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center space-x-2"
                            >
                                <Navigation size={20} />
                                <span>Start Navigation</span>
                            </button>
                        )}
                        {currentStop && !allCompleted && (
                            <button
                                onClick={handleCompleteStop}
                                disabled={!isNavigating}
                                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-3 px-4 rounded-lg transition flex items-center justify-center space-x-2"
                            >
                                <CheckCircle size={20} />
                                <span>{isLastStop ? 'Complete & Return' : 'Complete Stop'}</span>
                            </button>
                        )}
                        {allCompleted && (
                            <div className="bg-green-900 border border-green-500 rounded-lg p-4 text-center">
                                <CheckCircle2 size={32} className="text-green-400 mx-auto mb-2" />
                                <p className="text-green-400 font-bold">All Deliveries Complete!</p>
                                <p className="text-sm text-gray-400 mt-1">Return to warehouse</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ===============================================
// --- 4. MAIN APP COMPONENT (CONTROLLER) ---
// ===============================================
const App = () => {
    const [view, setView] = useState('client'); // 'client', 'dashboard', 'optimizer', or 'agent'
    const [userLocation, setUserLocation] = useState(null);
    const [orderBatch, setOrderBatch] = useState([]);
    const [agentRoutes, setAgentRoutes] = useState({}); // Store optimized routes for each agent

    // --- NEW STATES for Bulk Add Modal ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bulkAddressInput, setBulkAddressInput] = useState("");
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodingStatus, setGeocodingStatus] = useState("");

    // --- NEW: Agent State (Managed at top level) ---
    const [agents, setAgents] = useState([
        { id: 'a1', name: 'Rohan', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] },
        { id: 'a2', name: 'Priya', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] },
        { id: 'a3', name: 'Amit', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] },
        { id: 'a4', name: 'Sunita', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] },
        { id: 'a5', name: 'Vikram', status: 'idle', location: WAREHOUSE_LOCATION, batch: [] }
    ]);

    // Order service is imported at top level
    const [currentAgentId, setCurrentAgentId] = useState(null); // Track which agent is optimizing

    // Refs for Google Services (needed for bulk add geocoding)
    const geocoderRef = useRef(null);
    const [googleReady, setGoogleReady] = useState(false);

    // --- Geocoding helper function ---
    const geocodeAddress = useCallback((address) => {
        return new Promise((resolve, reject) => {
            if (!geocoderRef.current) {
                // Try to init geocoder if not ready
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
                    resolve({ lat, lng, name });
                } else {
                    reject(new Error(`Geocode failed for "${address}": ${status}`));
                }
            });
        });
    }, []);

    // --- Bulk Add Stop Handler ---
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

        // 1. Geocode the Warehouse first
        try {
            setGeocodingStatus("Finding Warehouse...");
            // Use provided warehouse, or first address, or fallback to default
            const whAddress = warehouseAddress.trim() || addresses[0] || WAREHOUSE_LOCATION.name;
            warehouseLocation = await geocodeAddress(whAddress);
            newCities.push({ ...warehouseLocation, name: "Warehouse" });
        } catch (error) {
            console.warn(error);
            setIsGeocoding(false);
            setGeocodingStatus("Error: Could not find warehouse address. Please add it first.");
            return;
        }

        // 2. Geocode the rest of the addresses
        const stops = warehouseAddress ? addresses : addresses.slice(1);
        for (let i = 0; i < stops.length; i++) {
            setGeocodingStatus(`Finding ${i + 1}/${stops.length}: ${stops[i]}...`);
            try {
                const location = await geocodeAddress(stops[i]);
                if (location) {
                    newCities.push({
                        ...location,
                        name: (location.name || `Stop ${i + 1}`)
                    });
                }
            } catch (error) {
                console.warn(error);
            }
        }

        setIsGeocoding(false);
        setGeocodingStatus("");
        setBulkAddressInput("");
        setIsModalOpen(false);

        // --- THIS IS THE HANDOFF ---
        // Find an idle agent to assign this bulk batch
        const targetAgent = agents.find(a => a.status === 'idle');
        if (targetAgent) {
            setAgents(prev => prev.map(a =>
                a.id === targetAgent.id ? { ...a, status: 'routing', batch: [] } : a // Set status to 'routing'
            ));
            setCurrentAgentId(targetAgent.id);
            setOrderBatch(newCities); // newCities already includes Warehouse
            setView('optimizer');
        } else {
            alert("All agents are currently busy. Please wait for an agent to become free.");
        }
    };

    // --- Load Google Maps script for Geocoding in Dashboard ---
    useEffect(() => {
        const initGoogle = () => {
            console.log("Google Services Initialized for Dashboard");
            if (window.google) {
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
                // Script might be loading, wait for it
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


    // This function is passed to the Dashboard
    const handleOptimizeBatch = (agentId) => {
        const agent = agents.find(a => a.id === agentId);
        if (!agent) return;

        setOrderBatch([WAREHOUSE_LOCATION, ...agent.batch]);
        setCurrentAgentId(agentId); // Track who is delivering

        // Set agent's status to "routing"
        setAgents(prev => prev.map(a =>
            a.id === agentId ? { ...a, status: 'routing', batch: [] } : a
        ));

        setView('optimizer');
    };

    // This function is passed to the Optimizer
    const handleBackToDashboard = (didDispatch, optimizedRoute = null) => {
        // Set the agent's status based on action
        if (currentAgentId) {
            if (didDispatch && optimizedRoute && optimizedRoute.route && optimizedRoute.locations) {
                // Reorder locations based on optimized route indices
                const orderedLocations = optimizedRoute.route.map(idx => optimizedRoute.locations[idx]).filter(Boolean);

                // Store the optimized route for this agent
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
                    ? { ...a, status: didDispatch ? 'delivering' : 'idle', batch: [] } // Clear batch, set status
                    : a
            ));
        }

        setOrderBatch([]);
        setCurrentAgentId(null);
        setView('dashboard');
    };

    // This function is passed to the Dashboard for tracking routes
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

    // Render client view separately (no header)
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
            {/* --- Global Styles --- */}
            <style jsx="true">{`
                /* ... (Copy all styles from the previous <style> block) ... */
                .header-zomato { background-color: #EE4266; }
                .text-zomato { color: #EE4266; }
                
                /* --- MODIFIED: Renamed #map to #map-optimizer --- */
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
                
                /* --- Full-screen layout --- */
                html, body, #root {
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow: hidden; /* Prevent body scroll */
                }
                #app-wrapper {
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                .main-content {
                    flex: 1; /* Make content area fill remaining space */
                    overflow: auto; /* Allow content to scroll */
                }
                .sidebar-scroll {
                    max-height: calc(100vh - 80px); /* Adjust based on header height */
                    overflow-y: auto;
                }
                .map-content {
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
            `}</style>

            {view !== 'client' && (
                <header className="p-5 sm:p-6 header-zomato text-white flex items-center justify-between shadow-lg z-20 sticky top-0">
                    <div className="flex items-center space-x-4">
                        <PackageCheck size={40} className="hidden sm:block" />
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">ACO Logistics Platform</h1>
                            <p className="text-sm font-light opacity-90">
                                {view === 'dashboard' ? 'Admin Dashboard' : view === 'optimizer' ? 'Route Optimization Panel' : 'Delivery Agent View'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setView('client')}
                        className="bg-white text-red-500 hover:bg-gray-100 px-6 py-2 rounded-lg font-semibold transition shadow-md"
                    >
                        Client View
                    </button>
                </header>
            )}

            {/* --- Main Content Area --- */}
            <main className="main-content custom-scrollbar">
                {view === 'client' ? (
                    <ClientOrdering
                        onBack={() => setView('dashboard')}
                        userLocation={userLocation}
                        setUserLocation={setUserLocation}
                    />
                ) : view === 'dashboard' ? (
                    <AdminDashboard
                        agents={agents}
                        setAgents={setAgents}
                        onOptimizeBatch={handleOptimizeBatch}
                        onOpenBulkAdd={() => setIsModalOpen(true)}
                        onTrackRoute={handleTrackRoute}
                    />
                ) : view === 'optimizer' ? (
                    <RouteOptimizer
                        initialLocations={orderBatch}
                        onBack={handleBackToDashboard}
                    />
                ) : (
                    <DeliveryAgentApp
                        agent={agents.find(a => a.id === currentAgentId)}
                        route={agentRoutes[currentAgentId]?.locations || []}
                        onBack={() => setView('dashboard')}
                    />
                )}
            </main>

            {/* --- Bulk Add Modal (Moved to top level) --- */}
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

                        {/* --- NEW: Simplified Warehouse Input --- */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Warehouse Address (First Stop)</label>
                            <input
                                id="warehouse-input"
                                type="text"
                                placeholder="e.g., Koramangala, Bangalore (or leave blank to use first address)"
                                className="w-full p-3 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                disabled={isGeocoding}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-300 mb-1">Delivery Stops (One per line)</label>
                            <textarea
                                value={bulkAddressInput}
                                onChange={(e) => setBulkAddressInput(e.target.value)}
                                placeholder="Indiranagar, Bangalore&#10;Whitefield, Bangalore&#10;Jayanagar, Bangalore"
                                rows="8"
                                className="w-full p-3 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 custom-scrollbar"
                                disabled={isGeocoding}
                            />
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row-reverse sm:items-center">
                            <button
                                onClick={() => handleBulkAdd(document.getElementById('warehouse-input').value)}
                                disabled={isGeocoding || bulkAddressInput.trim() === ""}
                                className="w-full sm:w-auto flex items-center justify-center bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:text-gray-400 transform hover:scale-105 active:scale-95"
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
                                className="w-full sm:w-auto mt-2 sm:mt-0 sm:mr-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 disabled:bg-gray-500"
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