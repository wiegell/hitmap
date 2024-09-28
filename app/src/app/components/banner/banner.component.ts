import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { isEqual } from "lodash-es";
import { distinctUntilChanged, map, shareReplay, take } from "rxjs";
import { OptionsService } from "../../services/options.service";
import { Filter, FilterType } from "../../services/search.model";
import { SearchService } from "../../services/search.service";
import { FilterComponent } from "./filter/filter.component";
import { SearchComponent } from "./search/search/search.component";

@Component({
  selector: "app-banner",
  standalone: true,
  imports: [CommonModule, SearchComponent, FilterComponent],
  templateUrl: "./banner.component.html",
  styleUrl: "./banner.component.scss",
})
export class BannerComponent {
  public searchStringFromService$ = this.searchService.searchString$;
  public filtersApplied$ = this.optionsService.generalOptions$.pipe(
    map((options) => options.filters),
    distinctUntilChanged(isEqual),
    shareReplay(1)
  );

  constructor(
    public searchService: SearchService,
    public optionsService: OptionsService
  ) {}

  searchTextUpdated(str: string) {
    this.searchService.setSearchString(str);
  }

  confirmSearch() {
    this.searchStringFromService$.pipe(take(1)).subscribe((str) => {
      this.optionsService.addFilter({ str, type: FilterType.wildcard });
      this.searchService.setSearchString("");
    });
  }

  removeFilter(filter: Filter) {
    this.optionsService.removeFilter(filter);
  }
}
