import { Component, ElementRef, ViewChild } from "@angular/core";
import {
  D3ZoomEvent,
  easeCubicOut,
  forceCenter,
  forceLink,
  forceSimulation,
  select,
  Selection,
  Simulation,
  zoom,
  zoomIdentity,
  ZoomTransform,
} from "d3";
import { cloneDeep, groupBy } from "lodash-es";
import {
  combineLatest,
  from,
  map,
  shareReplay,
  Subject,
  take,
  tap,
} from "rxjs";
import { vendorCollide } from "../../custom-forces/vendor-collide";
import {
  appendGradients,
  getFontColor,
  nodeScale,
} from "../../helpers/color.helpers";
import { createStandardToDataEntryMap } from "../../helpers/data.helpers";
import { generateEdges } from "../../helpers/edge.helpers";
import { calculateFontSizeForCircle } from "../../helpers/font-size.helpers";
import {
  randomXInWindow,
  randomYInWindow,
} from "../../helpers/position.helpers";
import { linkDataNodesToVendors } from "../../helpers/vendor-links";
import { inverseTranslateNestedRect } from "../../helpers/zoom.helpers";
import {
  DataNodeSelectionType,
  DataNodeType,
  G,
  IndexedDataNodeType,
  IndexedVendorNodeType,
  SimulationForce,
  SVG,
  VendorNodeSelectionType,
  VendorNodeType,
} from "../../models/app.model";
import { DataEntry } from "../../models/data.model";
import { Edge } from "../../models/edge.model";
import { ColorService } from "../../services/color.service";
import { OptionsService } from "../../services/options.service";
import { SearchService } from "../../services/search.service";
import { SelectionService } from "../../services/selection.service";

@Component({
  selector: "app-graph",
  standalone: true,
  imports: [],
  templateUrl: "./graph.component.html",
  styleUrl: "./graph.component.scss",
})
export class GraphComponent {
  // Misc
  @ViewChild("container") containerElement?: ElementRef;
  domCreatedSubject = new Subject<true>();
  domCreated$ = this.domCreatedSubject.asObservable();

