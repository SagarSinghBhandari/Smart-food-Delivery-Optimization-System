#include "DeliverySystem.h"
#include <iostream>
#include <fstream>
#include <sstream>

DeliverySystem::DeliverySystem() : aco(nullptr), warehouseIndex(0) {}

DeliverySystem::~DeliverySystem()
{
  if (aco)
    delete aco;
}

void DeliverySystem::addLocation(const std::string &name, double x, double y)
{
  locationNames.push_back(name);
  locations.push_back({x, y});
}

void DeliverySystem::loadFromFile(const std::string &filename)
{
  std::ifstream file(filename);
  std::string line;

  locations.clear();
  locationNames.clear();

  while (std::getline(file, line))
  {
    std::istringstream iss(line);
    std::string name;
    double x, y;

    if (iss >> name >> x >> y)
    {
      addLocation(name, x, y);
    }
  }
}

void DeliverySystem::setWarehouse(int index)
{
  if (index >= 0 && index < locations.size())
  {
    warehouseIndex = index;
  }
}

void DeliverySystem::initializeOptimizer(int numAnts, int iterations)
{
  if (locations.empty())
  {
    std::cout << "No locations loaded!" << std::endl;
    return;
  }

  int numCities = locations.size();
  aco = new ACO(numAnts, numCities, 1.0, 2.0, 100, 0.3, 2, warehouseIndex);
  aco->init();

  // Set positions
  for (int i = 0; i < numCities; i++)
  {
    aco->setCITYPOSITION(i, locations[i].first, locations[i].second);
  }

  // Connect all cities (complete graph)
  for (int i = 0; i < numCities; i++)
  {
    for (int j = i + 1; j < numCities; j++)
    {
      aco->connectCITIES(i, j);
    }
  }

  std::cout << "Delivery system initialized with " << numCities << " locations." << std::endl;
  std::cout << "Warehouse: " << locationNames[warehouseIndex] << std::endl;
}

void DeliverySystem::optimizeDeliveryRoute(int iterations)
{
  if (!aco)
  {
    std::cout << "System not initialized!" << std::endl;
    return;
  }

  std::cout << "\n=== OPTIMIZING DELIVERY ROUTE ===" << std::endl;
  aco->optimize(iterations);

  std::cout << "\n=== OPTIMIZATION COMPLETE ===" << std::endl;
  printOptimalRoute();
}

void DeliverySystem::printOptimalRoute()
{
  if (!aco)
    return;

  int *route = aco->getBestRoute();
  double totalDistance = aco->getBestLength();

  std::cout << "\n=== OPTIMAL DELIVERY ROUTE ===" << std::endl;
  std::cout << "Starting from: " << locationNames[warehouseIndex] << std::endl;
  std::cout << "Delivery sequence: ";

  for (int i = 0; i < aco->getNumberOfCities(); i++)
  {
    std::cout << locationNames[route[i]];
    if (i < aco->getNumberOfCities() - 1)
    {
      std::cout << " -> ";
    }
  }
  std::cout << " -> " << locationNames[warehouseIndex] << " (return)" << std::endl;

  std::cout << "Total Distance: " << totalDistance << " units" << std::endl;

  // Print coordinates for verification
  std::cout << "\nLocation coordinates:" << std::endl;
  for (int i = 0; i < locations.size(); i++)
  {
    std::cout << locationNames[i] << ": (" << locations[i].first
              << ", " << locations[i].second << ")" << std::endl;
  }
}
