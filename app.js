import {
  ElevatorStateMachine,
  FLOORS,
  STATES,
  createTripPlan,
  floorPath,
} from "./elevator-engine.js";

const dom = {
  main: document.querySelector("main"),
  elevator: document.querySelector("#elevator"),
  doors: document.querySelector("#doors"),
  doorway: document.querySelector("#doorway"),
  direction: document.querySelector("#direction-readout"),
  floorReadout: document.querySelector("#floor-readout"),
  floorButtons: [...document.querySelectorAll(".floor-button")],
  soundToggle: document.querySelector("#sound-toggle"),
  soundLabel: document.querySelector("#sound-toggle span"),
  volume: document.querySelector("#volume"),
  volumeOutput: document.querySelector("#volume-output"),
  resetButton: document.querySelector("#reset-button"),
  statusBoard: document.querySelector("#status-board"),
  statusMessage: document.querySelector("#status-message"),
  attemptLabel: document.querySelector("#attempt-label"),
  attemptMarkers: [...document.querySelectorAll(".attempt-track span")],
  serviceLamp: document.querySelector("#service-lamp"),
  sceneSymbol: document.querySelector("#scene-symbol"),
  sceneTitle: document.querySelector("#scene-title"),
  sceneSubtitle: document.querySelector("#scene-subtitle"),
};

const SCENES = Object.freeze({
  lobby: Object.freeze({
    theme: "lobby",
    symbol: "1",
    title: "GROUND FLOOR",
    subtitle: "PLEASE EXIT CALMLY",
  }),
  moon: Object.freeze({
    theme: "moon",
    symbol: "☾",
    title: "MOON GIFT SHOP",
    subtitle: "LOW GRAVITY · HIGH PRICES",
  }),
  aquarium: Object.freeze({
    theme: "aquarium",
    symbol: "≈",
    title: "EXECUTIVE AQUARIUM",
    subtitle: "THE FISH ARE IN A MEETING",
  }),
  laundry: Object.freeze({
    theme: "laundry",
    symbol: "◎",
    title: "SOCK ARCHIVE",
    subtitle: "UNMATCHED ITEMS ONLY",
  }),
  void: Object.freeze({
    theme: "void",
    symbol: "∞",
    title: "THE ENDLESS CORRIDOR",
    subtitle: "NO DELIVERIES AFTER MIDNIGHT",
  }),
  destination: Object.freeze({
    theme: "destination",
    symbol: "★",
    title: "YOUR ACTUAL FLOOR",
    subtitle: "AN UNEXPECTED DEVELOPMENT",
  }),
});

const STRANGE_SCENES = [SCENES.moon, SCENES.aquarium, SCENES.laundry, SCENES.void];
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const machine = new ElevatorStateMachine(1);
let tripController = null;

function motionDuration(milliseconds) {
  if (!prefersReducedMotion.matches) return milliseconds;
  return Math.max(180, Math.min(650, Math.round(milliseconds * 0.35)));
}

