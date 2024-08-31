export function extractParenthesizedSubstring(str: string) {
  // Regular expression to match content inside parentheses
  let regex = /\(([^)]+)\)/g;

  // Extract all matches using matchAll
  return [...str.matchAll(regex)].map((match) => match[1]);
}

export function removeParenthesizedSubstring(str: string) {
  let regex = /\s*\([^)]*\)/;

  // Replace the matched part with an empty string
  return str.replace(regex, "");
}
