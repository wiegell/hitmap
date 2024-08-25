import { Component } from "@angular/core";
import { RouterOutlet } from "@angular/router";
import {
  drag,
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  select,
  timer,
} from "d3";
import { node_data } from "./data/nodes";
import { cloneDeep } from "lodash-es";
import { Edge, NodeSelectionType, NodeType, SVG } from "./app.model";
import { edge_data } from "./data/edges";
@Component({
  selector: "app-root",
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.scss",
})
export class AppComponent {
  ngOnInit(): void {
    const svg = this.initSvg();
    const nodeData = this.initNodeData();
    const edgeData = this.initEdgeData();

    const f1 = forceCenter(
      window.innerWidth / 2,
      window.innerHeight / 2
    ).strength(1);

    const sim = forceSimulation(nodeData)
      .force("charge1", f1)
      .force("collision", forceCollide(40))
      .force(
        "link",
        forceLink(edgeData)
          .strength(0.2)
          .distance(() => 200)
      )
      .on("tick", ticked);

    const nodeSelection = this.initNodeSelection(nodeData, svg);
    const edgeSelection = this.initEdgeSelection(edgeData, svg);

    // Add a drag behavior.
    nodeSelection.call(
      drag<SVGCircleElement, NodeType, SVGSVGElement>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );

    // Reheat the simulation when drag starts, and fix the subject position.
    function dragstarted(event: any) {
      console.log("start", event);
      if (!event.active) sim.alpha(1).restart();
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
      if (!event.active) sim.stop();
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

  initNodeData(): NodeType[] {
    return node_data.map((d) => cloneDeep(d));
  }

  initEdgeData(): Edge[] {
    return edge_data.map((d) => Object.create(d));
  }

  initSvg() {
    const figure = select(`div.container`);
    return figure.append("svg").attr("class", "svg-container");
  }

  initNodeSelection(nodes: NodeType[], svg: SVG) {
    return svg
      .selectAll(".node")
      .data(nodes)
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
