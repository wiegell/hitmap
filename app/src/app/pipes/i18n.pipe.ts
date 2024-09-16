import { Pipe, PipeTransform } from "@angular/core";
import { Language, Text } from "../services/i18n.service";

@Pipe({ name: "i18n", standalone: true })
export class i18nPipe implements PipeTransform {
  transform(value: Text, chosenLanguage: Language | null): string {
    if (chosenLanguage == null) {
      return "";
    }
    return value[chosenLanguage];
  }
}
