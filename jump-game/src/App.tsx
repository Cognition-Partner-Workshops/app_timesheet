import { useEffect, useRef, useState, useCallback } from 'react';
import './App.css';

// ─── Game Constants ───
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const GROUND_Y = 320;
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 50;
const OBSTACLE_WIDTH = 30;
const OBSTACLE_MIN_HEIGHT = 30;
const OBSTACLE_MAX_HEIGHT = 70;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.001;
const OBSTACLE_SPAWN_INTERVAL = 1500;

// ─── Types ───
interface Obstacle {
  x: number;
  width: number;
  height: number;
  passed: boolean;
}

interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  velocityY: number;
  isJumping: boolean;
}

interface GameState {
  player: Player;
  obstacles: Obstacle[];
  score: number;
  highScore: number;
  speed: number;
  isRunning: boolean;
  isGameOver: boolean;
  frameCount: number;
}

// ─── Game Logic (exported for testing) ───
export function createPlayer(): Player {
  return {
    x: 80,
    y: GROUND_Y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityY: 0,
    isJumping: false,
  };
}

export function createObstacle(canvasWidth: number): Obstacle {
  const height =
    OBSTACLE_MIN_HEIGHT +
    Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT);
  return {
    x: canvasWidth,
    width: OBSTACLE_WIDTH,
    height,
    passed: false,
  };
}

export function applyGravity(player: Player): Player {
  const newVelocityY = player.velocityY + GRAVITY;
  const newY = player.y + newVelocityY;
  const groundLevel = GROUND_Y - player.height;

  if (newY >= groundLevel) {
    return {
      ...player,
      y: groundLevel,
      velocityY: 0,
      isJumping: false,
    };
  }
  return {
    ...player,
    y: newY,
    velocityY: newVelocityY,
  };
}

export function jump(player: Player): Player {
  if (player.isJumping) return player;
  return {
    ...player,
    velocityY: JUMP_FORCE,
    isJumping: true,
  };
}

export function moveObstacles(
  obstacles: Obstacle[],
  speed: number
): Obstacle[] {
  return obstacles
    .map((obs) => ({ ...obs, x: obs.x - speed }))
    .filter((obs) => obs.x + obs.width > -50);
}

export function checkCollision(player: Player, obstacle: Obstacle): boolean {
  const playerRight = player.x + player.width - 5;
  const playerBottom = player.y + player.height;
  const obstacleTop = GROUND_Y - obstacle.height;

  return (
    playerRight > obstacle.x + 5 &&
    player.x + 5 < obstacle.x + obstacle.width - 5 &&
    playerBottom > obstacleTop &&
    player.y < GROUND_Y
  );
}

export function calculateScore(
  obstacles: Obstacle[],
  playerX: number,
  currentScore: number
): { score: number; obstacles: Obstacle[] } {
  let score = currentScore;
  const updatedObstacles = obstacles.map((obs) => {
    if (!obs.passed && obs.x + obs.width < playerX) {
      score += 1;
      return { ...obs, passed: true };
    }
    return obs;
  });
  return { score, obstacles: updatedObstacles };
}

