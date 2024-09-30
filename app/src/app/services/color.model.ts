import { Color } from "chroma-js";
import { Standard } from "../models/data.model";

export class ColorMap {
  private _map: Map<string, Color>;

  public get(standard?: Standard) {
    if (standard == null) return undefined;
    return this._map.get(ColorMap.hash(standard));
  }
  public set(standard: Standard, color: Color) {
    return this._map.set(ColorMap.hash(standard), color);
  }
  public has(standard: Standard) {
    return this._map.has(ColorMap.hash(standard));
  }

  constructor(entries?: readonly (readonly [Standard, Color])[]) {
    if (entries != null) {
      this._map = new Map(
        entries.map(([standard, color]) => [ColorMap.hash(standard), color])
      );
    } else {
      this._map = new Map<string, Color>();
    }
  }

  private static hash(standard: Standard): string {
    return JSON.stringify(standard);
  }
}
