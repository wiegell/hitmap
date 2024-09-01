import { AppComponent } from "../app.component";
import { Selection } from "d3";
import { DataEntry } from "./data.model";

export type NodeType = NodeDataType & { index: number };
export type NodeDataType = DataEntry & {
  id: number;
  x: number;
  y: number;
  r: number;
  selected: boolean;
};
export type NodeSelectionType = Selection<
  SVGCircleElement,
  NodeType,
  SVGSVGElement,
  unknown
>;
export type Edge = { source: number; target: number; id?: string };
export type SVG = Selection<SVGSVGElement, unknown, HTMLElement, any>;
