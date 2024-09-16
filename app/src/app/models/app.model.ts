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
export type SVG = Selection<SVGSVGElement, unknown, HTMLElement, any>;
export type G = Selection<SVGGElement, unknown, HTMLElement, any>;

export enum SimulationForce {
  CENTER = "CENTER",
  CENTER_X = "CENTER_X",
  CENTER_Y = "CENTER_Y",
  LINK = "LINK",
  COLLISION = "COLLISION",
}
