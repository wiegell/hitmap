import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ColorMapPipe } from "../../pipes/color-map.pipe";
import { i18nPipe } from "../../pipes/i18n.pipe";
import { ColorService } from "../../services/color.service";
import { i18nService } from "../../services/i18n.service";
import { SelectionService } from "../../services/selection.service";

@Component({
  selector: "app-info",
  standalone: true,
  imports: [CommonModule, i18nPipe, ColorMapPipe],
  templateUrl: "./info.component.html",
  styleUrl: "./info.component.scss",
})
export class InfoComponent {
  selectedNode$ = this.infoService.selectedNode$;
  hoveredNode$ = this.infoService.hoveredNode$;
  colorMap$ = this.colorService.colorMap$;

  constructor(
    public infoService: SelectionService,
    public i18nService: i18nService,
    public colorService: ColorService
  ) {}
}
