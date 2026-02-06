#include <iostream>
#include "DeliverySystem.h"
using namespace std;
int main()
{
	DeliverySystem deliverySystem;

	deliverySystem.loadFromFile("input.txt");

	// Set warehouse (index 0 = first location)
	deliverySystem.setWarehouse(0);

	// Initialize with optimized parameters for delivery
	deliverySystem.initializeOptimizer(25, 100); // 25 ants, 100 iterations

	// Optimize the delivery route
	deliverySystem.optimizeDeliveryRoute(75);
	cout << "\nDelivery route optimization completed!" << endl;

	return 0;
}
// g++ main.cpp DeliverySystem.cpp ACO.cpp Randoms.cpp -o DeliveryOptimizer