import { zoomIdentity, ZoomTransform } from "d3";
import { G } from "../models/app.model";

export function updateNestedG(
  parentTransform: ZoomTransform,
  nestedGElement: G
) {
  // Get the current zoom transform of the parent g element
  const parentScale = parentTransform.k;

  // Calculate the inverse scale
  const inverseScale = 1 / parentScale;

  // Calculate the inverse translation
  const inverseTx = -parentTransform.x * inverseScale;
  const inverseTy = -parentTransform.y * inverseScale;

  // Create a new transform for the nested g element
  const nestedTransform = zoomIdentity
    .translate(inverseTx, inverseTy)
    .scale(inverseScale);

  // Apply the new transform to the nested g element
  nestedGElement.select("rect").attr("transform", nestedTransform.toString());
}
