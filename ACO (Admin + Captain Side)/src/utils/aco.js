// ACO Algorithm Utilities

export const toMinutes = (seconds) => seconds / 60;

export const getCost = (matrix, cityIndexI, cityIndexJ) => {
  if (!matrix || !matrix[cityIndexI] || !matrix[cityIndexI][cityIndexJ]) return Infinity;
  return matrix[cityIndexI][cityIndexJ];
};

// Core ACO Logic - Run Ant Tour
export const runAntTour = (startCityIndex, currentCities, currentTTM, currentPheromones, currentParams) => {
  let tour = [startCityIndex];
  let visited = new Set([startCityIndex]);
  let tourLength = 0;
  let currentCityIndex = startCityIndex;

  const calculateProbabilities = (i) => {
    const unvisited = currentCities.map((_, index) => index).filter(j => !visited.has(j));
    if (unvisited.length === 0) return [];
    let total = 0;
    let probabilities = [];
    for (const j of unvisited) {
      let cost = getCost(currentTTM, i, j);
      if (cost === Infinity) continue;
      if (cost < 0.0001) cost = 0.0001; // Avoid division by zero
      const visibility = 1 / cost;
      const numerator = (currentPheromones[i][j] ** currentParams.alpha) * (visibility ** currentParams.beta);
      probabilities.push({ city: j, score: numerator });
      total += numerator;
    }
    if (total === 0) return [];
    return probabilities.map(p => ({ city: p.city, prob: p.score / total }));
  };

  const selectNextCity = (probs) => {
    if (probs.length === 0) return null;
    let r = Math.random();
    let cumulativeProb = 0;
    for (const p of probs) {
      cumulativeProb += p.prob;
      if (r <= cumulativeProb) return p.city;
    }
    return probs[probs.length - 1].city;
  };

  while (tour.length < currentCities.length) {
    const probs = calculateProbabilities(currentCityIndex);
    const nextCity = selectNextCity(probs);
    if (nextCity === null) break;
    const prevCity = currentCityIndex;
    tourLength += getCost(currentTTM, prevCity, nextCity);
    tour.push(nextCity);
    visited.add(nextCity);
    currentCityIndex = nextCity;
  }

  if (tour.length === currentCities.length) {
    tourLength += getCost(currentTTM, tour[tour.length - 1], tour[0]);
  } else {
    tourLength = Infinity;
  }
  return { tour, tourLength };
};

