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
import { cloneDeep } from "lodash-es";
import {
  Edge,
  NodeDataType,
  NodeSelectionType,
  NodeType,
  SVG,
} from "./models/app.model";
import { edge_data } from "./models/edges";
import { DataEntry } from "./models/data.model";
import { from, of } from "rxjs";
import { AbbreviationPipe } from "./pipes/abbreviation.pipe";
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
  private abbreviationPipe = new AbbreviationPipe();

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
    const nodeData = from(this.initNodeData());
    const edgeData = this.initEdgeData();

    nodeData.subscribe((data) => {
      let sim = forceSimulation(data)
        .force(
          "charge1",
          forceCenter(window.innerWidth / 2, window.innerHeight / 2).strength(
            0.05
          )
        )
        // .force("x", forceX(window.innerWidth / 2).strength(0.05))
        // .force("y", forceY(window.innerHeight / 2).strength(0.05))
        .force(
          "collision",
          forceCollide((d) => d.r * 2)
        )
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
      const nodeSelection = this.initNodeSelection(data, svg);

      // Add a drag behavior.
      nodeSelection.call(
        drag<SVGGElement, NodeType, SVGSVGElement>()
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
        nodeSelection.attr("transform", (d) => `translate(${d.x}, ${d.y})`);
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

  initEdgeData(): Edge[] {
    return edge_data.map((d) => Object.create(d));
  }

  initSvg() {
    const figure = select(`div.container`);
    return figure.append("svg").attr("class", "svg-container");
  }

  initNodeSelection(nodes: NodeDataType[], svg: SVG) {
    const g = svg
      .selectAll(".node")
      .data(nodes as unknown[] as NodeType[])
      .enter()
      .append("g")
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
      .attr(
        "font-size",
        (d) =>
          (d.r * 1.5) /
          (this.abbreviationPipe.transform(d.productName).length * 0.8)
      )
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "central")
      .attr("class", "dot-text");

    return g;
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
