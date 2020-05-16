import { parseGcode, Command } from './parser';

interface OperationBase {
  /** The type of operation */
  operation: 'UNKNOWN' | 'RAPID_MOVE' | 'LINEAR_MOVE';
  /** Properties of the operation */
  props: unknown;
}

export interface UnknownOperation extends OperationBase {
  operation: 'UNKNOWN';
  props: {
    /** The unknown G-code command */
    command: string;
  };
}

export interface RapidMoveOperation extends OperationBase {
  operation: 'RAPID_MOVE';
  props: {
    /** The starting position of the movement */
    from: Position;
    /** The target position of the movement */
    to: Position;
    /** The speed of the movement in mm/min */
    speed: number;
  };
}

export interface LinearMoveOperation extends OperationBase {
  operation: 'LINEAR_MOVE';
  props: {
    /** The starting position of the movement */
    from: Position;
    /** The target position of the movement */
    to: Position;
    /** The speed of the movement in mm/min */
    speed: number;
    /** The relative amount of extrusion during the movement (for 3D prining) */
    extrusion: number;
    /** The amount of laser power from 0 to 1 (for laser cutting) */
    laserPower: number;
    /** The spindel speed in revolutions per minute (for CNC) */
    spindleSpeed: number;
  };
}

type Operation = RapidMoveOperation | LinearMoveOperation | UnknownOperation;

interface Position {
  x: number;
  y: number;
  z: number;
}

/** Represents the current state of the virtual machine */
export interface MachineState {
  /** The current tool position */
  position: Position;
  /** The current home position (for GRBL firmware) */
  home: Position;
  /** The current distance mode: 'ABSOLUTE' or 'RELATIVE' */
  distanceMode: 'ABSOLUTE' | 'RELATIVE';
  /** The current travel mode: 'G0' or 'G1' */
  travelMode: 'G0' | 'G1';
  /** The current feedrate */
  feedRate: number;
  /** The current position of the extrusion axis (for 3D printing) */
  extrusion: number;
  /** The current power of the laser: between 0 and 1 (for laser cutting) */
  laserPower: number;
  /** The spindel speed in revolutions per minute (for CNC) */
  spindleSpeed: number;
}

/** The settings of the interpreter */
export interface Settings {
  /** The firmware used to interpret the G-code commands: 'GRBL' */
  firmware: 'GRBL';
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
  feedRate: 1000,
  extrusion: 0,
  spindleSpeed: 0,
  laserPower: 0,
});

const defaultSettings: Readonly<Settings> = Object.freeze({
  firmware: 'GRBL',
});

function isAnyFirmare(firmware: string) {
  return firmware === 'GRBL';
}

function isNumber(number: unknown) {
  return (
    number !== null && number !== undefined && typeof number === 'number' && !Number.isNaN(number)
  );
}

function makeRapidMove(from: Position, to: Position, speed: number): RapidMoveOperation {
  return {
    operation: 'RAPID_MOVE',
    props: {
      from,
      to,
      speed,
    },
  };
}

function makeLinearMove(
  from: Position,
  to: Position,
  speed: number,
  extrusion: number,
  spindleSpeed: number,
  laserPower: number,
): LinearMoveOperation {
  return {
    operation: 'LINEAR_MOVE',
    props: {
      from,
      to,
      speed,
      extrusion,
      spindleSpeed,
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

  const feedRate = command.params.F || state.feedRate;

  return [
    [makeRapidMove(state.position, position, feedRate)],
    {
      ...state,
      position,
      travelMode: 'G0',
      feedRate,
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

  const feedRate = command.params.F || state.feedRate;

  const laserPower = command.params.S || state.laserPower;

  const extrusion = interpretExtrusion(command.params.E, state.extrusion, state.distanceMode);

  return [
    [
      makeLinearMove(
        state.position,
        position,
        feedRate,
        extrusion - state.extrusion,
        state.spindleSpeed,
        laserPower,
      ),
    ],
    {
      ...state,
      position,
      travelMode: 'G1',
      feedRate,
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
  if (settings.firmware === 'GRBL') {
    if (!isNumber(command.params.X) && !isNumber(command.params.Y) && !isNumber(command.params.Z)) {
      return [
        [makeRapidMove(state.position, state.home, state.feedRate)],
        {
          ...state,
          position: state.home,
        },
      ];
    }

    const position = {
      x: command.params.X,
      y: command.params.Y,
      z: command.params.Z,
    };

    const intermediate = interpretMove(position, state.position, state.distanceMode);

    const homeTo = {
      x: isNumber(command.params.X) ? state.home.x : intermediate.x,
      y: isNumber(command.params.Y) ? state.home.y : intermediate.y,
      z: isNumber(command.params.Z) ? state.home.z : intermediate.z,
    };

    return [
      [
        makeRapidMove(state.position, intermediate, state.feedRate),
        makeRapidMove(intermediate, homeTo, state.feedRate),
      ],
      {
        ...state,
        position: homeTo,
      },
    ];
  }

  const goTo = {
    x: isNumber(command.params.X) ? 0 : state.position.x,
    y: isNumber(command.params.Y) ? 0 : state.position.y,
    z: isNumber(command.params.Z) ? 0 : state.position.z,
  };
  return [
    [makeRapidMove(state.position, goTo, state.feedRate)],
    {
      ...state,
      position: goTo,
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

/**
 * Interprets an array of commands generated by the Parser and returns an array of operations and the final state of the virtual machine
 * @param commands The array of parsed commands
 * @param state The initial state of the virtual machine
 * @param settings The interpreter's settings
 */
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

/**
 * Interprets a G-code string and returns an array of operations and the final state of the virtual machine
 * @param gcode The G-code string
 * @param state The initial state of the virtual machine
 * @param settings The interpreter's settings
 */
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

/**
 * @param settings (Optional) Spicify the initial state of the virtual machine and the interpreter's settings
 */
export function createProcessor(
  settings: { state?: MachineState; settings?: Settings } = {
    state: defaultState,
    settings: defaultSettings,
  },
) {
  let mState = settings.state || defaultState;
  let mSettings = settings.settings || defaultSettings;
  return Object.freeze({
    /**
     * Interprets a G-code and returns an array of operations
     * @param gcode The G-code string
     */
    processGcode(gcode: string) {
      const parsed = parseGcode(gcode);

      const [operations, newState] = interpretCommands(parsed, mState, mSettings);

      mState = newState;

      return operations;
    },
    /** Resets the state and the settings of the processor to the defaults or the ones provided */
    reset(
      resetSettings: { state?: MachineState; settings?: Settings } = {
        state: defaultState,
        settings: defaultSettings,
      },
    ) {
      mState = resetSettings.state || defaultState;
      mSettings = resetSettings.settings || defaultSettings;
    },
    /** The current state of the virtual machine */
    get state() {
      return mState;
    },
    /** The current interpreter's settings */
    get settings() {
      return mSettings;
    },
  });
}
