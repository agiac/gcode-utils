# G-code utilities

Simple zero dependencies JavaScript G-code parser and interpreter for Node JS and browser. 

## Installation

```
npm install gcode-utils
```

or via CDN

```html
<script src="https://unpkg.com/gcode-utils@latest/dist/bundle.umd.js"></script>
```

## G-code parser

Parses a G-code string, strips away the comments and returns an array of commands in the form:

```typescript

interface Command {
  /** The name of the command e.g. 'G0' */
  command: string;
  /** An object containing the parsed command parameters */
  params:
    {
      [parameter: string]: number;
    }
}

```

### Example

```javascript
import { GcodeParser } from "gcode-utils";

const gcode = ["G90;a comment", "G00 X1.1 Z1.1", "T1 M08"].join("\n");

const parsedGcode = GcodeParser.parseGcode(gcode);

//[
//  { command: 'G90', params: {} },
//  { command: 'G00', params: { X: 1.1, Z: 1.1 } },
//  { command: 'T1', params: {} },
//  { command: 'M08', params: {} }
//]
```

## G-code interpreter

The main tool of the interpreter is the __processor__. You can create a processor in the following way:

```javascript
import {GcodeInterpreter} from "gcode-utils";

const gcode = ["G90;a comment", "G00 X1.1 Z1.1", "M08"].join("\n");

const processor = GcodeInterpreter.createProcessor();

```

Currently the only firmware supported is [GRBL](https://github.com/grbl/grbl/wiki).

The processor, via the ```processGcode``` function, can then take a G-code string and return a list of __operations__.

Currently the processor can interpret the following G-code commands:
``` G0, G1, G90, G91, G28, G28.1, G92 ```

### Example

```javascript

const gcode = ["G90;a comment", "G0 X10 Y10 F1000", "G91", "G0 X1 Y1", "G40"].join("\n");

const operations = processor.processGcode(gcode);

// [
//   {
//     operation: "RAPID_MOVE",
//     props: {
//       from: {x: 0, y: 0, z: 0},
//       to: { x: 10, y: 10, z: 0},
//       speed: 1000
//     }
//   },
//   {
//     operation: "RAPID_MOVE",
//     props: {
//       from: {x: 10, y: 10, z: 0},
//       to: { x: 11, y: 10, z: 0},
//       speed: 1000
//     }
//   },
//   {
//     operation: "UNKNOWN",
//     props: {
//       command: "G40",
//     }
//   }
// ]

```

### Machine state

In order to correctly interpret the G-code, the processor uses a __virtual machine__ with its own internal state. You can access the current state of the virtual machine of the interpreter with ```processor.state``` . The machine state has the following interface:

```typescript

interface MachineState {
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

```


## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## TODO

See the [TODO](TODO) list.
