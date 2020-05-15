import { parseGcode } from "./parser";

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
 * @typedef {'GRBL' | 'RepRap'} Firmware
 *
 * @typedef {'ABSOLUTE' | 'RELATIVE'} DistanceMode
 *
 * @typedef {'G0' | 'G1'} TravelMode
 *
 * @typedef {Object} MachineState
 * @property {Position} [position]
 * @property {Position} [home]
 * @property {DistanceMode} [distanceMode]
 * @property {TravelMode} [travelMode]
 * @property {number} [feedRateG0]
 * @property {number} [feedRateG1]
 * @property {number} [laserPower]
 * @property {number} [extrusion]
 *
 * @typedef {Object} Settings
 * @property {Firmware} firmware
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
  travelMode: "G0",
  feedRateG0: 1000,
  feedRateG1: 1000,
  laserPower: 0,
  extrusion: 0,
};

/**
 * @type {Settings}
 */
const defaultSettings = {
  firmware: "RepRap",
};

/**
 * @param {Firmware} firmware
 */
function isAnyFirmare(firmware) {
  return firmware === "GRBL" || firmware === "RepRap";
}

/**
 * @param {number} number
 */
function isNumber(number) {
  return number !== null && number !== undefined && !Number.isNaN(number);
}

/**
 * @param {Position} position
 * @param {Position} previousPosition
 * @param {DistanceMode} mode
 */
