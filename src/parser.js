const COMMAND_PARAM_RGX = /(?<type>[^GMTN\W\d\s])(?<value>[^\S\r\n]*[+-]?[^\S\r\n]*\d+[^\S\r\n]*\.?[^\S\r\n]*\d*|[^\S\r\n]*[+-]?[^\S\r\n]*\.[^\S\r\n]*\d+)/gi;
const COMMAND_RGX = /(?<command>[GMT][^\S\r\n]*\d+[^\S\r\n]*\.?[^\S\r\n]*\d*)[^\S\r\n]*((?<type>[^GMTN\W\d\s])(?<value>[^\S\r\n]*[+-]?[^\S\r\n]*\d+[^\S\r\n]*\.?[^\S\r\n]*\d*|[^\S\r\n]*[+-]?[^\S\r\n]*\.[^\S\r\n]*\d+))*/gi;

/**
 * @preserve
 * @param {string} gcode
 */
function removeComments(gcode) {
  return gcode.replace(/;.*|\(.*\)/gm, "");
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
  const gcodeNoComments = removeComments(gcode);

  const commands = getCommands(gcodeNoComments, []);

  return commands;
}

export default { parseGcode };
