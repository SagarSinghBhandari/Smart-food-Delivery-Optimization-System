#ifndef DELIVERYSYSTEM_H
#define DELIVERYSYSTEM_H

#include <vector>
#include <string>
#include <utility>
#include "ACO.h"

class DeliverySystem
{
private:
  ACO *aco;
  std::vector<std::pair<double, double>> locations;
  std::vector<std::string> locationNames;
  int warehouseIndex;

public:
  DeliverySystem();
  ~DeliverySystem();

  void addLocation(const std::string &name, double x, double y);
  void loadFromFile(const std::string &filename);
  void setWarehouse(int index);
  void initializeOptimizer(int numAnts = 20, int iterations = 100);
  void optimizeDeliveryRoute(int iterations = 50);
  void printOptimalRoute();
};

#endif