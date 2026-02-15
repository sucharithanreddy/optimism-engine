'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  MessageSquare,
  Brain,
  TrendingUp,
  Lock,
  LogOut,
  Eye,
  ChevronDown,
  ChevronUp,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: string;
  sessions: Session[];
  _count?: { sessions: number };
}

interface Session {
  id: string;
  title: string | null;
  summary: string | null;
  coreBelief: string | null;
  currentLayer: string;
  distortions: string | null;
  isCompleted: boolean;
  createdAt: string;
  messages: Message[];
  _count?: { messages: number };
}

interface Message {
  id: string;
  role: string;
  content: string;
  distortionType: string | null;
  reframe: string | null;
  createdAt: string;
}

interface Stats {
  totalUsers: number;
  totalSessions: number;
  totalMessages: number;
  completedSessions: number;
  commonDistortions: { type: string; count: number }[];
  layerDistribution: { layer: string; count: number; percentage: number }[];
  coreBeliefsDiscovered: number;
  averageSessionDepth: number;
  recentCoreBeliefs: string[];
}

export default function DashboardPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/dashboard/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setIsAuthenticated(true);
        fetchData();
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/dashboard/data');
      const data = await res.json();
      setUsers(data.users || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
    setUsers([]);
    setStats(null);
    setSelectedUser(null);
    setSelectedSession(null);
  };

  const toggleUserExpand = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const viewSession = async (user: User, sessionId: string) => {
    const session = user.sessions.find((s) => s.id === sessionId);
    if (session) {
      setSelectedUser(user);
      setSelectedSession(session);
    }
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl border border-blue-100 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Therapist Dashboard
              </h1>
              <p className="text-gray-500 text-sm">
                Enter password to access client insights
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Dashboard password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition"
              />
              {error && (
                <p className="text-red-500 text-sm text-center">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading || !password}
                className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
              >
                {loading ? 'Authenticating...' : 'Access Dashboard'}
              </Button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  // Session detail view
  if (selectedSession && selectedUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50">
        <header className="bg-white/80 backdrop-blur-lg border-b border-blue-100 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  Session Details
                </h1>
                <p className="text-xs text-gray-500">
                  {selectedUser.name || selectedUser.email}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => {
                setSelectedSession(null);
                setSelectedUser(null);
              }}
            >
              ← Back to Dashboard
            </Button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {selectedSession.title || 'Untitled Session'}
            </h2>
            <div className="flex gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(selectedSession.createdAt).toLocaleDateString()}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                {selectedSession.currentLayer}
              </span>
              {selectedSession.isCompleted && (
                <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">
                  Completed
                </span>
              )}
            </div>
            {selectedSession.coreBelief && (
              <div className="bg-teal-50 rounded-xl p-4 mb-4">
                <p className="text-sm font-medium text-teal-700 mb-1">
                  Core Belief Discovered:
                </p>
                <p className="text-gray-700">{selectedSession.coreBelief}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {selectedSession.messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  'rounded-2xl p-4',
                  message.role === 'user'
                    ? 'bg-blue-100 ml-8'
                    : 'bg-white border border-blue-100 mr-8'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full',
                      message.role === 'user'
                        ? 'bg-blue-200 text-blue-700'
                        : 'bg-teal-100 text-teal-700'
                    )}
                  >
                    {message.role === 'user' ? 'Client' : 'AI'}
                  </span>
                  {message.distortionType && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      {message.distortionType}
                    </span>
                  )}
                </div>
                <p className="text-gray-700">{message.content}</p>
                {message.reframe && (
                  <div className="mt-3 bg-teal-50 rounded-xl p-3 border border-teal-100">
                    <p className="text-xs font-medium text-teal-700 mb-1">
                      Reframe:
                    </p>
                    <p className="text-gray-700 text-sm">{message.reframe}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50">
      <header className="bg-white/80 backdrop-blur-lg border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">
                Therapist Dashboard
              </h1>
              <p className="text-xs text-gray-500">Client insights & progress</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-4">
              <div className="flex items-center gap-2 text-blue-500 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm font-medium">Total Clients</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {stats.totalUsers}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-4">
              <div className="flex items-center gap-2 text-teal-500 mb-2">
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm font-medium">Sessions</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {stats.totalSessions}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-4">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <Brain className="w-5 h-5" />
                <span className="text-sm font-medium">Completed</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {stats.completedSessions}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-4">
              <div className="flex items-center gap-2 text-sky-500 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Messages</span>
              </div>
              <p className="text-3xl font-bold text-gray-800">
                {stats.totalMessages}
              </p>
            </div>
          </div>
        )}

        {/* Common Distortions */}
        {stats?.commonDistortions && stats.commonDistortions.length > 0 && (
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Common Cognitive Distortions
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.commonDistortions.map((d, i) => (
                <span
                  key={i}
                  className="px-3 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm"
                >
                  {d.type} ({d.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Iceberg Layer Distribution & Core Beliefs */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Layer Distribution */}
          {stats?.layerDistribution && (
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">
                  Client Session Depth
                </h2>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Avg Depth</p>
                  <p className="text-lg font-bold text-violet-600">
                    {((stats.averageSessionDepth || 0) * 33.3).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {stats.layerDistribution.map((layer, index) => {
                  const layerColors = ['bg-sky-400', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500'];
                  const layerLabels = ['Surface', 'Trigger', 'Emotion', 'Core Belief'];
                  return (
                    <div key={layer.layer} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${layerColors[index]}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-700">{layerLabels[index]}</span>
                          <span className="text-sm text-gray-500">{layer.count} ({layer.percentage}%)</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${layerColors[index]} rounded-full`}
                            style={{ width: `${layer.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Core Beliefs Discovered */}
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl border border-violet-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Core Beliefs Discovered
              </h2>
              <span className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-sm font-medium">
                {stats?.coreBeliefsDiscovered || 0} total
              </span>
            </div>
            {stats?.recentCoreBeliefs && stats.recentCoreBeliefs.length > 0 ? (
              <div className="space-y-2">
                {stats.recentCoreBeliefs.map((belief, index) => (
                  <div key={index} className="bg-white/60 rounded-xl p-3">
                    <p className="text-sm text-gray-700 line-clamp-2">{belief}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No core beliefs discovered yet</p>
            )}
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 overflow-hidden">
          <div className="p-4 border-b border-blue-100">
            <h2 className="text-lg font-semibold text-gray-800">Clients</h2>
          </div>
          <div className="divide-y divide-blue-100">
            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No clients yet. They will appear here once they sign up.
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="p-4">
                  <button
                    onClick={() => toggleUserExpand(user.id)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-teal-400 flex items-center justify-center text-white font-medium">
                        {(user.name?.[0] || user.email[0]).toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-800">
                          {user.name || 'Anonymous'}
                        </p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">
                        {user.sessions.length} sessions
                      </span>
                      {expandedUsers.has(user.id) ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {expandedUsers.has(user.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-4 ml-13 pl-12 space-y-2"
                    >
                      {user.sessions.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">
                          No sessions yet
                        </p>
                      ) : (
                        user.sessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                {session.title || 'Untitled Session'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(session.createdAt).toLocaleDateString()}{' '}
                                • {session.messages?.length || 0} messages
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => viewSession(user, session.id)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
