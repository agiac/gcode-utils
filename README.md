# G-code utils

Simple zero dependencies JavaScript G-code parser for Node JS and browser. Parses a G-code string, strips away the comments and returns an array of commands in the form:

```typescript
[
  {
    command: string // The name of the command e.g. 'G0'
    params:
      {
        // An object containing the parsed command parameters
        X: number,
        Y: number,
        // ...
      }
  }
]
```

## Installation

```
npm install gcode-utils
```

## Usage

```javascript
const GcodeUtils = require("gcode-utils");

const gcode = ["G41; a comment", "G00 X1.1 Z1.1", "T0303 M08"].join("\n");

const parsedGcode = GcodeUtils.GcodeParser.parseGcode(gcode);
//[
//  { command: 'G41', params: {} },
//  { command: 'G00', params: { X: 1.1, Z: 1.1 } },
//  { command: 'T0303', params: {} },
//  { command: 'M08', params: {} }
//]
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

## TODO

- G-code interpreter
- G-code builder
