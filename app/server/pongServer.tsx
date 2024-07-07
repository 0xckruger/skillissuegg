import express from 'express';
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 10;
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PADDLE_VELOCITY = 40;
const BALL_SPEED = 7;

let gameState = {
    leftPaddleY: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    rightPaddleY: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
    ballPosition: { x: GAME_WIDTH / 2 - BALL_SIZE / 2, y: GAME_HEIGHT / 2 - BALL_SIZE / 2 },
    ballVelocity: { x: BALL_SPEED, y: 0 },
    leftScore: 0,
    rightScore: 0,
    gameStatus: 'waiting',
    connectedPlayers: []
};

let players = { left: null, right: null };

function logGameState() {
    console.log('Current Game State:');
    console.log(`Game Status: ${gameState.gameStatus}`);
    console.log(`Left Paddle: ${gameState.leftPaddleY}`);
    console.log(`Right Paddle: ${gameState.rightPaddleY}`);
    console.log(`Ball Position: (${gameState.ballPosition.x}, ${gameState.ballPosition.y})`);
    console.log(`Ball Velocity: (${gameState.ballVelocity.x}, ${gameState.ballVelocity.y})`);
    console.log(`Score: ${gameState.leftScore} - ${gameState.rightScore}`);
    console.log(`Connected Players: ${JSON.stringify(gameState.connectedPlayers)}`);
    console.log('-------------------');
}

function resetBall() {
    gameState.ballPosition = { x: GAME_WIDTH / 2 - BALL_SIZE / 2, y: GAME_HEIGHT / 2 - BALL_SIZE / 2 };
    const angle = Math.random() * Math.PI / 2 - Math.PI / 4;
    gameState.ballVelocity = {
        x: BALL_SPEED * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1),
        y: BALL_SPEED * Math.sin(angle)
    };
    console.log('Ball reset. New velocity:', gameState.ballVelocity);
}

function startGame() {
    gameState.gameStatus = 'playing';
    resetBall();
    io.emit('gameState', gameState);
    console.log('Game started!');
}

function updateConnectedPlayers() {
    gameState.connectedPlayers = Object.entries(players)
        .filter(([, id]) => id !== null)
        .map(([position, id]) => ({ position, id }));
    io.emit('gameState', gameState);
}

function updateGameState() {
    if (gameState.gameStatus !== 'playing') return;

    let { ballPosition, ballVelocity } = gameState;

    // Update ball position
    ballPosition.x += ballVelocity.x;
    ballPosition.y += ballVelocity.y;

    // Handle paddle collisions
    if (
        (ballVelocity.x < 0 && ballPosition.x <= PADDLE_WIDTH && ballPosition.y + BALL_SIZE >= gameState.leftPaddleY && ballPosition.y <= gameState.leftPaddleY + PADDLE_HEIGHT) ||
        (ballVelocity.x > 0 && ballPosition.x + BALL_SIZE >= GAME_WIDTH - PADDLE_WIDTH && ballPosition.y + BALL_SIZE >= gameState.rightPaddleY && ballPosition.y <= gameState.rightPaddleY + PADDLE_HEIGHT)
    ) {
        let paddleY = ballVelocity.x < 0 ? gameState.leftPaddleY : gameState.rightPaddleY;
        let relativeIntersectY = (paddleY + (PADDLE_HEIGHT / 2)) - ballPosition.y;
        let normalizedRelativeIntersectionY = (relativeIntersectY / (PADDLE_HEIGHT / 2));
        let bounceAngle = normalizedRelativeIntersectionY * (Math.PI / 4);

        gameState.ballVelocity = {
            x: BALL_SPEED * Math.cos(bounceAngle) * (ballVelocity.x > 0 ? -1 : 1),
            y: BALL_SPEED * -Math.sin(bounceAngle)
        };
        ballPosition.x = ballVelocity.x < 0 ? PADDLE_WIDTH : GAME_WIDTH - PADDLE_WIDTH - BALL_SIZE;
        console.log('Paddle collision. New ball velocity:', gameState.ballVelocity);
    }

    // Handle top and bottom wall collisions
    if (ballPosition.y <= 0 || ballPosition.y + BALL_SIZE >= GAME_HEIGHT) {
        gameState.ballVelocity.y = -gameState.ballVelocity.y;
        ballPosition.y = ballPosition.y <= 0 ? 0 : GAME_HEIGHT - BALL_SIZE;
        console.log('Wall collision. New ball velocity:', gameState.ballVelocity);
    }

    // Handle scoring
    if (ballPosition.x <= 0) {
        gameState.rightScore++;
        console.log('Right player scored. New score:', gameState.leftScore, '-', gameState.rightScore);
        resetBall();
    } else if (ballPosition.x + BALL_SIZE >= GAME_WIDTH) {
        gameState.leftScore++;
        console.log('Left player scored. New score:', gameState.leftScore, '-', gameState.rightScore);
        resetBall();
    }

    io.emit('gameState', gameState);
}

io.on('connection', (socket) => {
    const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
    console.log(`New client connected: ${socket.id} from IP: ${clientIp}`);

    let playerPosition = null;

    if (!players.left) {
        players.left = socket.id;
        playerPosition = 'left';
        socket.emit('playerAssignment', 'left');
        console.log(`Assigned left paddle to: ${socket.id}`);
    } else if (!players.right) {
        players.right = socket.id;
        playerPosition = 'right';
        socket.emit('playerAssignment', 'right');
        console.log(`Assigned right paddle to: ${socket.id}`);
        startGame();
    } else {
        socket.emit('playerAssignment', 'spectator');
        console.log(`New spectator: ${socket.id}`);
    }

    updateConnectedPlayers();
    io.emit('gameState', gameState);
    logGameState();

    socket.on('movePaddle', ({ player, direction }) => {
        if (players[player] === socket.id) {
            gameState[`${player}PaddleY`] = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, gameState[`${player}PaddleY`] + direction * PADDLE_VELOCITY));
            console.log(`${player} paddle moved. New position:`, gameState[`${player}PaddleY`]);
            io.emit('gameState', gameState);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        if (players.left === socket.id) {
            players.left = null;
            console.log('Left player disconnected');
        }
        if (players.right === socket.id) {
            players.right = null;
            console.log('Right player disconnected');
        }
        console.log('Current players:', players);

        if (!players.left && !players.right) {
            gameState.gameStatus = 'waiting';
            console.log('Game ended due to all players disconnecting');
        }

        updateConnectedPlayers();
        io.emit('gameState', gameState);
    });
});

setInterval(updateGameState, 1000 / 60);  // 60 FPS

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));