function interpretMove(position, previousPosition, mode) {
  if (mode === "RELATIVE") {
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

/**
 * @param {number} extrusion
 * @param {number} previousExtrusion
 * @param {DistanceMode} mode
 */
function interpretExtrusion(extrusion, previousExtrusion, mode) {
  if (mode === "RELATIVE") {
    return (previousExtrusion || 0) + (extrusion || 0);
  }

  return isNumber(extrusion) ? extrusion : previousExtrusion;
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @returns {[Operation[], MachineState]}
 */
function interpretG0(command, state) {
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
    [
      {
        operation: "MOVE_TO",
        props: {
          from: state.position,
          to: position,
          speed,
        },
      },
    ],
    {
      ...state,
      position,
      travelMode: "G0",
      feedRateG0: speed,
      laserPower,
      extrusion,
    },
  ];
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @returns {[Operation[], MachineState]}
 */
function interpretG1(command, state) {
  const moveTo = {
    x: command.params.X,
    y: command.params.Y,
    z: command.params.Z,
  };

  const position = interpretMove(moveTo, state.position, state.distanceMode);

  const speed = command.params.F || state.feedRateG1;

  const laserPower = command.params.S || state.laserPower;

  const extrusion = interpretExtrusion(
    command.params.E,
    state.extrusion,
    state.distanceMode
  );

  return [
    [
      {
        operation: "MOVE_TO",
        props: {
          from: state.position,
          to: position,
          speed,
          extrusion: extrusion - state.extrusion,
        },
      },
    ],
    {
      ...state,
      position,
      travelMode: "G1",
      feedRateG1: speed,
      laserPower,
      extrusion,
    },
  ];
}

/**
 * @param {MachineState} state
 * @returns {[Operation[], MachineState]}
 */
function interpretG90(state) {
  return [
    [],
    {
      ...state,
      distanceMode: "ABSOLUTE",
    },
  ];
}

/**
 * @param {MachineState} state
 * @returns {[Operation[], MachineState]}
 */
function interpretG91(state) {
  return [
    [],
    {
      ...state,
      distanceMode: "RELATIVE",
    },
  ];
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @param {Settings} settings
 * @returns {[Operation[], MachineState]}
 */
function interpretG28(command, state, settings) {
  if (settings.firmware === "RepRap") {
    const goTo = {
      x: isNumber(command.params.X) ? 0 : state.position.x,
      y: isNumber(command.params.Y) ? 0 : state.position.y,
      z: isNumber(command.params.Z) ? 0 : state.position.z,
    };
    return [
      [
        {
          operation: "MOVE_TO",
          props: {
            from: state.position,
            to: goTo,
            speed: state.feedRateG0,
          },
        },
      ],
      {
        ...state,
        position: goTo,
      },
    ];
  }
  if (settings.firmware === "GRBL") {
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
        {
          operation: "MOVE_TO",
          props: {
            from: state.position,
            to: moveTo,
            speed: state.feedRateG0,
          },
        },
        {
          operation: "MOVE_TO",
          props: {
            from: moveTo,
            to: homeTo,
            speed: state.feedRateG0,
          },
        },
      ],
      {
        ...state,
        position: homeTo,
      },
    ];
  }
  return [[], state];
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @param {Settings} settings
 * @returns {[Operation[], MachineState]}
 */
function interpretG28p1(command, state, settings) {
  if (settings.firmware === "GRBL") {
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

/**
 * @param {Command} command
 * @param {MachineState} state
 * @param {Settings} settings
 * @returns {[Operation[], MachineState]}
 */
function interpretG92(command, state, settings) {
  if (settings.firmware === "RepRap") {
    return [
      [],
      {
        ...state,
        position: {
          x: isNumber(command.params.X) ? command.params.X : state.position.x,
          y: isNumber(command.params.Y) ? command.params.Y : state.position.y,
          z: isNumber(command.params.Z) ? command.params.Z : state.position.z,
        },
        extrusion: isNumber(command.params.E)
          ? command.params.E
          : state.extrusion,
      },
    ];
  }
  if (settings.firmware === "GRBL") {
    // TODO
    return [null, state];
  }

  throw new Error(`Unknown firmware: ${settings.firmware}`);
}

/**
 * @param {Command} command
 * @param {MachineState} state
 * @param {Settings} settings
 * @returns {[Operation[], MachineState]}
 */
function interpretCommand(command, state, settings) {
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
    return interpretG28(command, state, settings);
  }
  if (command.command === "G28.1") {
    return interpretG28p1(command, state, settings);
  }
  if (command.command === "G92") {
    return interpretG92(command, state, settings);
  }
  return [[], state];
}

/**
 * @preserve
 * @param {Command[]} commands
 * @param {MachineState} state
 * @param {Settings} settings
 * @returns {[Operation[], MachineState]}
 */
export function interpretCommands(
  commands,
  state = defaultState,
  settings = defaultSettings
) {
  // Check passed settings
  if (!isAnyFirmare(settings.firmware)) {
    throw new Error(`Unknown firmware: ${settings.firmware}`);
  }

  return commands.reduce(
    ([operations, currentState], command) => {
      const [newOperations, newState] = interpretCommand(
        command,
        currentState,
        { ...defaultSettings, ...settings }
      );
      return [
        newOperations.length ? [...operations, ...newOperations] : operations,
        newState,
      ];
    },
    [[], { ...defaultState, ...state }]
  );
}

/**
 * @preserve
 * @param {string} gcode
 * @param {MachineState} state
 * @param {Settings} settings
 * @return {[Operation[], MachineState]}
 */
export function interpretGcode(
  gcode,
  state = defaultState,
  settings = defaultSettings
) {
  return interpretCommands(
    parseGcode(gcode),
    { ...defaultState, ...state },
    { ...defaultSettings, ...settings }
  );
}

/**
 * @preserve
 * @param {{state?: MachineState, settings?: Settings}} [settings={}]
 */
export function createProcessor(settings = {}) {
  let mState = { ...defaultState, ...settings.state };
  let mSettings = { ...defaultSettings, ...settings.settings };
  return Object.freeze({
    /**
     * @oreserve
     * @param {string} gcode
     */
    processGcode(gcode) {
      const parsed = parseGcode(gcode);

      const [operations, newState] = interpretCommands(
        parsed,
        mState,
        mSettings
      );

      mState = newState;

      return operations;
    },
    /**
     * @preserve
     * @param {MachineState} newState
     */
    reset(newState = defaultState, newSettings = defaultSettings) {
      mState = newState;
      mSettings = newSettings;
    },
    get state() {
      return mState;
    },
  });
}

export default { createProcessor, interpretGcode, interpretCommands };
