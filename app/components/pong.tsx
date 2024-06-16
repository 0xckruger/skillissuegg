import React, { useState, useEffect, useRef } from 'react';

export const Pong = () => {
  const initialBallState = { x: 300, y: 200, speedX: 5, speedY: 5 };
  const initialPaddleState = { left: 150, right: 150 };
  const [ball, setBall] = useState(initialBallState);
  const [paddles, setPaddles] = useState(initialPaddleState);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const ballRef = useRef(null);
  useEffect(() => {
    if (gameRunning) {
      const handleKeyPress = (e) => {
        switch (e.key) {
          case 'ArrowUp':
            setPaddles((prev) => ({ ...prev, right: Math.max(prev.right - 10, 0) }));
            break;
          case 'ArrowDown':
            setPaddles((prev) => ({ ...prev, right: Math.min(prev.right + 10, 300) }));
            break;
          case 'w':
            setPaddles((prev) => ({ ...prev, left: Math.max(prev.left - 10, 0) }));
            break;
          case 'd':
            setPaddles((prev) => ({ ...prev, left: Math.min(prev.left + 10, 300) }));
            break;
          default:
            break;
        }
      };
 
      const updateGame = () => {
        setBall((prevBall) => ({
          ...prevBall,
          x: prevBall.x + prevBall.speedX,
          y: 200,
        }));
 
        const ballRect = ballRef.current.getBoundingClientRect();
        const paddleLeftRect = document.getElementById('paddle-left').getBoundingClientRect();
        const paddleRightRect = document.getElementById('paddle-right').getBoundingClientRect();
 
        // Check for collisions with paddles
        if (
          (ballRect.left <= paddleLeftRect.right &&
            ballRect.right >= paddleLeftRect.left &&
            ballRect.top <= paddleLeftRect.bottom &&
            ballRect.bottom >= paddleLeftRect.top) ||
          (ballRect.left <= paddleRightRect.right &&
            ballRect.right >= paddleRightRect.left &&
            ballRect.top <= paddleRightRect.bottom &&
            ballRect.bottom >= paddleRightRect.top)
        ) {
          setBall((prevBall) => ({ ...prevBall, speedX: -prevBall.speedX }));
        }
 
        // Check for collisions with top and bottom walls
        if (ball.y <= 0 || ball.y >= 380) {
          setBall((prevBall) => ({ ...prevBall, speedY: -prevBall.speedY }));
        }
 
        // Check for game over
        if (ball.x < 0 || ball.x > 600) {
          setGameOver(true);
          pauseGame();
        }
      };
      const intervalId = setInterval(updateGame, 50);
 
      window.addEventListener('keydown', handleKeyPress);
 
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [gameRunning, ball]);
 
  const startGame = () => {
    setGameRunning(true);
  };
 
  const restartGame = () => {
    setBall(initialBallState);
    setPaddles(initialPaddleState);
    setGameOver(false);
  };
 
  const pauseGame = () => {
    setGameRunning(false);
  };
 
  return (
    <div className="ping-pong-container">
      <div
        className={`paddle paddle-left ${gameRunning ? '' : 'paused'}`}
        id="paddle-left"
        style={{ top: `${paddles.left}px` }}
      />
      <div
        className={`paddle paddle-right ${gameRunning ? '' : 'paused'}`}
        id="paddle-right"
        style={{ top: `${paddles.right}px`, left: '580px' }}
      />
      <div
        className={`ball ${gameRunning ? '' : 'paused'}`}
        ref={ballRef}
        style={{ top: `${ball.y}px`, left: `${ball.x}px` }}
      />
      <div className="controls">
        <button onClick={startGame}>Start</button>
        <button onClick={restartGame}>Restart</button>
        <button onClick={pauseGame}>Pause</button>
      </div>
      {gameOver && <div className="game-over">Game Over</div>}
    </div>
  );
}
