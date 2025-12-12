'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Game, Player, BuzzerEvent } from '@/types';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  game: Game | null;
  playerId: string | null;
  buzzerQueue: BuzzerEvent[];
  joinGame: (gameId: string, playerName: string) => void;
  buzz: () => void;
  selectQuestion: (categoryId: string, questionId: string) => void;
  answerCorrect: (playerId: string) => void;
  answerWrong: (playerId: string) => void;
  skipQuestion: () => void;
  activateBuzzer: () => void;
  deactivateBuzzer: () => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  game: null,
  playerId: null,
  buzzerQueue: [],
  joinGame: () => {},
  buzz: () => {},
  selectQuestion: () => {},
  answerCorrect: () => {},
  answerWrong: () => {},
  skipQuestion: () => {},
  activateBuzzer: () => {},
  deactivateBuzzer: () => {},
});

export function SocketProvider({ children, gameId }: { children: React.ReactNode; gameId: string }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [buzzerQueue, setBuzzerQueue] = useState<BuzzerEvent[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socket',
      query: { gameId },
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    socketInstance.on('game-update', (updatedGame: Game) => {
      setGame(updatedGame);
    });

    socketInstance.on('player-id', (id: string) => {
      setPlayerId(id);
    });

    socketInstance.on('buzzer-queue', (queue: BuzzerEvent[]) => {
      setBuzzerQueue(queue);
    });

    socketInstance.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [gameId]);

  const joinGame = useCallback((gameId: string, playerName: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-game', { gameId, playerName });
    }
  }, []);

  const buzz = useCallback(() => {
    if (socketRef.current && game?.buzzerActive) {
      socketRef.current.emit('buzz', { gameId, timestamp: Date.now() });
    }
  }, [gameId, game?.buzzerActive]);

  const selectQuestion = useCallback((categoryId: string, questionId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('select-question', { gameId, categoryId, questionId });
    }
  }, [gameId]);

  const answerCorrect = useCallback((playerId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('answer-correct', { gameId, playerId });
    }
  }, [gameId]);

  const answerWrong = useCallback((playerId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('answer-wrong', { gameId, playerId });
    }
  }, [gameId]);

  const skipQuestion = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('skip-question', { gameId });
    }
  }, [gameId]);

  const activateBuzzer = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('activate-buzzer', { gameId });
    }
  }, [gameId]);

  const deactivateBuzzer = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('deactivate-buzzer', { gameId });
    }
  }, [gameId]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        game,
        playerId,
        buzzerQueue,
        joinGame,
        buzz,
        selectQuestion,
        answerCorrect,
        answerWrong,
        skipQuestion,
        activateBuzzer,
        deactivateBuzzer,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
