export class DataRecord {
  constructor(
    public uuid: string,
    public productName?: string,
    public vendor?: string,
    public systemType?: string,
    public approvedStandards: Standard[] = []
  ) {}

  /**
   * @description hash of productName, vendor and systemType
   * (so ignores approvedStandards)
   */
  public get hash() {
    return this.productName ?? "" + this.vendor ?? "" + this.systemType ?? "";
  }
}

export type Standard = {
  channel?: Channel;
  id?: string;
  name: string;
  version?: string;
};

export enum Channel {
  Receive,
  Send,
}
