# Real-Time Logistics & Delivery Route Optimization Platform

A comprehensive React application that simulates a real-time delivery logistics platform with three distinct user-facing views, featuring Ant Colony Optimization (ACO) algorithm for route optimization.

## 🚀 Features

### 1. Admin Dashboard
- **Agent Roster**: Monitor 5-6 delivery agents with real-time status (idle, routing, delivering)
- **Live Order Feed**: Simulated incoming orders arriving every few seconds
- **Automatic Order Assignment**: Orders are automatically assigned to idle agents with the fewest orders
- **Dispatch & Tracking**: Optimize routes and track active deliveries
- **Bulk Add**: Add multiple delivery stops via text input with geocoding

### 2. Route Optimizer
- **ACO Algorithm**: Ant Colony Optimization for finding optimal delivery routes
- **Google Maps Integration**: Full-screen dark-themed map with custom markers
- **Travel Time Matrix**: Real-time calculation using Google Directions API with traffic data
- **Visual Optimization**: Watch the ACO algorithm find the best route in real-time
- **Interactive Controls**: Adjust ACO parameters (ants, pheromone influence, etc.)

### 3. Delivery Agent App
- **Mobile-First Interface**: Optimized for delivery agents on the go
- **Step-by-Step Navigation**: Guided route with turn-by-turn directions
- **Real-Time Tracking**: Current stop highlighting with distance and time estimates
- **Stop Management**: Mark stops as complete and navigate to the next location
- **Visual Feedback**: Color-coded stops (current, completed, pending)

## 🛠️ Technologies

- **Frontend**: React 19 with functional components and hooks
- **Styling**: TailwindCSS 4
- **Icons**: lucide-react
- **Maps & Routing**: Google Maps Platform
  - Maps JavaScript API
  - Directions API
  - Geocoding API
  - Places API
- **Algorithm**: Ant Colony Optimization (ACO) implemented in JavaScript

## 📋 Prerequisites

1. Node.js (v18 or higher)
2. Google Maps API Key with the following APIs enabled:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
   - Places API

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ACO
```

2. Install dependencies:
```bash
npm install
```

3. Add your Google Maps API Key:
   - Open `src/App.jsx`
   - Find the line: `const API_KEY = "YOUR_API_KEY_HERE";`
   - Replace with your actual Google Maps API key

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:5173`

## 📖 Usage

### Admin Dashboard
1. View incoming orders in the "Incoming Order Feed"
2. Orders are automatically assigned to idle agents
3. Click "Optimize & Dispatch" on an agent card to optimize their route
4. Use "Add Multiple Stops" to bulk add delivery addresses
5. Click "Track Route" on delivering agents to view their active route

### Route Optimizer
1. The optimizer automatically loads when dispatching an agent
2. Wait for the Travel Time Matrix (TTM) calculation to complete
3. Click "Start" to begin the ACO optimization
4. Watch the algorithm find the optimal route
5. Click "Dispatch This Route" when satisfied with the result

### Delivery Agent App
1. Access via "Track Route" button in the Admin Dashboard
2. View the optimized route on the map
3. Click "Start Navigation" to begin delivery
4. Follow the route step-by-step
5. Mark stops as complete as you deliver

## 🎨 Features in Detail

### ACO Algorithm Parameters
- **Number of Ants**: Controls exploration (default: 25)
- **Alpha (α)**: Pheromone influence (default: 1.0)
- **Beta (β)**: Distance/visibility influence (default: 2.0)
- **Evaporation Rate (ρ)**: Pheromone decay (default: 0.3)
- **Max Iterations**: Optimization cycles (default: 100)

### Agent Statuses
- **Idle** (Green): Available for new orders
- **Routing** (Yellow): Route being optimized
- **Delivering** (Pink): On active delivery route

## 🔐 API Key Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the required APIs:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
   - Places API
4. Create credentials (API Key)
5. Restrict the API key to the enabled APIs for security
6. Add the API key to `src/App.jsx`

## 📝 Project Structure

```
ACO/
├── src/
│   ├── App.jsx          # Main application component with all three views
│   ├── main.jsx         # React entry point
│   ├── App.css          # Additional styles
│   └── index.css        # TailwindCSS imports
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
```

## 🚧 Development

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint
```bash
npm run lint
```

## 📄 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Google Maps Platform for mapping and routing services
- Ant Colony Optimization algorithm for route optimization
- React and Vite for the development framework
