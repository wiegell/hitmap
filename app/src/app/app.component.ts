import { Component, ElementRef, ViewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import {
  D3ZoomEvent,
  easeCubicOut,
  forceLink,
  forceSimulation,
  select,
  Selection,
  Simulation,
  zoom,
  zoomIdentity,
  ZoomTransform,
} from "d3";
import { cloneDeep } from "lodash-es";
import {
  combineLatest,
  from,
  map,
  shareReplay,
  Subject,
  take,
  withLatestFrom,
} from "rxjs";
import { InfoComponent } from "./components/info/info.component";
import { vendorCollide } from "./custom-forces/vendor-collide";
import {
  appendRadialGradient,
  getFontColor,
  nodeScale,
} from "./helpers/color.helpers";
import { createStandardToDataEntryMap } from "./helpers/data.helpers";
import { calculateFontSizeForCircle } from "./helpers/font-size.helpers";
import { randomXInWindow, randomYInWindow } from "./helpers/position.helpers";
import { linkDataNodesToVendors } from "./helpers/vendor-links";
import {
  DataNodeSelectionType,
  DataNodeType,
  G,
  IndexedDataNodeType,
  IndexedVendorNodeType,
  SimulationForce,
  VendorNodeSelectionType,
  VendorNodeType,
} from "./models/app.model";
import { DataEntry } from "./models/data.model";
import { Edge } from "./models/edge.model";
import { AbbreviationPipe } from "./pipes/abbreviation.pipe";
import { OptionsService } from "./services/options.service";
import { SelectionService } from "./services/selection.service";

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
  hoverRadiusPxAddition = 1;
  activeRadiusPxAddition = 3;
  circlePaddingFraction = 0.1;
  vendorNodeTextPxWidth = 50;
  vendorNodeCircleRadius = 100;
  interVendorDistance = this.vendorNodeCircleRadius * 2;
  approvedStandardsGrowthFactor = 0.5;

  // Nodes
  dataNodes$ = from(
    this.initDataNodes(
      (d) => d.productName.length,
      (d) => (d.vendor ?? "").length,
      this.circlePaddingFraction
    )
  ).pipe(shareReplay(1));
  vendorNodes$ = this.dataNodes$.pipe(
    map((dataNodes) => {
      const vendors = Array.from(
        new Set(dataNodes.map((node) => node.vendor ?? "")).values()
      );
      const vendorNodes: VendorNodeType[] = vendors.map((vendor, i) => ({
        vendor,
        id: i,
        r: this.vendorNodeCircleRadius,
        x: randomXInWindow(),
        y: randomYInWindow(),
        __type: "NodeVendorType",
      }));
      return vendorNodes;
    }),
    shareReplay(1)
  );
  // Re index nodes to come after the vendor nodes to render them
  // after the vendors in the DOM
  dataNodesReIndexed$ = combineLatest([
    this.dataNodes$,
    this.vendorNodes$,
  ]).pipe(
    map(([dataNodes, vendorNodes]) => {
      const clonedNodes = cloneDeep(dataNodes);
      clonedNodes.forEach((node, i) => {
        node.id = vendorNodes.length + i;
      });
      return clonedNodes;
    }),
    shareReplay(1)
  );

  // Edges
  edgeData$ = this.dataNodesReIndexed$.pipe(
    map(createStandardToDataEntryMap),
    withLatestFrom(this.dataNodesReIndexed$),
    // map(([standardMap, allEntries]) => generateEdges(allEntries, standardMap)),
    map(() => []),
    shareReplay(1)
  );

  // D3 Simulation
  sim?: Simulation<DataNodeType | VendorNodeType, undefined>;

  // D3 Selections
  svg$ = this.domCreated$.pipe(map(this.initSvg), shareReplay(1));
  containerGraph$ = this.svg$.pipe(
    map((svg) => svg.append("g")),
    shareReplay(1)
  );
  lineGroup$ = this.containerGraph$.pipe(
    map(this.initLineGroup),
    shareReplay(1)
  );
  edgeSelection$ = combineLatest([this.edgeData$, this.lineGroup$]).pipe(
    map(([edgeData, lineGroup]) => this.initEdgeSelection(edgeData, lineGroup)),
    shareReplay(1)
  );
  dataNodeSelection$ = combineLatest([
    this.dataNodesReIndexed$,
    this.containerGraph$,
  ]).pipe(
    map(([dataNodes, svg]) => this.initDataNodeSelection(dataNodes, svg)),
    shareReplay(1)
  );
  vendorNodeSelection$ = combineLatest([
    this.vendorNodes$,
    this.containerGraph$,
  ]).pipe(
    map(([vendorNodes, svg]) => this.initVendorNodeSelection(vendorNodes, svg)),
    shareReplay(1)
  );

  public constructor(
    public infoService: SelectionService,
    public selectionService: SelectionService,
    public optionsService: OptionsService
  ) {
    // Kickoff simulation
    combineLatest([
      this.dataNodesReIndexed$,
      this.dataNodeSelection$,
      this.vendorNodes$,
      this.vendorNodeSelection$,
      this.edgeSelection$,
    ]).subscribe(
      ([
        dataNodes,
        dataNodeSelection,
        vendorNodes,
        vendorNodeSelection,
        edgeSelection,
      ]) => {
        const nodes = [...vendorNodes, ...dataNodes];
        this.initSimulation(nodes, () => {
          vendorNodeSelection.attr("transform", (d) => {
            return `translate(${d.x}, ${d.y})`;
          });
          dataNodeSelection.attr("transform", (d) => {
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

    // Setup zoom event handler
    combineLatest([
      this.svg$,
      // This is the initial value read from url
      this.optionsService.zoom$.pipe(take(1)),
      this.containerGraph$,
    ]).subscribe(([svg, zoomOptions, g]) => {
      // TODO: This handler is probably being set more than once
      // on multiple emits
      const z = zoom().on("zoom", (e: D3ZoomEvent<Element, unknown>) => {
        this.optionsService.zoomTransform(e.transform);
      });
      (svg as unknown as Selection<Element, unknown, HTMLElement, any>)
        .call(z)
        .call(
          z.transform,
          zoomIdentity
            .translate(zoomOptions.x, zoomOptions.y)
            .scale(zoomOptions.k)
        );
    });
    // Perform zoom action
    combineLatest([this.optionsService.zoom$, this.containerGraph$]).subscribe(
      ([zoomTransform, g]) => {
        if (zoomTransform instanceof ZoomTransform) {
          g.attr("transform", zoomTransform.toString());
        } else {
          const instantiated = new ZoomTransform(
            zoomTransform.k,
            zoomTransform.x,
            zoomTransform.y
          );
          g.attr("transform", instantiated.toString());
        }
      }
    );

    // Effects, hover edges
    combineLatest([
      this.selectionService.hoveredNode$,
      this.edgeSelection$,
      this.dataNodeSelection$,
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
      this.dataNodeSelection$,
      this.selectionService.selectedNode$,
      this.selectionService.hoveredNode$,
    ]).subscribe(([nodeSelection, selectedNode, hoveredNode]) => {
      // Node, hover
      nodeSelection
        .filter(
          (d: IndexedDataNodeType) => hoveredNode === d && selectedNode !== d
        )
        .select("circle")
        .transition()
        .duration(200)
        .ease(easeCubicOut)
        .attr("stroke-width", 2)
        .attr("r", (d) => d.r + this.hoverRadiusPxAddition);
      nodeSelection
        .filter(
          (d: IndexedDataNodeType) => hoveredNode !== d && selectedNode !== d
        )
        .select("circle")
        .transition()
        .duration(200)
        .ease(easeCubicOut)
        .attr("stroke-width", 1)
        .attr("r", (d) => d.base_r);
    });

    // Effects, nodes active
    combineLatest([
      this.dataNodeSelection$,
      this.selectionService.selectedNode$,
      this.selectionService.activeNode$,
    ]).subscribe(([nodeSelection, selectedNode, activeNode]) => {
      // Node, active
      nodeSelection
        .filter(
          (d: IndexedDataNodeType) => activeNode === d && selectedNode !== d
        )
        .select("circle")
        .attr("r", (d) => d.r + this.activeRadiusPxAddition);
      nodeSelection
        .filter(
          (d: IndexedDataNodeType) => activeNode !== d && selectedNode !== d
        )
        .select("circle")
        .attr("r", (d) => d.base_r);
    });

    // Mouse handlers
    combineLatest([
      this.dataNodesReIndexed$,
      this.vendorNodes$,
      this.dataNodeSelection$,
    ]).subscribe(([dataNodes, vendorNodes, nodeSelection]) => {
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
          this.infoService.setActiveNode(undefined);
          this.infoService.setSelectedNode(d);
          this.initializeForces([...dataNodes, ...vendorNodes]);
          this.sim!.alpha(0.5).restart();
        });
    });
  }

  ngAfterViewInit(): void {
    this.domCreatedSubject.next(true);
  }

  initSimulation(nodes: (DataNodeType | VendorNodeType)[], ticked: () => void) {
    const collisionForce = vendorCollide(
      (d: DataNodeType | VendorNodeType) => {
        if (d == this.selectionService.selectedNode) {
          return d.r * 2;
        } else {
          return d.r;
        }
      },
      this.vendorNodeTextPxWidth,
      this.interVendorDistance
    );
    collisionForce.strength(0.2);
    this.sim = forceSimulation(nodes)
      .force(SimulationForce.COLLISION, collisionForce)
      // .force(SimulationForce.GRAVITY, forceManyBody().strength(-0.1))
      .force(
        SimulationForce.VENDOR,
        forceLink(linkDataNodesToVendors(nodes)).strength(0.3)
      )
      .on("tick", ticked);
  }

  initDataNodes(
    textLengthForMainFontSizeCalculation: (d: DataEntry) => number,
    textLengthForSubFontSizeCalculation: (d: DataEntry) => number,
    paddingFraction: number
  ): Promise<DataNodeType[]> {
    return fetch("/assets/data.json")
      .then((res) => res.text())
      .then((body) => {
        return (JSON.parse(body) as DataEntry[]).map(
          (d: DataEntry, i: number) => {
            const dataNode: Omit<
              Omit<DataNodeType, "mainFontSize">,
              "subFontSize"
            > = {
              ...d,
              id: i,
              x: randomXInWindow(),
              y: randomYInWindow(),
              r:
                30 +
                d.approvedStandards.length * this.approvedStandardsGrowthFactor,
              base_r:
                30 +
                d.approvedStandards.length * this.approvedStandardsGrowthFactor,
              selected: false,
            };
            const mainFontSize = calculateFontSizeForCircle(
              textLengthForMainFontSizeCalculation(d),
              dataNode.r,
              paddingFraction
            );
            const subFontSize = calculateFontSizeForCircle(
              textLengthForSubFontSizeCalculation(d),
              dataNode.r,
              paddingFraction,
              (mainFontSize / 2) * 1.2
            );
            return { ...dataNode, mainFontSize, subFontSize };
          }
        );
      });
  }

  initSvg() {
    const figure = select(`div.container`);
    const svg = figure.append("svg").attr("class", "svg-container");
    appendRadialGradient(svg);
    return svg;
  }

  initLineGroup(svg: G) {
    return svg.append("g").attr("class", "line-group");
  }

  initDataNodeSelection(nodes: DataNodeType[], svg: G): DataNodeSelectionType {
    const g = svg
      .selectAll(".data")
      .data(nodes as IndexedDataNodeType[])
      .join("g")
      .attr("class", "node data");

    const circle = g
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => nodeScale(d.approvedStandards.length / 30).hex());

    const mainText = g
      .append("text")
      .text((d) => d.productName)
      .attr("font-size", (d) => d.mainFontSize)
      .attr("fill", (d) =>
        getFontColor(nodeScale(d.approvedStandards.length / 30))
      )
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("class", "dot-text");

    // TODO: Position this correctly
    // const subText = g
    //   .append("text")
    //   .text((d) => d.vendor ?? "")
    //   .attr("font-size", (d) => d.subFontSize)
    //   .attr("text-anchor", "middle")
    //   .attr("dominant-baseline", "central")
    //   .attr("transform", (d) => `translate(0,${d.mainFontSize * 0.75})`)
    //   .attr("class", "dot-text");

    return g;
  }

  initVendorNodeSelection(
    nodes: VendorNodeType[],
    container: G
  ): VendorNodeSelectionType {
    const g = container
      .selectAll(".vendor")
      .data(nodes as IndexedVendorNodeType[])
      .join((enter) =>
        enter
          .insert("g", ":first-child") // Insert new nodes as first children
          .attr("class", "node vendor")
      )
      .attr("class", "node vendor");

    const circle = g
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", "url(#radial-gradient)");

    const mainText = g
      .append("text")
      .text((d) => d.vendor)
      .attr("font-size", (d) =>
        calculateFontSizeForCircle(
          d.vendor.length,
          this.vendorNodeTextPxWidth,
          this.circlePaddingFraction
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

  initializeForces(nodes: (DataNodeType | VendorNodeType)[]) {
    console.log("nodes", nodes);
    this.sim!.force(SimulationForce.VENDOR)!.initialize!(nodes, Math.random);
    this.sim!.force(SimulationForce.GRAVITY)!.initialize!(nodes, Math.random);
    this.sim!.force(SimulationForce.COLLISION)!.initialize!(nodes, Math.random);
  }
}
