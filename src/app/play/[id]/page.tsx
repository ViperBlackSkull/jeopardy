'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Game, BuzzerEvent } from '@/types';
import { io, Socket } from 'socket.io-client';

export default function PlayerPage() {
  const params = useParams();
  const router = useRouter();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [buzzerQueue, setBuzzerQueue] = useState<BuzzerEvent[]>([]);
  const [justBuzzed, setJustBuzzed] = useState(false);

  useEffect(() => {
    // Get player name from localStorage
    const storedName = localStorage.getItem('playerName');
    if (storedName) {
      setPlayerName(storedName);
    }

    const socketInstance = io({
      path: '/api/socket',
      query: { gameId: params.id },
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Player connected');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
    });

    socketInstance.on('game-update', (updatedGame: Game) => {
      setGame(updatedGame);
    });

    socketInstance.on('player-id', (id: string) => {
      setPlayerId(id);
      setJoined(true);
    });

    socketInstance.on('buzzer-queue', (queue: BuzzerEvent[]) => {
      setBuzzerQueue(queue);
    });

    socketInstance.on('error', (error: { message: string }) => {
      alert(error.message);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [params.id]);

  // Auto-join if name is available
  useEffect(() => {
    if (socket && connected && playerName && !joined) {
      socket.emit('join-game', { gameId: params.id, playerName });
    }
  }, [socket, connected, playerName, joined, params.id]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !socket) return;
    localStorage.setItem('playerName', playerName.trim());
    socket.emit('join-game', { gameId: params.id, playerName: playerName.trim() });
  };

  const handleBuzz = useCallback(() => {
    if (!socket || !game?.buzzerActive) return;
    socket.emit('buzz', { gameId: params.id, timestamp: Date.now() });
    setJustBuzzed(true);
    setTimeout(() => setJustBuzzed(false), 300);

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  }, [socket, game?.buzzerActive, params.id]);

  // Keyboard buzzer support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleBuzz();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleBuzz]);

  // Get current player
  const currentPlayer = game?.players.find(p => p.id === playerId);
  const myBuzzPosition = game?.buzzerQueue.find(b => b.playerId === playerId)?.order;
  const isFirstBuzzer = myBuzzPosition === 1;

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-xl text-gray-400 animate-pulse">Connecting...</div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-jeopardy-gold text-center mb-8">
            Join Game
          </h1>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Your Name</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:border-jeopardy-gold text-lg"
                placeholder="Enter your name"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full py-4 bg-jeopardy-blue hover:bg-blue-700 rounded-lg font-bold text-lg"
            >
              Join Game
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div className="text-xl text-gray-400">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-lg font-bold text-white">{currentPlayer?.name || playerName}</div>
            <div className={`text-2xl font-bold ${(currentPlayer?.score || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${(currentPlayer?.score || 0).toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400">{game.name}</div>
            <div className={`text-sm ${connected ? 'text-green-400' : 'text-red-400'}`}>
              {connected ? '● Connected' : '○ Disconnected'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {game.phase === 'question' && game.currentQuestion ? (
          <>
            {/* Current Question Info */}
            <div className="text-center mb-8">
              <div className="text-jeopardy-gold text-lg mb-2">
                {game.currentCategory?.name}
              </div>
              <div className="text-4xl font-bold text-white">
                ${game.currentQuestion.points}
              </div>
            </div>

            {/* Buzzer Status */}
            <div className="text-center mb-8">
              {myBuzzPosition ? (
                <div className={`text-2xl font-bold ${isFirstBuzzer ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isFirstBuzzer ? "YOU'RE UP!" : `Position #${myBuzzPosition}`}
                </div>
              ) : game.buzzerActive ? (
                <div className="text-xl text-green-400 animate-pulse">
                  BUZZ NOW!
                </div>
              ) : (
                <div className="text-xl text-gray-500">
                  Waiting for host...
                </div>
              )}
            </div>

            {/* Buzzer Button */}
            <button
              onClick={handleBuzz}
              disabled={!game.buzzerActive || !!myBuzzPosition}
              className={`
                w-48 h-48 rounded-full text-3xl font-bold uppercase
                flex items-center justify-center
                transition-all duration-100
                ${justBuzzed ? 'scale-95' : 'scale-100'}
                ${game.buzzerActive && !myBuzzPosition
                  ? 'buzzer-button text-white cursor-pointer'
                  : myBuzzPosition
                    ? 'bg-yellow-600 border-4 border-yellow-800 text-white cursor-default'
                    : 'bg-gray-700 border-4 border-gray-600 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {myBuzzPosition ? (
                <span>#{myBuzzPosition}</span>
              ) : (
                <span>BUZZ!</span>
              )}
            </button>

            {/* Instructions */}
            <div className="text-center mt-8 text-gray-500 text-sm">
              {game.buzzerActive && !myBuzzPosition ? (
                <>Tap the button or press SPACE to buzz in</>
              ) : myBuzzPosition ? (
                <>Wait for the host to call on you</>
              ) : (
                <>Listen to the question and wait for buzzers to open</>
              )}
            </div>
          </>
        ) : game.phase === 'lobby' ? (
          <div className="text-center">
            <div className="text-3xl text-jeopardy-gold mb-4">Welcome!</div>
            <div className="text-xl text-gray-400 mb-8">
              Waiting for the game to start...
            </div>
            <div className="text-gray-500">
              {game.players.length} player{game.players.length !== 1 ? 's' : ''} connected
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-2xl text-gray-400 mb-4">
              Watch the board!
            </div>
            <div className="text-lg text-gray-500">
              A question will be selected soon...
            </div>
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="text-xs text-gray-500 text-center mb-2">SCOREBOARD</div>
        <div className="flex flex-wrap justify-center gap-3">
          {game.players.sort((a, b) => b.score - a.score).map((player) => (
            <div
              key={player.id}
              className={`px-3 py-1 rounded text-sm ${
                player.id === playerId
                  ? 'bg-jeopardy-blue text-white'
                  : player.connected
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-800 text-gray-500'
              }`}
            >
              {player.name}: ${player.score.toLocaleString()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
