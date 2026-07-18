export const FLOORS = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);

export const STATES = Object.freeze({
  IDLE: "idle",
  PREPARING: "preparing",
  CLOSING: "closing",
  MOVING: "moving",
  DRAMA: "drama",
  OPENING: "opening",
  WAITING: "waiting",
  ARRIVING: "arriving",
  SUCCESS: "success",
  RESETTING: "resetting",
});

export const TRIP_EVENTS = Object.freeze([
  Object.freeze({ id: "between-floors", label: "Stopping between floors" }),
  Object.freeze({ id: "wrong-direction", label: "Travelling in the wrong direction" }),
  Object.freeze({ id: "strange-location", label: "Opening at a strange location" }),
  Object.freeze({ id: "thinking", label: "Displaying “Thinking”" }),
  Object.freeze({ id: "skip-floor", label: "Skipping the selected floor" }),
  Object.freeze({ id: "arrive-and-leave", label: "Arriving and immediately leaving" }),
  Object.freeze({ id: "tiny-operator", label: "Revealing a tiny elevator operator" }),
  Object.freeze({ id: "countdown", label: "Starting a dramatic countdown" }),
  Object.freeze({ id: "suspense", label: "Playing unnecessary suspense sounds" }),
  Object.freeze({ id: "same-floor", label: "Opening on the same floor" }),
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  [STATES.IDLE]: [STATES.PREPARING, STATES.RESETTING],
  [STATES.PREPARING]: [STATES.CLOSING, STATES.DRAMA, STATES.RESETTING],
  [STATES.CLOSING]: [STATES.MOVING, STATES.DRAMA, STATES.OPENING, STATES.ARRIVING, STATES.RESETTING],
  [STATES.MOVING]: [STATES.CLOSING, STATES.DRAMA, STATES.OPENING, STATES.ARRIVING, STATES.RESETTING],
  [STATES.DRAMA]: [STATES.CLOSING, STATES.MOVING, STATES.OPENING, STATES.ARRIVING, STATES.RESETTING],
  [STATES.OPENING]: [STATES.CLOSING, STATES.DRAMA, STATES.WAITING, STATES.SUCCESS, STATES.RESETTING],
  [STATES.WAITING]: [STATES.CLOSING, STATES.MOVING, STATES.DRAMA, STATES.RESETTING],
  [STATES.ARRIVING]: [STATES.OPENING, STATES.DRAMA, STATES.RESETTING],
  [STATES.SUCCESS]: [STATES.IDLE, STATES.RESETTING],
  [STATES.RESETTING]: [STATES.IDLE],
});

function assertFloor(floor) {
  if (!FLOORS.includes(floor)) {
    throw new RangeError(`Floor must be one of: ${FLOORS.join(", ")}. Received ${floor}.`);
  }
}

/**
 * A deliberately small state machine. It owns trip facts and legal transitions;
 * animation timing remains in app.js so the model can be tested without a DOM.
 */
export class ElevatorStateMachine {
  #listeners = new Set();

  constructor(initialFloor = 1) {
    assertFloor(initialFloor);
    this.state = STATES.IDLE;
    this.currentFloor = initialFloor;
    this.targetFloor = null;
    this.attempt = 0;
  }

  get busy() {
    return this.state !== STATES.IDLE;
  }

  get snapshot() {
    return Object.freeze({
      state: this.state,
      currentFloor: this.currentFloor,
      targetFloor: this.targetFloor,
      attempt: this.attempt,
      busy: this.busy,
    });
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.snapshot);
    return () => this.#listeners.delete(listener);
  }

  transition(nextState) {
    const allowed = ALLOWED_TRANSITIONS[this.state] ?? [];
    if (!allowed.includes(nextState)) {
      throw new Error(`Illegal elevator transition: ${this.state} → ${nextState}`);
    }
    this.state = nextState;
    this.#emit();
  }

  startTrip(targetFloor) {
    assertFloor(targetFloor);
    if (this.busy) {
      throw new Error("The elevator is already handling a request.");
    }
    this.targetFloor = targetFloor;
    this.attempt = 0;
    this.transition(STATES.PREPARING);
  }

  setCurrentFloor(floor) {
    assertFloor(floor);
    this.currentFloor = floor;
    this.#emit();
  }

  setAttempt(attempt) {
    if (!Number.isInteger(attempt) || attempt < 0) {
      throw new RangeError("Attempt must be a non-negative integer.");
    }
    this.attempt = attempt;
    this.#emit();
  }

  completeTrip() {
    if (this.targetFloor === null) {
      throw new Error("Cannot complete a trip without a target floor.");
    }
    this.currentFloor = this.targetFloor;
    this.transition(STATES.SUCCESS);
  }

  settle() {
    this.transition(STATES.IDLE);
    this.targetFloor = null;
    this.attempt = 0;
    this.#emit();
  }

  reset(floor = 1) {
    assertFloor(floor);
    if (this.state !== STATES.RESETTING) {
      this.transition(STATES.RESETTING);
    }
    this.currentFloor = floor;
    this.targetFloor = null;
    this.attempt = 0;
    this.transition(STATES.IDLE);
  }

  #emit() {
    const snapshot = this.snapshot;
    this.#listeners.forEach((listener) => listener(snapshot));
  }
}

/**
 * Randomises the mishaps while guaranteeing a finite, successful trip.
 */
export function createTripPlan(random = Math.random, failureCount) {
  const count = failureCount ?? 2 + Math.floor(random() * 3);
  if (!Number.isInteger(count) || count < 2 || count > 4) {
    throw new RangeError("A dramatic trip needs between 2 and 4 failed attempts.");
  }

  const pool = [...TRIP_EVENTS];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }

  return Object.freeze({
    failures: Object.freeze(pool.slice(0, count)),
    finalAttempt: count + 1,
  });
}

export function floorPath(from, to) {
  assertFloor(from);
  assertFloor(to);
  if (from === to) return [];

  const direction = to > from ? 1 : -1;
  const path = [];
  for (let floor = from + direction; direction > 0 ? floor <= to : floor >= to; floor += direction) {
    path.push(floor);
  }
  return path;
}
