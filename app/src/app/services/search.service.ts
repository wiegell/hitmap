import { Injectable } from "@angular/core";
import { BehaviorSubject, distinctUntilChanged, shareReplay } from "rxjs";
import { SelectionService } from "./selection.service";

@Injectable({
  providedIn: "root",
})
export class SearchService {
  private searchStringSubject = new BehaviorSubject("");
  public searchString$ = this.searchStringSubject
    .asObservable()
    .pipe(shareReplay(1));

  constructor(public selectionService: SelectionService) {
    this.selectionService.selectedNode$
      .pipe(distinctUntilChanged())
      .subscribe(() => this.searchStringSubject.next(""));
  }

  setSearchString(str: string) {
    this.searchStringSubject.next(str);
  }
}