function pause(milliseconds, signal) {
  const duration = motionDuration(milliseconds);
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Trip cancelled", "AbortError"));
      return;
    }

    const timeout = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, duration);

    function onAbort() {
      window.clearTimeout(timeout);
      reject(new DOMException("Trip cancelled", "AbortError"));
    }

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function serviceText(text) {
  const textNode = [...dom.serviceLamp.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
  if (textNode) textNode.nodeValue = ` ${text}`;
}

function renderMachine(snapshot) {
  document.body.dataset.machineState = snapshot.state;
  dom.elevator.dataset.state = snapshot.state;
  dom.main.setAttribute("aria-busy", String(snapshot.busy));

  dom.floorButtons.forEach((button) => {
    const floor = Number(button.dataset.floor);
    button.disabled = snapshot.busy;
    button.dataset.selected = String(snapshot.targetFloor === floor);
    if (snapshot.currentFloor === floor) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  const attempt = snapshot.attempt;
  dom.attemptMarkers.forEach((marker, index) => {
    marker.dataset.active = String(attempt > 0 && index === attempt - 1);
    marker.dataset.complete = String(attempt > 0 && index < attempt - 1);
  });

  if (snapshot.state === STATES.IDLE) serviceText("Ready");
  else if (snapshot.state === STATES.SUCCESS) serviceText("Miraculous");
  else if (snapshot.state === STATES.DRAMA) serviceText("Complicated");
  else serviceText("In service");
}

machine.subscribe(renderMachine);

function announce(message, { tone = "neutral", meta } = {}) {
  dom.statusMessage.textContent = message;
  dom.statusBoard.dataset.tone = tone;
  if (meta) dom.attemptLabel.textContent = meta;
}

function setIndicator(value, direction = "idle") {
  const display = String(value);
  const symbols = { up: "↑", down: "↓", idle: "•", alert: "!" };
  const words = { up: "going up", down: "going down", idle: "stationary", alert: "attention" };
  dom.floorReadout.textContent = display;
  dom.floorReadout.dataset.wide = String(display.length > 2);
  dom.direction.textContent = symbols[direction] ?? symbols.idle;
  dom.floorReadout.setAttribute("aria-label", `Elevator display ${display}, ${words[direction] ?? words.idle}`);
}

function configureScene(scene, { floor, operator = false } = {}) {
  const selectedScene = scene ?? SCENES.lobby;
  dom.doorway.dataset.scene = selectedScene.theme;
  dom.doorway.dataset.operator = operator ? "visible" : "hidden";
  dom.sceneSymbol.textContent = floor ?? selectedScene.symbol;
  dom.sceneTitle.textContent = floor ? `FLOOR ${floor}` : selectedScene.title;
  dom.sceneSubtitle.textContent = floor ? "THIS ONE APPEARS TO BE REAL" : selectedScene.subtitle;
}

class SoundDirector {
  constructor() {
    this.enabled = true;
    this.volume = 0.42;
    this.context = null;
    this.master = null;
    this.sources = new Set();
  }

  async unlock() {
    if (!this.enabled) return;
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!this.context) {
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === "suspended") await this.context.resume();
    } catch (error) {
      console.warn("Generated elevator audio is unavailable.", error);
      this.setEnabled(false);
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.02);
    }
  }

  tone(frequency, duration = 0.18, options = {}) {
    if (!this.enabled || !this.context || !this.master) return;
    const { delay = 0, type = "sine", gain = 0.15, endFrequency = frequency } = options;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), start + 0.025);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
    this.sources.add(oscillator);
    oscillator.addEventListener("ended", () => this.sources.delete(oscillator), { once: true });
  }

  doors(opening) {
    this.tone(opening ? 110 : 180, 0.48, {
      type: "triangle",
      gain: 0.08,
      endFrequency: opening ? 260 : 75,
    });
  }

  floorStep(direction) {
    const base = direction === "down" ? 130 : 155;
    this.tone(base, 0.16, { type: "square", gain: 0.035, endFrequency: base * 1.12 });
    this.tone(base * 2, 0.12, { delay: 0.06, type: "sine", gain: 0.025 });
  }

  thunk() {
    this.tone(72, 0.38, { type: "sawtooth", gain: 0.11, endFrequency: 38 });
  }

  suspense() {
    [146.8, 155.6, 146.8, 174.6, 164.8, 130.8].forEach((frequency, index) => {
      this.tone(frequency, 0.5, { delay: index * 0.34, type: "sawtooth", gain: 0.035 });
      this.tone(frequency / 2, 0.58, { delay: index * 0.34, type: "triangle", gain: 0.045 });
    });
  }

  countdown(number) {
    this.tone(number === 0 ? 92 : 420 + number * 22, number === 0 ? 0.65 : 0.13, {
      type: number === 0 ? "sawtooth" : "square",
      gain: number === 0 ? 0.12 : 0.055,
      endFrequency: number === 0 ? 44 : 420 + number * 22,
    });
  }

  success() {
    [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      this.tone(frequency, 0.55, { delay: index * 0.11, type: "sine", gain: 0.075 });
    });
  }

  stopAll() {
    this.sources.forEach((source) => {
      try {
        source.stop();
      } catch {
        // A source that has already stopped needs no cleanup.
      }
    });
    this.sources.clear();
  }
}

