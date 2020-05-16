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
      expect(processor.processGcode(' G28 X0 Y0')).toEqual([
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
          },
        },
      ]);
    });

    test('G92', () => {
      processor.processGcode('G92 E0.00');
      expect(processor.state.extrusion).toEqual(0);
    });
  });

  describe('Unknown firmware:', () => {
    test('Throws', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(() => interpretGcode('G1', null, { firmware: 'Blah' } as any)).toThrow();
    });
  });
});
