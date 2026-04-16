import { describe, it, expect } from 'vitest';
import {
  createPlayer,
  createObstacle,
  applyGravity,
  jump,
  moveObstacles,
  checkCollision,
  calculateScore,
} from './App';

// ─── createPlayer Tests ───
describe('createPlayer', () => {
  it('should create a player at the correct starting position', () => {
    const player = createPlayer();
    expect(player.x).toBe(80);
    expect(player.y).toBe(270); // GROUND_Y(320) - PLAYER_HEIGHT(50)
    expect(player.width).toBe(40);
    expect(player.height).toBe(50);
  });

  it('should create a player that is not jumping', () => {
    const player = createPlayer();
    expect(player.isJumping).toBe(false);
    expect(player.velocityY).toBe(0);
  });
});

// ─── createObstacle Tests ───
describe('createObstacle', () => {
  it('should create an obstacle at the right edge of the canvas', () => {
    const obstacle = createObstacle(800);
    expect(obstacle.x).toBe(800);
  });

  it('should create an obstacle with valid dimensions', () => {
    const obstacle = createObstacle(800);
    expect(obstacle.width).toBe(30);
    expect(obstacle.height).toBeGreaterThanOrEqual(30);
    expect(obstacle.height).toBeLessThanOrEqual(70);
  });

  it('should create an obstacle that has not been passed', () => {
    const obstacle = createObstacle(800);
    expect(obstacle.passed).toBe(false);
  });

  it('should create obstacles with varying heights', () => {
    const heights = new Set<number>();
    for (let i = 0; i < 50; i++) {
      heights.add(Math.round(createObstacle(800).height));
    }
    expect(heights.size).toBeGreaterThan(1);
  });
});

// ─── applyGravity Tests ───
describe('applyGravity', () => {
  it('should increase velocity and move player down when in the air', () => {
    const player = createPlayer();
    const jumpingPlayer = { ...player, y: 100, velocityY: -5, isJumping: true };
    const result = applyGravity(jumpingPlayer);
    expect(result.velocityY).toBeCloseTo(-5 + 0.6);
    expect(result.y).toBeCloseTo(100 + (-5 + 0.6));
  });

  it('should stop the player at ground level', () => {
    const player = createPlayer();
    const fallingPlayer = { ...player, y: 268, velocityY: 5, isJumping: true };
    const result = applyGravity(fallingPlayer);
    expect(result.y).toBe(270); // GROUND_Y - PLAYER_HEIGHT
    expect(result.velocityY).toBe(0);
    expect(result.isJumping).toBe(false);
  });

  it('should not move a player already on the ground with zero velocity', () => {
    const player = createPlayer(); // starts on the ground
    const result = applyGravity(player);
    // velocity increases by GRAVITY but is clamped to ground
    expect(result.y).toBe(270);
    expect(result.velocityY).toBe(0);
    expect(result.isJumping).toBe(false);
  });
});

// ─── jump Tests ───
describe('jump', () => {
  it('should apply jump force to a grounded player', () => {
    const player = createPlayer();
    const result = jump(player);
    expect(result.velocityY).toBe(-12);
    expect(result.isJumping).toBe(true);
  });

  it('should not allow double jumping', () => {
    const player = createPlayer();
    const jumped = jump(player);
    const doubleJumped = jump(jumped);
    expect(doubleJumped.velocityY).toBe(-12); // same as single jump
    expect(doubleJumped).toBe(jumped); // returns same reference
  });

  it('should not modify the original player object', () => {
    const player = createPlayer();
    const result = jump(player);
    expect(player.isJumping).toBe(false);
    expect(result.isJumping).toBe(true);
  });
});