const sound = new SoundDirector();

async function closeDoors(signal) {
  if (machine.state !== STATES.CLOSING) machine.transition(STATES.CLOSING);
  const wasOpen = dom.doors.dataset.open === "true";
  dom.doors.dataset.open = "false";
  dom.doorway.dataset.operator = "hidden";
  if (wasOpen) sound.doors(false);
  await pause(wasOpen ? 960 : 240, signal);
}

async function openDoors(signal, scene, options = {}) {
  machine.transition(STATES.OPENING);
  configureScene(scene, options);
  sound.doors(true);
  dom.doors.dataset.open = "true";
  await pause(960, signal);
}

async function moveAlong(path, signal) {
  machine.transition(STATES.MOVING);
  if (path.length === 0) {
    setIndicator("…", "idle");
    sound.floorStep("up");
    await pause(720, signal);
    setIndicator(machine.currentFloor, "idle");
    return;
  }

  for (const floor of path) {
    const direction = floor > machine.currentFloor ? "up" : "down";
    setIndicator(floor, direction);
    sound.floorStep(direction);
    await pause(620, signal);
    machine.setCurrentFloor(floor);
  }
}

function oneStepTowardTarget() {
  const target = machine.targetFloor;
  if (target === machine.currentFloor) {
    return machine.currentFloor === FLOORS.at(-1) ? machine.currentFloor - 1 : machine.currentFloor + 1;
  }
  return machine.currentFloor + Math.sign(target - machine.currentFloor);
}

function safeEscapeFloor(from) {
  if (from <= FLOORS[0]) return from + 1;
  if (from >= FLOORS.at(-1)) return from - 1;
  return Math.random() > 0.5 ? from + 1 : from - 1;
}

