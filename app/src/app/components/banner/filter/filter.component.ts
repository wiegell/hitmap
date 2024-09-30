import { Component, EventEmitter, Input, Output } from "@angular/core";
import { Filter } from "../../../services/search.model";

@Component({
  selector: "app-filter",
  standalone: true,
  imports: [],
  templateUrl: "./filter.component.html",
  styleUrl: "./filter.component.scss",
})
export class FilterComponent {
  @Input() filter?: Filter;
  @Output("remove") removeEmitter = new EventEmitter<boolean>();

  public iconPath = "/assets/icons/funnel.svg";

  remove() {
    this.removeEmitter.emit(true);
  }

  setCloseIcon(ev: Event) {
    ev.stopPropagation();
    this.iconPath = "/assets/icons/x.svg";
  }

  setFunnelIcon(ev: Event) {
    this.iconPath = "/assets/icons/funnel.svg";
  }
}
