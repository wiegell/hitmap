import { Component, ElementRef, HostListener, ViewChild } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import {
  drag,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  select,
  timer,
} from "d3";
import { node_data } from "./data/nodes";
import { cloneDeep } from "lodash-es";
import {
  Edge,
  NodeDataType,
  NodeSelectionType,
  NodeType,
  SVG,
} from "./app.model";
import { edge_data } from "./data/edges";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  @ViewChild("container") containerElement?: ElementRef;

  private scale = 1;

  @HostListener("wheel", ["$event"])
  onScroll(event: WheelEvent) {
    if (this.containerElement == null) throw new Error("oops no container");
    event.preventDefault();

    const zoomFactor = 0.01;
    const deltaY = event.deltaY;

    if (deltaY > 0) {
      this.scale -= zoomFactor; // Zoom out
    } else {
      this.scale += zoomFactor; // Zoom in
    }

    this.containerElement.nativeElement.style.transformOrigin = `${
      event.x * this.scale * 0.5
    }px ${event.y * this.scale * 0.5}px`;
    this.containerElement.nativeElement.style.transform = `scale(${this.scale})`;
  }

  ngOnInit(): void {
    this.initVisual();
  }

  initVisual() {
    const svg = this.initSvg();
    const nodeData = this.initNodeData();
    const edgeData = this.initEdgeData();

    let sim = forceSimulation(nodeData)
      .force(
        "charge1",
        forceCenter(window.innerWidth / 2, window.innerHeight / 2).strength(1)
      )
      .force(
        "x",
        forceX(window.innerWidth / 2).strength((d) => {
          console.log("e: ", d);
          return (d as any).selected ? 100 : 0;
        })
      )
      .force(
        "y",
        forceY(window.innerHeight / 2).strength((d) =>
          (d as any).selected ? 100 : 0
        )
      )
      .force("collision", forceCollide(50))
      .force(
        "link",
        forceLink(edgeData)
          .strength(0.2)
          .distance(() => 200)
      )
      .on("tick", ticked);

    // setTimeout(() => {
    //   sim.stop();
    //   sim = forceSimulation(nodeData)
    //     .force(
    //       "charge1",
    //       forceCenter(window.innerWidth / 2, window.innerHeight / 2).strength(1)
    //     )
    //     .force("collision", forceCollide(50))
    //     .force(
    //       "link",
    //       forceLink(edgeData)
    //         .strength(0.2)
    //         .distance(() => 200)
    //     )
    //     .on("tick", ticked)
    //     .stop();
    // }, 2000);

    const edgeSelection = this.initEdgeSelection(edgeData, svg);
    const nodeSelection = this.initNodeSelection(nodeData, svg);

    // Add a drag behavior.
    nodeSelection.call(
      drag<SVGCircleElement, NodeType, SVGSVGElement>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );
    nodeSelection
      .on("mouseover", function (event, d) {
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
      .on("mouseout", function (event, d) {
        edgeSelection.attr("class", function (e) {
          return "";
        });
      })
      .on("click", function (event, d) {
        setTimeout(() => {
          nodeSelection.each((n) => (n.selected = false));
          setTimeout(() => {
            d.selected = true;
            console.log("d: ", d, " event: ", event);
          }, 100);
        }, 100);
      });

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event: any) {
      if (!event.active) sim.alphaTarget(1).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    // Update the subject (dragged node) position during drag.
    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    // Restore the target alpha so the simulation cools after dragging ends.
    // Unfix the subject position now that it’s no longer being dragged.
    function dragended(event: any) {
      if (!event.active) {
        sim.alphaTarget(0);
        sim.alpha(0.1);
      }
      event.subject.fx = null;
      event.subject.fy = null;
    }

    function ticked() {
      nodeSelection.attr("cx", (d) => d.x).attr("cy", (d) => d.y);
      edgeSelection
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
    }
  }

  initNodeData(): NodeDataType[] {
    return node_data.map((d) => ({ ...cloneDeep(d), selected: false }));
  }

  initEdgeData(): Edge[] {
    return edge_data.map((d) => Object.create(d));
  }

  initSvg() {
    const figure = select(`div.container`);
    return figure.append("svg").attr("class", "svg-container");
  }

  initNodeSelection(nodes: NodeDataType[], svg: SVG) {
    return svg
      .selectAll(".node")
      .data(nodes as unknown[] as NodeType[])
      .enter()
      .append("circle")
      .attr("class", "node")
      .attr("r", (d) => d.r * 2)
      .attr("fill", "white")
      .attr("stroke", "black");
  }

  initEdgeSelection(edges: Edge[], svg: SVG) {
    return svg
      .append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke-width", "1");
  }
}
