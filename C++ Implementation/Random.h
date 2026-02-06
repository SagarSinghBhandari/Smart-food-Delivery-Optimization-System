#ifndef RANDOM_H
#define RANDOM_H

class Randoms
{
private:
  long xpto;
  float ran1(long *idum);
  float gaussdev(long *idum);

public:
  Randoms(long x) { xpto = -x; }
  double Normal(double avg, double sigma);
  double Uniforme();
  double sorte(int m);
};

#endif