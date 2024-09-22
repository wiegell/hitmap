import { Color, hsl, scale } from "chroma-js";
import { SVG } from "../models/app.model";

export const nodeScale = scale([
  hsl(150, 0.8, 0.6), // start color - hue 200 (blue), lightness 0.7
  hsl(200, 0.8, 0.1), // end color - hue 120 (green), lightness 0.3
]).mode("lch");

//Append a defs (for definition) element to your SVG
export function appendRadialGradient(svg: SVG) {
  var defs = svg.append("defs");

  //Append a radialGradient element to the defs and give it a unique id
  var radialGradient = defs
    .append("radialGradient")
    .attr("id", "radial-gradient")
    .attr("cx", "50%") //The x-center of the gradient
    .attr("cy", "50%") //The y-center of the gradient
    .attr("r", "50%"); //The radius of the gradient

  radialGradient
    .append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "rgb(200, 200, 200)");
  radialGradient
    .append("stop")
    .attr("offset", "65%")
    .attr("stop-color", "rgb(140, 140, 140)");
  radialGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgb(126, 126, 126)");
  radialGradient
    .append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "rgb(73, 73, 73)");
}

export function getFontColor(background: Color) {
  const luminance = background.luminance();

  if (luminance < 0.4) {
    return "white"; // Dark background, use white text
  } else {
    return "black"; // Light background, use black text
  }
}
