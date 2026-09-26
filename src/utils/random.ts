/** Uniform integer in [0, n). */
export const randomIndex = (n: number): number => Math.floor(Math.random() * n);

/** Uniform float in [min, max). */
export const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);
