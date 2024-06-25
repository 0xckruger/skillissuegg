import React, { useState, useEffect, useCallback } from 'react';

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PADDLE_VELOCITY = 60;

const Paddle = ({ position, top }) => (
  <div
    style={{
      position: 'absolute',
      left: position === 'left' ? 0 : GAME_WIDTH - PADDLE_WIDTH,
      top,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      backgroundColor: 'white',
    }}
  />
);

const Ball = ({ x, y }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: BALL_SIZE,
      height: BALL_SIZE,
      backgroundColor: 'white',
      borderRadius: '50%',
    }}
  />
);

const Scoreboard = ({ leftScore, rightScore }) => (
  <div
    style={{
      position: 'absolute',
      top: 20,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: '100px',
      color: '#33ff33',
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '24px',
    }}
  >
    <div>{leftScore}</div>
    <div>{rightScore}</div>
  </div>
);

const PongGame = () => {
  const [leftPaddleY, setLeftPaddleY] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [rightPaddleY, setRightPaddleY] = useState(GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2);
  const [ballPosition, setBallPosition] = useState({ x: GAME_WIDTH / 2 - BALL_SIZE / 2, y: GAME_HEIGHT / 2 - BALL_SIZE / 2 });
  const [ballVelocity, setBallVelocity] = useState({ x: 5, y: 2 });
  const [leftScore, setLeftScore] = useState(0);
  const [rightScore, setRightScore] = useState(0);
  const [isResetting, setIsResetting] = useState(false);

  const movePaddle = useCallback((paddle, direction) => {
    const setPaddle = paddle === 'left' ? setLeftPaddleY : setRightPaddleY;
    setPaddle((prevY) => {
      const newY = prevY + direction * PADDLE_VELOCITY;
      return Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, newY));
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'w': movePaddle('left', -1); break;
        case 's': movePaddle('left', 1); break;
        case 'ArrowUp': movePaddle('right', -1); break;
        case 'ArrowDown': movePaddle('right', 1); break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePaddle]);

  const resetBall = useCallback(() => {
    if (!isResetting) {
      setIsResetting(true);
      setBallPosition({ x: GAME_WIDTH / 2 - BALL_SIZE / 2, y: GAME_HEIGHT / 2 - BALL_SIZE / 2 });
      setBallVelocity({ x: Math.random() > 0.5 ? 5 : -5, y: Math.random() > 0.5 ? 2 : -2 });
      setTimeout(() => setIsResetting(false), 1000); // Prevent multiple resets within 1 second
    }
  }, [isResetting]);

  useEffect(() => {
    const gameLoop = setInterval(() => {
      if (!isResetting) {
        setBallPosition((prevPos) => {
          let newX = prevPos.x + ballVelocity.x;
          let newY = prevPos.y + ballVelocity.y;

          // Handle paddle collisions
          if (
            (ballVelocity.x < 0 && newX <= PADDLE_WIDTH && newY + BALL_SIZE >= leftPaddleY && newY <= leftPaddleY + PADDLE_HEIGHT) ||
            (ballVelocity.x > 0 && newX + BALL_SIZE >= GAME_WIDTH - PADDLE_WIDTH && newY + BALL_SIZE >= rightPaddleY && newY <= rightPaddleY + PADDLE_HEIGHT)
          ) {
            let paddleY = ballVelocity.x < 0 ? leftPaddleY : rightPaddleY;
            let relativeIntersectY = (paddleY + (PADDLE_HEIGHT / 2)) - newY;
            let normalizedRelativeIntersectionY = (relativeIntersectY / (PADDLE_HEIGHT / 2));
            let bounceAngle = normalizedRelativeIntersectionY * (Math.PI / 4);

            let speed = Math.sqrt(ballVelocity.x * ballVelocity.x + ballVelocity.y * ballVelocity.y);
            let newVelX = speed * Math.cos(bounceAngle);
            let newVelY = speed * -Math.sin(bounceAngle);

            setBallVelocity({ x: ballVelocity.x > 0 ? -newVelX : newVelX, y: newVelY });
            newX = ballVelocity.x < 0 ? PADDLE_WIDTH : GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE;
          }

          // Handle top and bottom wall collisions
          if (newY <= 0 || newY + BALL_SIZE >= GAME_HEIGHT) {
            setBallVelocity(prev => ({ ...prev, y: -prev.y }));
            newY = newY <= 0 ? 0 : GAME_HEIGHT - BALL_SIZE;
          }

          // Handle scoring
          if (newX <= 0) {
            setRightScore(prev => prev + 1);
            resetBall();
            return prevPos; // Keep the ball at its current position until reset
          } else if (newX + BALL_SIZE >= GAME_WIDTH) {
            setLeftScore(prev => prev + 1);
            resetBall();
            return prevPos; // Keep the ball at its current position until reset
          }

          return { x: newX, y: newY };
        });
      }
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [ballVelocity, leftPaddleY, rightPaddleY, resetBall, isResetting]);

  return (
    <div
      style={{
        position: 'relative',
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        backgroundColor: '#000',
        overflow: 'hidden',
      }}
    >
      <Paddle position="left" top={leftPaddleY} />
      <Paddle position="right" top={rightPaddleY} />
      <Ball x={ballPosition.x} y={ballPosition.y} />
      <Scoreboard leftScore={leftScore} rightScore={rightScore} />
    </div>
  );
};

export default PongGame;