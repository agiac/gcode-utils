const COMMAND_PARAM_RGX = /(?<type>[^GgMmTtNn\W\d])(?<value>[+-]?\d+\.?\d*|[+-]?\.\d+)/g;
const COMMAND_RGX = /(?<command>[GgMmTt]\d+\.?\d*)((?<type>[^GgMmTtNn\W\d])(?<value>[+-]?\d+\.?\d*|[+-]?\.\d+))*/g;

/**
 * @typedef {Object} Command
 * @property {string} command
 * @property {Object<string, number>} params
 */

/**
 * @preserve
 * @param {string} gcode
 */
function removeCommentsAndSpaces(gcode) {
  return gcode.replace(/;.*|\(.*\)|\s/gm, "");
}

/**
 * @preserve
 * @param {string} command
 * @returns {Object<string, number>}
 */
function getParams(command) {
  let match;

  const params = {};

  // eslint-disable-next-line no-cond-assign
  while ((match = COMMAND_PARAM_RGX.exec(command)) !== null) {
    const { type, value } = match.groups;

    params[type.toUpperCase()] = +value;
  }

  // @ts-ignore
  return params;
}

/**
 * @preserve
 * @param {string} gcode
 * @returns {Command[]}
 */
function getCommands(gcode) {
  let match;

  const commands = [];

  // eslint-disable-next-line no-cond-assign
  while ((match = COMMAND_RGX.exec(gcode)) !== null) {
    const commandString = match[0];

    const command = match.groups.command.toUpperCase().replace(/\s/g, "");

    const params = getParams(commandString);

    commands.push({ command, params });
  }

  return commands;
}

/**
 * Parses a Gcode string, removing any comment, and returns an array of commands
 * @preserve
 * @param {string} gcode The Gcode string
 */
export function parseGcode(gcode) {
  const strippedGcode = removeCommentsAndSpaces(gcode);

  const commands = getCommands(strippedGcode);

  return commands;
}

export default { parseGcode };
