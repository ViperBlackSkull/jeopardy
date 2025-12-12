'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || !playerName.trim()) {
      setError('Please enter both access code and your name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/games/join?code=${accessCode.toUpperCase()}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to join game');
        setLoading(false);
        return;
      }

      // Store player name and navigate to play screen
      localStorage.setItem('playerName', playerName.trim());
      router.push(`/play/${data.gameId}`);
    } catch (err) {
      setError('Failed to connect to server');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-jeopardy-gold mb-4">JEOPARDY!</h1>
        <p className="text-xl text-gray-300">The Ultimate Quiz Game</p>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-center">Join a Game</h2>

          <form onSubmit={handleJoinGame} className="space-y-4">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-300 mb-2">
                Access Code
              </label>
              <input
                type="text"
                id="accessCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-digit code"
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white text-center text-2xl tracking-widest uppercase focus:outline-none focus:border-jeopardy-gold"
                maxLength={6}
              />
            </div>

            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="playerName"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-jeopardy-gold"
                maxLength={20}
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-jeopardy-blue hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Game'}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <a
            href="/admin"
            className="text-jeopardy-gold hover:underline"
          >
            Host a Game (Admin Panel)
          </a>
        </div>
      </div>
    </main>
  );
}
