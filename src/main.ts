import { parseGcode } from './parser';
import { createProcessor, interpretCommands, interpretGcode } from './interpreter';

export const GcodeParser = { parseGcode };

export const GcodeInterpreter = {
  createProcessor,
  interpretCommands,
  interpretGcode,
};

export default { GcodeParser, GcodeInterpreter };
