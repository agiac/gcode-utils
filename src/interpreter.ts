import { parseGcode, Command } from './parser';

interface OperationBase {
  /** The type of operation */
  operation: string;
  /** Properties of the operation */
  props: unknown;
}

interface UnknownOperation extends OperationBase {
  operation: 'UNKNOWN';
  props: {
    /** The unknown G-code command */
    command: string;
  };
}

interface MoveOperation extends OperationBase {
  operation: 'MOVE_TO';
  props: {
    /** The starting position of the movement */
    from: Position;
    /** The target position of the movement */
    to: Position;
    /** The speed of the movement in mm/min */
    speed: number;
    /** The relative amount of extrusion during the movement (for 3D prinint) */
    extrusion?: number;
    /** The amount of laser power from 0 to 1 (for laser cutting) */
    laserPower?: number;
  };
}

type Operation = MoveOperation | UnknownOperation;

interface Position {
  x: number;
  y: number;
  z: number;
}

/** Represents the current state of the virtual machine */
interface MachineState {
  /** The current tool position */
  position: Position;
  /** The current home position (for GRBL firmware) */
  home: Position;
  /** The current distance mode: 'ABSOLUTE' or 'RELATIVE' */
  distanceMode: 'ABSOLUTE' | 'RELATIVE';
  /** The current travel mode: 'G0' or 'G1' */
  travelMode: 'G0' | 'G1';
  /** The current speed during G0 movements */
  feedRateG0: number;
  /** The current speed during G1 movements */
  feedRateG1: number;
  /** The current power of the laser: between 0 and 1 */
  laserPower: number;
  /** The current position of the extrusion axis */
  extrusion: number;
}

/** The settings of the interpreter */
interface Settings {
  /** The firmware used to interpret the G-code commands: 'GRBL' or 'RepRap' */
  firmware: 'GRBL' | 'RepRap';
}

const defaultState: Readonly<MachineState> = Object.freeze({
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
  distanceMode: 'ABSOLUTE',
  travelMode: 'G0',
  feedRateG0: 1000,
  feedRateG1: 1000,
  laserPower: 0,
  extrusion: 0,
});

const defaultSettings: Readonly<Settings> = Object.freeze({
  firmware: 'RepRap',
});

function isAnyFirmare(firmware: string) {
  return firmware === 'GRBL' || firmware === 'RepRap';
}

function isNumber(number: unknown) {
  return (
    number !== null && number !== undefined && typeof number === 'number' && !Number.isNaN(number)
  );
}

function operationMoveTo(
  from: Position,
  to: Position,
  speed: number,
  extrusion?: number,
  laserPower?: number,
): MoveOperation {
  return {
    operation: 'MOVE_TO',
    props: {
      from,
      to,
      speed,
      extrusion,
      laserPower,
    },
  };
}

function interpretMove(
  position: Position,
  previousPosition: Position,
  mode: MachineState['distanceMode'],
): Position {
  if (mode === 'RELATIVE') {
    return {
      x: (previousPosition.x || 0) + (position.x || 0),
      y: (previousPosition.y || 0) + (position.y || 0),
      z: (previousPosition.z || 0) + (position.z || 0),
    };
  }

  return {
    x: isNumber(position.x) ? position.x : previousPosition.x,
    y: isNumber(position.y) ? position.y : previousPosition.y,
    z: isNumber(position.z) ? position.z : previousPosition.z,
  };
}

function interpretExtrusion(
  extrusion: number,
  previousExtrusion: number,
  mode: MachineState['distanceMode'],
) {
  if (mode === 'RELATIVE') {
    return (previousExtrusion || 0) + (extrusion || 0);
  }

  return isNumber(extrusion) ? extrusion : previousExtrusion;
}

function interpretG0(command: Command, state: MachineState): [Operation[], MachineState] {
  const moveTo = {
    x: command.params.X,
    y: command.params.Y,
    z: command.params.Z,
  };

  const position = interpretMove(moveTo, state.position, state.distanceMode);

  const speed = command.params.F || state.feedRateG0;

  const laserPower = 0;

  const extrusion = 0;

  return [
    [operationMoveTo(state.position, position, speed)],
    {
      ...state,
      position,
      travelMode: 'G0',
      feedRateG0: speed,
      laserPower,
      extrusion,
    },
  ];
}

function interpretG1(command: Command, state: MachineState): [Operation[], MachineState] {
  const moveTo = {
    x: command.params.X,
    y: command.params.Y,
    z: command.params.Z,
  };

  const position = interpretMove(moveTo, state.position, state.distanceMode);

  const speed = command.params.F || state.feedRateG1;

  const laserPower = command.params.S || state.laserPower;

  const extrusion = interpretExtrusion(command.params.E, state.extrusion, state.distanceMode);

  return [
    [operationMoveTo(state.position, position, speed, extrusion - state.extrusion, laserPower)],
    {
      ...state,
      position,
      travelMode: 'G1',
      feedRateG1: speed,
      laserPower,
      extrusion,
    },
  ];
}

function interpretG90(state: MachineState): [Operation[], MachineState] {
  return [
    [],
    {
      ...state,
      distanceMode: 'ABSOLUTE',
    },
  ];
}

function interpretG91(state: MachineState): [Operation[], MachineState] {
  return [
    [],
    {
      ...state,
      distanceMode: 'RELATIVE',
    },
  ];
}

