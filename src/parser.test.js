import Parser from "./parser";

test("Basic command", () => {
  expect(Parser.parseGcode("G0 X20 Y10.5")).toEqual([
    {
      command: "G0",
      params: { X: 20, Y: 10.5 },
    },
  ]);
});

test("Multiple commands", () => {
  expect(Parser.parseGcode("G0 X20 Y10.5 T1 G1 Z8")).toEqual([
    {
      command: "G0",
      params: { X: 20, Y: 10.5 },
    },
    {
      command: "T1",
      params: {},
    },
    {
      command: "G1",
      params: { Z: 8 },
    },
  ]);
});

test("Spaces", () => {
  expect(Parser.parseGcode("G 0 X  20 Y10.5 T  1 G1 Z 8")).toEqual([
    {
      command: "G0",
      params: { X: 20, Y: 10.5 },
    },
    {
      command: "T1",
      params: {},
    },
    {
      command: "G1",
      params: { Z: 8 },
    },
  ]);
});

test("Multiline", () => {
  expect(Parser.parseGcode("G0 X20 Y10.5 \nT1 \n G1 Z8")).toEqual([
    {
      command: "G0",
      params: { X: 20, Y: 10.5 },
    },
    {
      command: "T1",
      params: {},
    },
    {
      command: "G1",
      params: { Z: 8 },
    },
  ]);
});

test("Number and letter formats", () => {
  expect(Parser.parseGcode("g0 X+20 Y-10.5 \nt1 \n G1 X-.5z.8")).toEqual([
    {
      command: "G0",
      params: { X: 20, Y: -10.5 },
    },
    {
      command: "T1",
      params: {},
    },
    {
      command: "G1",
      params: { X: -0.5, Z: 0.8 },
    },
  ]);
});

test("Comments", () => {
  expect(
    Parser.parseGcode(
      "G0(a comment) X+20 Y-10.5 ;a comment \nT1(a comment) \n G1 X-.5Z.8 ;a comment G0 x2\n;a comment T9"
    )
  ).toEqual([
    {
      command: "G0",
      params: { X: 20, Y: -10.5 },
    },
    {
      command: "T1",
      params: {},
    },
    {
      command: "G1",
      params: { X: -0.5, Z: 0.8 },
    },
  ]);
});
