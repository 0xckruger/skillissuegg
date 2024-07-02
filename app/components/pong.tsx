import React, { useState, useEffect, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;

interface GameState {
    leftPaddleY: number;
    rightPaddleY: number;
    ballPosition: { x: number; y: number };
    leftScore: number;
    rightScore: number;
    gameStatus: 'waiting' | 'playing' | 'ended';
    connectedPlayers: { position: string; id: string }[];
}

const Paddle: React.FC<{ position: 'left' | 'right'; top: number }> = ({ position, top }) => (
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

const Ball: React.FC<{ x: number; y: number }> = ({ x, y }) => (
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

const Scoreboard: React.FC<{ leftScore: number; rightScore: number }> = ({ leftScore, rightScore }) => (
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

const PongGame: React.FC = () => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const gameStateRef = useRef<GameState>({
        leftPaddleY: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        rightPaddleY: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        ballPosition: { x: GAME_WIDTH / 2 - BALL_SIZE / 2, y: GAME_HEIGHT / 2 - BALL_SIZE / 2 },
        leftScore: 0,
        rightScore: 0,
        gameStatus: 'waiting',
        connectedPlayers: []
    });
    const [, forceUpdate] = useState({});
    const [player, setPlayer] = useState<'left' | 'right' | 'spectator' | null>(null);

    useEffect(() => {
        const newSocket = io('http://your-server-ip:3001', {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to server');
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
        });

        newSocket.on('playerAssignment', (assignedPlayer: 'left' | 'right' | 'spectator') => {
            console.log('Assigned as:', assignedPlayer);
            setPlayer(assignedPlayer);
        });

        newSocket.on('gameState', (newGameState: GameState) => {
            console.log('Received new game state:', newGameState);
            gameStateRef.current = newGameState;
            forceUpdate({});
        });

        return () => {
            newSocket.close();
        };
    }, []);

    const movePaddle = useCallback((direction: number) => {
        if (socket && player && player !== 'spectator') {
            socket.emit('movePaddle', { player, direction });
        }
    }, [socket, player]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (player === 'left') {
                if (e.key === 'w') movePaddle(-1);
                if (e.key === 's') movePaddle(1);
            } else if (player === 'right') {
                if (e.key === 'ArrowUp') movePaddle(-1);
                if (e.key === 'ArrowDown') movePaddle(1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [movePaddle, player]);

    const renderConnectedPlayers = () => {
        const { connectedPlayers } = gameStateRef.current;
        return (
            <div style={{ position: 'absolute', top: 5, right: 5, color: 'white', fontSize: '12px' }}>
                <div>Connected Players:</div>
                {connectedPlayers.map((player, index) => (
                    <div key={index}>{player.position}: {player.id.slice(0, 6)}...</div>
                ))}
            </div>
        );
    };

    const renderDebugInfo = () => {
        const { gameStatus } = gameStateRef.current;
        return (
            <div style={{ position: 'absolute', top: 30, left: 5, color: 'white', fontSize: '12px' }}>
                <div>Game Status: {gameStatus}</div>
                <div>Player Role: {player || 'Not assigned'}</div>
                {gameStatus === 'waiting' && (
                    <div>Waiting for: {!player ? 'player assignment' : 'another player to join'}</div>
                )}
                <div>Connected to server: {socket?.connected ? 'Yes' : 'No'}</div>
            </div>
        );
    };

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
            {gameStateRef.current.gameStatus === 'playing' ? (
                <>
                    <Paddle position="left" top={gameStateRef.current.leftPaddleY} />
                    <Paddle position="right" top={gameStateRef.current.rightPaddleY} />
                    <Ball x={gameStateRef.current.ballPosition.x} y={gameStateRef.current.ballPosition.y} />
                    <Scoreboard leftScore={gameStateRef.current.leftScore} rightScore={gameStateRef.current.rightScore} />
                </>
            ) : (
                <div style={{ color: 'white', textAlign: 'center', paddingTop: '150px' }}>
                    Waiting for players to join...
                </div>
            )}
            {player && <div style={{ position: 'absolute', top: 5, left: 5, color: 'white' }}>You are the {player} player</div>}
            {renderDebugInfo()}
            {renderConnectedPlayers()}
        </div>
    );
};

export default PongGame;