import { Component, ElementRef, ViewChild } from "@angular/core";
import {
  curveCatmullRomClosed,
  D3ZoomEvent,
  easeCubicOut,
  forceLink,
  forceSimulation,
  forceX,
  forceY,
  line,
  polygonCentroid,
  polygonHull,
  select,
  Selection,
  Simulation,
  zoom,
  zoomIdentity,
  ZoomTransform,
} from "d3";
import { groupBy, isEqual } from "lodash-es";
import {
  combineLatest,
  distinctUntilChanged,
  from,
  map,
  Observable,
  shareReplay,
  skip,
  Subject,
  take,
  withLatestFrom,
  zip,
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
import { wildCardCompare } from "../../helpers/search.helpers";
import { linkDataNodesToVendors } from "../../helpers/vendor-links";
import { inverseTranslateNestedRect } from "../../helpers/zoom.helpers";
import {
  Circle,
  DataNodeSelectionType,
  DataNodeType,
  EdgeSelectionType,
  G,
  IndexedDataNodeType,
  IndexedVendorNodeType,
  SimulationForce,
  SVG,
  Text,
  VendorNodeSelectionType,
  VendorNodeType,
} from "../../models/app.model";
import { DataEntry } from "../../models/data.model";
import { Edge } from "../../models/edge.model";
import { ColorMap } from "../../services/color.model";
import { ColorService } from "../../services/color.service";
import { OptionsService } from "../../services/options.service";
import { Filter } from "../../services/search.model";
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
  dataNodesFiltered$ = combineLatest([
    this.dataNodes$,
    this.optionsService.generalOptions$.pipe(
      map((options) => options.filters),
      distinctUntilChanged(isEqual),
      shareReplay(1)
    ) as Observable<Filter[]>,
  ]).pipe(
    map(([dataNodes, filters]) =>
      dataNodes.filter((dataNode) =>
        filters.every((filter) => wildCardCompare(dataNode, filter.str))
      )
    )
  );

  vendorNodes$ = this.dataNodesFiltered$.pipe(
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

  // Edges
  edgeData$ = combineLatest([
    this.dataNodesFiltered$,
    this.selectionService.selectedNode$,
  ]).pipe(
    map(([allEntries, selectedNode]) => {
      const map = createStandardToDataEntryMap(allEntries);
      return generateEdges(allEntries, map, selectedNode);
    }),
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
  groupingContainer$ = this.containerGraph$.pipe(
    map((g) => g.append("g").attr("class", "grouping")),
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
    this.dataNodesFiltered$,
    this.containerGraph$,
  ]).pipe(
    map(([dataNodes, svg]) => this.updateDataNodeSelection(dataNodes, svg)),
    shareReplay(1)
  );
  vendorNodeSelection$ = combineLatest([
    this.vendorNodes$,
    this.containerGraph$,
  ]).pipe(
    map(([vendorNodes, svg]) =>
      this.updateVendorNodeSelection(vendorNodes, svg)
    ),
    shareReplay(1)
  );

  public constructor(
    public colorService: ColorService,
    public selectionService: SelectionService,
    public searchService: SearchService,
    public optionsService: OptionsService
  ) {
    // Kickoff simulation
    zip([
      this.dataNodesFiltered$,
      this.dataNodeSelection$,
      this.vendorNodes$,
      this.vendorNodeSelection$,
      this.edgeSelection$,
      this.colorService.colorMap$,
      this.groupingContainer$,
    ])
      .pipe(take(1))
      .subscribe((arg) => {
        const [
          dataNodes,
          dataNodeSelection,
          vendorNodes,
          vendorNodeSelection,
          edgeSelection,
          colorMap,
          groupingContainer,
        ] = arg;
        const nodes = [...vendorNodes, ...dataNodes];
        const ticked = this.buildTickFunction(
          vendorNodeSelection,
          dataNodeSelection,
          edgeSelection,
          colorMap,
          groupingContainer
        );

        this.initSimulation(nodes, ticked);
      });

    // Update edge rendering, if changed
    combineLatest([
      zip(
        this.dataNodesFiltered$,
        this.dataNodeSelection$,
        this.vendorNodes$,
        this.vendorNodeSelection$
      ),
      this.colorService.colorMap$,
      this.edgeSelection$,
    ])
      .pipe(withLatestFrom(this.groupingContainer$))
      .subscribe(
        ([
          [
            [
              dataNodesFiltered,
              dataNodeSelection,
              vendorNodes,
              vendorNodeSelection,
            ],
            colorMap,
            edgeSelection,
          ],
          groupingContainer,
        ]) => {
          const ticked = this.buildTickFunction(
            vendorNodeSelection,
            dataNodeSelection,
            edgeSelection,
            colorMap,
            groupingContainer
          );
          this.sim?.on("tick", ticked);
          this.sim?.restart();
        }
      );

    // Update simulation nodes if changed
    zip([this.dataNodesFiltered$, this.vendorNodes$])
      .pipe(skip(1))
      .subscribe(([dataNodes, vendorNodes]) => {
        console.log("reheat", dataNodes);
        const nodes = [...vendorNodes, ...dataNodes];
        this.initializeForces(nodes);
        this.sim?.alpha(0.5).restart();
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
    combineLatest([this.selectionService.hoveredNode$])
      .pipe(
        withLatestFrom(
          this.selectionService.selectedNode$,
          this.edgeSelection$,
          this.dataNodeSelection$
        )
      )
      .subscribe(([[hoveredNode], selectedNode, edgeSelection]) => {
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
          // The backdrop is also lowered after 500 ms. in a debounced subscription above
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
            if (hoveredNode?.uuid === d.uuid && selectedNode?.uuid !== d.uuid)
              return true;
            else if (searchString == "") return false;
            else if (
              wildCardCompare(d, searchString) &&
              selectedNode?.uuid !== d.uuid
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
              else if (!wildCardCompare(d, searchString)) return true;
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
          (d: IndexedDataNodeType) =>
            activeNode?.uuid === d.uuid && selectedNode?.uuid !== d.uuid
        )
        .select("circle")
        .attr("r", (d) => d.r + this.activeRadiusPxAddition);
      nodeSelection
        .filter(
          (d: IndexedDataNodeType) =>
            activeNode?.uuid !== d.uuid && selectedNode?.uuid !== d.uuid
        )
        .select("circle")
        .attr("r", (d) => d.base_r);

      // Node, selected
      nodeSelection
        .filter((d: IndexedDataNodeType) => selectedNode?.uuid === d.uuid)
        .select("circle")
        .attr("stroke", "white")
        .attr("r", (d) => d.r + this.activeRadiusPxAddition);
      nodeSelection
        .filter(
          (d: IndexedDataNodeType) =>
            activeNode?.uuid !== d.uuid && selectedNode?.uuid !== d.uuid
        )
        .select("circle")
        .attr("r", (d) => d.base_r);
    });

    // Mouse handlers
    combineLatest([this.svg$, this.dataNodeSelection$]).subscribe(
      ([svg, nodeSelection]) => {
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
            console.log("click");
            event.stopPropagation();
          })
          .on("mousedown", (event, d) => {
            // stopPropagation is needed for the zoom handler not to
            // consume the mouseup event for some reason
            // Also used to stop event propagation to the backdrop
            console.log("mousedown");
            event.stopPropagation();
            this.selectionService.setActiveNode(d);
          })
          .on("mouseup", (event, d) => {
            console.log("mouseup");
            event.stopPropagation();
            this.sim?.stop();
            this.selectionService.setActiveNode(undefined);
            this.colorService.generateColorMap(d.approvedStandards);
            this.selectionService.setSelectedNode(d);
          });

        // Backdrop
        svg
          .on("click", (event) => {
            console.log("backdrop click", event);
            event.stopPropagation();
            this.selectionService.setSelectedNode(undefined);
          })
          .on("mouseover", (event) => {
            console.log("mouseover backdrop");
            event.stopPropagation();
            this.selectionService.setHoveredNode(undefined);
          });
      }
    );
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
        forceX(window.innerWidth / 2).strength(0.03)
      )
      .force("arst", forceY(window.innerHeight / 2).strength(0.03))
      .force(
        SimulationForce.VENDOR,
        forceLink(linkDataNodesToVendors(nodes)).strength(1)
      )
      // .alphaDecay(0.01)
      // .velocityDecay(0.5)
      // .alpha(1)
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

  updateDataNodeSelection(
    nodes: DataNodeType[],
    svg: G
  ): DataNodeSelectionType {
    const gs = svg
      .selectAll(".data")
      .data(nodes as IndexedDataNodeType[], (d) => (d as DataEntry).uuid)
      .join("g")
      .attr("class", "node data");

    gs.each(function (d) {
      const g = select(this);
      let circle: Circle = g.select("circle");
      if (circle.empty()) {
        circle = g.append("circle");
      }
      circle
        .attr("r", d.r)
        .attr("fill", nodeScale(d.approvedStandards.length / 30).toString());
    });

    gs.each(function (d) {
      const g = select(this);
      let text: Text = g.select("text");
      if (text.empty()) {
        text = g
          .append("text")
          .text(d.productName)
          .attr("font-size", d.mainFontSize)
          .attr("fill", getFontColor(nodeScale(d.approvedStandards.length)))
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("class", "dot-text");
      }
    });

    // TODO: Position this correctly
    // const subText = g
    //   .append("text")
    //   .text((d) => d.vendor ?? "")
    //   .attr("font-size", (d) => d.subFontSize)
    //   .attr("text-anchor", "middle")
    //   .attr("dominant-baseline", "central")
    //   .attr("transform", (d) => `translate(0,${d.mainFontSize * 0.75})`)
    //   .attr("class", "dot-text");

    return gs;
  }

  updateVendorNodeSelection(
    nodes: VendorNodeType[],
    container: G
  ): VendorNodeSelectionType {
    const gs = container
      .selectAll(".vendor")
      .data(
        nodes as IndexedVendorNodeType[],
        (d) => (d as IndexedVendorNodeType).vendor
      )
      .join("g")
      .attr("class", "node vendor")
      .lower();

    gs.each(function (d) {
      const g = select(this);
      let circle: Circle = g.select("circle");
      if (circle.empty()) {
        circle = g.append("circle").attr("fill", "url(#radial-gradient)");
      }
      circle.attr("r", d.r);
    });

    // // TODO: Dont recreate on emit
    // const mainText = gs.select("text");
    // if (mainText.empty()) {
    //   gs.append("text")
    //     .text((d) => d.vendor)
    //     .attr("font-size", (d) =>
    //       calculateFontSizeForCircle(
    //         d.vendor.length,
    //         this.vendorNodeTextPxWidth,
    //         this.circlePaddingFraction
    //       )
    //     )
    //     .attr("text-anchor", "middle")
    //     .attr("dominant-baseline", "central")
    //     .attr("class", "dot-text");
    // }
    const vendorNodeTextPxWidth = this.vendorNodeTextPxWidth;
    const circlePaddingFraction = this.circlePaddingFraction;
    gs.each(function (d) {
      const g = select(this);
      let text: Text = g.select("text");
      if (text.empty()) {
        text = g
          .append("text")
          .text(d.vendor)
          .attr(
            "font-size",
            calculateFontSizeForCircle(
              d.vendor.length,
              vendorNodeTextPxWidth,
              circlePaddingFraction
            )
          )
          .attr("text-anchor", "middle")
          .attr("dominant-baseline", "central")
          .attr("class", "dot-text");
      }
    });

    return gs;
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
    console.log("reinit forces for nodes", nodes);
    this.sim?.nodes(nodes);
    this.sim!.force(
      SimulationForce.VENDOR,
      forceLink(linkDataNodesToVendors(nodes)).strength(0.4)
    );
    this.sim!.force(SimulationForce.GRAVITY)!.initialize!(nodes, Math.random);
    this.sim!.force(SimulationForce.COLLISION)!.initialize!(nodes, Math.random);
  }

  buildTickFunction(
    vendorNodeSelection: VendorNodeSelectionType,
    dataNodeSelection: DataNodeSelectionType,
    edgeSelection: EdgeSelectionType,
    colorMap: ColorMap | undefined,
    groupingContainer: G
  ): () => void {
    const lineGenerator = line()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(curveCatmullRomClosed);
    return () => {
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
        .attr("stroke", (d) => colorMap?.get(d.standard)?.hex() ?? "black");

      const filteredNodes = dataNodeSelection.filter(
        (d) => d.vendor === "Rados"
      );
      const coordinates = filteredNodes
        .data()
        .map((data) => [data.x, data.y] as [number, number]);
      const centroid = polygonCentroid(coordinates);
      const scaleFactor = 1.5;
      const scaledCoordinates = coordinates.map((point: [number, number]) => {
        return [
          centroid[0] + (point[0] - centroid[0]) * scaleFactor,
          centroid[1] + (point[1] - centroid[1]) * scaleFactor,
        ] as [number, number];
      });
      if (scaledCoordinates.some(([x, y]) => x < 0 || y < 0)) {
        console.log("scaledcoordinates", coordinates, scaledCoordinates);
      }
      const polygon = polygonHull(scaledCoordinates);

      const centroidBullet = groupingContainer
        .selectAll(".centroid")
        .data([null])
        .join("circle")
        .attr("class", ".centroid")
        .attr("cx", centroid[0])
        .attr("cy", centroid[1])
        .attr("r", 10)
        .attr("fill", "blue");
      const path = groupingContainer
        .selectAll("path")
        .data([null])
        .join("path");
      path
        .attr("d", lineGenerator(polygon ?? []))
        .attr("fill", "rgba(255,0,0,0.5)")
        .attr("transform");
    };
  }
}
