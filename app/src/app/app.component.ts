import { Component, ElementRef, HostListener, ViewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import {
  drag,
  Force,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  select,
  Simulation,
  svg,
  timer,
} from "d3";
import { cloneDeep } from "lodash-es";
import {
  G,
  NodeDataType,
  NodeSelectionType,
  NodeType,
  SimulationForce,
  SVG,
} from "./models/app.model";
import { DataEntry } from "./models/data.model";
import {
  combineLatest,
  from,
  map,
  of,
  share,
  shareReplay,
  withLatestFrom,
} from "rxjs";
import { AbbreviationPipe } from "./pipes/abbreviation.pipe";
import { createStandardToDataEntryMap } from "./helpers/data.helpers";
import { generateEdges } from "./helpers/edge.helpers";
import { Edge } from "./models/edge.model";
import { SelectionService } from "./services/selection.service";
import { InfoComponent } from "./components/info/info.component";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, InfoComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  @ViewChild("container") containerElement?: ElementRef;

  private abbreviationPipe = new AbbreviationPipe();
  private sim?: Simulation<NodeDataType, undefined>;

  public constructor(
    public infoService: SelectionService,
    public selectionService: SelectionService
  ) {}

  ngOnInit(): void {
    this.initVisual();
  }

  initVisual() {
    const svg = this.initSvg();
    const lineGroup = this.initLineGroup(svg);
    const nodeData$ = from(this.initNodeData()).pipe(shareReplay(1));
    const edgeData$ = nodeData$.pipe(
      map(createStandardToDataEntryMap),
      withLatestFrom(nodeData$),
      map(([standardMap, allEntries]) =>
        generateEdges(allEntries, standardMap)
      ),
      shareReplay(1)
    );

    combineLatest([nodeData$, edgeData$]).subscribe(([nodeData, edgeData]) => {
      const edgeSelection = this.initEdgeSelection(edgeData, lineGroup);
      const nodeSelection = this.initNodeSelection(nodeData, svg);

      this.sim = forceSimulation(nodeData)
        .force(
          SimulationForce.CENTER_X,
          forceX(window.innerWidth / 2).strength((d) => {
            return (
              d == this.selectionService.selectedNode ? 0.4 : 0.1
            ) as number;
          })
        )
        .force(
          SimulationForce.CENTER_Y,
          forceY(window.innerHeight / 2).strength((d) => {
            return (
              d == this.selectionService.selectedNode ? 0.5 : 0.1
            ) as number;
          })
        )
        // .force(
        //   SimulationForce.LINK,
        //   forceLink(edgeData)
        //     .strength(0.05)
        //     .distance(() => 300)
        // )
        .force(
          SimulationForce.COLLISION,
          forceCollide((d) =>
            d == this.selectionService.selectedNode ? 200 : d.r * 1.5
          )
        )
        .on("tick", ticked);

      nodeSelection
        .on("mouseover", (event, d) => {
          this.infoService.setHoveredNode(d);
          edgeSelection.attr("class", function (e) {
            if (
              d.index == (e.source as any).index ||
              d.index == (e.target as any).index
            ) {
              return "bold";
            }
            return "";
          });
        })
        .on("mouseout", (event, d) => {
          this.infoService.setHoveredNode(undefined);
          edgeSelection.attr("class", function (e) {
            return "";
          });
        })
        .on("mosedown", (event, d) => {
          console.log("trigger");
          this.infoService.setActiveNode(d);
          d.r = 200;
        })
        .on("mouseup", (event, d) => {
          this.infoService.setActiveNode(undefined);
          this.infoService.setSelectedNode(d);
          this.initializeForces(nodeData);
          this.sim!.alpha(0.5).restart();
        });

      function ticked() {
        nodeSelection.attr("transform", (d) => {
          return `translate(${d.x}, ${d.y})`;
        });
        edgeSelection
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);
      }
    });
  }

  initNodeData(): Promise<NodeDataType[]> {
    return fetch("/assets/data.json")
      .then((res) => res.text())
      .then((body) => {
        return (JSON.parse(body) as DataEntry[]).map(
          (d: DataEntry, i: number) => {
            return {
              ...d,
              id: i,
              x: window.innerWidth / 2,
              y: window.innerHeight / 2,
              r: 15 + d.approvedStandards.length * 1.5,
              selected: false,
            };
          }
        );
      });
  }

  initSvg() {
    const figure = select(`div.container`);
    return figure.append("svg").attr("class", "svg-container");
  }

  initLineGroup(svg: SVG) {
    return svg.append("g").attr("class", "line-group");
  }

  initNodeSelection(nodes: NodeDataType[], svg: SVG) {
    const g = svg
      .selectAll(".node")
      .data(nodes as unknown[] as NodeType[])
      .join("g")
      .attr("class", "node");

    const circle = g
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", "white")
      .attr("stroke", "black");

    const text = g
      .append("text")
      .text((d) => this.abbreviationPipe.transform(d.productName))
      .attr("stroke", "black")
      .attr("font-size", (d) =>
        Math.sqrt(
          d.r * 20 -
            Math.pow(
              this.abbreviationPipe.transform(d.productName).length * 20,
              0.85
            ) *
              10
        )
      )
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("class", "dot-text");

    return g;
  }

  initEdgeSelection(edges: Edge<DataEntry>[], lineGroup: G) {
    return lineGroup
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("class", "line");
  }

  initializeForces(nodes: NodeDataType[]) {
    this.sim!.force(SimulationForce.CENTER_X)!.initialize!(nodes, Math.random);
    this.sim!.force(SimulationForce.CENTER_Y)!.initialize!(nodes, Math.random);
    this.sim!.force(SimulationForce.COLLISION)!.initialize!(nodes, Math.random);
  }
}
