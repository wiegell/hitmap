import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { SearchService } from "../../services/search.service";
import { SearchComponent } from "./search/search/search.component";

@Component({
  selector: "app-banner",
  standalone: true,
  imports: [CommonModule, SearchComponent],
  templateUrl: "./banner.component.html",
  styleUrl: "./banner.component.scss",
})
export class BannerComponent {
  public searchStringFromService$ = this.searchService.searchString$;

  constructor(public searchService: SearchService) {}

  searchTextUpdated(str: string) {
    this.searchService.setSearchString(str);
  }

  confirmSearch() {
    console.log("");
  }
}
