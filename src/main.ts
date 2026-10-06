import "./style.css";
import p5 from "p5";
import { CANVAS_HEIGHT, CANVAS_WIDTH, INK } from "./config";
import { fitCanvas } from "./core/display";

const frame = document.getElementById("game");
if (!frame) throw new Error("#game is missing from the DOM");

new p5((sketch: p5) => {
  sketch.setup = () => {
    const canvas = sketch.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT).elt;

    sketch.pixelDensity(1);
    sketch.noSmooth();

    const fit = () => fitCanvas(canvas, frame, CANVAS_WIDTH, CANVAS_HEIGHT);
    fit();

    window.addEventListener("resize", fit);
  };

  sketch.draw = () => {
    sketch.background(INK);
  };
}, frame);
