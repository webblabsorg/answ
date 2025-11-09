'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, Send } from 'lucide-react';

interface EssayAttempt {
  id: string;
  user_answer: any;
  question: {
    id: string;
    question_text: string;
    topic: string;
  };
  user: {
    name: string;
    email: string;
  };
  created_at: string;
}

export default function EssayReviewPage() {
  const [essays, setEssays] = useState<EssayAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEssay, setSelectedEssay] = useState<EssayAttempt | null>(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    loadEssays();
  }, []);

  const loadEssays = async () => {
    try {
      const response = await apiClient.get('/admin/essays/unreviewed');
      setEssays(response.data);
    } catch (error) {
      console.error('Failed to load essays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    if (!selectedEssay || !score) {
      alert('Please enter a score');
      return;
    }

    try {
      setGrading(true);
      await apiClient.post(`/admin/essays/${selectedEssay.id}/grade`, {
        score: parseFloat(score),
        feedback,
      });
      
      alert('Essay graded successfully!');
      setSelectedEssay(null);
      setScore('');
      setFeedback('');
      loadEssays();
    } catch (error) {
      console.error('Failed to grade essay:', error);
      alert('Failed to grade essay');
    } finally {
      setGrading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Essay Review Queue</h1>
        <p className="mt-2 text-gray-600">
          Review and grade pending essay submissions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Essays List */}
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                <span>Pending Reviews ({essays.length})</span>
                <Button variant="outline" size="sm" onClick={loadEssays}>
                  Refresh
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading essays...</div>
            ) : essays.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No essays pending review</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {essays.map((essay) => (
                  <div
                    key={essay.id}
                    onClick={() => setSelectedEssay(essay)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedEssay?.id === essay.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-400'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge>{essay.question.topic}</Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(essay.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {essay.user.name}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {essay.question.question_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Essay Review Form */}
        <Card>
          <CardHeader>
            <CardTitle>Review Essay</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedEssay ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Select an essay to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Student Info */}
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Student</p>
                  <p className="font-medium">{selectedEssay.user.name}</p>
                  <p className="text-sm text-gray-500">{selectedEssay.user.email}</p>
                </div>

                {/* Question */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question
                  </label>
                  <p className="text-sm text-gray-900 p-3 bg-gray-50 rounded">
                    {selectedEssay.question.question_text}
                  </p>
                </div>

                {/* Essay Answer */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Student Answer
                  </label>
                  <div className="p-3 bg-gray-50 rounded max-h-48 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {typeof selectedEssay.user_answer === 'object'
                        ? selectedEssay.user_answer.text || selectedEssay.user_answer.answer
                        : selectedEssay.user_answer}
                    </p>
                  </div>
                </div>

                {/* Score Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Score (0-100)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="Enter score"
                  />
                </div>

                {/* Feedback */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback (optional)
                  </label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide detailed feedback..."
                    rows={4}
                  />
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleGrade}
                  disabled={!score || grading}
                  className="w-full"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {grading ? 'Submitting...' : 'Submit Grade'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
