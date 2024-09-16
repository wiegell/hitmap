import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class i18nService {
  private chosenLanguage = new BehaviorSubject<Language>("da");
  private texts = {
    supportedStandards: {
      en: "Supported standards",
      da: "Understøttede standarder",
    },
    test: {
      en: "Supported standards",
      da: "Understøttede standarder",
    },
  };

  public chosenLanguage$ = this.chosenLanguage.asObservable();

  public getText(textKey: TextKey): Text {
    return this.texts[textKey];
  }
  public setLanguage(language: Language) {
    this.chosenLanguage.next(language);
  }
}

export type TextKey = keyof i18nService["texts"];
export type Language = keyof Text;
export type Text = { en: string; da: string };
