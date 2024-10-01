import { Pipe, PipeTransform } from "@angular/core";
import { Standard } from "../models/data.model";
import { ColorMap } from "../services/color.model";

@Pipe({ name: "colorMap", standalone: true })
export class ColorMapPipe implements PipeTransform {
  transform(value: Standard, map: ColorMap): string {
    const rgb = map.get(value)?.rgb();
    if (rgb == null) return "0, 0, 0";
    return `${rgb[0]}, ${rgb[1]}, ${rgb[2]}`;
  }
}
