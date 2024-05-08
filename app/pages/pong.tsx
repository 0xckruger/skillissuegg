import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const Pong: React.FC = () => {
    const [isHost, setIsHost] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [gameStarted, setGameStarted] = useState(false);
    const [score, setScore] = useState({ player1: 0, player2: 0 });
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const socketRef = useRef<Socket>();

    const gameWidth = 800;
    const gameHeight = 600;
    const paddleWidth = 10;
    const paddleHeight = 100;
    const ballSize = 10;

    const [player1Position, setPlayer1Position] = useState(gameHeight / 2 - paddleHeight / 2);
    const [player2Position, setPlayer2Position] = useState(gameHeight / 2 - paddleHeight / 2);
    const [ballPosition, setBallPosition] = useState({ x: gameWidth / 2, y: gameHeight / 2 });
    const [ballSpeed, setBallSpeed] = useState({ x: 5, y: 5 });

    useEffect(() => {
        socketRef.current = io('/api/socketHandler');

        socketRef.current.on('passcode', (data) => {
            setPasscode(data);
        });

        socketRef.current.on('startGame', () => {
            setGameStarted(true);
        });

        socketRef.current.on('paddleMove', (data) => {
            if (!isHost) {
                setPlayer1Position(data.position);
            } else {
                setPlayer2Position(data.position);
            }
        });

        socketRef.current.on('ballMove', (data) => {
            setBallPosition(data.position);
            setBallSpeed(data.speed);
        });

        return () => {
            socketRef.current?.disconnect();
        };
    }, [isHost]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
            ctx.clearRect(0, 0, gameWidth, gameHeight);

            // Render paddles
            ctx.fillStyle = 'white';
            ctx.fillRect(0, player1Position, paddleWidth, paddleHeight);
            ctx.fillRect(gameWidth - paddleWidth, player2Position, paddleWidth, paddleHeight);

            // Render ball
            ctx.fillRect(ballPosition.x - ballSize / 2, ballPosition.y - ballSize / 2, ballSize, ballSize);
        };

        const gameLoop = () => {
            if (gameStarted) {
                // Update ball position
                ballPosition.x += ballSpeed.x;
                ballPosition.y += ballSpeed.y;

                // Check for collision with walls
                if (ballPosition.y <= 0 || ballPosition.y >= gameHeight) {
                    ballSpeed.y = -ballSpeed.y;
                }

                // Check for collision with paddles
                if (
                    (ballPosition.x <= paddleWidth && ballPosition.y >= player1Position && ballPosition.y <= player1Position + paddleHeight) ||
                    (ballPosition.x >= gameWidth - paddleWidth && ballPosition.y >= player2Position && ballPosition.y <= player2Position + paddleHeight)
                ) {
                    ballSpeed.x = -ballSpeed.x;
                }

                // Check for score
                if (ballPosition.x <= 0) {
                    setScore((prevScore) => ({ ...prevScore, player2: prevScore.player2 + 1 }));
                    resetBall();
                } else if (ballPosition.x >= gameWidth) {
                    setScore((prevScore) => ({ ...prevScore, player1: prevScore.player1 + 1 }));
                    resetBall();
                }

                socketRef.current?.emit('ballMove', { passcode, position: ballPosition, speed: ballSpeed });
            }

            render();
            requestAnimationFrame(gameLoop);
        };

        const resetBall = () => {
            setBallPosition({ x: gameWidth / 2, y: gameHeight / 2 });
            setBallSpeed({ x: 5, y: 5 });
        };

        gameLoop();
    }, [gameStarted, ballPosition, ballSpeed, player1Position, player2Position, score]);

    const handleHostClick = () => {
        setIsHost(true);
        socketRef.current?.emit('host');
    };

    const handleJoinClick = () => {
        const enteredPasscode = prompt('Enter the passcode:');
        if (enteredPasscode) {
            socketRef.current?.emit('join', enteredPasscode);
        }
    };

    const generatePasscode = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let passcode = '';
        for (let i = 0; i < 6; i++) {
            passcode += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return passcode;
    };

    const handlePaddleMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const rect = canvas.getBoundingClientRect();
        const position = event.clientY - rect.top - paddleHeight / 2;

        if (isHost) {
            setPlayer2Position(position);
        } else {
            setPlayer1Position(position);
        }

        socketRef.current?.emit('paddleMove', { passcode, position });
    };

    return (
        <div>
            {!gameStarted ? (
                <div>
                    {!isHost && !passcode ? (
                        <div>
                            <button onClick={handleHostClick}>Host</button>
                            <button onClick={handleJoinClick}>Join</button>
                        </div>
                    ) : (
                        <div>
                            <p>Waiting for opponent...</p>
                            <p>Passcode: {passcode || generatePasscode()}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <canvas ref={canvasRef} width={gameWidth} height={gameHeight} onMouseMove={handlePaddleMove} />
                    <p>Player 1 Score: {score.player1}</p>
                    <p>Player 2 Score: {score.player2}</p>
                    {score.player1 === 10 && <p>Player 1 wins!</p>}
                    {score.player2 === 10 && <p>Player 2 wins!</p>}
                </div>
            )}
        </div>
    );
};

export default Pong;