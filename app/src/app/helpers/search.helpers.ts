export function wildCardCompare(d: any, searchString: string) {
  return JSON.stringify(d, null, 0)
    .toLowerCase()
    .includes(searchString.toLowerCase());
}
