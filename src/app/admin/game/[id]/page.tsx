'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Game, Category, Question, Player, MediaAttachment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const POINT_VALUES = [100, 200, 300, 400, 500];

export default function GameManagePage() {
  const params = useParams();
  const router = useRouter();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<{
    categoryId: string;
    questionIndex: number;
    question: Question;
  } | null>(null);

  const loadGame = useCallback(async () => {
    try {
      const response = await fetch(`/api/games/${params.id}`);
      if (!response.ok) throw new Error('Game not found');
      const data = await response.json();
      setGame(data);
    } catch (error) {
      console.error('Failed to load game:', error);
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    loadGame();
    // Poll for updates every 2 seconds when game is active
    const interval = setInterval(loadGame, 2000);
    return () => clearInterval(interval);
  }, [loadGame]);

  const saveGame = async (updatedGame: Game) => {
    setSaving(true);
    try {
      await fetch(`/api/games/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedGame),
      });
      setGame(updatedGame);
    } catch (error) {
      console.error('Failed to save game:', error);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (!game) return;
    const newCategory: Category = {
      id: uuidv4(),
      name: 'New Category',
      questions: POINT_VALUES.map((points) => ({
        id: uuidv4(),
        question: '',
        answer: '',
        points,
        answered: false,
      })),
    };
    const updatedGame = {
      ...game,
      categories: [...game.categories, newCategory],
    };
    saveGame(updatedGame);
  };

  const updateCategory = (categoryId: string, name: string) => {
    if (!game) return;
    const updatedGame = {
      ...game,
      categories: game.categories.map((c) =>
        c.id === categoryId ? { ...c, name } : c
      ),
    };
    saveGame(updatedGame);
  };

  const deleteCategory = (categoryId: string) => {
    if (!game || !confirm('Delete this category?')) return;
    const updatedGame = {
      ...game,
      categories: game.categories.filter((c) => c.id !== categoryId),
    };
    saveGame(updatedGame);
  };

  const updateQuestion = (
    categoryId: string,
    questionIndex: number,
    updates: Partial<Question>
  ) => {
    if (!game) return;
    const updatedGame = {
      ...game,
      categories: game.categories.map((c) =>
        c.id === categoryId
          ? {
              ...c,
              questions: c.questions.map((q, i) =>
                i === questionIndex ? { ...q, ...updates } : q
              ),
            }
          : c
      ),
    };
    saveGame(updatedGame);
  };

  const startGame = async () => {
    if (!game) return;
    const updatedGame = { ...game, phase: 'playing' as const };
    await saveGame(updatedGame);
  };

  const resetGame = async () => {
    if (!game || !confirm('Reset the game? All progress will be lost.')) return;
    const updatedGame: Game = {
      ...game,
      phase: 'lobby',
      players: game.players.map((p) => ({ ...p, score: 0 })),
      categories: game.categories.map((c) => ({
        ...c,
        questions: c.questions.map((q) => ({ ...q, answered: false })),
      })),
      currentQuestion: null,
      currentCategory: null,
      buzzerQueue: [],
    };
    await saveGame(updatedGame);
  };

  const removePlayer = (playerId: string) => {
    if (!game) return;
    const updatedGame = {
      ...game,
      players: game.players.filter((p) => p.id !== playerId),
    };
    saveGame(updatedGame);
  };

  const adjustScore = (playerId: string, adjustment: number) => {
    if (!game) return;
    const updatedGame = {
      ...game,
      players: game.players.map((p) =>
        p.id === playerId ? { ...p, score: p.score + adjustment } : p
      ),
    };
    saveGame(updatedGame);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Game not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-jeopardy-gold">{game.name}</h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-2xl font-mono bg-gray-800 px-4 py-2 rounded">
                Code: {game.accessCode}
              </span>
              <span className={`px-3 py-1 rounded ${
                game.phase === 'playing' ? 'bg-green-600' :
                game.phase === 'lobby' ? 'bg-yellow-600' :
                'bg-gray-600'
              }`}>
                {game.phase.toUpperCase()}
              </span>
              {saving && <span className="text-yellow-400">Saving...</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              ← Back
            </button>
            <button
              onClick={() => window.open(`/game/${game.id}`, '_blank')}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
            >
              Open Display
            </button>
            {game.phase === 'lobby' && (
              <button
                onClick={startGame}
                className="px-4 py-2 bg-jeopardy-blue hover:bg-blue-700 rounded font-bold"
              >
                Start Game
              </button>
            )}
            <button
              onClick={resetGame}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content - Categories & Questions */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Categories & Questions</h2>
                <button
                  onClick={addCategory}
                  disabled={game.categories.length >= 6}
                  className="px-4 py-2 bg-jeopardy-gold text-black font-bold rounded hover:bg-yellow-500 disabled:opacity-50"
                >
                  + Add Category
                </button>
              </div>

              {game.categories.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No categories yet. Add your first category to get started!
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="grid gap-2" style={{
                    gridTemplateColumns: `repeat(${game.categories.length}, minmax(200px, 1fr))`
                  }}>
                    {game.categories.map((category) => (
                      <div key={category.id} className="min-w-[200px]">
                        <div className="bg-jeopardy-blue p-2 rounded-t flex items-center gap-2">
                          <input
                            type="text"
                            value={category.name}
                            onChange={(e) => updateCategory(category.id, e.target.value)}
                            className="flex-1 bg-transparent text-center font-bold text-sm focus:outline-none focus:bg-blue-800 rounded px-1"
                          />
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                        {category.questions.map((question, qIndex) => (
                          <div
                            key={question.id}
                            onClick={() => setEditingQuestion({
                              categoryId: category.id,
                              questionIndex: qIndex,
                              question
                            })}
                            className={`p-3 border-b border-gray-700 cursor-pointer transition-colors ${
                              question.answered
                                ? 'bg-gray-700 opacity-50'
                                : question.question
                                  ? 'bg-gray-700 hover:bg-gray-600'
                                  : 'bg-gray-800 hover:bg-gray-700'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-jeopardy-gold font-bold">
                                ${question.points}
                              </span>
                              {question.dailyDouble && (
                                <span className="text-xs bg-yellow-600 px-1 rounded">DD</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400 truncate mt-1">
                              {question.question || 'Click to edit...'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Players */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-4 sticky top-4">
              <h2 className="text-xl font-bold mb-4">Players ({game.players.length})</h2>
              {game.players.length === 0 ? (
                <p className="text-gray-400 text-sm">
                  No players yet. Share the code: <strong>{game.accessCode}</strong>
                </p>
              ) : (
                <div className="space-y-2">
                  {game.players.sort((a, b) => b.score - a.score).map((player, index) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded ${
                        player.connected ? 'bg-gray-700' : 'bg-gray-700 opacity-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-gray-400 mr-2">#{index + 1}</span>
                          <span className="font-bold">{player.name}</span>
                          {!player.connected && (
                            <span className="text-xs text-red-400 ml-2">(disconnected)</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className={`text-lg font-bold ${
                          player.score >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${player.score.toLocaleString()}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => adjustScore(player.id, -100)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                          >
                            -100
                          </button>
                          <button
                            onClick={() => adjustScore(player.id, 100)}
                            className="px-2 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                          >
                            +100
                          </button>
                          <button
                            onClick={() => removePlayer(player.id)}
                            className="px-2 py-1 bg-gray-600 hover:bg-gray-500 rounded text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Edit Modal */}
      {editingQuestion && (
        <QuestionEditModal
          question={editingQuestion.question}
          onSave={(updates) => {
            updateQuestion(
              editingQuestion.categoryId,
              editingQuestion.questionIndex,
              updates
            );
            setEditingQuestion(null);
          }}
          onClose={() => setEditingQuestion(null)}
        />
      )}
    </div>
  );
}

function QuestionEditModal({
  question,
  onSave,
  onClose,
}: {
  question: Question;
  onSave: (updates: Partial<Question>) => void;
  onClose: () => void;
}) {
  const [questionText, setQuestionText] = useState(question.question);
  const [answer, setAnswer] = useState(question.answer);
  const [dailyDouble, setDailyDouble] = useState(question.dailyDouble || false);
  const [media, setMedia] = useState<MediaAttachment | undefined>(question.media);
  const [answerMedia, setAnswerMedia] = useState<MediaAttachment | undefined>(question.answerMedia);
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (
    file: File,
    type: 'question' | 'answer'
  ) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        if (type === 'question') {
          setMedia(data.media);
        } else {
          setAnswerMedia(data.media);
        }
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch (error) {
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (type: 'question' | 'answer') => {
    if (type === 'question') {
      setMedia(undefined);
    } else {
      setAnswerMedia(undefined);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl my-8">
        <h3 className="text-xl font-bold mb-4 text-jeopardy-gold">
          Edit ${question.points} Question
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Question (Clue)</label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-jeopardy-gold h-24"
              placeholder="Enter the question/clue..."
            />
          </div>

          {/* Question Media Upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Question Media (Image/Audio/Video)</label>
            {media ? (
              <div className="bg-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{media.filename}</span>
                  <button
                    onClick={() => removeMedia('question')}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
                {media.type === 'image' && (
                  <img src={media.url} alt="Question media" className="max-h-32 rounded" />
                )}
                {media.type === 'audio' && (
                  <audio src={media.url} controls className="w-full" />
                )}
                {media.type === 'video' && (
                  <video src={media.url} controls className="max-h-32 rounded" />
                )}
              </div>
            ) : (
              <input
                type="file"
                accept="image/*,audio/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'question');
                }}
                disabled={uploading}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
              />
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Answer</label>
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 focus:outline-none focus:border-jeopardy-gold"
              placeholder="What is...?"
            />
          </div>

          {/* Answer Media Upload */}
          <div>
            <label className="block text-sm text-gray-400 mb-1">Answer Media (Optional)</label>
            {answerMedia ? (
              <div className="bg-gray-700 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">{answerMedia.filename}</span>
                  <button
                    onClick={() => removeMedia('answer')}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
                {answerMedia.type === 'image' && (
                  <img src={answerMedia.url} alt="Answer media" className="max-h-32 rounded" />
                )}
                {answerMedia.type === 'audio' && (
                  <audio src={answerMedia.url} controls className="w-full" />
                )}
                {answerMedia.type === 'video' && (
                  <video src={answerMedia.url} controls className="max-h-32 rounded" />
                )}
              </div>
            ) : (
              <input
                type="file"
                accept="image/*,audio/*,video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'answer');
                }}
                disabled={uploading}
                className="w-full px-3 py-2 bg-gray-700 rounded border border-gray-600 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-600 file:text-white hover:file:bg-gray-500"
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dailyDouble"
              checked={dailyDouble}
              onChange={(e) => setDailyDouble(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="dailyDouble" className="text-sm">Daily Double</label>
          </div>
        </div>

        {uploading && (
          <div className="mt-4 text-center text-yellow-400">Uploading...</div>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => onSave({ question: questionText, answer, dailyDouble, media, answerMedia })}
            disabled={uploading}
            className="flex-1 py-2 bg-jeopardy-blue hover:bg-blue-700 rounded font-bold disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
