import { Injectable } from "@angular/core";
import { Color, hex } from "chroma-js";
import { cloneDeep, isEqual } from "lodash-es";
import { BehaviorSubject, distinctUntilChanged, map, shareReplay } from "rxjs";
import { palettes } from "../helpers/color.palettes";
import { Standard } from "../models/data.model";
import { ColorMap } from "./color.model";

@Injectable({
  providedIn: "root",
})
export class ColorService {
  /**
   * @description
   * the first palette will have length = 0, the last length = 49
   */
  private colorMapSubject = new BehaviorSubject<ColorMap | undefined>(
    undefined
  );
  public colorMap$ = this.colorMapSubject.pipe(
    distinctUntilChanged(isEqual),
    shareReplay(1),
    map(cloneDeep)
  );

  public generateColorMap(standards: Standard[]) {
    const paletteToUse = palettes[standards.length];
    standards.sort();
    const entries: [Standard, Color][] = standards.map((standard, i) => [
      standard,
      hex(paletteToUse[i]),
    ]);
    this.colorMapSubject.next(new ColorMap(entries));
  }
}
