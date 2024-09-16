import { Standard } from "./data.model";

export type Edge<T> = {
  source: T;
  target: T;
  standard: Standard;
  id?: string;
};
