const eps = 1e-6;
const PLAYER_SPEED = 3.1;
const SCREAN_WIDTH = 300;
const NEAR_CLIPPING_PLANE = 0.25;
const FOV = Math.PI * 0.5;
class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  static fromAngle(angle) {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }
  dot(vector) {
    return this.x * vector.x + this.y * vector.y;
  }
  rot90() {
    return new Vector2(-this.y, this.x);
  }
  array() {
    return [this.x, this.y];
  }
  add(vector) {
    return new Vector2(this.x + vector.x, this.y + vector.y);
  }
  sub(vector) {
    return new Vector2(this.x - vector.x, this.y - vector.y);
  }
  sqrDistanceTo(vector) {
    return vector.sub(this).sqrLength();
  }
  length(vector) {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  sqrLength() {
    return this.x * this.x + this.y * this.y;
  }
  normalize(vector) {
    const length = this.length();
    if (length === 0) {
      return new Vector2(0, 0);
    }
    return new Vector2(this.x / length, this.y / length);
  }
  div(vector) {
    return new Vector2(this.x / vector.x, this.y / vector.y);
  }
  scale(scalar) {
    return new Vector2(this.x * scalar, this.y * scalar);
  }
  mul(vector) {
    return new Vector2(this.x * vector.x, this.y * vector.y);
  }
  lerp(vector, t) {
    return vector.sub(this).scale(t).add(this);
  }
}

