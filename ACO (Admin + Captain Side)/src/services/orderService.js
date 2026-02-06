// Order Service - Manages orders and communication between client and admin

class OrderService {
  constructor() {
    this.orders = [];
    this.listeners = [];
  }

  // Subscribe to order updates
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify all listeners
  notify() {
    this.listeners.forEach(callback => callback(this.orders));
  }

  // Create a new order
  createOrder(orderData) {
    const order = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...orderData,
      status: 'pending',
      timestamp: new Date(),
      assignedAgent: null
    };
    this.orders.push(order);
    this.notify();
    return order;
  }

  // Get all orders
  getOrders() {
    return this.orders;
  }

  // Get pending orders
  getPendingOrders() {
    return this.orders.filter(o => o.status === 'pending');
  }

  // Update order status
  updateOrderStatus(orderId, status, agentId = null) {
    const order = this.orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      if (agentId) order.assignedAgent = agentId;
      this.notify();
    }
  }

  // Assign order to agent
  assignOrderToAgent(orderId, agentId) {
    this.updateOrderStatus(orderId, 'assigned', agentId);
  }
}

// Singleton instance
export const orderService = new OrderService();

