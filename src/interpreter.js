import GcodeParser from "./parser.js";

/**
 * @preserve
 * @typedef {import('./parser').Command} Command
 *
 * @typedef {Object} Operation
 * @property {string} operation
 * @property {Object} props
 *
 * @typedef {Object} Position
 * @property {number} x
 * @property {number} y
 * @property {number} z
 *
 * @typedef {Object} MachineState
 * @property {Position} position
 * @property {Position} home
 * @property {'ABSOLUTE' | 'RELATIVE'} distanceMode
 * @property {number} feedRate
 */

/**
 * @type {MachineState}
 */
const defaultState = {
  position: {
    x: 0,
    y: 0,
    z: 0,
  },
  home: {
    x: 0,
    y: 0,
    z: 0,
  },
  distanceMode: "ABSOLUTE",
  feedRate: 1000,
};

/**
 * @param {number} number
 */
function isNumber(number) {
  return number !== null && number !== undefined && !Number.isNaN(number);
}

/**
 * @param {Position} position
 * @param {Position} previousPosition
 * @param {'ABSOLUTE' | 'RELATIVE'} mode
 */
function interpretMove(position, previousPosition, mode) {
  if (mode === "ABSOLUTE") {
    return {
      x: isNumber(position.x) ? position.x : previousPosition.x,
      y: isNumber(position.y) ? position.y : previousPosition.y,
      z: isNumber(position.z) ? position.z : previousPosition.z,
    };
  }

  if (mode === "RELATIVE") {
    return {
      x: (previousPosition.x || 0) + (position.x || 0),
      y: (previousPosition.y || 0) + (position.y || 0),
      z: (previousPosition.z || 0) + (position.z || 0),
    };
  }

  throw new Error("Unknown distance mode");
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @returns {[Operation, MachineState]}
 */
function interpretG0(command, state) {
  const moveTo = {
    x: command.params.X,
    y: command.params.Y,
    z: command.params.Z,
  };

  const position = interpretMove(moveTo, state.position, state.distanceMode);

  const speed = command.params.F || state.feedRate;

  return [
    {
      operation: "MOVE_TO",
      props: {
        from: state.position,
        to: position,
        speed,
      },
    },
    {
      ...state,
      position,
      feedRate: speed,
    },
  ];
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @returns {[Operation, MachineState]}
 */
function interpretG1(command, state) {
  const moveTo = {
    x: command.params.X,
    y: command.params.Y,
    z: command.params.Z,
  };

  const position = interpretMove(moveTo, state.position, state.distanceMode);

  const speed = command.params.F || state.feedRate;

  return [
    {
      operation: "MOVE_TO",
      props: {
        from: state.position,
        to: position,
        speed,
      },
    },
    {
      ...state,
      position,
      feedRate: speed,
    },
  ];
}

/**
 * @param {MachineState} state
 * @returns {[Operation, MachineState]}
 */
function interpretG90(state) {
  return [
    null,
    {
      ...state,
      distanceMode: "ABSOLUTE",
    },
  ];
}

/**
 * @param {MachineState} state
 * @returns {[Operation, MachineState]}
 */
function interpretG91(state) {
  return [
    null,
    {
      ...state,
      distanceMode: "RELATIVE",
    },
  ];
}

/**
 * @param {MachineState} state
 * @returns {[Operation, MachineState]}
 */
function interpretG28(state) {
  return [
    {
      operation: "MOVE_TO",
      props: {
        from: state.position,
        to: state.home,
        speed: state.feedRate,
      },
    },
    {
      ...state,
      position: state.home,
    },
  ];
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @returns {[Operation, MachineState]}
 */
function interpretCommand(command, state = defaultState) {
  if (command.command === "G0" || command.command === "G00") {
    return interpretG0(command, state);
  }
  if (command.command === "G1" || command.command === "G01") {
    return interpretG1(command, state);
  }
  if (command.command === "G90") {
    return interpretG90(state);
  }
  if (command.command === "G91") {
    return interpretG91(state);
  }
  if (command.command === "G28") {
    return interpretG28(state);
  }
  return [undefined, state];
}

/**
 * @preserve
 * @param {Command[]} commands
 * @param {MachineState} state
 * @returns {[Operation[], MachineState]}
 */
function interpretCommands(commands, state = defaultState) {
  return commands.reduce(
    ([operations, currentState], command) => {
      const [operation, newState] = interpretCommand(command, currentState);
      return [operation ? [...operations, operation] : operations, newState];
    },
    [[], state]
  );
}

/**
 * @preserve
 * @param {string} gcode
 * @param {MachineState} state
 * @return {[Operation[], MachineState]}
 */
function interpretGcode(gcode, state = defaultState) {
  return interpretCommands(GcodeParser.parseGcode(gcode), state);
}

/**
 * @preserve
 * @param {MachineState} state
 */
function createProcessor(state = defaultState) {
  let mState = state;
  return Object.freeze({
    /**
     * @oreserve
     * @param {string} gcode
     */
    processGcode(gcode) {
      const parsed = GcodeParser.parseGcode(gcode);

      const [operations, newState] = interpretCommands(parsed, mState);

      mState = newState;

      return operations;
    },
    /**
     * @preserve
     * @param {MachineState} newState
     */
    reset(newState = defaultState) {
      mState = newState;
    },
    get state() {
      return mState;
    },
  });
}

export default { createProcessor, interpretGcode, interpretCommands };

const test = `; relative mode
G91
G1 Z1; up one millimeter
G28 X0 Y0; home X and Y axes
; absolute mode
G90
G1 X117.5 Y125. F8000; go to the center (modify according to your printer)
G1 Z0; go to height 0
T0; select extruder 1
G92 E0; reset extruder position to 0`;

const processor = createProcessor();
const operations = processor.processGcode(test);

console.log(
  operations.map((operation) => ({
    operation: operation.operation,
    ...operation.props,
  }))
);
console.log(processor.state);
