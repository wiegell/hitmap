import { BaseType, Selection } from "d3";
import { DataEntry } from "./data.model";

export type IndexedDataNodeType = DataNodeType & { index: number };
export type DataNodeType = DataEntry & {
  id: number;
  x: number;
  y: number;
  r: number;
  base_r: number;
  mainFontSize: number;
  subFontSize: number;
  selected: boolean;
};
export type IndexedVendorNodeType = VendorNodeType & { index: number };
export type VendorNodeType = {
  vendor: string;
  id: number;
  x: number;
  y: number;
  r: number;
  __type: "NodeVendorType";
};
export type NodeUnionType = DataNodeType | VendorNodeType;
export function isNodeVendorType(arg: NodeUnionType): arg is VendorNodeType {
  return (arg as VendorNodeType).__type === "NodeVendorType";
}
export type DataNodeSelectionType = Selection<
  BaseType | SVGGElement,
  IndexedDataNodeType,
  SVGGElement,
  unknown
>;
export type VendorNodeSelectionType = Selection<
  BaseType | SVGGElement,
  IndexedVendorNodeType,
  SVGGElement,
  unknown
>;
export type SVG = Selection<SVGSVGElement, unknown, HTMLElement, any>;
export type G = Selection<SVGGElement, unknown, HTMLElement, any>;
export type Rect = Selection<BaseType, unknown, HTMLElement, any>;

export enum SimulationForce {
  GRAVITY = "GRAVITY",
  LINK = "LINK",
  COLLISION = "COLLISION",
  VENDOR = "VENDOR",
}
