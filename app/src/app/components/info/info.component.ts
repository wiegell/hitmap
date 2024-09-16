import { Component } from "@angular/core";
import { SelectionService } from "../../services/selection.service";
import { CommonModule } from "@angular/common";
import { i18nService } from "../../services/i18n.service";
import { i18nPipe } from "../../pipes/i18n.pipe";

@Component({
  selector: "app-info",
  standalone: true,
  imports: [CommonModule, i18nPipe],
  templateUrl: "./info.component.html",
  styleUrl: "./info.component.scss",
})
export class InfoComponent {
  constructor(
    public infoService: SelectionService,
    public i18nService: i18nService
  ) {}

  selectedNode$ = this.infoService.selectedNode$;
  hoveredNode$ = this.infoService.hoveredNode$;
}
