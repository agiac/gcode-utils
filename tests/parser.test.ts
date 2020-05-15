import Parser from "../src/parser";

describe("Test if the  Gcode parser can handle:", () => {
  test("Single commands", () => {
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

  test("Multiple lines", () => {
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

  test("Different number and letter formats", () => {
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

  test("Spaces", () => {
    expect(Parser.parseGcode("G 0 X  2 0 Y 1 0 . 5 T  1 G1  Z 8")).toEqual([
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

  test("Bad inputs", () => {
    expect(
      Parser.parseGcode("G0 X21.4 saf Y2 G1 Z1.0 fa8f s23\n fa34 X1 G1 X1")
    ).toEqual([
      {
        command: "G0",
        params: { X: 21.4 },
      },
      {
        command: "G1",
        params: { Z: 1 },
      },
      {
        command: "G1",
        params: { X: 1 },
      },
    ]);
  });
});
