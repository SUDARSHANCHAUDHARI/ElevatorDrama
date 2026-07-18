import test from "node:test";
import assert from "node:assert/strict";

import {
  ElevatorStateMachine,
  STATES,
  TRIP_EVENTS,
  createTripPlan,
  floorPath,
} from "../elevator-engine.js";

test("a normal state path completes and returns to idle", () => {
  const machine = new ElevatorStateMachine(1);
  machine.startTrip(6);
  machine.transition(STATES.CLOSING);
  machine.transition(STATES.MOVING);
  machine.setCurrentFloor(6);
  machine.transition(STATES.ARRIVING);
  machine.transition(STATES.OPENING);
  machine.completeTrip();

  assert.equal(machine.state, STATES.SUCCESS);
  assert.equal(machine.currentFloor, 6);
  assert.equal(machine.busy, true);

  machine.settle();
  assert.equal(machine.state, STATES.IDLE);
  assert.equal(machine.targetFloor, null);
  assert.equal(machine.busy, false);
});

test("illegal transitions fail loudly", () => {
  const machine = new ElevatorStateMachine(1);
  assert.throws(() => machine.transition(STATES.SUCCESS), /Illegal elevator transition/);
});

test("trip plans contain several unique failures and a guaranteed final attempt", () => {
  const randomValues = [0.4, 0.1, 0.7, 0.2, 0.9, 0.3, 0.8, 0.5, 0.6, 0.4, 0.2];
  let index = 0;
  const plan = createTripPlan(() => randomValues[index++ % randomValues.length], 4);

  assert.equal(plan.failures.length, 4);
  assert.equal(new Set(plan.failures.map((event) => event.id)).size, 4);
  assert.equal(plan.finalAttempt, 5);
});

test("the event catalog includes every requested mishap", () => {
  assert.deepEqual(
    TRIP_EVENTS.map((event) => event.id).sort(),
    [
      "arrive-and-leave",
      "between-floors",
      "countdown",
      "same-floor",
      "skip-floor",
      "strange-location",
      "suspense",
      "thinking",
      "tiny-operator",
      "wrong-direction",
    ],
  );
});

test("floorPath includes each floor after the starting floor", () => {
  assert.deepEqual(floorPath(2, 5), [3, 4, 5]);
  assert.deepEqual(floorPath(5, 2), [4, 3, 2]);
  assert.deepEqual(floorPath(3, 3), []);
});
