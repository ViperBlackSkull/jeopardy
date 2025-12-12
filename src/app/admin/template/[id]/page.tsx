'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GameTemplate, Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const POINT_VALUES = [100, 200, 300, 400, 500];

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === 'new';
  const [template, setTemplate] = useState<GameTemplate | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (isNew) {
      setTemplate({
        id: uuidv4(),
        name: 'New Template',
        categories: [],
        createdAt: new Date().toISOString(),
      });
      setName('New Template');
    } else {
      loadTemplate();
    }
  }, [isNew, params.id]);

  const loadTemplate = async () => {
    try {
      const response = await fetch(`/api/templates/${params.id}`);
      if (!response.ok) throw new Error('Template not found');
      const data = await response.json();
      setTemplate(data);
      setName(data.name);
    } catch (error) {
      console.error('Failed to load template:', error);
      router.push('/admin');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const updatedTemplate = { ...template, name };
      await fetch(`/api/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedTemplate),
      });
      if (isNew) {
        router.push('/admin');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  const addCategory = () => {
    if (!template) return;
    const newCategory: Omit<Category, 'id'> & { id?: string } = {
      name: 'New Category',
      questions: POINT_VALUES.map((points) => ({
        id: uuidv4(),
        question: '',
        answer: '',
        points,
        answered: false,
      })),
    };
    setTemplate({
      ...template,
      categories: [...template.categories, newCategory as any],
    });
  };

  const updateCategory = (index: number, updates: Partial<Category>) => {
    if (!template) return;
    setTemplate({
      ...template,
      categories: template.categories.map((c, i) =>
        i === index ? { ...c, ...updates } : c
      ),
    });
  };

  const deleteCategory = (index: number) => {
    if (!template || !confirm('Delete this category?')) return;
    setTemplate({
      ...template,
      categories: template.categories.filter((_, i) => i !== index),
    });
  };

  const updateQuestion = (
    categoryIndex: number,
    questionIndex: number,
    updates: Partial<any>
  ) => {
    if (!template) return;
    setTemplate({
      ...template,
      categories: template.categories.map((c, i) =>
        i === categoryIndex
          ? {
              ...c,
              questions: c.questions.map((q: any, qi: number) =>
                qi === questionIndex ? { ...q, ...updates } : q
              ),
            }
          : c
      ),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Template not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-3xl font-bold text-jeopardy-gold bg-transparent focus:outline-none focus:bg-gray-800 rounded px-2"
              placeholder="Template Name"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
            >
              ← Back
            </button>
            <button
              onClick={saveTemplate}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold"
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Categories</h2>
            <button
              onClick={addCategory}
              disabled={template.categories.length >= 6}
              className="px-4 py-2 bg-jeopardy-gold text-black font-bold rounded hover:bg-yellow-500 disabled:opacity-50"
            >
              + Add Category
            </button>
          </div>

          {template.categories.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No categories yet. Add your first category!
            </p>
          ) : (
            <div className="space-y-4">
              {template.categories.map((category, catIndex) => (
                <div key={catIndex} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) =>
                        updateCategory(catIndex, { name: e.target.value })
                      }
                      className="flex-1 text-lg font-bold bg-transparent border-b border-gray-500 focus:outline-none focus:border-jeopardy-gold px-1"
                      placeholder="Category Name"
                    />
                    <button
                      onClick={() => deleteCategory(catIndex)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="grid md:grid-cols-5 gap-3">
                    {category.questions.map((question: any, qIndex: number) => (
                      <div key={qIndex} className="bg-gray-800 rounded p-3">
                        <div className="text-jeopardy-gold font-bold mb-2">
                          ${question.points}
                        </div>
                        <textarea
                          value={question.question}
                          onChange={(e) =>
                            updateQuestion(catIndex, qIndex, {
                              question: e.target.value,
                            })
                          }
                          className="w-full bg-gray-700 rounded p-2 text-sm h-16 focus:outline-none focus:ring-1 focus:ring-jeopardy-gold"
                          placeholder="Question..."
                        />
                        <input
                          type="text"
                          value={question.answer}
                          onChange={(e) =>
                            updateQuestion(catIndex, qIndex, {
                              answer: e.target.value,
                            })
                          }
                          className="w-full mt-2 bg-gray-700 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-jeopardy-gold"
                          placeholder="Answer..."
                        />
                      </div>
                    ))}
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