  // Visual constants
  hoverRadiusPxAddition = 1;
  activeRadiusPxAddition = 3;
  circlePaddingFraction = 0.1;
  vendorNodeTextPxWidth = 50;
  vendorNodeCircleRadius = 100;
  interVendorDistance = this.vendorNodeCircleRadius * 1.0;
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
      const dataNodesByVendor = groupBy(dataNodes, (node) => node.vendor);
      const vendorNodes: VendorNodeType[] = Object.entries(
        dataNodesByVendor
      ).map(([vendor, dataNodesFromCurrentVendor], i) => ({
        vendor,
        id: i,
        r: this.vendorNodeCircleRadius + dataNodesFromCurrentVendor.length * 10,
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
  edgeData$ = combineLatest([
    this.dataNodesReIndexed$,
    this.selectionService.selectedNode$,
  ]).pipe(
    map(([allEntries, selectedNode]) => {
      const map = createStandardToDataEntryMap(allEntries);
      return generateEdges(allEntries, map, selectedNode);
    }),
    tap((edges) => console.log("edgeemit", edges)),
    shareReplay(1)
  );

  // D3 Simulation
  sim?: Simulation<DataNodeType | VendorNodeType, undefined>;

  // D3 Selections
  svg$ = this.domCreated$.pipe(map(this.initSvg), shareReplay(1));
  containerGraph$ = this.svg$.pipe(
    map(this.initContainerGraph),
    shareReplay(1)
  );
  searchBackDrop$ = this.containerGraph$.pipe(
    map(this.initSearchBackDrop),
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
    public colorService: ColorService,
    public selectionService: SelectionService,
    public searchService: SearchService,
    public optionsService: OptionsService
  ) {
    // Kickoff and update simulation
    combineLatest([
      this.dataNodesReIndexed$,
      this.dataNodeSelection$,
      this.vendorNodes$,
      this.vendorNodeSelection$,
      this.edgeSelection$,
      this.colorService.colorMap$,
    ]).subscribe((arg) => {
      const [
        dataNodes,
        dataNodeSelection,
        vendorNodes,
        vendorNodeSelection,
        edgeSelection,
        colorMap,
      ] = arg;
      const nodes = [...vendorNodes, ...dataNodes];
      const ticked = () => {
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
          .attr("y2", (d: any) => d.target.y)
          .attr("stroke", (d) => colorMap.get(d.standard));
      };
      if (this.sim != null) {
        this.sim.on("tick", ticked);
        this.sim.restart();
      } else this.initSimulation(nodes, ticked);
    });

    // Setup zoom event handler
    combineLatest([
      this.svg$,
      // This is the initial value read from url
      this.optionsService.zoom$.pipe(take(1)),
    ]).subscribe(([svg, zoomOptions]) => {
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
    combineLatest([
      this.optionsService.zoom$,
      this.containerGraph$,
      this.searchBackDrop$,
    ]).subscribe(([zoomTransform, g, backdrop]) => {
      let instantiated: ZoomTransform;
      if (zoomTransform instanceof ZoomTransform) {
        instantiated = zoomTransform;
      } else {
        instantiated = new ZoomTransform(
          zoomTransform.k,
          zoomTransform.x,
          zoomTransform.y
        );
      }
      g.attr("transform", instantiated.toString());

      inverseTranslateNestedRect(instantiated, backdrop.select("rect"));
    });

    // Effects, hover edges
    combineLatest([
      this.selectionService.hoveredNode$,
      this.selectionService.selectedNode$,
      this.edgeSelection$,
      this.dataNodeSelection$,
    ]).subscribe(([hoveredNode, selectedNode, edgeSelection]) => {
      // Edges, hover
      edgeSelection.attr("class", function (e) {
        if (
          selectedNode?.index == (e.source as any).index ||
          selectedNode?.index == (e.target as any).index
        ) {
          return "selected";
        } else if (
          hoveredNode?.index == (e.source as any).index ||
          hoveredNode?.index == (e.target as any).index
        ) {
          return "hovered";
        }
        return "";
      });
    });

    // Effects, hover or search nodes
    combineLatest([
      this.searchBackDrop$,
      this.dataNodeSelection$,
      this.selectionService.selectedNode$,
      this.selectionService.hoveredNode$,
      this.searchService.searchString$,
    ]).subscribe(
      ([backDrop, nodeSelection, selectedNode, hoveredNode, searchString]) => {
        // Backdrop
        if (searchString == "") {
          setTimeout(() => {
            backDrop.lower();
          }, 500);
          backDrop
            .select("rect")
            .transition()
            .duration(500)
            .attr("fill", "transparent");
        } else {
          backDrop.raise();
          backDrop
            .select("rect")
            .transition()
            .duration(500)
            .attr("fill", "rgba(0,0,0,0.5)");
        }

        // Node, hover
        nodeSelection
          .filter((d: IndexedDataNodeType) => {
            if (hoveredNode === d && selectedNode !== d) return true;
            else if (searchString == "") return false;
            else if (
              JSON.stringify(d, null, 0)
                .toLowerCase()
                .includes(searchString.toLowerCase()) &&
              selectedNode !== d
            )
              return true;
            else return false;
          })
          .raise()
          .select("circle")
          .transition()
          .duration(200)
          .ease(easeCubicOut)
          .attr("stroke-width", 2)
          .attr("stroke", "orange")
          .attr("r", (d) => d.r + this.hoverRadiusPxAddition);
        nodeSelection
          .filter((d: IndexedDataNodeType) => {
            if (d === selectedNode) return false;
            else if (hoveredNode !== d) {
              if (searchString === "") return true;
              else if (
                !JSON.stringify(d, null, 0)
                  .toLowerCase()
                  .includes(searchString.toLowerCase())
              )
                return true;
              else return false;
            } else return false;
          })
          .select("circle")
          .transition()
          .duration(200)
          .ease(easeCubicOut)
          .attr("stroke-width", 0)
          .attr("r", (d) => d.base_r);
        nodeSelection
          .filter((d: IndexedDataNodeType) => d === selectedNode)
          .raise();
      }
    );

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

    // Effects, nodes selected
    combineLatest([
      this.dataNodeSelection$,
      this.selectionService.selectedNode$,
      this.selectionService.activeNode$,
    ]).subscribe(([nodeSelection, selectedNode, activeNode]) => {
      // Node, active
      nodeSelection
        .filter((d: IndexedDataNodeType) => selectedNode === d)
        .select("circle")
        .attr("stroke", "white")
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
      this.svg$,
      this.dataNodesReIndexed$,
      this.vendorNodes$,
      this.dataNodeSelection$,
    ]).subscribe(([svg, dataNodes, vendorNodes, nodeSelection]) => {
      // Nodes
      nodeSelection
        .on("mouseover", (event, d) => {
          event.stopPropagation();
          this.selectionService.setHoveredNode(d);
        })
        .on("mouseout", (event, d) => {
          event.stopPropagation();
          this.selectionService.setHoveredNode(
            this.selectionService.selectedNode
          );
        })
        .on("click", (event) => {
          // Handled instead by mousedown and mouseup, but `stopPropagation` is needed
          // to prevent the backdrop click handler from triggering
          event.stopPropagation();
        })
        .on("mousedown", (event, d) => {
          // stopPropagation is needed for the zoom handler not to
          // consume the mouseup event for some reason
          // Also used to stop event propagation to the backdrop
          event.stopPropagation();
          this.selectionService.setActiveNode(d);
        })
        .on("mouseup", (event, d) => {
          event.stopPropagation();
          this.selectionService.setActiveNode(undefined);
          this.colorService.generateColorMap(d.approvedStandards);
          this.selectionService.setSelectedNode(d);
          // this.initializeForces([...dataNodes, ...vendorNodes]);
          // this.sim!.alpha(0.5).restart();
        });

      // Backdrop
      svg
        .on("click", (event) => {
          event.stopPropagation();
          this.selectionService.setSelectedNode(undefined);
        })
        .on("mouseover", (event) => {
          event.stopPropagation();
          this.selectionService.setHoveredNode(undefined);
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
    collisionForce.strength(0.5);
    this.sim = forceSimulation(nodes)
      .force(SimulationForce.COLLISION, collisionForce)
      .force(
        SimulationForce.GRAVITY,
        forceCenter(window.innerWidth / 2, window.innerHeight / 2).strength(0.5)
      )
      .force(
        SimulationForce.VENDOR,
        forceLink(linkDataNodesToVendors(nodes)).strength(0.2)
      )
      .alphaDecay(0.01)
      .velocityDecay(0.5)
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
    appendGradients(svg);
    return svg;
  }

  initContainerGraph(svg: SVG) {
    const g = svg.append("g");
    return g;
  }

  initSearchBackDrop(g: G) {
    const searchBackdrop = g.append("g").attr("class", "backdrop");
    searchBackdrop
      .append("rect")
      .attr("class", "backdrop-rect")
      .attr("width", "100vw")
      .attr("height", "100%");
    return searchBackdrop;
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
      .attr("fill", (d) => {
        const scaled = nodeScale(d.approvedStandards.length / 30);
        return scaled.toString();
      });

    const mainText = g
      .append("text")
      .text((d) => d.productName)
      .attr("font-size", (d) => d.mainFontSize)
      .attr("fill", (d) => getFontColor(nodeScale(d.approvedStandards.length)))
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
    console.log("initting edges", edges);
    return lineGroup
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("class", "line");
  }

  initializeForces(nodes: (DataNodeType | VendorNodeType)[]) {
    this.sim!.force(SimulationForce.VENDOR)!.initialize!(nodes, Math.random);
    this.sim!.force(SimulationForce.GRAVITY)!.initialize!(nodes, Math.random);
    this.sim!.force(SimulationForce.COLLISION)!.initialize!(nodes, Math.random);
  }
}