// ─── moveObstacles Tests ───
describe('moveObstacles', () => {
  it('should move obstacles to the left by the given speed', () => {
    const obstacles = [
      { x: 500, width: 30, height: 50, passed: false },
      { x: 300, width: 30, height: 40, passed: false },
    ];
    const moved = moveObstacles(obstacles, 5);
    expect(moved[0].x).toBe(495);
    expect(moved[1].x).toBe(295);
  });

  it('should remove obstacles that have gone off screen', () => {
    const obstacles = [
      { x: -100, width: 30, height: 50, passed: true },
      { x: 400, width: 30, height: 40, passed: false },
    ];
    const moved = moveObstacles(obstacles, 5);
    expect(moved.length).toBe(1);
    expect(moved[0].x).toBe(395);
  });

  it('should keep obstacles that are partially visible', () => {
    const obstacles = [
      { x: -40, width: 30, height: 50, passed: true },
    ];
    const moved = moveObstacles(obstacles, 5);
    // -40 - 5 = -45, and -45 + 30 = -15 which is > -50
    expect(moved.length).toBe(1);
  });

  it('should return an empty array when no obstacles remain', () => {
    const obstacles = [
      { x: -90, width: 30, height: 50, passed: true },
    ];
    const moved = moveObstacles(obstacles, 5);
    // -90 - 5 = -95, -95 + 30 = -65 which is < -50
    expect(moved.length).toBe(0);
  });

  it('should handle an empty obstacle array', () => {
    const moved = moveObstacles([], 5);
    expect(moved).toEqual([]);
  });
});

// ─── checkCollision Tests ───
describe('checkCollision', () => {
  it('should detect collision when player overlaps with obstacle', () => {
    const player = createPlayer(); // x=80, y=270, w=40, h=50
    const obstacle = { x: 85, width: 30, height: 60, passed: false };
    // obstacle top = 320 - 60 = 260, player bottom = 270 + 50 = 320
    // playerRight = 80+40-5=115 > 85+5=90, player.x+5=85 < 85+30-5=110
    // playerBottom=320 > 260, player.y=270 < 320
    expect(checkCollision(player, obstacle)).toBe(true);
  });

  it('should not detect collision when player is above obstacle', () => {
    const player = { ...createPlayer(), y: 100 }; // high in the air
    const obstacle = { x: 85, width: 30, height: 50, passed: false };
    // obstacleTop = 320 - 50 = 270, playerBottom = 100 + 50 = 150
    // 150 > 270 is false
    expect(checkCollision(player, obstacle)).toBe(false);
  });

  it('should not detect collision when obstacle is far ahead', () => {
    const player = createPlayer(); // x=80
    const obstacle = { x: 500, width: 30, height: 50, passed: false };
    expect(checkCollision(player, obstacle)).toBe(false);
  });

  it('should not detect collision when obstacle is behind the player', () => {
    const player = createPlayer(); // x=80
    const obstacle = { x: 10, width: 30, height: 50, passed: true };
    // playerRight = 115 > 10+5=15 YES, but player.x+5=85 < 10+30-5=35? NO, 85 > 35
    expect(checkCollision(player, obstacle)).toBe(false);
  });
});

// ─── calculateScore Tests ───
describe('calculateScore', () => {
  it('should increment score when obstacle passes the player', () => {
    const obstacles = [
      { x: 10, width: 30, height: 50, passed: false }, // x + width = 40 < playerX(80)
    ];
    const result = calculateScore(obstacles, 80, 0);
    expect(result.score).toBe(1);
    expect(result.obstacles[0].passed).toBe(true);
  });

  it('should not increment score for obstacles still ahead', () => {
    const obstacles = [
      { x: 200, width: 30, height: 50, passed: false },
    ];
    const result = calculateScore(obstacles, 80, 0);
    expect(result.score).toBe(0);
    expect(result.obstacles[0].passed).toBe(false);
  });

  it('should not re-score already passed obstacles', () => {
    const obstacles = [
      { x: 10, width: 30, height: 50, passed: true },
    ];
    const result = calculateScore(obstacles, 80, 5);
    expect(result.score).toBe(5);
  });

  it('should handle multiple obstacles at once', () => {
    const obstacles = [
      { x: 10, width: 30, height: 50, passed: false },
      { x: 20, width: 30, height: 40, passed: false },
      { x: 300, width: 30, height: 60, passed: false },
    ];
    const result = calculateScore(obstacles, 80, 0);
    expect(result.score).toBe(2); // first two pass, third is ahead
    expect(result.obstacles[0].passed).toBe(true);
    expect(result.obstacles[1].passed).toBe(true);
    expect(result.obstacles[2].passed).toBe(false);
  });

  it('should accumulate with existing score', () => {
    const obstacles = [
      { x: 10, width: 30, height: 50, passed: false },
    ];
    const result = calculateScore(obstacles, 80, 10);
    expect(result.score).toBe(11);
  });

  it('should handle empty obstacles array', () => {
    const result = calculateScore([], 80, 5);
    expect(result.score).toBe(5);
    expect(result.obstacles).toEqual([]);
  });
});
