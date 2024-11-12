const GRID_ROWS = 10;
const GRID_COLS = 10;

class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  add(vector) {
    return new Vector2(this.x + vector.x, this.y + vector.y);
  }
  sub(vector) {
    return new Vector2(this.x - vector.x, this.y - vector.y);
  }
  length(vector) {
    return Math.sqrt(this.x * this.x + this.y * this.y);
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
function rayStep(p1, p2) {
  const dp = p2.sub(p1);
  const k = dp.y / dp.x;
  if (dp.x > 0) {
  }
  const p3 = p2.sub(p1).normalize().add(p2);
  return p3;
}

function grid(ctx, p2) {
  ctx.reset();
  ctx.fillStyle = "#181818";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.scale(ctx.canvas.width / GRID_COLS, ctx.canvas.height / GRID_ROWS);
  ctx.lineWidth = 0.02;
  ctx.strokeStyle = "#303030";
  for (let x = 0; x <= GRID_COLS; x++) {
    drawLine(ctx, x, 0, x, ctx.canvas.height);
  }
  ctx.strokeStyle = "#303030";
  for (let y = 0; y <= GRID_ROWS; y++) {
    drawLine(ctx, 0, y, ctx.canvas.width, y);
  }

  const p1 = new Vector2(5.5, 5.5);
  ctx.fillStyle = "magenta";
  fillCircle(ctx, p1, 0.1);
  if (p2 !== undefined) {
    fillCircle(ctx, p2, 0.1);
    ctx.strokeStyle = "magenta";
    drawLine(ctx, p1.x, p1.y, p2.x, p2.y);
    const p3 = rayStep(p1, p2);
    fillCircle(ctx, p3, 0.1);
    drawLine(ctx, p2.x, p2.y, p3.x, p3.y);
  }
}

(() => {
  const game = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById("game")
  );
  if (game === null) {
    throw new Error("Canvas element not found");
  }
  game.width = 800;
  game.height = 800;
  const ctx = game.getContext("2d");

  if (ctx === null) {
    throw new Error("ctx element not found");
  }

  let p2 = undefined | Vector2;
  game.addEventListener("mousemove", (e) => {
    const offsetX = e.offsetX;
    const offsetY = e.offsetY;
    p2 = new Vector2(offsetX, offsetY)
      .div(canvasSize(ctx))
      .mul(new Vector2(GRID_COLS, GRID_ROWS));
    grid(ctx, p2);
  });
  grid(ctx, p2);
})();
