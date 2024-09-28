import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { RouterOutlet } from "@angular/router";
import { BannerComponent } from "./components/banner/banner.component";
import { GraphComponent } from "./components/graph/graph.component";
import { InfoComponent } from "./components/info/info.component";
import { LegendComponent } from "./components/legend/legend.component";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [
    RouterOutlet,
    InfoComponent,
    BannerComponent,
    LegendComponent,
    GraphComponent,
    FormsModule,
  ],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {}
