import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ColorMapPipe } from "../../pipes/color-map.pipe";
import { i18nPipe } from "../../pipes/i18n.pipe";
import { ColorService } from "../../services/color.service";
import { i18nService } from "../../services/i18n.service";
import { OptionsService } from "../../services/options.service";
import { FilterType } from "../../services/search.model";
import { SearchService } from "../../services/search.service";
import { SelectionService } from "../../services/selection.service";

@Component({
  selector: "app-info",
  standalone: true,
  imports: [CommonModule, i18nPipe, ColorMapPipe],
  templateUrl: "./info.component.html",
  styleUrl: "./info.component.scss",
})
export class InfoComponent {
  selectedNode$ = this.selectionService.selectedNode$;
  hoveredNode$ = this.selectionService.hoveredNode$;
  colorMap$ = this.colorService.colorMap$;

  constructor(
    public selectionService: SelectionService,
    public searchService: SearchService,
    public optionsService: OptionsService,
    public i18nService: i18nService,
    public colorService: ColorService
  ) {}

  mouseOver(standard: string) {
    this.searchService.setSearchString(standard);
  }

  click(standard: string) {
    this.optionsService.addFilter({ str: standard, type: FilterType.wildcard });
  }
}
