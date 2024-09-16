import { flatMap, map } from "lodash-es";

import { Edge } from "../models/edge.model";
import { StandardMap } from "./data.helpers";
import { DataEntry } from "../models/data.model";

export function generateEdges(
  allEntries: DataEntry[],
  standardMap: StandardMap
): Edge<DataEntry>[] {
  const map = flatMap(
    flatMap(
      allEntries.map((entry) => {
        return entry.approvedStandards.map((approvedStandard) =>
          (standardMap.get(approvedStandard) ?? [])
            .map((targetEntry) => ({
              source: entry,
              target: targetEntry,
              standard: approvedStandard,
            }))
            .filter((entry) => entry.source !== entry.target)
        );
      })
    )
  );
  console.log("map", standardMap);
  return map;
}
