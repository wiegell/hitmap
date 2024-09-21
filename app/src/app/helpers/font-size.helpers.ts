/**
 * @description used to calculate character width from font-size
 * for Menlo
 */
const menloCharacterWidthRatio = 0.602;

/**
 *
 * @param r radius of cirle to fit
 * @param n length of text
 * @param cw factor to get character width from font size
 */
export function calculateUnadjustedFontSize(
  r: number,
  n: number,
  cw: number
): number {
  return (2 * r) / (n * cw);
}

/**
 *
 * @param y y coordinate of the intersection between text and the circle
 * @param r circle radius
 * @param n text length
 * @param cw factor to get character width from font size
 * @returns font size adjusted to fit inside the circle at the supplied y coordinate
 */
export function adjustFontSizeToFitCircle(
  y: number,
  r: number,
  n: number,
  cw: number
) {
  return (2 * Math.sqrt(Math.pow(r, 2) - Math.pow(y, 2))) / (cw * n);
}

export function calculateFontSizeForCircle(
  textLength: number,
  r: number,
  paddingFraction: number,
  yOffsetToIntersectionWithCircle?: number
) {
  const radiusMinusPadding = r * (1 - paddingFraction);
  const unadjustedFontSize = calculateUnadjustedFontSize(
    radiusMinusPadding,
    textLength,
    menloCharacterWidthRatio
  );
  const adjustedFontSize = adjustFontSizeToFitCircle(
    yOffsetToIntersectionWithCircle
      ? yOffsetToIntersectionWithCircle + unadjustedFontSize * 0.5
      : unadjustedFontSize * 0.5,
    radiusMinusPadding,
    textLength,
    menloCharacterWidthRatio
  );
  return Math.min(adjustedFontSize, r * 0.75);
}
