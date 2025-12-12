'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Game, Category, Question } from '@/types';
import { io, Socket } from 'socket.io-client';

export default function GameDisplayPage() {
  const params = useParams();
  const [game, setGame] = useState<Game | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const socketInstance = io({
      path: '/api/socket',
      query: { gameId: params.id },
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Display connected');
    });

    socketInstance.on('game-update', (updatedGame: Game) => {
      setGame(updatedGame);
      setShowAnswer(false);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [params.id]);

  const selectQuestion = (categoryId: string, questionId: string) => {
    if (socket) {
      socket.emit('select-question', { gameId: params.id, categoryId, questionId });
    }
  };

  const activateBuzzer = () => {
    if (socket) {
      socket.emit('activate-buzzer', { gameId: params.id });
    }
  };

  const answerCorrect = (playerId: string) => {
    if (socket) {
      socket.emit('answer-correct', { gameId: params.id, playerId });
    }
  };

  const answerWrong = (playerId: string) => {
    if (socket) {
      socket.emit('answer-wrong', { gameId: params.id, playerId });
    }
  };

  const skipQuestion = () => {
    if (socket) {
      socket.emit('skip-question', { gameId: params.id });
    }
  };

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center jeopardy-board">
        <div className="text-4xl text-jeopardy-gold animate-pulse">Loading...</div>
      </div>
    );
  }

  // Show question/clue screen
  if (game.phase === 'question' && game.currentQuestion) {
    return (
      <div className="min-h-screen jeopardy-board flex flex-col">
        {/* Question Display */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="question-display rounded-lg p-12 max-w-5xl w-full text-center">
            {!showAnswer ? (
              <>
                <div className="text-jeopardy-gold text-2xl mb-4">
                  {game.currentCategory?.name} - ${game.currentQuestion.points}
                </div>
                {game.currentQuestion.media && (
                  <div className="mb-6 flex justify-center">
                    {game.currentQuestion.media.type === 'image' && (
                      <img
                        src={game.currentQuestion.media.url}
                        alt="Question media"
                        className="max-h-64 rounded-lg shadow-lg"
                      />
                    )}
                    {game.currentQuestion.media.type === 'audio' && (
                      <audio
                        src={game.currentQuestion.media.url}
                        controls
                        autoPlay
                        className="w-full max-w-md"
                      />
                    )}
                    {game.currentQuestion.media.type === 'video' && (
                      <video
                        src={game.currentQuestion.media.url}
                        controls
                        autoPlay
                        className="max-h-64 rounded-lg shadow-lg"
                      />
                    )}
                  </div>
                )}
                <div className="text-4xl md:text-6xl font-bold text-white leading-tight">
                  {game.currentQuestion.question}
                </div>
              </>
            ) : (
              <>
                <div className="text-gray-400 text-xl mb-4">ANSWER</div>
                {game.currentQuestion.answerMedia && (
                  <div className="mb-6 flex justify-center">
                    {game.currentQuestion.answerMedia.type === 'image' && (
                      <img
                        src={game.currentQuestion.answerMedia.url}
                        alt="Answer media"
                        className="max-h-64 rounded-lg shadow-lg"
                      />
                    )}
                    {game.currentQuestion.answerMedia.type === 'audio' && (
                      <audio
                        src={game.currentQuestion.answerMedia.url}
                        controls
                        className="w-full max-w-md"
                      />
                    )}
                    {game.currentQuestion.answerMedia.type === 'video' && (
                      <video
                        src={game.currentQuestion.answerMedia.url}
                        controls
                        className="max-h-64 rounded-lg shadow-lg"
                      />
                    )}
                  </div>
                )}
                <div className="text-4xl md:text-6xl font-bold text-jeopardy-gold leading-tight">
                  {game.currentQuestion.answer}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Buzzer Queue */}
        <div className="p-4 bg-black/50">
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            {game.buzzerQueue.length > 0 ? (
              game.buzzerQueue.map((buzz, index) => (
                <div
                  key={buzz.playerId}
                  className={`px-6 py-3 rounded-lg ${
                    index === 0
                      ? 'bg-green-600 text-white buzz-animation text-2xl'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  #{buzz.order} {buzz.playerName}
                </div>
              ))
            ) : (
              <div className={`text-2xl ${game.buzzerActive ? 'text-green-400 animate-pulse-fast' : 'text-gray-500'}`}>
                {game.buzzerActive ? 'BUZZERS ACTIVE!' : 'Waiting for host...'}
              </div>
            )}
          </div>

          {/* Control buttons (for host) */}
          <div className="flex flex-wrap justify-center gap-2">
            {!game.buzzerActive && game.buzzerQueue.length === 0 && (
              <button
                onClick={activateBuzzer}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-lg"
              >
                Activate Buzzers
              </button>
            )}
            {game.buzzerQueue.length > 0 && (
              <>
                <button
                  onClick={() => answerCorrect(game.buzzerQueue[0].playerId)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold"
                >
                  ✓ Correct (+${game.currentQuestion.points})
                </button>
                <button
                  onClick={() => answerWrong(game.buzzerQueue[0].playerId)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold"
                >
                  ✗ Wrong (-${game.currentQuestion.points})
                </button>
              </>
            )}
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold"
            >
              {showAnswer ? 'Show Question' : 'Show Answer'}
            </button>
            <button
              onClick={skipQuestion}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-bold"
            >
              Skip Question
            </button>
          </div>
        </div>

        {/* Scoreboard */}
        <div className="p-4 bg-black/80">
          <div className="flex flex-wrap justify-center gap-4">
            {game.players.sort((a, b) => b.score - a.score).map((player) => (
              <div
                key={player.id}
                className={`px-4 py-2 rounded ${
                  player.connected ? 'bg-gray-800' : 'bg-gray-900 opacity-50'
                }`}
              >
                <div className="font-bold">{player.name}</div>
                <div className={`text-xl ${player.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${player.score.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show game board
  return (
    <div className="min-h-screen jeopardy-board p-4 flex flex-col">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-4xl font-bold text-jeopardy-gold mb-2">{game.name}</h1>
        <div className="text-xl text-white">
          Access Code: <span className="font-mono bg-gray-800 px-3 py-1 rounded">{game.accessCode}</span>
        </div>
      </div>

      {/* Game Board */}
      {game.categories.length > 0 ? (
        <div className="flex-1 grid gap-2" style={{
          gridTemplateColumns: `repeat(${game.categories.length}, 1fr)`,
          gridTemplateRows: `auto repeat(5, 1fr)`,
        }}>
          {/* Category Headers */}
          {game.categories.map((category) => (
            <div
              key={category.id}
              className="jeopardy-category p-4 flex items-center justify-center text-center"
            >
              <span className="text-white font-bold text-lg md:text-2xl uppercase">
                {category.name}
              </span>
            </div>
          ))}

          {/* Question Cells */}
          {[100, 200, 300, 400, 500].map((points) => (
            game.categories.map((category) => {
              const question = category.questions.find(q => q.points === points);
              if (!question) return null;
              return (
                <button
                  key={`${category.id}-${points}`}
                  onClick={() => !question.answered && selectQuestion(category.id, question.id)}
                  disabled={question.answered || game.phase !== 'playing'}
                  className={`jeopardy-cell flex items-center justify-center ${
                    question.answered ? 'answered' : ''
                  }`}
                >
                  {!question.answered && (
                    <span className="jeopardy-value text-3xl md:text-5xl">
                      ${points}
                    </span>
                  )}
                </button>
              );
            })
          ))}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-2xl text-gray-400">No categories yet. Set up the game in the admin panel.</div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="mt-4 p-4 bg-black/50 rounded-lg">
        <div className="flex flex-wrap justify-center gap-6">
          {game.players.sort((a, b) => b.score - a.score).map((player, index) => (
            <div
              key={player.id}
              className={`text-center px-6 py-3 rounded-lg ${
                player.connected ? 'bg-gray-800' : 'bg-gray-900 opacity-50'
              } ${index === 0 && game.players.length > 1 ? 'ring-2 ring-jeopardy-gold' : ''}`}
            >
              <div className="font-bold text-lg">{player.name}</div>
              <div className={`text-2xl font-bold ${player.score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${player.score.toLocaleString()}
              </div>
            </div>
          ))}
          {game.players.length === 0 && (
            <div className="text-gray-400">Waiting for players to join...</div>
          )}
        </div>
      </div>
    </div>
  );
}
