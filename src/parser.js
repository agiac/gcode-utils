const COMMAND_PARAM_RGX = /(?<type>[^GgMmTtNn\W\d])(?<value>[+-]?\d+\.?\d*|[+-]?\.\d+)/g;
const COMMAND_RGX = /(?<command>[GgMmTt]\d+\.?\d*)((?<type>[^GgMmTtNn\W\d])(?<value>[+-]?\d+\.?\d*|[+-]?\.\d+))*/g;

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
 * @param {Object<string, number>} params
 * @returns {Object<string, number>}
 */
function getParams(command, params) {
  const match = COMMAND_PARAM_RGX.exec(command);

  if (match === null) {
    return params;
  }

  const { type, value } = match.groups;

  return getParams(command, { ...params, [type.toUpperCase()]: +value });
}

/**
 * @preserve
 * @param {string} gcode
 * @param {{command: string, params: Object<string, number>}[]} commands
 * @returns {{command: string, params: Object<string, number>}[]}
 */
function getCommands(gcode, commands) {
  const match = COMMAND_RGX.exec(gcode);

  if (match === null) {
    return commands;
  }

  const commandString = match[0];

  const command = match.groups.command.toUpperCase().replace(/\s/g, "");

  const params = getParams(commandString, {});

  return getCommands(gcode, [...commands, { command, params }]);
}

/**
 * Parses a GCode string, removing any comment, and returns an array of commands
 * @preserve
 * @param {string} gcode The GCode string
 */
function parseGcode(gcode) {
  const strippedGCode = removeCommentsAndSpaces(gcode);

  const commands = getCommands(strippedGCode, []);

  return commands;
}

export default { parseGcode };
