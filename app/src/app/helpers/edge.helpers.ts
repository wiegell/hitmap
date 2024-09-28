import { flatMap } from "lodash-es";

import { DataEntry } from "../models/data.model";
import { Edge } from "../models/edge.model";
import { StandardMap } from "./data.helpers";

export function generateEdges(
  allEntries: DataEntry[],
  standardMap: StandardMap,
  onlyForNode?: DataEntry | null
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
  if (onlyForNode !== null) {
    return map.filter(
      (edge) => edge.source == onlyForNode || edge.target == onlyForNode
    );
  }
  return map;
}
