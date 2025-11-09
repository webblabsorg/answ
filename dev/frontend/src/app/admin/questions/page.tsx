'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  topic: string;
  difficulty_level: number;
  exam: { name: string; code: string };
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await apiClient.get('/questions', {
        params: { limit: 100 },
      });
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await apiClient.delete(`/questions/${id}`);
      loadQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
      alert('Failed to delete question');
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Questions</h1>
          <p className="mt-2 text-gray-600">Manage exam questions</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/bulk-import">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Bulk Import
            </Button>
          </Link>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Question
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading questions...</div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No questions found</div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-indigo-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge>{question.exam.code}</Badge>
                        <Badge variant="outline">{question.question_type}</Badge>
                        <Badge variant="outline">Level {question.difficulty_level}</Badge>
                      </div>
                      <p className="text-gray-900 mb-1 line-clamp-2">
                        {question.question_text}
                      </p>
                      <p className="text-sm text-gray-500">Topic: {question.topic}</p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(question.id)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
