import { beforeEach, describe, expect, it } from "vitest";
import type { Assets } from "../assets";
import {
  AIRFIELD_AT,
  DESCENT_DISTANCE,
  LANDING_HOLD_FRAMES,
  LANDING_LEAD,
  LIFTOFF_FRAMES,
  PLAYER_SPAWN,
  SCROLL_SPEED,
} from "../config";
import { Input } from "../core/Input";
import { Player } from "../entities/Player";
import type { PlatformDef } from "../types";
import { Flight } from "./Flight";

const platform: PlatformDef = {
  sprite: "launch-platform.png",
  park: { x: 56, y: 128 },
  liftoff: { x: 56, y: 24 },
  touchdown: { x: 56, y: 232 },
  lamps: [],
};
const level = { length: 3000 };
// The scroll at which the landing platform's eye lies under the parked plane.
const parked = level.length + LANDING_LEAD + PLAYER_SPAWN.y;

describe("Flight", () => {
  let player: Player;
  let flight: Flight;

  // One tick as the scene runs it: the flight sets the speed, then the city moves.
  const tick = () => {
    flight.update();
    flight.advance();
  };

  beforeEach(() => {
    player = new Player(
      new Input(new EventTarget()),
      {} as Assets["image"],
      () => {},
    );
    flight = new Flight(player, level, platform);
  });

  it("starts parked on the start platform's eye, on the ground", () => {
    expect(flight.scroll - PLAYER_SPAWN.y).toBe(AIRFIELD_AT);
    expect(flight.speed).toBe(0);
    expect(player.altitude).toBe(0);
    expect(flight.flying).toBe(false);
  });

  it("rolls the runway, and only climbs once the lift-off line passes under the plane", () => {
    const liftoff =
      AIRFIELD_AT + PLAYER_SPAWN.y + platform.park.y - platform.liftoff.y;

    let altitude = 0;
    while (!flight.flying) {
      const scroll = flight.scroll;
      tick();

      expect(flight.scroll).toBeGreaterThan(scroll);
      if (scroll < liftoff) expect(player.altitude).toBe(0);
      expect(player.altitude).toBeGreaterThanOrEqual(altitude);
      altitude = player.altitude;
    }

    expect(player.altitude).toBe(1);
    expect(flight["liftoffFrames"]).toBe(LIFTOFF_FRAMES);
    expect(flight.speed).toBe(SCROLL_SPEED);
    // The level's own distances begin only once the pilot has the stick.
    expect(flight.scroll).toBeLessThan(0);
  });

  it("stops the city at the level's length while the pilot flies", () => {
    flight["phase"] = "flying";
    flight.speed = SCROLL_SPEED;
    flight.scroll = level.length - 1;

    tick();
    expect(flight.atEnd).toBe(true);
    tick();

    expect(flight.scroll).toBe(level.length);
    expect(flight.speed).toBe(0);
  });

  it("lands the plane: lines it up, touches down at the line, and stops it on the eye", () => {
    const touchdown = parked - (platform.touchdown.y - platform.park.y);
    flight["phase"] = "flying";
    flight.scroll = level.length;
    player.altitude = 1;
    player.pos = { x: 60, y: 200 };
    flight.startLanding();

    let stoppedFor = 0;
    // The plane's height follows the scroll each tick starts at.
    while (!flight.landed) {
      const scroll = flight.scroll;
      tick();

      if (scroll < touchdown - DESCENT_DISTANCE)
        expect(player.altitude).toBe(1);
      if (scroll >= touchdown) expect(player.altitude).toBe(0);
      expect(flight.scroll).toBeLessThanOrEqual(parked);
      if (flight.scroll === parked) stoppedFor++;
    }

    expect(player.pos).toEqual(PLAYER_SPAWN);
    expect(stoppedFor).toBe(LANDING_HOLD_FRAMES);
  });
});
