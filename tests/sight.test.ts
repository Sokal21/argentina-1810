import { expect, test } from 'vitest';
import { Sight, SQUARE, type Standing } from '../src/world/sight';

// Something a few pixels wide and tall, standing on its foot.
function thing(x: number, y: number, wide = 10, tall = 20): Standing & { visible: boolean } {
  return {
    x, y, visible: true,
    setVisible(shown: boolean) { this.visible = shown; },
    getBounds: () => ({ left: x - wide / 2, right: x + wide / 2, top: y - tall, bottom: y }),
  };
}

const view = (x: number, y: number) => ({ x, y, width: 640, height: 400 });

test('nothing is shown until it is looked at', () => {
  const near = thing(100, 100);
  new Sight().add([near]);
  expect(near.visible).toBe(false);
});

test('what stands in view is shown and what stands far off is not', () => {
  const near = thing(300, 200), far = thing(300 + SQUARE * 10, 200), below = thing(300, 200 + SQUARE * 10);
  const sight = new Sight();
  sight.add([near, far, below]);
  sight.look(view(0, 0));
  expect([near.visible, far.visible, below.visible]).toEqual([true, false, false]);
});

test('it follows the view: what is left behind is hidden again', () => {
  const near = thing(300, 200), far = thing(300 + SQUARE * 10, 200);
  const sight = new Sight();
  sight.add([near, far]);
  sight.look(view(0, 0));
  sight.look(view(SQUARE * 10, 0));
  expect([near.visible, far.visible]).toEqual([false, true]);
});

test('something whose foot is off screen is shown while its drawing reaches in', () => {
  // A tree four squares tall, standing well below the view: its crown is in it.
  const tree = thing(300, 400 + SQUARE * 3, 60, SQUARE * 4);
  const sight = new Sight();
  sight.add([tree]);
  sight.look(view(0, 0));
  expect(tree.visible).toBe(true);
});

test('everything in view is shown, wherever on the map the view is', () => {
  const things: (Standing & { visible: boolean })[] = [];
  for (let x = 0; x < 6000; x += 37) for (let y = 0; y < 3000; y += 53) things.push(thing(x, y, 40, 90));
  const sight = new Sight();
  sight.add(things);
  for (const at of [view(0, 0), view(1234, 777), view(5300, 2500), view(1300, 800)]) {
    sight.look(at);
    for (const t of things) {
      const b = t.getBounds();
      const inView = b.right >= at.x && b.left <= at.x + at.width && b.bottom >= at.y && b.top <= at.y + at.height;
      if (inView) expect(t.visible).toBe(true);
    }
    // And most of the map is left out.
    expect(things.filter(t => t.visible).length).toBeLessThan(things.length / 4);
  }
});

test('things added later are hidden until the next look', () => {
  const first = thing(100, 100), second = thing(120, 100);
  const sight = new Sight();
  sight.add([first]);
  sight.look(view(0, 0));
  sight.add([second]);
  expect([first.visible, second.visible]).toEqual([false, false]);
  sight.look(view(0, 0));
  expect([first.visible, second.visible]).toEqual([true, true]);
});