const eventHandlers = {
  async "between-floors"(signal) {
    const nextFloor = oneStepTowardTarget();
    announce("The elevator has stopped between floors to reconsider its priorities.", {
      tone: "alert",
      meta: `Attempt ${machine.attempt} · Position: disputed`,
    });
    await moveAlong([nextFloor], signal);
    machine.transition(STATES.DRAMA);
    setIndicator(`${machine.currentFloor}½`, "alert");
    sound.thunk();
    await pause(1450, signal);
  },

  async "wrong-direction"(signal) {
    const intendedDirection = Math.sign(machine.targetFloor - machine.currentFloor) || 1;
    const wrongFloor = machine.currentFloor - intendedDirection;
    announce("Confidently travelling in the wrong direction.", {
      tone: "alert",
      meta: `Attempt ${machine.attempt} · Navigation by instinct`,
    });

    if (!FLOORS.includes(wrongFloor)) {
      machine.transition(STATES.MOVING);
      setIndicator(wrongFloor < 1 ? "B?" : "PH", wrongFloor < 1 ? "down" : "up");
      sound.floorStep(wrongFloor < 1 ? "down" : "up");
      await pause(1250, signal);
    } else {
      await moveAlong([wrongFloor], signal);
    }
    machine.transition(STATES.DRAMA);
    await pause(800, signal);
  },

  async "strange-location"(signal) {
    const nextFloor = oneStepTowardTarget();
    const scene = randomItem(STRANGE_SCENES);
    await moveAlong([nextFloor], signal);
    announce(`The doors open onto ${scene.title.toLowerCase()}. This is not on the directory.`, {
      tone: "alert",
      meta: `Attempt ${machine.attempt} · Unauthorised destination`,
    });
    await openDoors(signal, scene);
    machine.transition(STATES.DRAMA);
    await pause(1550, signal);
  },

  async thinking(signal) {
    machine.transition(STATES.DRAMA);
    announce("Thinking", {
      tone: "neutral",
      meta: `Attempt ${machine.attempt} · Please do not interrupt`,
    });
    for (const thought of ["TH", "TH.", "TH..", "TH..."]) {
      setIndicator(thought, "idle");
      sound.tone(240, 0.08, { type: "sine", gain: 0.025 });
      await pause(420, signal);
    }
  },

  async "skip-floor"(signal) {
    const target = machine.targetFloor;
    const direction = Math.sign(target - machine.currentFloor) || 1;
    const floorAfterTarget = target + direction;
    const path = floorPath(machine.currentFloor, target);
    if (FLOORS.includes(floorAfterTarget)) path.push(floorAfterTarget);

    announce(`Floor ${target} is approaching. The elevator has elected not to stop.`, {
      tone: "alert",
      meta: `Attempt ${machine.attempt} · Stop request overruled`,
    });
    await moveAlong(path, signal);
    if (!FLOORS.includes(floorAfterTarget)) {
      setIndicator(floorAfterTarget > target ? "PH" : "B?", direction > 0 ? "up" : "down");
      await pause(700, signal);
    }
    machine.transition(STATES.DRAMA);
    sound.thunk();
    await pause(1000, signal);
  },

  async "arrive-and-leave"(signal) {
    const target = machine.targetFloor;
    await moveAlong(floorPath(machine.currentFloor, target), signal);
    machine.transition(STATES.ARRIVING);
    setIndicator(target, "idle");
    announce(`Floor ${target}! The doors are open—no, wait, they’re leaving.`, {
      tone: "alert",
      meta: `Attempt ${machine.attempt} · Boarding window: 0.8 seconds`,
    });
    await openDoors(signal, SCENES.destination, { floor: target });
    await pause(420, signal);
    await closeDoors(signal);
    const escapeFloor = safeEscapeFloor(target);
    await moveAlong([escapeFloor], signal);
    machine.transition(STATES.DRAMA);
    await pause(550, signal);
  },

  async "tiny-operator"(signal) {
    announce("A tiny elevator operator appears. He says this is all perfectly normal.", {
      tone: "neutral",
      meta: `Attempt ${machine.attempt} · Staff intervention`,
    });
    await openDoors(signal, SCENES.lobby, { floor: machine.currentFloor, operator: true });
    machine.transition(STATES.DRAMA);
    sound.tone(392, 0.2, { type: "triangle", gain: 0.06 });
    sound.tone(523, 0.28, { delay: 0.18, type: "triangle", gain: 0.05 });
    await pause(1850, signal);
  },

  async countdown(signal) {
    machine.transition(STATES.DRAMA);
    announce("A dramatic countdown has begun. Its purpose has not been disclosed.", {
      tone: "alert",
      meta: `Attempt ${machine.attempt} · Brace for significance`,
    });
    for (let number = 5; number >= 0; number -= 1) {
      setIndicator(number, "alert");
      sound.countdown(number);
      await pause(number === 0 ? 900 : 520, signal);
    }
    announce("Nothing happened. The countdown considers this a success.", {
      tone: "neutral",
      meta: `Attempt ${machine.attempt} · Consequence pending`,
    });
  },

  async suspense(signal) {
    machine.transition(STATES.MOVING);
    announce("Unnecessary suspense music is now playing.", {
      tone: "alert",
      meta: `Attempt ${machine.attempt} · Orchestra not included`,
    });
    sound.suspense();
    for (const symbol of ["?", "?!", "!?", "…"]) {
      setIndicator(symbol, "alert");
      await pause(610, signal);
    }
    machine.transition(STATES.DRAMA);
  },

  async "same-floor"(signal) {
    announce(`The doors open on floor ${machine.currentFloor}, which is exactly where you already were.`, {
      tone: "neutral",
      meta: `Attempt ${machine.attempt} · Net travel: zero`,
    });
    await openDoors(signal, SCENES.lobby, { floor: machine.currentFloor });
    machine.transition(STATES.DRAMA);
    await pause(1450, signal);
  },
};

