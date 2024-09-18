import { Component, ElementRef, HostListener, ViewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import {
  active,
  drag,
  easeCubicOut,
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
  zoom,
  ZoomBehavior,
  zoomIdentity,
  zoomTransform,
  D3ZoomEvent,
  Selection,
} from "d3";
import { cloneDeep, transform } from "lodash-es";
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
  distinctUntilChanged,
  from,
  map,
  multicast,
  of,
  ReplaySubject,
  share,
  shareReplay,
  Subject,
  take,
  tap,
  withLatestFrom,
} from "rxjs";
import { AbbreviationPipe } from "./pipes/abbreviation.pipe";
import { createStandardToDataEntryMap } from "./helpers/data.helpers";
import { generateEdges } from "./helpers/edge.helpers";
import { Edge } from "./models/edge.model";
import { SelectionService } from "./services/selection.service";
import { InfoComponent } from "./components/info/info.component";
import { consumerBeforeComputation } from "@angular/core/primitives/signals";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet, InfoComponent],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  // Misc
  @ViewChild("container") containerElement?: ElementRef;
  abbreviationPipe = new AbbreviationPipe();
  domCreatedSubject = new Subject<true>();
  domCreated$ = this.domCreatedSubject.asObservable();

  // Visual constants
  hoverRadiusAddition = 1;
  activeRadiusAddition = 3;

  // Data
  nodeData$ = from(this.initNodeData()).pipe(shareReplay(1));
  edgeData$ = this.nodeData$.pipe(
    map(createStandardToDataEntryMap),
    withLatestFrom(this.nodeData$),
    map(([standardMap, allEntries]) => generateEdges(allEntries, standardMap)),
    shareReplay(1)
  );

  // D3 Simulation
  sim?: Simulation<NodeDataType, undefined>;

  // D3 Selections
  svg$ = this.domCreated$.pipe(map(this.initSvg), share());
  containerGraph$ = this.svg$.pipe(
    map((svg) => svg.append("g")),
    share()
  );
  lineGroup$ = this.containerGraph$.pipe(map(this.initLineGroup), share());
  edgeSelection$ = combineLatest([this.edgeData$, this.lineGroup$]).pipe(
    map(([edgeData, lineGroup]) => this.initEdgeSelection(edgeData, lineGroup)),
    share()
  );
  nodeSelection$ = combineLatest([this.nodeData$, this.containerGraph$]).pipe(
    map(([nodeData, svg]) => this.initNodeSelection(nodeData, svg)),
    share()
  );

  public constructor(
    public infoService: SelectionService,
    public selectionService: SelectionService
  ) {
    // Kickoff simulation
    combineLatest([this.nodeSelection$, this.edgeSelection$]).subscribe(
      ([nodeSelection, edgeSelection]) => {
        this.initSimulation(() => {
          nodeSelection.attr("transform", (d) => {
            return `translate(${d.x}, ${d.y})`;
          });
          edgeSelection
            .attr("x1", (d: any) => d.source.x)
            .attr("y1", (d: any) => d.source.y)
            .attr("x2", (d: any) => d.target.x)
            .attr("y2", (d: any) => d.target.y);
        });
      }
    );

    // Setup zoom
    combineLatest([this.svg$, this.containerGraph$]).subscribe(([svg, g]) => {
      const z = zoom().on("zoom", (e: D3ZoomEvent<Element, unknown>) => {
        g.attr("transform", e.transform.toString());
      });
      (svg as unknown as Selection<Element, unknown, HTMLElement, any>)
        .call(z)
        .call(z.transform, zoomIdentity);
    });

    // Effects, hover edges
    combineLatest([
      this.selectionService.hoveredNode$,
      this.edgeSelection$,
      this.nodeSelection$,
    ]).subscribe(([hoveredNode, edgeSelection]) => {
      // Edges, hover
      edgeSelection.attr("class", function (e) {
        if (
          hoveredNode?.index == (e.source as any).index ||
          hoveredNode?.index == (e.target as any).index
        ) {
          return "bold";
        }
        return "";
      });
    });

    // Effects, hover nodes
    combineLatest([
      this.nodeSelection$,
      this.selectionService.selectedNode$,
      this.selectionService.hoveredNode$,
    ]).subscribe(([nodeSelection, selectedNode, hoveredNode]) => {
      // Node, hover
      nodeSelection
        .filter((d: NodeType) => hoveredNode === d && selectedNode !== d)
        .select("circle")
        .transition()
        .duration(200)
        .ease(easeCubicOut)
        .attr("stroke-width", 2)
        .attr("r", (d) => d.r + this.hoverRadiusAddition);
      nodeSelection
        .filter((d: NodeType) => hoveredNode !== d && selectedNode !== d)
        .select("circle")
        .transition()
        .duration(200)
        .ease(easeCubicOut)
        .attr("stroke-width", 1)
        .attr("r", (d) => d.base_r);
    });

    // Effects, nodes active
    combineLatest([
      this.nodeSelection$,
      this.selectionService.selectedNode$,
      this.selectionService.activeNode$,
    ]).subscribe(([nodeSelection, selectedNode, activeNode]) => {
      // Node, active
      nodeSelection
        .filter((d: NodeType) => activeNode === d && selectedNode !== d)
        .select("circle")
        .attr("r", (d) => d.r + this.activeRadiusAddition);
      nodeSelection
        .filter((d: NodeType) => activeNode !== d && selectedNode !== d)
        .select("circle")
        .attr("r", (d) => d.base_r);
    });

    // Mouse handlers
    combineLatest([this.nodeData$, this.nodeSelection$]).subscribe(
      ([nodeData, nodeSelection]) => {
        nodeSelection
          .on("mouseover", (event, d) => {
            this.infoService.setHoveredNode(d);
          })
          .on("mouseout", (event, d) => {
            this.infoService.setHoveredNode(this.infoService.selectedNode);
          })
          .on("mousedown", (event, d) => {
            // stopPropagation is needed for the zoom handler not to
            // consume the mouseup event for some reason
            event.stopPropagation();
            this.infoService.setActiveNode(d);
          })
          .on("mouseup", (event, d) => {
            console.log("mouseup");
            this.infoService.setActiveNode(undefined);
            this.infoService.setSelectedNode(d);
            this.initializeForces(nodeData);
            this.sim!.alpha(0.5).restart();
          });
      }
    );
  }

  ngAfterViewInit(): void {
    this.domCreatedSubject.next(true);
  }

  initSimulation(ticked: () => void) {
    combineLatest([this.nodeData$, this.edgeData$]).subscribe(
      ([nodeData, edgeData]) => {
        this.sim = forceSimulation(nodeData)
          .force(
            SimulationForce.CENTER_X,
            forceX(window.innerWidth / 2).strength((d) => {
              return (
                d == this.selectionService.selectedNode ? 0.1 : 0.1
              ) as number;
            })
          )
          .force(
            SimulationForce.CENTER_Y,
            forceY(window.innerHeight / 2).strength((d) => {
              return (
                d == this.selectionService.selectedNode ? 0.1 : 0.1
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
              d == this.selectionService.selectedNode ? 250 : d.r * 1.5
            )
          )
          .on("tick", ticked);
      }
    );
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
              base_r: 15 + d.approvedStandards.length * 1.5,
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

  initLineGroup(svg: G) {
    return svg.append("g").attr("class", "line-group");
  }

  initNodeSelection(nodes: NodeDataType[], svg: G) {
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