function interpretG28(
  command: Command,
  state: MachineState,
  settings: Settings,
): [Operation[], MachineState] {
  if (settings.firmware === 'RepRap') {
    const goTo = {
      x: isNumber(command.params.X) ? 0 : state.position.x,
      y: isNumber(command.params.Y) ? 0 : state.position.y,
      z: isNumber(command.params.Z) ? 0 : state.position.z,
    };
    return [
      [operationMoveTo(state.position, goTo, state.feedRateG0)],
      {
        ...state,
        position: goTo,
      },
    ];
  }

  if (!isNumber(command.params.X) && !isNumber(command.params.Y) && !isNumber(command.params.Z)) {
    return [
      [operationMoveTo(state.position, state.home, state.feedRateG0)],
      {
        ...state,
        position: state.home,
      },
    ];
  }

  const moveTo = {
    x: isNumber(command.params.X) ? command.params.X : state.position.x,
    y: isNumber(command.params.Y) ? command.params.Y : state.position.y,
    z: isNumber(command.params.Z) ? command.params.Z : state.position.z,
  };
  const homeTo = {
    x: isNumber(command.params.X) ? state.home.x : moveTo.x,
    y: isNumber(command.params.Y) ? state.home.y : moveTo.y,
    z: isNumber(command.params.Z) ? state.home.z : moveTo.z,
  };

  return [
    [
      operationMoveTo(state.position, moveTo, state.feedRateG0),
      operationMoveTo(moveTo, homeTo, state.feedRateG0),
    ],
    {
      ...state,
      position: homeTo,
    },
  ];
}

function interpretG28p1(
  command: Command,
  state: MachineState,
  settings: Settings,
): [Operation[], MachineState] {
  if (settings.firmware === 'GRBL') {
    return [
      [],
      {
        ...state,
        home: {
          x: isNumber(command.params.X) ? command.params.X : state.home.x,
          y: isNumber(command.params.Y) ? command.params.Y : state.home.y,
          z: isNumber(command.params.Z) ? command.params.Z : state.home.z,
        },
      },
    ];
  }
  return [[], state];
}

function interpretG92(command: Command, state: MachineState): [Operation[], MachineState] {
  // TODO When handling multiple coordinate systems, distinguish between RepRap and GRBL firmwares
  return [
    [],
    {
      ...state,
      position: {
        x: isNumber(command.params.X) ? command.params.X : state.position.x,
        y: isNumber(command.params.Y) ? command.params.Y : state.position.y,
        z: isNumber(command.params.Z) ? command.params.Z : state.position.z,
      },
      extrusion: isNumber(command.params.E) ? command.params.E : state.extrusion,
    },
  ];
}

function interpretCommand(
  command: Command,
  state: MachineState,
  settings: Settings,
): [Operation[], MachineState] {
  if (command.command === 'G0' || command.command === 'G00') {
    return interpretG0(command, state);
  }
  if (command.command === 'G1' || command.command === 'G01') {
    return interpretG1(command, state);
  }
  if (command.command === 'G90') {
    return interpretG90(state);
  }
  if (command.command === 'G91') {
    return interpretG91(state);
  }
  if (command.command === 'G28') {
    return interpretG28(command, state, settings);
  }
  if (command.command === 'G28.1') {
    return interpretG28p1(command, state, settings);
  }
  if (command.command === 'G92') {
    return interpretG92(command, state);
  }
  return [
    [{ operation: 'UNKNOWN', props: { command: command.command } } as UnknownOperation],
    state,
  ];
}

export function interpretCommands(
  commands: Command[],
  state: MachineState | null = defaultState,
  settings: Settings | null = defaultSettings,
): [Operation[], MachineState] {
  if (!isAnyFirmare(settings?.firmware || 'undefined')) {
    throw new Error(`Unknown firmware: ${settings?.firmware}`);
  }

  return commands.reduce(
    ([operations, currentState], command) => {
      const [newOperations, newState] = interpretCommand(command, currentState, {
        ...defaultSettings,
        ...settings,
      });
      return [newOperations.length ? [...operations, ...newOperations] : operations, newState];
    },
    [[] as Operation[], { ...defaultState, ...state } as MachineState],
  );
}

export function interpretGcode(
  gcode: string,
  state: MachineState | null = defaultState,
  settings: Settings | null = defaultSettings,
): [Operation[], MachineState] {
  return interpretCommands(
    parseGcode(gcode),
    { ...defaultState, ...state },
    { ...defaultSettings, ...settings },
  );
}

export function createProcessor(
  settings: { state?: MachineState; settings?: Settings } = {
    state: defaultState,
    settings: defaultSettings,
  },
) {
  let mState = settings.state || defaultState;
  let mSettings = settings.settings || defaultSettings;
  return Object.freeze({
    processGcode(gcode: string) {
      const parsed = parseGcode(gcode);

      const [operations, newState] = interpretCommands(parsed, mState, mSettings);

      mState = newState;

      return operations;
    },
    reset(
      resetSettings: { state?: MachineState; settings?: Settings } = {
        state: defaultState,
        settings: defaultSettings,
      },
    ) {
      mState = resetSettings.state || defaultState;
      mSettings = resetSettings.settings || defaultSettings;
    },
    get state() {
      return mState;
    },
    get settings() {
      return mSettings;
    },
  });
}

export default { createProcessor, interpretGcode, interpretCommands };
