import React, { useEffect, useRef, useState } from 'react';

const Pong: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ball, setBall] = useState({ x: 0, y: 0, dx: 2, dy: 2, radius: 10 });
  const [paddle, setPaddle] = useState({ x: 0, width: 75, height: 10, speed: 5 });
  const [score, setScore] = useState(0);

  const drawBall = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.closePath();
  };

  const drawPaddle = (ctx: CanvasRenderingContext2D) => {
    ctx.beginPath();
    ctx.rect(paddle.x, canvasRef.current!.height - paddle.height, paddle.width, paddle.height);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.closePath();
  };

  const drawScore = (ctx: CanvasRenderingContext2D) => {
    ctx.font = "16px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Score: ${score}`, 8, 20);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas!.getContext('2d')!;

    // Set background color to black
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas!.width, canvas!.height);

    drawBall(ctx);
    drawPaddle(ctx);
    drawScore(ctx);

    const isHittingLeftOrRightWall = ball.x + ball.dx > canvas!.width - ball.radius || ball.x + ball.dx < ball.radius;
    if (isHittingLeftOrRightWall) {
      setBall(ball => ({ ...ball, dx: -ball.dx }));
    }

    const isHittingTopWall = ball.y + ball.dy < ball.radius;
    if (isHittingTopWall) {
      setBall(ball => ({ ...ball, dy: -ball.dy }));
    } else {
      const isHittingBottomWall = ball.y + ball.dy > canvas!.height - ball.radius;
      if (isHittingBottomWall) {
        const isHittingPaddle = ball.x > paddle.x && ball.x < paddle.x + paddle.width;
        if (isHittingPaddle) {
          setScore(score => score + 1);
          setBall(ball => ({ ...ball, dy: -ball.dy }));
        } else {
          alert("Game Over!");
          document.location.reload();
        }
      }
    }

    ball.x += ball.dx;
    ball.y += ball.dy;
  };

  const movePaddle = (event: KeyboardEvent) => {
    const isMovingLeft = event.key === 'ArrowLeft' && paddle.x > 0;
    if (isMovingLeft) {
      setPaddle(paddle => ({ ...paddle, x: paddle.x - paddle.speed }));
    } else {
      const isMovingRight = event.key === 'ArrowRight' && paddle.x < canvasRef.current!.width - paddle.width;
      if (isMovingRight) {
        setPaddle(paddle => ({ ...paddle, x: paddle.x + paddle.speed }));
      }
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    setBall({ ...ball, x: canvas!.width / 2, y: canvas!.height - 30 });
    setPaddle({ ...paddle, x: (canvas!.width - paddle.width) / 2 });

    const interval = setInterval(draw, 10);
    document.addEventListener('keydown', movePaddle);

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', movePaddle);
    };
  }, []);

  return <canvas ref={canvasRef} width={800} height={600} />;
};

export default Pong;