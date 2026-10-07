import "./style.css";
import p5 from "p5";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./config";
import { fitCanvas } from "./core/display";
import { Input } from "./core/Input";
import { SceneManager } from "./core/SceneManager";
import { loadAssets } from "./assets";
import { MenuScene } from "./scenes/MenuScene";

// The checks cost time every frame, and minified names trip false warnings.
p5.disableFriendlyErrors = import.meta.env.PROD;

const frame = document.getElementById("game");
if (!frame) throw new Error("#game is missing from the DOM");

const sketch = (p: p5) => {
  let manager: SceneManager;

  p.setup = async () => {
    const canvas = p.createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT).elt;

    // Disable pixel density scaling and smoothing to keep the pixel art crisp
    p.pixelDensity(1);
    p.noSmooth();

    const fit = () => fitCanvas(canvas, frame, CANVAS_WIDTH, CANVAS_HEIGHT);
    fit();
    window.addEventListener("resize", fit);

    manager = new SceneManager(await loadAssets(p), new Input());
    manager.change(new MenuScene(p));
  };

  p.draw = () => manager.frame(p.deltaTime);
};

new p5(sketch, frame);
