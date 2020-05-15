declare interface Command {
  command: string;
  params: {
    [param: string]: number;
  };
}

declare interface Operation {
  operation: string;
  props: any;
}

declare interface Position {
  x: number;
  y: number;
  z: number;
}

declare interface MachineState {
  position: Position;
  home: Position;
  distanceMode: "ABSOLUTE" | "RELATIVE";
  travelMode: "G0" | "G1";
  feedRateG0: number;
  feedrateG1: number;
  laserPower: number;
  extrusion: number;
}

declare interface Processor {
  processGcode: (gcode: string) => Operation[];
  reset: (state?: MachineState, settings?: Settings) => void;
  readonly state: MachineState;
}

declare interface Settings {
  firmware: "GRBL" | "RELATIVE";
}

declare function parseGcode(gcode: string): Command[];

declare function interpretGcode(
  gcode: string,
  state?: MachineState,
  settings?: Settings
): [Operation[], MachineState];
declare function interpretCommands(
  commands: Command[],
  state?: MachineState,
  settings?: Settings
): [Operation[], MachineState];
declare function createProcessor(settings?: {
  sate?: MachineState;
  settings?: Settings;
}): Processor;

export as namespace GcodeUtils;

export const GcodeParser = { parseGcode };

export const GcodeInterpreter = {
  createProcessor,
  interpretCommands,
  interpretGcode,
};

export default { GcodeParser, GcodeInterpreter };
