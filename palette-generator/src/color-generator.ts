import { Color, hcl } from "chroma-js";

function euclideanDistance(c1: Color, c2: Color): number {
  const p1 = c1.hcl();
  const p2 = c2.hcl();
  return Math.sqrt(
    Math.pow(p1[0] - p2[0], 2) +
      Math.pow(p1[1] - p2[1], 2) +
      Math.pow(p1[2] - p2[2], 2)
  );
}

function getRandomColor(): Color {
  let color: Color;
  do {
    color = hcl(
      Math.floor(Math.random() * 360),
      Math.floor(Math.random() * 120) + 20,
      Math.floor(Math.random() * 75) + 18
    );
  } while (color.clipped());
  return color;
}

export function findFurthestPoints(
  n: number,
  candidatesPerPoint: number
): string[] {
  const colors: Color[] = [];

  // Place the first point randomly
  colors.push(getRandomColor());

  for (let i = 1; i < n; i++) {
    let bestColor: Color = getRandomColor();
    let maxMinDistance = -1;

    // Generate random candidates and evaluate them
    for (let j = 0; j < candidatesPerPoint; j++) {
      const candidate = getRandomColor();
      const minDistance = Math.min(
        ...colors.map((p) => euclideanDistance(p, candidate))
      );

      if (minDistance > maxMinDistance) {
        maxMinDistance = minDistance;
        bestColor = candidate;
      }
    }

    console.log("maxmin", maxMinDistance);
    colors.push(bestColor);
  }

  return colors.map((color) => color.hex());
}
