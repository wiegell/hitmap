import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "abbreviation",
  standalone: true,
})
export class AbbreviationPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      return "";
    }

    // Split the string by spaces or camelCase
    const words = value.split(/(?=[A-Z])|\s+/);

    // Create abbreviation by taking the first letter of each word and converting it to uppercase
    const abbreviation = words
      .map((word) => word.charAt(0).toUpperCase())
      .join("");

    return abbreviation;
  }
}
