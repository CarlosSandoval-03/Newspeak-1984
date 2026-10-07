import "./style.css";
import p5 from "p5";
import { CANVAS_HEIGHT, CANVAS_WIDTH, INK } from "./config";
import { fitCanvas } from "./core/display";
import { loadAssets } from "./entities/assets";

const frame = document.getElementById("game");
if (!frame) throw new Error("#game is missing from the DOM");

const sketch = (p: p5) => {
  p.setup = async () => {
    const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT).elt;

    // Disable pixel density scaling and smoothing to keep the pixel art crisp
    p.pixelDensity(1);
    p.noSmooth();

    const fit = () => fitCanvas(canvas, frame, CANVAS_WIDTH, CANVAS_HEIGHT);
    fit();
    window.addEventListener("resize", fit);

    const assets = await loadAssets(p);
    console.log("Assets loaded:", assets);
  };

  p.draw = () => {
    p.background(INK);
  };
};

new p5(sketch, frame);
