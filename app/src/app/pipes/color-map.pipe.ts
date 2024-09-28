import { Pipe, PipeTransform } from "@angular/core";
import { Standard } from "../models/data.model";
import { ColorMap } from "../services/color.model";

@Pipe({ name: "colorMap", standalone: true })
export class ColorMapPipe implements PipeTransform {
  transform(value: Standard, map: ColorMap): string {
    return map.get(value)?.hex() ?? "black";
  }
}
