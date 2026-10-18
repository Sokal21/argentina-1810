import { describe, expect, it } from 'vitest';
import { lands, type Strike } from '../src/machi/controller';

// A blow swung to the right from the origin, reaching 84 with an arc of 75° either side.
const blow: Strike = { x: 0, y: 0, dx: 1, dy: 0, reach: 84, arc: Math.PI * 5 / 12, damage: 2 };

describe('a blow lands', () => {
  it('on what stands within its reach, the way it was swung', () => {
    expect(lands(blow, { x: 60, y: 0 }, 10)).toBe(true);
  });

  it('not on what is out of reach, its girth counted', () => {
    expect(lands(blow, { x: 90, y: 0 }, 10)).toBe(true);
    expect(lands(blow, { x: 100, y: 0 }, 10)).toBe(false);
  });

  it('not on what is behind it', () => {
    expect(lands(blow, { x: -40, y: 0 }, 10)).toBe(false);
  });

  it('measuring the foreshortened ground as it truly is', () => {
    // 30 pixels down the screen is 60 deep: at 63° off the swing, inside its arc; 50 down is not.
    expect(lands(blow, { x: 30, y: 30 }, 4)).toBe(true);
    expect(lands(blow, { x: 10, y: 40 }, 4)).toBe(false);
  });

  it('on what it is struck from on top of, whichever way', () => {
    expect(lands(blow, { x: -3, y: 0 }, 10)).toBe(true);
  });
});
