const GCodeParser = require("./src/parser");

const example = `G0 ;Some code G1
;another comment # yeah
Random stuff

M1 G0  df X0 Y0

G 0 X100.123 (comment) Y100
G1 X200 Y-100 S1.0
G1 X200 y200 S+1.0 G1 X100 Y200 S1.0
G1 x100 Y100 dfas S1.0`;

const parsed = GCodeParser.parseGcode(example);

console.log(parsed);