class Color {
  constructor(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
  static red() {
    return new Color(1, 0, 0, 1);
  }
  static blue() {
    return new Color(0, 0, 1, 1);
  }
  static green() {
    return new Color(0, 1, 0, 1);
  }
  static yellow() {
    return new Color(1, 1, 0, 1);
  }
  static black() {
    return new Color(0, 0, 0, 1);
  }
  brightness(factor) {
    return new Color(this.r * factor, this.g * factor, this.b * factor, this.a);
  }
  toStyle() {
    return (
      `rgba(` +
      `${Math.floor(this.r * 255)},` +
      `${Math.floor(this.g * 255)},` +
      `${Math.floor(this.b * 255)},` +
      `${this.a})`
    );
  }
}
class Player {
  constructor(position, direction) {
    this.position = position;
    this.direction = direction;
  }
  getFov() {
    const p = this.position.add(
      Vector2.fromAngle(this.direction).scale(NEAR_CLIPPING_PLANE)
    );
    const l = Math.tan(FOV * 0.5) * NEAR_CLIPPING_PLANE;
    const p2 = p.sub(this.position).rot90().normalize().scale(l).add(p);
    const p1 = p.sub(this.position).rot90().normalize().scale(-l).add(p);
    return [p, p1, p2];
  }
}
class Scene {
  constructor(cells) {
    this.height = cells.length;
    this.width = Number.MIN_VALUE;
    for (let row of cells) {
      this.width = Math.max(this.width, row.length);
    }
    this.cells = [];
    for (let row of cells) {
      this.cells = this.cells.concat(row);
      for (let i = 0; i < this.width - row.length; ++i) {
        this.cells.push(null);
      }
    }
  }
  size() {
    return new Vector2(this.width, this.height);
  }
  getCell(p) {
    if (!this.insideMap(p)) return undefined;
    const fp = new Vector2(Math.floor(p.x), Math.floor(p.y));
    return this.cells[fp.y * this.width + fp.x];
  }
  insideMap(p) {
    const size = this.size();
    return p.x >= 0 && p.x < size.x && p.y >= 0 && p.y < size.y;
  }
}
function fillCircle(ctx, vector, radius) {
  ctx.beginPath();
  ctx.arc(vector.x, vector.y, radius, 0, Math.PI * 2, true);
  ctx.fill();
}

function drawLine(ctx, movX, movY, lineX, lineY) {
  ctx.beginPath();
  ctx.moveTo(movX, movY);
  ctx.lineTo(lineX, lineY);
  ctx.stroke();
}

function canvasSize(ctx) {
  return new Vector2(ctx.canvas.width, ctx.canvas.height);
}

function snap(x, dx) {
  if (dx > 0) return Math.ceil(x + Math.sign(dx) * eps);
  if (dx < 0) return Math.floor(x + Math.sign(dx) * eps);
  return x;
}

function rayStep(p1, p2) {
  const d = p2.sub(p1);
  let p3;
  if (d.x !== 0 && d.y !== 0) {
    k = d.y / d.x;
    c = p1.y - k * p1.x;
    {
      const x3 = snap(p2.x, d.x);
      const y3 = k * x3 + c;
      p3 = new Vector2(x3, y3);
    }
    if (k !== 0) {
      const y3 = snap(p2.y, d.y);
      const x3 = (y3 - c) / k;
      let p3t = new Vector2(x3, y3);
      if (p2.sqrDistanceTo(p3) < p2.sqrDistanceTo(p3t)) {
        return p3;
      }
      return p3t;
    }
  } else {
    if (d.x === 0) {
      const y3 = snap(p2.y, d.y);
      const x3 = p2.x;
      p3 = new Vector2(x3, y3);
      return p3;
    }
    const x3 = snap(p2.x, d.x);
    const y3 = p2.y;
    p3 = new Vector2(x3, y3);
    return p3;
  }
}

function castRay(map, p1, p2) {
  for (;;) {
    const c = hittingCell(p1, p2);
    // console.log(c);
    if (!map.insideMap(c) || map.getCell(c) !== null) break;
    const p3 = rayStep(p1, p2);
    p1 = p2;
    p2 = p3;
  }
  return p2;
}

function drawMap(ctx, mapSize, map) {
  for (let x = 0; x <= mapSize.x; x++) {
    drawLine(ctx, x, 0, x, mapSize.y);
  }

  for (let y = 0; y <= mapSize.y; y++) {
    drawLine(ctx, 0, y, mapSize.x, y);
  }
  for (let y = 0; y < mapSize.y; y++) {
    for (let x = 0; x < mapSize.x; x++) {
      const cell = map.getCell(new Vector2(x, y));
      if (cell instanceof Color) {
        const color = map.getCell(new Vector2(x, y));
        ctx.fillStyle = color.toStyle();
        ctx.fillRect(x, y, 1, 1);
      } else if (cell instanceof HTMLImageElement) {
        ctx.drawImage(cell, x, y, 1, 1);
      }
    }
  }
}
function hittingCell(p1, p2) {
  const d = p2.sub(p1);
  let x = Math.floor(p2.x + Math.sign(d.x) * eps);
  let y = Math.floor(p2.y + Math.sign(d.y) * eps);
  return new Vector2(x, y);
}

function drawFov(ctx, player, p, p1, p2) {
  drawLine(ctx, p.x, p.y, p1.x, p1.y);
  drawLine(ctx, p.x, p.y, p2.x, p2.y);
  drawLine(ctx, player.position.x, player.position.y, p1.x, p1.y);
  drawLine(ctx, player.position.x, player.position.y, p2.x, p2.y);
}
function renderScene(ctx, player, map) {
  const stripWidth = Math.ceil(ctx.canvas.width / SCREAN_WIDTH);

  const [r, r1, r2] = player.getFov();
  // console.log(r1.lerp(r2, 1 / SCREAN_WIDTH));
  for (let x = 0; x < SCREAN_WIDTH; x++) {
    const p = castRay(map, player.position, r1.lerp(r2, x / SCREAN_WIDTH));
    const c = hittingCell(player.position, p);
    if (map.insideMap(c) && map.getCell(c) !== null) {
      const v = p.sub(player.position);
      const d = Vector2.fromAngle(player.direction);
      const stripHeight = ctx.canvas.height / v.dot(d);
      let cell = map.getCell(c);
      if (cell instanceof Color) {
        cell = cell.brightness(4 / (1 + v.dot(d)));
        ctx.fillStyle = cell.toStyle();
        ctx.fillRect(
          x * stripWidth,
          ctx.canvas.height * 0.5 - stripHeight / 2,
          stripWidth + 1,
          stripHeight
        );
      } else if (cell instanceof HTMLImageElement) {
        const t = p.sub(c);
        let u = 0;
        if ((Math.abs(t.x) < eps || Math.abs(t.x - 1) < eps) && t.y) {
          u = t.y;
        } else {
          u = t.x;
        }
        ctx.drawImage(
          cell,
          u * cell.width,
          0,
          1,
          cell.height,
          x * stripWidth,
          ctx.canvas.height * 0.5 - stripHeight * 0.5,
          stripWidth + 1,
          stripHeight
        );
      }
    }
  }
}
function minimap(ctx, player, minimapPosition, minimapSize, map) {
  ctx.save();
  const mapSize = map.size();

  ctx.translate(...minimapPosition.array());
  ctx.scale(...minimapSize.div(mapSize).array());

  ctx.fillStyle = "#181818";
  ctx.fillRect(0, 0, mapSize.x, mapSize.y);

  ctx.lineWidth = 0.05;
  ctx.strokeStyle = "#505050";
  drawMap(ctx, mapSize, map);

  ctx.fillStyle = "magenta";
  fillCircle(ctx, player.position, 0.07);

  const [p, p1, p2] = player.getFov();
  ctx.strokeStyle = "magenta";
  drawFov(ctx, player, p, p1, p2);
  ///
  // for (;;) {
  //   ctx.fillStyle = "magenta";
  //   ctx.strokeStyle = "magenta";
  //   // const c = hittingCell(p1, p2 );
  //   // if (
  //   //   c.x <= 0 ||
  //   //   c.x >= mapSize.x - 1 ||
  //   //   c.y <= 0 ||
  //   //   c.y >= mapSize.y - 1 ||
  //   //   grid[c.y][c.x] === 1
  //   // ) {
  //   //   break;
  //   // }
  //   // const p3 = rayStep(p1, p2);
  //   // fillCircle(ctx, p3, 0.07);
  //   // drawLine(ctx, p2.x, p2.y, p3.x, p3.y);
  // }
  ctx.restore();
}
function renderGame(ctx, player, map) {
  const cellSize = ctx.canvas.width / map.width;
  const minimapSize = map.size().scale(cellSize * 0.3);
  const minimapPosition = new Vector2(0, 0);
  ctx.fillStyle = "#181818";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  renderScene(ctx, player, map);
  minimap(ctx, player, minimapPosition, minimapSize, map);
}
async function loadImage(url) {
  const img = new Image();
  img.src = url;
  return new Promise((resolve, reject) => {
    img.onload = (e) => resolve(img);

    img.onerror = (e) => reject(new Error("Failed to load wall1"));
  });
}
(async () => {
  const game = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById("game")
  );
  if (game === null) {
    throw new Error("Canvas element not found");
  }
  game.width = 800;
  game.height = 600;
  const ctx = game.getContext("2d");

  if (ctx === null) {
    throw new Error("ctx element not found");
  }
  const wall1 = await loadImage("./textures/square_0_16.PNG").catch((e) =>
    Color.red()
  );

  const map = new Scene([
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      wall1,
      wall1,
      null,
      wall1,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      Color.yellow(),
      null,
      null,
      null,
      null,
      wall1,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      Color.green(),
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      Color.blue(),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      Color.blue(),
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      Color.blue(),
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      wall1,
      null,
      null,
    ],
    [
      null,
      null,
      wall1,
      null,
      null,
      null,
      null,
      wall1,
      null,
      null,
      null,
      null,
      wall1,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      wall1,
      null,
      null,
      null,
      wall1,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      Color.red(),
      null,
      null,
      wall1,
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
  ]);
  const player = new Player(new Vector2(4.5, 3.7), Math.PI * 1.5);

  let movingForward = false;
  let movingBackward = false;
  let turnLeft = false;
  let turnRight = false;
  window.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key === "w") {
        movingForward = true;
      }
      if (e.key === "s") {
        movingBackward = true;
      }
      if (e.key === "a") {
        turnLeft = true;
      }
      if (e.key === "d") {
        turnRight = true;
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    if (!e.repeat) {
      if (e.key === "w") {
        movingForward = false;
      }
      if (e.key === "s") {
        movingBackward = false;
      }
      if (e.key === "a") {
        turnLeft = false;
      }
      if (e.key === "d") {
        turnRight = false;
      }
    }
  });

  let prevTimestamp = 0;
  const frame = (timestamp) => {
    const deltaTime = (timestamp - prevTimestamp) / 1000;
    prevTimestamp = timestamp;

    const playerVelocity = Vector2.fromAngle(player.direction).scale(
      PLAYER_SPEED * deltaTime
    );
    if (movingForward) {
      const newPosition = player.position.add(playerVelocity);
      if (map.insideMap(newPosition) && map.getCell(player.position) === null)
        player.position = player.position.add(playerVelocity);
    }
    if (movingBackward) {
      const newPosition = player.position.sub(playerVelocity);
      if (map.insideMap(newPosition) && map.getCell(player.position) === null)
        player.position = player.position.sub(playerVelocity);
    }
    if (turnLeft) {
      player.direction -= Math.PI * 0.02;
    }
    if (turnRight) {
      player.direction += Math.PI * 0.02;
    }
    renderGame(ctx, player, map);
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame((timestamp) => {
    prevTimestamp = timestamp;
    window.requestAnimationFrame(frame);
  });
})();
