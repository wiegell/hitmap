import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class SearchService {
  private searchStringSubject = new BehaviorSubject("");
  public searchString$ = this.searchStringSubject.asObservable();

  constructor() {}

  setSearchString(str: string) {
    this.searchStringSubject.next(str);
  }
}
