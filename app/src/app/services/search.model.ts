export type Filter = {
  type: FilterType;
  str: string;
};

export enum FilterType {
  wildcard,
  product,
  vendor,
  systemType,
}