// ─── Drawing Helpers ───
function drawBackground(ctx: CanvasRenderingContext2D, frameCount: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(0.6, '#E0F0FF');
  gradient.addColorStop(1, '#F5E6D3');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  const cloudOffset = (frameCount * 0.3) % (CANVAS_WIDTH + 200);
  drawCloud(ctx, CANVAS_WIDTH - cloudOffset, 60, 1);
  drawCloud(ctx, CANVAS_WIDTH - cloudOffset + 350, 100, 0.7);
  drawCloud(ctx, CANVAS_WIDTH - cloudOffset + 600, 40, 1.2);

  ctx.fillStyle = '#8B7355';
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, 4);
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.arc(0, 0, 20, 0, Math.PI * 2);
  ctx.arc(25, -10, 25, 0, Math.PI * 2);
  ctx.arc(50, 0, 20, 0, Math.PI * 2);
  ctx.arc(25, 5, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  frameCount: number
) {
  ctx.save();
  ctx.translate(player.x, player.y);

  ctx.fillStyle = '#FF6B35';
  ctx.fillRect(5, 10, 30, 25);

  ctx.fillStyle = '#FFD93D';
  ctx.beginPath();
  ctx.arc(20, 8, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.arc(16, 5, 2, 0, Math.PI * 2);
  ctx.arc(24, 5, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(20, 9, 5, 0.1 * Math.PI, 0.9 * Math.PI);
  ctx.stroke();

  if (!player.isJumping) {
    const legOffset = Math.sin(frameCount * 0.3) * 5;
    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(10, 35, 8, 15 + legOffset);
    ctx.fillRect(22, 35, 8, 15 - legOffset);
  } else {
    ctx.fillStyle = '#4A90D9';
    ctx.fillRect(10, 35, 8, 10);
    ctx.fillRect(22, 35, 8, 10);
  }

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle) {
  const obstacleY = GROUND_Y - obstacle.height;

  ctx.fillStyle = '#2E7D32';
  ctx.fillRect(obstacle.x + 5, obstacleY, obstacle.width - 10, obstacle.height);

  if (obstacle.height > 45) {
    ctx.fillRect(obstacle.x - 2, obstacleY + 10, 10, 6);
    ctx.fillRect(obstacle.x - 2, obstacleY + 10, 6, 20);
    ctx.fillRect(obstacle.x + obstacle.width - 8, obstacleY + 20, 10, 6);
    ctx.fillRect(obstacle.x + obstacle.width - 2, obstacleY + 20, 6, 15);
  }

  ctx.fillStyle = '#1B5E20';
  for (let i = 0; i < obstacle.height; i += 8) {
    ctx.fillRect(obstacle.x + 3, obstacleY + i, 2, 4);
    ctx.fillRect(obstacle.x + obstacle.width - 5, obstacleY + i, 2, 4);
  }
}

function drawScore(
  ctx: CanvasRenderingContext2D,
  score: number,
  highScore: number
) {
  ctx.fillStyle = '#333';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Score: ${score}`, CANVAS_WIDTH - 20, 30);
  ctx.font = '14px monospace';
  ctx.fillText(`Best: ${highScore}`, CANVAS_WIDTH - 20, 50);
}

function drawGameOver(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.font = '20px sans-serif';
  ctx.fillText(
    'Press Space or Tap to restart',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 30
  );
}

function drawStartScreen(ctx: CanvasRenderingContext2D) {
  drawBackground(ctx, 0);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Jump Game', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

  ctx.font = '20px sans-serif';
  ctx.fillText(
    'Press Space or Tap to start',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 20
  );

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#DDD';
  ctx.fillText(
    'Jump over the cacti to score points!',
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2 + 55
  );
}

// ─── Main Component ───
function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef<GameState>({
    player: createPlayer(),
    obstacles: [],
    score: 0,
    highScore: parseInt(localStorage.getItem('jumpGameHighScore') || '0', 10),
    speed: INITIAL_SPEED,
    isRunning: false,
    isGameOver: false,
    frameCount: 0,
  });
  const animationRef = useRef<number>(0);
  const lastObstacleTimeRef = useRef<number>(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayHighScore, setDisplayHighScore] = useState(
    gameStateRef.current.highScore
  );
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const resetGame = useCallback(() => {
    const state = gameStateRef.current;
    state.player = createPlayer();
    state.obstacles = [];
    state.score = 0;
    state.speed = INITIAL_SPEED;
    state.isRunning = true;
    state.isGameOver = false;
    state.frameCount = 0;
    lastObstacleTimeRef.current = Date.now();
    setGameStarted(true);
    setGameOver(false);
    setDisplayScore(0);
  }, []);

  const handleAction = useCallback(() => {
    const state = gameStateRef.current;
    if (state.isGameOver) {
      resetGame();
      return;
    }
    if (!state.isRunning) {
      resetGame();
      return;
    }
    state.player = jump(state.player);
  }, [resetGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAction]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;

      if (!state.isRunning) {
        drawStartScreen(ctx);
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      if (state.isGameOver) {
        animationRef.current = requestAnimationFrame(gameLoop);
        return;
      }

      state.frameCount++;

      state.player = applyGravity(state.player);

      state.speed = INITIAL_SPEED + state.frameCount * SPEED_INCREMENT;

      const now = Date.now();
      const spawnInterval = Math.max(
        800,
        OBSTACLE_SPAWN_INTERVAL - state.frameCount * 0.5
      );
      if (now - lastObstacleTimeRef.current > spawnInterval) {
        state.obstacles.push(createObstacle(CANVAS_WIDTH));
        lastObstacleTimeRef.current = now;
      }

      state.obstacles = moveObstacles(state.obstacles, state.speed);

      for (const obs of state.obstacles) {
        if (checkCollision(state.player, obs)) {
          state.isGameOver = true;
          state.isRunning = false;
          if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem(
              'jumpGameHighScore',
              state.score.toString()
            );
            setDisplayHighScore(state.score);
          }
          setGameOver(true);
          break;
        }
      }

      const scoreResult = calculateScore(
        state.obstacles,
        state.player.x,
        state.score
      );
      state.score = scoreResult.score;
      state.obstacles = scoreResult.obstacles;
      setDisplayScore(state.score);

      drawBackground(ctx, state.frameCount);
      state.obstacles.forEach((obs) => drawObstacle(ctx, obs));
      drawPlayer(ctx, state.player, state.frameCount);
      drawScore(ctx, state.score, state.highScore);

      if (state.isGameOver) {
        drawGameOver(ctx);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-100 to-sky-200 flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-800 mb-4 tracking-tight">
        Jump Game
      </h1>

      <div className="relative rounded-xl overflow-hidden shadow-2xl border-4 border-gray-700">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleAction}
          onTouchStart={(e) => {
            e.preventDefault();
            handleAction();
          }}
          className="block cursor-pointer"
          data-testid="game-canvas"
        />
      </div>

      <div className="mt-6 flex gap-8 text-lg font-mono">
        <div className="bg-white px-6 py-3 rounded-lg shadow-md">
          <span className="text-gray-500 text-sm">Score</span>
          <p className="text-2xl font-bold text-gray-800" data-testid="score-display">
            {displayScore}
          </p>
        </div>
        <div className="bg-white px-6 py-3 rounded-lg shadow-md">
          <span className="text-gray-500 text-sm">Best</span>
          <p className="text-2xl font-bold text-amber-600" data-testid="high-score-display">
            {displayHighScore}
          </p>
        </div>
      </div>

      <div className="mt-4 text-gray-600 text-sm">
        {!gameStarted && <p>Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Space</kbd> or tap to start</p>}
        {gameStarted && !gameOver && <p>Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Space</kbd> / <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Up Arrow</kbd> or tap to jump</p>}
        {gameOver && <p>Press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Space</kbd> or tap to restart</p>}
      </div>
    </div>
  );
}

export default App;
