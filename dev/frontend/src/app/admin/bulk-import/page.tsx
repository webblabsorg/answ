'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, XCircle, FileJson } from 'lucide-react';

export default function BulkImportPage() {
  const [jsonData, setJsonData] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const exampleData = {
    questions: [
      {
        exam_code: 'GRE',
        question_text: 'What is the capital of France?',
        question_type: 'MULTIPLE_CHOICE',
        options: [
          { id: 'A', text: 'London', correct: false },
          { id: 'B', text: 'Paris', correct: true },
          { id: 'C', text: 'Berlin', correct: false },
          { id: 'D', text: 'Madrid', correct: false },
        ],
        correct_answer: { answer: 'B' },
        topic: 'Geography',
        difficulty_level: 2,
        explanation: 'Paris is the capital and largest city of France.',
      },
    ],
  };

  const handleImport = async () => {
    try {
      setImporting(true);
      setResult(null);

      const data = JSON.parse(jsonData);
      const response = await apiClient.post('/admin/questions/bulk-import', data);
      setResult(response.data);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Invalid JSON format');
    } finally {
      setImporting(false);
    }
  };

  const loadExample = () => {
    setJsonData(JSON.stringify(exampleData, null, 2));
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bulk Import Questions</h1>
        <p className="mt-2 text-gray-600">
          Import multiple questions at once using JSON format
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>JSON Data</span>
              <Button variant="outline" size="sm" onClick={loadExample}>
                <FileJson className="w-4 h-4 mr-2" />
                Load Example
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Paste your JSON data here..."
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              className="min-h-[400px] font-mono text-sm"
            />
            <Button
              onClick={handleImport}
              disabled={!jsonData || importing}
              className="mt-4 w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {importing ? 'Importing...' : 'Import Questions'}
            </Button>
          </CardContent>
        </Card>

        {/* Instructions & Results */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">Required fields:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>exam_code (e.g., "GRE", "SAT", "GMAT")</li>
                <li>question_text</li>
                <li>question_type (MULTIPLE_CHOICE, MULTIPLE_SELECT, etc.)</li>
                <li>correct_answer</li>
                <li>topic</li>
              </ul>
              <p className="font-medium mt-4">Optional fields:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>options (for choice questions)</li>
                <li>difficulty_level (1-5, default: 3)</li>
                <li>explanation</li>
                <li>subtopic</li>
              </ul>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="font-medium">Total:</span>
                    <span>{result.total}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                    <span className="font-medium text-green-700">
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Success:
                    </span>
                    <span className="text-green-700 font-bold">{result.success}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded">
                    <span className="font-medium text-red-700">
                      <XCircle className="w-4 h-4 inline mr-2" />
                      Failed:
                    </span>
                    <span className="text-red-700 font-bold">{result.failed}</span>
                  </div>
                  {result.errors && result.errors.length > 0 && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        <p className="font-medium mb-2">Errors:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {result.errors.slice(0, 5).map((err: any, idx: number) => (
                            <li key={idx}>
                              Row {err.index + 1}: {err.error}
                            </li>
                          ))}
                          {result.errors.length > 5 && (
                            <li>... and {result.errors.length - 5} more</li>
                          )}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
