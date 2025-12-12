'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Game, GameTemplate } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [templates, setTemplates] = useState<GameTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [gamesRes, templatesRes] = await Promise.all([
        fetch('/api/games'),
        fetch('/api/templates'),
      ]);
      const gamesData = await gamesRes.json();
      const templatesData = await templatesRes.json();
      setGames(gamesData);
      setTemplates(templatesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createGame = async (name: string, templateId?: string) => {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, templateId }),
      });
      const game = await response.json();
      router.push(`/admin/game/${game.id}`);
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  const deleteGame = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    try {
      await fetch(`/api/games/${id}`, { method: 'DELETE' });
      setGames(games.filter(g => g.id !== id));
    } catch (error) {
      console.error('Failed to delete game:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-jeopardy-gold">Admin Panel</h1>
          <div className="space-x-4">
            <a href="/" className="text-gray-400 hover:text-white">
              ← Back to Home
            </a>
          </div>
        </div>

        {/* Create New Game */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Create New Game</h2>
          <CreateGameForm templates={templates} onSubmit={createGame} />
        </div>

        {/* Active Games */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Games</h2>
          {games.length === 0 ? (
            <p className="text-gray-400">No games created yet. Create your first game above!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className="bg-gray-700 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-bold">{game.name}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      game.phase === 'playing' ? 'bg-green-600' :
                      game.phase === 'lobby' ? 'bg-yellow-600' :
                      'bg-gray-600'
                    }`}>
                      {game.phase}
                    </span>
                  </div>
                  <div className="text-2xl font-mono text-jeopardy-gold mb-2">
                    {game.accessCode}
                  </div>
                  <div className="text-sm text-gray-400 mb-4">
                    {game.players.length} players • {game.categories.length} categories
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/admin/game/${game.id}`)}
                      className="flex-1 px-3 py-2 bg-jeopardy-blue hover:bg-blue-700 rounded transition-colors"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => router.push(`/game/${game.id}`)}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
                    >
                      Display
                    </button>
                    <button
                      onClick={() => deleteGame(game.id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Templates</h2>
            <button
              onClick={() => router.push('/admin/template/new')}
              className="px-4 py-2 bg-jeopardy-gold text-black font-bold rounded hover:bg-yellow-500 transition-colors"
            >
              Create Template
            </button>
          </div>
          {templates.length === 0 ? (
            <p className="text-gray-400">No templates yet. Create a template to reuse categories!</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-600 transition-colors"
                  onClick={() => router.push(`/admin/template/${template.id}`)}
                >
                  <h3 className="text-lg font-bold mb-2">{template.name}</h3>
                  <div className="text-sm text-gray-400">
                    {template.categories.length} categories
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateGameForm({
  templates,
  onSubmit,
}: {
  templates: GameTemplate[];
  onSubmit: (name: string, templateId?: string) => void;
}) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit(name.trim(), templateId || undefined);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Game name"
        className="flex-1 min-w-[200px] px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-jeopardy-gold"
      />
      <select
        value={templateId}
        onChange={(e) => setTemplateId(e.target.value)}
        className="px-4 py-2 rounded bg-gray-700 border border-gray-600 focus:outline-none focus:border-jeopardy-gold"
      >
        <option value="">Start from scratch</option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="px-6 py-2 bg-green-600 hover:bg-green-700 font-bold rounded transition-colors"
      >
        Create Game
      </button>
    </form>
  );
}
