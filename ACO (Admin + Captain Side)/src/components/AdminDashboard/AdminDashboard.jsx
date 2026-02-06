import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Truck, Coffee, Loader2, MapPinned, Map, ListPlus } from 'lucide-react';
import { FAKE_ADDRESSES, WAREHOUSE_LOCATION } from '../../constants/config';
import { orderService } from '../../services/orderService';

const AdminDashboard = ({ agents, setAgents, onOptimizeBatch, onOpenBulkAdd, onTrackRoute }) => {
  const [pendingOrders, setPendingOrders] = useState([]);

  // Auto-assign logic
  const assignOrderToAgent = useCallback((newOrder) => {
    setAgents(prevAgents => {
      const targetAgent = prevAgents
        .filter(a => a.status === 'idle')
        .sort((a, b) => a.batch.length - b.batch.length)[0];

      if (targetAgent) {
        return prevAgents.map(agent =>
          agent.id === targetAgent.id
            ? { ...agent, batch: [...agent.batch, newOrder] }
            : agent
        );
      }
      return prevAgents;
    });
  }, [setAgents]);

  // Subscribe to order service
  useEffect(() => {
    // Get initial orders
    const allOrders = orderService.getOrders();
    const initialPending = allOrders.filter(o => o.status === 'pending');
    setPendingOrders(initialPending);

    const unsubscribe = orderService.subscribe((orders) => {
      console.log('Orders updated in AdminDashboard:', orders);
      const pending = orders.filter(o => o.status === 'pending');
      setPendingOrders(pending);

      // Auto-assign pending orders
      pending.forEach(order => {
        const isAssigned = agents.some(a =>
          a.batch.some(bOrder => bOrder.id === order.id)
        );
        if (!isAssigned) {
          assignOrderToAgent({
            id: order.id,
            name: order.name || order.deliveryAddress?.name || order.deliveryAddress?.formatted || 'Unknown',
            lat: order.deliveryAddress?.lat,
            lng: order.deliveryAddress?.lng,
            timestamp: order.timestamp,
            orderData: order
          });
          orderService.updateOrderStatus(order.id, 'assigned');
        }
      });
    });

    // Simulate random orders (optional - can be removed if only using client orders)
    const orderInterval = setInterval(() => {
      const fakeOrderData = FAKE_ADDRESSES[Math.floor(Math.random() * FAKE_ADDRESSES.length)];
      if (fakeOrderData.name === WAREHOUSE_LOCATION.name) return;

      const newOrder = {
        id: `ORD-${Math.random().toString(36).substr(2, 9)}`,
        ...fakeOrderData,
        timestamp: new Date()
      };

      setPendingOrders(prev => {
        const updatedOrders = [newOrder, ...prev];
        return updatedOrders.slice(0, 10);
      });
    }, 10000); // Every 10 seconds

    return () => {
      unsubscribe();
      clearInterval(orderInterval);
    };
  }, [agents, assignOrderToAgent]);

  // Assign pending orders to agents
  useEffect(() => {
    const idleAgent = agents.find(a => a.status === 'idle');
    const unassignedOrders = pendingOrders.filter(pOrder =>
      !agents.some(a => a.batch.some(bOrder => bOrder.id === pOrder.id))
    );

    if (idleAgent && unassignedOrders.length > 0) {
      const orderToAssign = unassignedOrders[0];
      assignOrderToAgent({
        id: orderToAssign.id,
        name: orderToAssign.name || orderToAssign.deliveryAddress?.name || 'Unknown',
        lat: orderToAssign.lat || orderToAssign.deliveryAddress?.lat,
        lng: orderToAssign.lng || orderToAssign.deliveryAddress?.lng,
        timestamp: orderToAssign.timestamp,
        orderData: orderToAssign
      });
      setPendingOrders(prev => prev.filter(o => o.id !== orderToAssign.id));
    }
  }, [agents, pendingOrders, assignOrderToAgent]);

  const handleDispatch = (agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || agent.batch.length === 0) {
      alert("No orders in batch to optimize.");
      return;
    }
    onOptimizeBatch(agentId);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-bold text-white mb-6">Admin Dashboard</h1>

      <div className="mb-6 p-4 bg-gray-800 border border-purple-800 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-lg font-semibold text-purple-400">Agent Control Center</h3>
        <button
          onClick={onOpenBulkAdd}
          className="w-full sm:w-auto flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95"
        >
          <ListPlus size={20} className="mr-2" />
          Add Stops via Text
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-5 border border-gray-700 rounded-xl bg-gray-800 shadow-md">
          <h3 className="text-lg font-bold text-purple-400 flex items-center mb-4">
            <ShoppingCart size={20} className="mr-2" />
            Incoming Order Feed
          </h3>
          <div className="space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            {pendingOrders.length === 0 && <p className="text-gray-400 text-sm">Waiting for new orders...</p>}
            {pendingOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between bg-gray-900 p-3 rounded-lg animate-fade-in border border-gray-700">
                <div className="flex-1">
                  <p className="font-semibold text-white">
                    {order.name || order.deliveryAddress?.name || order.deliveryAddress?.formatted || 'Unknown Address'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {order.id} @ {order.timestamp?.toLocaleTimeString() || new Date().toLocaleTimeString()}
                  </p>
                  {order.items && (
                    <p className="text-xs text-purple-400 mt-1">
                      {order.items.length} items • ₹{order.totalPrice || 0}
                    </p>
                  )}
                  {order.restaurant && (
                    <p className="text-xs text-blue-400 mt-1">
                      From: {order.restaurant.name}
                    </p>
                  )}
                </div>
                <span className="text-xs font-medium text-yellow-400 bg-yellow-900 px-2 py-1 rounded">Pending</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 p-5 border border-gray-700 rounded-xl bg-gray-800 shadow-md">
          <h3 className="text-lg font-bold text-green-500 flex items-center mb-4">
            <Truck size={20} className="mr-2" />
            Delivery Agents
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2">
            {agents.map((agent) => (
              <div key={agent.id} className={`p-4 rounded-lg shadow-lg ${agent.status === 'idle' ? 'bg-gray-900 border border-gray-700' : 'bg-gray-700 border-pink-500'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {agent.status === 'idle' && <Coffee size={20} className="text-green-500" />}
                    {agent.status === 'routing' && <Loader2 size={20} className="text-yellow-500 animate-spin" />}
                    {agent.status === 'delivering' && <Truck size={20} className="text-pink-500 animate-pulse" />}
                    <p className="text-lg font-bold text-white">{agent.name}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${agent.status === 'idle' ? 'bg-green-500 text-green-900'
                    : agent.status === 'routing' ? 'bg-yellow-500 text-yellow-900'
                      : 'bg-pink-500 text-pink-900'
                    }`}>
                    {agent.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4 min-h-[100px]">
                  <p className="text-sm text-gray-400 border-b border-gray-700 pb-1">Batch ({agent.batch.length} orders):</p>
                  {agent.batch.length === 0 && <p className="text-xs text-gray-500 italic">No orders assigned.</p>}
                  {agent.batch.map((order, index) => (
                    <div key={order.id} className="flex items-center">
                      <span className="text-pink-400 text-xs font-bold mr-2">{index + 1}.</span>
                      <p className="text-sm text-gray-300 truncate">
                        {order.name || order.deliveryAddress?.name || 'Unknown'}
                      </p>
                    </div>
                  ))}
                </div>

                {agent.status === 'idle' && (
                  <button
                    onClick={() => handleDispatch(agent.id)}
                    disabled={agent.batch.length === 0}
                    className="w-full flex items-center justify-center bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 disabled:bg-gray-600 disabled:text-gray-400 transform hover:scale-105 active:scale-95"
                  >
                    <MapPinned size={18} className="mr-2" />
                    Optimize & Dispatch
                  </button>
                )}
                {agent.status === 'delivering' && (
                  <button
                    onClick={() => onTrackRoute(agent.id)}
                    className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-300 transform hover:scale-105 active:scale-95"
                  >
                    <Map size={18} className="mr-2" />
                    Track Route
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

