import GcodeParser from "./parser.js";

const defaultState = {
  position: {
    x: 0,
    y: 0,
    z: 0,
  },
};

/**
 * @typedef {import('./parser').Command} Command
 *
 * @typedef {Object} Operation
 * @property {string} operation
 * @property {Object} props
 *
 * @typedef {defaultState} MachineState
 */

/**
 *
 * @param {Command} command
 * @param {MachineState} state
 * @returns {[Operation, MachineState]}
 */
function handleG0(command, state) {
  return [
    {
      operation: "RAPID_MOVE",
      props: { x: command.params.X, y: command.params.Y },
    },
    {
      ...state,
      position: {
        x: state.position.x + (command.params.X || 0),
        y: state.position.y + (command.params.Y || 0),
        z: state.position.z + (command.params.Z || 0),
      },
    },
  ];
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @returns {[Operation, MachineState]}
 */
function interpretCommand(command, state) {
  if (command.command === "G0") {
    return handleG0(command, state);
  }
  return [{ operation: "UNKNOWN", props: {} }, state];
}

/**
 * @param {Command} command
 * @param {Operation[]} operations
 * @param {MachineState} state
 * @return {[Operation[], MachineState]}
 */
function handleCommand(command, operations, state) {
  const [operation, newState] = interpretCommand(command, state);
  return [[...operations, operation], newState];
}

/**
 * @preserve
 * @param {string} gcode
 * @param {MachineState} state
 * @param {Object[]} operations
 * @return {[Operation[], MachineState]}
 */
function interpretGcode(gcode, state = defaultState, operations = []) {
  const commands = GcodeParser.parseGcode(gcode);

  return commands.reduce(
    ([currentOperations, currentState], command) =>
      handleCommand(command, currentOperations, currentState),
    [operations, state]
  );
}

export default { interpretGcode };

const test = "G0 X10 G0 Y10";

const [operations, state] = interpretGcode(test);

console.log(operations, state);
