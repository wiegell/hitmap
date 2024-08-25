import { AppComponent } from "./app.component";
import { Selection } from "d3";

export type NodeType = { x: number; y: number; r: number };
export type NodeSelectionType = Selection<
  SVGCircleElement,
  NodeType,
  SVGSVGElement,
  unknown
>;
export type Edge = { source: number; target: number; id?: string };
export type SVG = Selection<SVGSVGElement, unknown, HTMLElement, any>;
