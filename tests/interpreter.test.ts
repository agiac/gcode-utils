import {
  createProcessor,
  interpretGcode,
  RapidMoveOperation,
  LinearMoveOperation,
  UnknownOperation,
} from '../src/interpreter';

describe('Test the  Gcode interpreter for:', () => {
  describe('GRBL firmware:', () => {
    const processor = createProcessor();

    test('G0', () => {
      expect(processor.processGcode('G0 X20 Y10.5 Z 5 F500')).toEqual([
        {
          operation: 'RAPID_MOVE',
          props: {
            from: { x: 0, y: 0, z: 0 },
            to: { x: 20, y: 10.5, z: 5 },
            speed: 500,
          },
        } as RapidMoveOperation,
      ]);
    });

    test('G91', () => {
      expect(processor.processGcode('G91 G0 X0 Y0 Z1')).toEqual([
        {
          operation: 'RAPID_MOVE',
          props: {
            from: { x: 20, y: 10.5, z: 5 },
            to: { x: 20, y: 10.5, z: 6 },
            speed: 500,
          },
        } as RapidMoveOperation,
      ]);
    });

    test('G90', () => {
      expect(processor.processGcode('G90 G0 X5 Y5 Z5')).toEqual([
        {
          operation: 'RAPID_MOVE',
          props: {
            from: { x: 20, y: 10.5, z: 6 },
            to: { x: 5, y: 5, z: 5 },
            speed: 500,
          },
        } as RapidMoveOperation,
      ]);
    });

    test('G28', () => {
      expect(processor.processGcode('G0 X10 Y10 Z0 G28.1 X5 Y5 G28 X40 G28')).toEqual([
        {
          operation: 'RAPID_MOVE',
          props: {
            from: { x: 5, y: 5, z: 5 },
            to: { x: 10, y: 10, z: 0 },
            speed: 500,
          },
        } as RapidMoveOperation,
        {
          operation: 'RAPID_MOVE',
          props: {
            from: { x: 10, y: 10, z: 0 },
            to: { x: 40, y: 10, z: 0 },
            speed: 500,
          },
        } as RapidMoveOperation,
        {
          operation: 'RAPID_MOVE',
          props: {
            from: { x: 40, y: 10, z: 0 },
            to: { x: 5, y: 10, z: 0 },
            speed: 500,
          },
        } as RapidMoveOperation,
        {
          operation: 'RAPID_MOVE',
          props: {
            from: { x: 5, y: 10, z: 0 },
            to: { x: 5, y: 5, z: 0 },
            speed: 500,
          },
        } as RapidMoveOperation,
      ]);
    });

    test('G1', () => {
      expect(processor.processGcode('G1 X117.5 Y125. Z1  F100')).toEqual([
        {
          operation: 'LINEAR_MOVE',
          props: {
            from: { x: 5, y: 5, z: 0 },
            to: { x: 117.5, y: 125, z: 1 },
            speed: 100,
            extrusion: 0,
            laserPower: 0,
            spindleSpeed: 0,
          },
        } as LinearMoveOperation,
      ]);
    });

    test('G92', () => {
      processor.processGcode('G92 X0 Y0');
      expect(processor.state.position).toEqual({ x: 0, y: 0, z: 1 });
    });

    test('Unknown command', () => {
      expect(processor.processGcode('G25 Y20')).toEqual([
        {
          operation: 'UNKNOWN',
          props: {
            command: 'G25',
          },
        } as UnknownOperation,
      ]);
    });
  });

  describe('Unknown firmware:', () => {
    test('Throws', () => {
      expect(() => interpretGcode('G1', null, { firmware: 'RepRap' } as any)).toThrow();
    });
  });

  // describe('RepRap firmware:', () => {
  //   const processor = createProcessor();

  //   processor.reset({ settings: { firmware: 'RepRap' } });

  //   test('Reset processor', () => {
  //     expect(processor.settings.firmware).toBe('GRBL');
  //   });

  //   test('G28', () => {
  //     expect(processor.processGcode('G28.1 X10 G28 X0 Y0')).toEqual([
  //       {
  //         operation: 'RAPID_MOVE',
  //         props: {
  //           from: { x: 20, y: 10.5, z: 6 },
  //           to: { x: 0, y: 0, z: 6 },
  //           speed: 500,
  //         },
  //       } as RapidMoveOperation,
  //     ]);
  //   });

  //   test('Extrusion', () => {
  //     expect(processor.processGcode('G1 X0 Y0 Z0 F100 E5 G1 E6 G91 G1 E1')).toEqual([
  //       {
  //         operation: 'MOVE_TO',
  //         props: {
  //           from: { x: 117.5, y: 125, z: 5 },
  //           to: { x: 0, y: 0, z: 0 },
  //           speed: 100,
  //           extrusion: 5,
  //           laserPower: 0,
  //         },
  //       },
  //       {
  //         operation: 'MOVE_TO',
  //         props: {
  //           from: { x: 0, y: 0, z: 0 },
  //           to: { x: 0, y: 0, z: 0 },
  //           speed: 100,
  //           extrusion: 1,
  //           laserPower: 0,
  //         },
  //       },
  //       {
  //         operation: 'MOVE_TO',
  //         props: {
  //           from: { x: 0, y: 0, z: 0 },
  //           to: { x: 0, y: 0, z: 0 },
  //           speed: 100,
  //           extrusion: 1,
  //           laserPower: 0,
  //         },
  //       },
  //     ]);
  //   });
  // });
});
