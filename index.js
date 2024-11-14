const eps = 1e-6;
const SCREAN_WIDTH = 800;
const NEAR_CLIPPING_PLANE = 1;
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
function gridSize(grid) {
  return new Vector2(grid[0].length, grid.length);
}

function castRay(grid, p1, p2) {
  for (;;) {
    const c = hittingCell(p1, p2);
    // console.log(c);
    if (!insideMap(grid, c) || grid[c.y][c.x] !== null) break;
    const p3 = rayStep(p1, p2);
    p1 = p2;
    p2 = p3;
  }
  return p2;
}

function drawMap(ctx, mapSize, grid) {
  for (let x = 0; x <= mapSize.x; x++) {
    drawLine(ctx, x, 0, x, mapSize.y);
  }

  for (let y = 0; y <= mapSize.y; y++) {
    drawLine(ctx, 0, y, mapSize.x, y);
  }

  for (let y = 0; y < mapSize.y; y++) {
    for (let x = 0; x < mapSize.x; x++) {
      if (grid[y][x] !== null) {
        ctx.fillStyle = grid[y][x];
        ctx.fillRect(x, y, 1, 1);
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
function insideMap(map, p) {
  const size = gridSize(map);
  return p.x >= 0 && p.x < size.x && p.y >= 0 && p.y < size.y;
}

function drawFov(ctx, player, p, p1, p2) {
  drawLine(ctx, p.x, p.y, p1.x, p1.y);
  drawLine(ctx, p.x, p.y, p2.x, p2.y);
  drawLine(ctx, player.position.x, player.position.y, p1.x, p1.y);
  drawLine(ctx, player.position.x, player.position.y, p2.x, p2.y);
}
function renderScene(ctx, player, grid) {
  const stripWidth = Math.ceil(ctx.canvas.width / SCREAN_WIDTH);

  const [r, r1, r2] = player.getFov();
  // console.log(r1.lerp(r2, 1 / SCREAN_WIDTH));
  for (let x = 0; x < SCREAN_WIDTH; x++) {
    const p = castRay(grid, player.position, r1.lerp(r2, x / SCREAN_WIDTH));
    const c = hittingCell(player.position, p);
    // console.log(c);
    // console.log(insideMap(grid, c), c.y, c.x);
    if (insideMap(grid, c) && grid[c.y][c.x] !== null) {
      const v = p.sub(player.position);
      const d = Vector2.fromAngle(player.direction);
      const stripHeight = ctx.canvas.height / v.dot(d);
      const color = grid[c.y][c.x];

      ctx.fillStyle = color;
      ctx.fillRect(
        x * stripWidth,
        ctx.canvas.height * 0.5 - stripHeight / 2,
        stripWidth + 1,
        stripHeight
      );
    }
  }
}
function minimap(ctx, player, position, size, grid) {
  ctx.save();
  const mapSize = gridSize(grid);

  ctx.translate(...position.array());
  ctx.scale(...size.div(mapSize).array());

  ctx.fillStyle = "#181818";
  ctx.fillRect(0, 0, mapSize.x, mapSize.y);

  ctx.lineWidth = 0.05;
  ctx.strokeStyle = "#505050";
  drawMap(ctx, mapSize, grid);

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
function renderGame(ctx, player, grid) {
  const cellSize = ctx.canvas.width / grid[0].length;
  const minimapSize = gridSize(grid).scale(cellSize * 0.3);
  const minimapPosition = new Vector2(0, 0);
  ctx.fillStyle = "#181818";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  renderScene(ctx, player, grid);
  minimap(ctx, player, minimapPosition, minimapSize, grid);
}

(() => {
  const grid = [
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
      "red",
      null,
      null,
      "blue",
      null,
      null,
      null,
      null,
      "magenta",
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
      "yellow",
      null,
      null,
      null,
      null,
      "red",
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
      "green",
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      "blue",
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      "blue",
      null,
      null,
      null,
    ],
    [
      null,
      null,
      null,
      "blue",
      null,
      null,
      "magenta",
      null,
      null,
      null,
      null,
      "red",
      null,
      null,
    ],
    [
      null,
      null,
      "red",
      null,
      null,
      null,
      null,
      "red",
      null,
      null,
      null,
      null,
      "red",
      null,
    ],
    [
      null,
      null,
      null,
      null,
      "red",
      null,
      null,
      null,
      "red",
      null,
      null,
      null,
      null,
      null,
    ],
    [
      null,
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      "magenta",
      null,
      "red",
      null,
      null,
      "red",
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
  ];

  const player = new Player(new Vector2(4.5, 4.5), Math.PI);

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

  window.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      if (e.key === "ArrowUp") {
        player.position = player.position.add(
          Vector2.fromAngle(player.direction).scale(0.5)
        );
        renderGame(ctx, player, grid);
      }
      if (e.key === "ArrowDown") {
        player.position = player.position.add(
          Vector2.fromAngle(player.direction).scale(-0.5)
        );
        renderGame(ctx, player, grid);
      }
      if (e.key === "ArrowLeft") {
        player.direction -= Math.PI / 16;
        renderGame(ctx, player, grid);
      }
      if (e.key === "ArrowRight") {
        player.direction += Math.PI / 16;
        renderGame(ctx, player, grid);
      }
    }
  });
  renderGame(ctx, player, grid);
})();
