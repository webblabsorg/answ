'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, User, FileText } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: any;
  created_at: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const response = await apiClient.get('/audit-logs', {
        params: { take: 100 },
      });
      setLogs(response.data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE')) return 'bg-red-100 text-red-800';
    if (action.includes('SUSPEND')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-2 text-gray-600">Track all admin actions and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity ({logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No logs found</div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getActionColor(log.action)}>
                        {log.action.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline">{log.entity_type}</Badge>
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{log.user.name}</span>
                    <span className="text-gray-500">({log.user.role})</span>
                  </div>

                  {log.changes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                      <div className="flex items-start gap-2">
                        <FileText className="w-3 h-3 mt-0.5 text-gray-400" />
                        <pre className="text-gray-600 overflow-x-auto">
                          {JSON.stringify(log.changes, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {log.entity_id && (
                    <p className="text-xs text-gray-500 mt-2">
                      Entity ID: {log.entity_id}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
