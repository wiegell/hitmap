import { DataEntry, Standard } from "../models/data.model";

export function createStandardToDataEntryMap(
  dataEntries: DataEntry[]
): StandardMap {
  const standardToDataEntryMap = new StandardMap();

  dataEntries.forEach((dataEntry) => {
    dataEntry.approvedStandards.forEach((standard) => {
      if (!standardToDataEntryMap.has(standard)) {
        standardToDataEntryMap.set(standard, []);
      }
      standardToDataEntryMap.get(standard)!.push(dataEntry);
    });
  });

  return standardToDataEntryMap;
}

export class StandardMap {
  _map = new Map<string, DataEntry[]>();

  private static mapKeyIdentifier(standard: Standard): string {
    return standard.name + standard.version;
  }
  public get(standard: Standard) {
    return this._map.get(StandardMap.mapKeyIdentifier(standard));
  }
  public set(standard: Standard, entries: DataEntry[]) {
    return this._map.set(StandardMap.mapKeyIdentifier(standard), entries);
  }
  public has(standard: Standard) {
    return this._map.has(StandardMap.mapKeyIdentifier(standard));
  }
}
