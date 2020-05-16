import { createProcessor, interpretGcode } from '../src/interpreter';

describe('Test the  Gcode interpreter for:', () => {
  describe('RepRap firmware:', () => {
    const processor = createProcessor({ settings: { firmware: 'RepRap' } });

    test('G0', () => {
      expect(processor.processGcode('G0 X20 Y10.5 Z 5 F500')).toEqual([
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 0, y: 0, z: 0 },
            to: { x: 20, y: 10.5, z: 5 },
            speed: 500,
          },
        },
      ]);
    });

    test('G91', () => {
      expect(processor.processGcode('G91 G0 X0 Y0 Z1')).toEqual([
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 20, y: 10.5, z: 5 },
            to: { x: 20, y: 10.5, z: 6 },
            speed: 500,
          },
        },
      ]);
    });

    test('G28', () => {
      expect(processor.processGcode('G28.1 X10 G28 X0 Y0')).toEqual([
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 20, y: 10.5, z: 6 },
            to: { x: 0, y: 0, z: 6 },
            speed: 500,
          },
        },
      ]);
    });

    test('G90', () => {
      expect(processor.processGcode('G90 G0 X5 Y5 Z5')).toEqual([
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 0, y: 0, z: 6 },
            to: { x: 5, y: 5, z: 5 },
            speed: 500,
          },
        },
      ]);
    });

    test('G1', () => {
      expect(processor.processGcode('G1 X117.5 Y125. E5 F8000')).toEqual([
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 5, y: 5, z: 5 },
            to: { x: 117.5, y: 125, z: 5 },
            speed: 8000,
            extrusion: 5,
            laserPower: 0,
          },
        },
      ]);
    });

    test('G92', () => {
      processor.processGcode('G92 E0.00');
      expect(processor.state.extrusion).toEqual(0);
    });

    test('Extrusion', () => {
      expect(processor.processGcode('G1 X0 Y0 Z0 F100 E5 G1 E6 G91 G1 E1')).toEqual([
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 117.5, y: 125, z: 5 },
            to: { x: 0, y: 0, z: 0 },
            speed: 100,
            extrusion: 5,
            laserPower: 0,
          },
        },
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 0, y: 0, z: 0 },
            to: { x: 0, y: 0, z: 0 },
            speed: 100,
            extrusion: 1,
            laserPower: 0,
          },
        },
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 0, y: 0, z: 0 },
            to: { x: 0, y: 0, z: 0 },
            speed: 100,
            extrusion: 1,
            laserPower: 0,
          },
        },
      ]);
    });

    test('Unknown command', () => {
      expect(processor.processGcode('G25 Y20')).toEqual([
        {
          operation: 'UNKNOWN',
          props: {
            command: 'G25',
          },
        },
      ]);
    });
  });

  describe('GRBL firmware:', () => {
    const processor = createProcessor({ settings: { firmware: 'RepRap' } });

    processor.reset({ settings: { firmware: 'GRBL' } });

    test('Reset processor', () => {
      expect(processor.settings.firmware).toBe('GRBL');
    });

    test('G28', () => {
      expect(processor.processGcode('G0 X10 Y10 F500 G28.1 X5 Y5 G28 X40 G28')).toEqual([
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 0, y: 0, z: 0 },
            to: { x: 10, y: 10, z: 0 },
            speed: 500,
          },
        },
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 10, y: 10, z: 0 },
            to: { x: 40, y: 10, z: 0 },
            speed: 500,
          },
        },
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 40, y: 10, z: 0 },
            to: { x: 5, y: 10, z: 0 },
            speed: 500,
          },
        },
        {
          operation: 'MOVE_TO',
          props: {
            from: { x: 5, y: 10, z: 0 },
            to: { x: 5, y: 5, z: 0 },
            speed: 500,
          },
        },
      ]);
    });
  });

  describe('Unknown firmware:', () => {
    test('Throws', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => interpretGcode('G1', null, { firmware: 'Blah' } as any)).toThrow();
    });
  });
});
