import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { nodeScale } from "../../helpers/color.helpers";
import { i18nPipe } from "../../pipes/i18n.pipe";
import { i18nService } from "../../services/i18n.service";

@Component({
  selector: "app-legend",
  standalone: true,
  imports: [i18nPipe, CommonModule],
  templateUrl: "./legend.component.html",
  styleUrl: "./legend.component.scss",
})
export class LegendComponent {
  public linearGradient = "";
  // public text = this.i18nService.getText("supportedStandards");

  constructor(public i18nService: i18nService) {
    this.linearGradient = "linear-gradient(90deg,";
    const iterations = 100;
    for (let i = 0; i <= iterations; i++) {
      if (i !== iterations) {
        this.linearGradient += ` ${nodeScale(i / iterations)} ${i}%,`;
      } else {
        this.linearGradient += ` ${nodeScale(i / iterations)} ${i}%)`;
      }
    }
    console.log("grad", this.linearGradient);
  }
}
