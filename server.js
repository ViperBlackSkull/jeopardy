const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory game state for real-time updates
const gameStates = new Map();
const playerSockets = new Map();

const DATA_DIR = path.join(process.cwd(), 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');

function readGames() {
  try {
    if (fs.existsSync(GAMES_FILE)) {
      return JSON.parse(fs.readFileSync(GAMES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Error reading games:', e);
  }
  return [];
}

function writeGames(games) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
}

function getGame(gameId) {
  // Check in-memory first, then file
  if (gameStates.has(gameId)) {
    return gameStates.get(gameId);
  }
  const games = readGames();
  const game = games.find(g => g.id === gameId);
  if (game) {
    gameStates.set(gameId, game);
  }
  return game;
}

function saveGame(game) {
  gameStates.set(game.id, game);
  const games = readGames();
  const index = games.findIndex(g => g.id === game.id);
  if (index >= 0) {
    games[index] = game;
  } else {
    games.push(game);
  }
  writeGames(games);
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    const gameId = socket.handshake.query.gameId;

    if (gameId) {
      socket.join(gameId);
      const game = getGame(gameId);
      if (game) {
        socket.emit('game-update', game);
      }
    }

    socket.on('join-game', ({ gameId, playerName }) => {
      const game = getGame(gameId);
      if (!game) {
        socket.emit('error', { message: 'Game not found' });
        return;
      }

      // Check if player already exists (reconnecting)
      let player = game.players.find(p => p.name === playerName);

      if (player) {
        // Reconnecting
        player.connected = true;
      } else {
        // New player
        player = {
          id: `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: playerName,
          score: 0,
          connected: true,
        };
        game.players.push(player);
      }

      playerSockets.set(socket.id, { gameId, playerId: player.id });
      socket.join(gameId);

      saveGame(game);
      socket.emit('player-id', player.id);
      io.to(gameId).emit('game-update', game);
    });

    socket.on('buzz', ({ gameId, timestamp }) => {
      const socketData = playerSockets.get(socket.id);
      if (!socketData) return;

      const game = getGame(gameId);
      if (!game || !game.buzzerActive) return;

      const player = game.players.find(p => p.id === socketData.playerId);
      if (!player) return;

      // Check if player already buzzed
      if (game.buzzerQueue.some(b => b.playerId === player.id)) return;

      const buzzerEvent = {
        playerId: player.id,
        playerName: player.name,
        timestamp,
        order: game.buzzerQueue.length + 1,
      };

      game.buzzerQueue.push(buzzerEvent);
      game.buzzerQueue.sort((a, b) => a.timestamp - b.timestamp);
      game.buzzerQueue.forEach((b, i) => b.order = i + 1);

      saveGame(game);
      io.to(gameId).emit('game-update', game);
      io.to(gameId).emit('buzzer-queue', game.buzzerQueue);
    });

    socket.on('select-question', ({ gameId, categoryId, questionId }) => {
      const game = getGame(gameId);
      if (!game) return;

      const category = game.categories.find(c => c.id === categoryId);
      if (!category) return;

      const question = category.questions.find(q => q.id === questionId);
      if (!question || question.answered) return;

      game.currentCategory = category;
      game.currentQuestion = question;
      game.phase = 'question';
      game.buzzerQueue = [];
      game.buzzerActive = false;

      saveGame(game);
      io.to(gameId).emit('game-update', game);
    });

    socket.on('activate-buzzer', ({ gameId }) => {
      const game = getGame(gameId);
      if (!game) return;

      game.buzzerActive = true;
      game.buzzerQueue = [];

      saveGame(game);
      io.to(gameId).emit('game-update', game);
    });

    socket.on('deactivate-buzzer', ({ gameId }) => {
      const game = getGame(gameId);
      if (!game) return;

      game.buzzerActive = false;

      saveGame(game);
      io.to(gameId).emit('game-update', game);
    });

    socket.on('answer-correct', ({ gameId, playerId }) => {
      const game = getGame(gameId);
      if (!game || !game.currentQuestion) return;

      const player = game.players.find(p => p.id === playerId);
      if (!player) return;

      player.score += game.currentQuestion.points;

      // Mark question as answered
      game.categories.forEach(cat => {
        cat.questions.forEach(q => {
          if (q.id === game.currentQuestion.id) {
            q.answered = true;
          }
        });
      });

      game.phase = 'playing';
      game.currentQuestion = null;
      game.currentCategory = null;
      game.buzzerActive = false;
      game.buzzerQueue = [];

      saveGame(game);
      io.to(gameId).emit('game-update', game);
    });

    socket.on('answer-wrong', ({ gameId, playerId }) => {
      const game = getGame(gameId);
      if (!game || !game.currentQuestion) return;

      const player = game.players.find(p => p.id === playerId);
      if (!player) return;

      if (game.settings.allowNegative) {
        player.score -= game.currentQuestion.points;
      }

      // Remove player from buzzer queue
      game.buzzerQueue = game.buzzerQueue.filter(b => b.playerId !== playerId);
      game.buzzerQueue.forEach((b, i) => b.order = i + 1);

      saveGame(game);
      io.to(gameId).emit('game-update', game);
      io.to(gameId).emit('buzzer-queue', game.buzzerQueue);
    });

    socket.on('skip-question', ({ gameId }) => {
      const game = getGame(gameId);
      if (!game || !game.currentQuestion) return;

      // Mark question as answered (skipped)
      game.categories.forEach(cat => {
        cat.questions.forEach(q => {
          if (q.id === game.currentQuestion.id) {
            q.answered = true;
          }
        });
      });

      game.phase = 'playing';
      game.currentQuestion = null;
      game.currentCategory = null;
      game.buzzerActive = false;
      game.buzzerQueue = [];

      saveGame(game);
      io.to(gameId).emit('game-update', game);
    });

    socket.on('disconnect', () => {
      const socketData = playerSockets.get(socket.id);
      if (socketData) {
        const game = getGame(socketData.gameId);
        if (game) {
          const player = game.players.find(p => p.id === socketData.playerId);
          if (player) {
            player.connected = false;
            saveGame(game);
            io.to(socketData.gameId).emit('game-update', game);
          }
        }
        playerSockets.delete(socket.id);
      }
      console.log('Client disconnected:', socket.id);
    });
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