async function runTrip(targetFloor, sourceButton) {
  if (machine.busy) return;

  tripController = new AbortController();
  const { signal } = tripController;
  const plan = createTripPlan();

  try {
    void sound.unlock();
    machine.startTrip(targetFloor);
    announce(`Floor ${targetFloor} selected. A routine journey is being made needlessly complex.`, {
      meta: `Car 01 · Request logged`,
    });
    await pause(700, signal);

    for (const [index, event] of plan.failures.entries()) {
      machine.setAttempt(index + 1);
      await closeDoors(signal);
      await eventHandlers[event.id](signal);
      await pause(420, signal);
    }

    machine.setAttempt(plan.finalAttempt);
    await closeDoors(signal);
    announce(`Final attempt. Floor ${targetFloor} has been located using conventional arithmetic.`, {
      tone: "neutral",
      meta: `Attempt ${plan.finalAttempt} · Procedure reluctantly normal`,
    });
    await moveAlong(floorPath(machine.currentFloor, targetFloor), signal);
    machine.transition(STATES.ARRIVING);
    setIndicator(targetFloor, "idle");
    sound.success();
    announce(`Against all odds, you have arrived at floor ${targetFloor}.`, {
      tone: "success",
      meta: `Attempt ${plan.finalAttempt} · Destination confirmed`,
    });
    await openDoors(signal, SCENES.destination, { floor: targetFloor });
    machine.completeTrip();
    await pause(2500, signal);
    machine.settle();
    announce(`Floor ${targetFloor}. Doors open. Try not to make eye contact with the machinery.`, {
      tone: "success",
      meta: `Car 01 · Standing by at floor ${targetFloor}`,
    });
    sourceButton.focus({ preventScroll: true });
  } catch (error) {
    if (error.name !== "AbortError") {
      console.error(error);
      sound.stopAll();
      machine.reset(machine.currentFloor);
      announce("The elevator encountered a paperwork error. Reset and choose a floor again.", {
        tone: "alert",
        meta: "Car 01 · Service interrupted",
      });
    }
  } finally {
    if (tripController?.signal === signal) tripController = null;
  }
}

function resetExperience({ focus = false } = {}) {
  tripController?.abort();
  tripController = null;
  sound.stopAll();
  machine.reset(1);
  configureScene(SCENES.lobby, { floor: 1 });
  dom.doors.dataset.open = "true";
  setIndicator(1, "idle");
  announce("Reset complete. Select a floor and lower your expectations.", {
    tone: "neutral",
    meta: "Car 01 · Standing by",
  });
  if (focus) dom.floorButtons.at(-1).focus({ preventScroll: true });
}

dom.floorButtons.forEach((button) => {
  button.addEventListener("click", () => runTrip(Number(button.dataset.floor), button));
});

dom.soundToggle.addEventListener("click", async () => {
  const enabled = dom.soundToggle.getAttribute("aria-pressed") !== "true";
  dom.soundToggle.setAttribute("aria-pressed", String(enabled));
  dom.soundLabel.textContent = enabled ? "Sound on" : "Sound off";
  sound.setEnabled(enabled);
  if (enabled) {
    await sound.unlock();
    sound.tone(523.25, 0.18, { type: "sine", gain: 0.06 });
  }
});

dom.volume.addEventListener("input", () => {
  const value = Number(dom.volume.value);
  dom.volumeOutput.value = `${value}%`;
  dom.volumeOutput.textContent = `${value}%`;
  sound.setVolume(value / 100);
});

dom.resetButton.addEventListener("click", () => resetExperience({ focus: true }));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    resetExperience({ focus: true });
    return;
  }

  const isTyping = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  const floor = Number(event.key);
  if (isTyping || event.metaKey || event.ctrlKey || event.altKey || machine.busy || !FLOORS.includes(floor)) return;

  const button = dom.floorButtons.find((candidate) => Number(candidate.dataset.floor) === floor);
  if (button) {
    event.preventDefault();
    button.click();
  }
});

prefersReducedMotion.addEventListener("change", () => {
  if (!machine.busy) setIndicator(machine.currentFloor, "idle");
});

configureScene(SCENES.lobby, { floor: 1 });
setIndicator(1, "idle");
