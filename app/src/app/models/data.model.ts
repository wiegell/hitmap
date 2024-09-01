export type DataEntry = {
  productName: string;
  producer?: string;
  approvedStandards: Standard[];
};

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
