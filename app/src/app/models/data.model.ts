import { SimulationNodeDatum } from "d3";

export interface DataEntry extends SimulationNodeDatum {
  productName: string;
  vendor?: string;
  systemType?: string;
  approvedStandards: Standard[];
}

export type Standard = {
  channel?: Channel;
  id: string;
  name: string;
  version?: string;
};

export enum Channel {
  Receive,
  Send,
}
