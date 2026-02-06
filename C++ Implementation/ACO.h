#ifndef ACO_H
#define ACO_H
#include "Random.h"

class ACO
{
private:
	// ACO parameters
	int NUMBEROFANTS;
	int NUMBEROFCITIES;
	double ALPHA;
	double BETA;
	double Q;
	double RO;
	double TAUMAX;
	int INITIALCITY;

	// Data structures
	int **GRAPH;
	double **CITIES;
	double **PHEROMONES;
	double **DELTAPHEROMONES;
	double **PROBS;
	int **ROUTES;
	int *BESTROUTE;
	double BESTLENGTH;

	Randoms *randoms;

	// Helper methods
	double distance(int cityi, int cityj);
	bool exists(int cityi, int cityj);
	bool vizited(int antk, int c);
	double PHI(int cityi, int cityj, int antk);
	double length(int antk);
	int city();
	void route(int antk);
	int valid(int antk, int iteration);
	void updatePHEROMONES();

public:
	ACO(int nAnts, int nCities, double alpha, double beta, double q, double ro, double taumax, int initCity);
	~ACO();

	void init();
	void connectCITIES(int cityi, int cityj);
	void setCITYPOSITION(int city, double x, double y);
	void optimize(int ITERATIONS);
	void printGRAPH();
	void printPHEROMONES();
	void printRESULTS();

	// New methods for delivery system
	int *getBestRoute() { return BESTROUTE; }
	double getBestLength() { return BESTLENGTH; }
	int getNumberOfCities() { return NUMBEROFCITIES; }
};

#endif