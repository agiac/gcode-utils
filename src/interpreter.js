import GcodeParser from "./parser";

/**
 * @param {import('./parser').Command} command
 * @param {Object} state
 */
function handleCommand(command, state) {
  const operation = {};
  return [operation, state];
}

/**
 * @param {import('./parser').Command} command
 * @param {Object[]} operations
 * @param {Object} state
 * @return {[Object, Object]}
 */
function interpretCommand(command, operations, state) {
  const [operation, newState] = handleCommand(command, state);
  return [[...operations, operation], newState];
}

/**
 * @preserve
 * @param {string} gcode
 * @param {Object} state
 * @param {Object[]} operations
 * @return {[Object, Object]}
 */
function interpretGcode(gcode, state, operations) {
  const commands = GcodeParser.parseGcode(gcode);

  return commands.reduce(
    ([currentOperations, currentState], command) =>
      interpretCommand(command, currentOperations, currentState),
    [operations, state]
  );
}

export default { interpretGcode };
