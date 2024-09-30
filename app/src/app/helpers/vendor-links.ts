import { SimulationLinkDatum } from "d3";

import { flatMap, groupBy } from "lodash-es";
import {
  DataNodeType,
  VendorNodeType,
  isNodeVendorType,
} from "../models/app.model";

export function linkDataNodesToVendors(
  nodes: (DataNodeType | VendorNodeType)[]
): SimulationLinkDatum<DataNodeType | VendorNodeType>[] {
  const dataNodesByVendor = groupBy(
    nodes.filter((node) => !isNodeVendorType(node)),
    (node) => node.vendor
  );
  const vendorNodesByVendor = groupBy(
    nodes.filter(isNodeVendorType),
    (node) => node.vendor
  );
  return flatMap(
    Object.entries(dataNodesByVendor).map(([vendor, nodes]) =>
      nodes.map((node) => {
        return {
          // There should only ever be one vendor node with the same name
          source: vendorNodesByVendor[vendor][0],
          target: node,
        };
      })
    )
  );
}
