'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  History,
  TrendingUp,
  Download,
  ArrowLeft,
  Trash2,
} from 'lucide-react';
import { SignInButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChatMessage, Message } from '@/components/ChatMessage';
import { IcebergVisualization, IcebergLayer } from '@/components/IcebergVisualization';
import { DraggableBubble } from '@/components/DraggableBubble';
import { ThoughtInput } from '@/components/ThoughtInput';
import { Button } from '@/components/ui/button';

interface ReframeResponse {
  acknowledgment: string;
  distortionType?: string;
  distortionExplanation?: string;
  reframe?: string;
  probingQuestion?: string;
  encouragement?: string;
  icebergLayer?: IcebergLayer;
  layerInsight?: string;
  progressScore?: number;
  layerProgress?: {
    surface: number;
    trigger: number;
    emotion: number;
    coreBelief: number;
  };
  progressNote?: string;
}

interface SessionData {
  id: string;
  title: string | null;
  summary: string | null;
  coreBelief: string | null;
  currentLayer: string;
  isCompleted: boolean;
  createdAt: string;
  messages: Message[];
}

export default function ReflectPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<IcebergLayer>('surface');
  const [discoveredInsights, setDiscoveredInsights] = useState<
    Record<IcebergLayer, string | null>
  >({
    surface: null,
    trigger: null,
    emotion: null,
    coreBelief: null,
  });
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [progressScore, setProgressScore] = useState(0);
  const [layerProgress, setLayerProgress] = useState({
    surface: 0,
    trigger: 0,
    emotion: 0,
    coreBelief: 0,
  });
  const [progressNote, setProgressNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isSignedIn) {
      loadSessions();
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (currentLayer === 'coreBelief' && discoveredInsights.coreBelief && currentSessionId) {
      updateSessionComplete();
    }
  }, [currentLayer, discoveredInsights.coreBelief]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const createSession = async (firstThought: string): Promise<string | null> => {
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstThought }),
      });
      const data = await res.json();
      return data.session?.id || null;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const saveMessage = async (message: Omit<Message, 'id'>) => {
    if (!currentSessionId) return;
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...message, sessionId: currentSessionId }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const updateSessionComplete = async () => {
    if (!currentSessionId) return;
    try {
      await fetch(`/api/sessions/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLayer: 'coreBelief',
          coreBelief: discoveredInsights.coreBelief,
          isCompleted: true,
        }),
      });
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const handleSubmit = async (thought: string) => {
    if (!sessionStarted) {
      setSessionStarted(true);

      if (isSignedIn) {
        setIsSaving(true);
        const sessionId = await createSession(thought);
        if (sessionId) {
          setCurrentSessionId(sessionId);
        }
        setIsSaving(false);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: thought,
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.role === 'user' ? m.content : m.reframe || m.content,
      }));

      const previousTopics = sessions
        .slice(0, 5)
        .map(s => s.title)
        .filter(Boolean) as string[];
      
      const previousDistortions = sessions
        .slice(0, 5)
        .flatMap(s => s.messages?.map(m => m.distortionType).filter(Boolean) as string[])
        .filter(Boolean);

      const previousQuestions = messages
        .filter(m => m.role === 'assistant' && m.probingQuestion)
        .map(m => m.probingQuestion)
        .filter(Boolean) as string[];

      const sessionContext = {
        previousTopics,
        previousDistortions,
        previousQuestions,
        sessionCount: sessions.length + 1,
      };

      const response = await fetch('/api/reframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: thought,
          conversationHistory,
          sessionContext,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const data: ReframeResponse = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.acknowledgment || "Thank you for sharing.",
        distortionType: data.distortionType,
        distortionExplanation: data.distortionExplanation,
        reframe: data.reframe,
        probingQuestion: data.probingQuestion,
        encouragement: data.encouragement,
        icebergLayer: data.icebergLayer,
        layerInsight: data.layerInsight,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (isSignedIn && currentSessionId) {
        await saveMessage(userMessage);
        await saveMessage(assistantMessage);
      }

      setCurrentLayer(data.icebergLayer || 'surface');
      setDiscoveredInsights((prev) => ({
        ...prev,
        [data.icebergLayer || 'surface']: data.layerInsight,
      }));
      
      if (typeof data.progressScore === 'number') {
        setProgressScore(data.progressScore);
      }
      if (data.layerProgress) {
        setLayerProgress(data.layerProgress);
      }
      if (data.progressNote) {
        setProgressNote(data.progressNote);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          `I apologize, but I encountered an issue: ${error instanceof Error ? error.message : 'Unknown error'}. Let's try again.`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setCurrentLayer('surface');
    setDiscoveredInsights({
      surface: null,
      trigger: null,
      emotion: null,
      coreBelief: null,
    });
    setProgressScore(0);
    setLayerProgress({
      surface: 0,
      trigger: 0,
      emotion: 0,
      coreBelief: 0,
    });
    setProgressNote('');
    setSessionStarted(false);
    setShowSummary(false);
    setCurrentSessionId(null);
    if (isSignedIn) {
      loadSessions();
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      const data = await res.json();
      if (data.session) {
        setMessages(data.session.messages);
        setCurrentLayer(data.session.currentLayer as IcebergLayer);
        setCurrentSessionId(sessionId);
        setSessionStarted(true);
        setShowHistory(false);

        const insights: Record<IcebergLayer, string | null> = {
          surface: null,
          trigger: null,
          emotion: null,
          coreBelief: data.session.coreBelief,
        };
        data.session.messages.forEach((msg: Message) => {
          if (msg.icebergLayer && msg.layerInsight) {
            insights[msg.icebergLayer as IcebergLayer] = msg.layerInsight;
          }
        });
        setDiscoveredInsights(insights);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this session? This cannot be undone.')) return;
    
    try {
      await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions(sessions.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleReset();
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const exportSession = () => {
    const content = messages
      .map((m) => {
        let text = `${m.role === 'user' ? 'You' : 'AI'}: ${m.content}`;
        if (m.distortionType) text += `\nDistortion: ${m.distortionType}`;
        if (m.reframe) text += `\nReframe: ${m.reframe}`;
        return text;
      })
      .join('\n\n---\n\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimism-session-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse" />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse"
          style={{ animationDelay: '2s' }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div className="w-10 h-10 relative">
                <img 
                  src="/logo.svg" 
                  alt="Optimism Engine Logo" 
                  className="w-full h-full rounded-xl shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  Reflect
                </h1>
                <p className="text-xs text-gray-500">Understand your thoughts</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSignedIn ? (
                <>
                  <Link href="/assist" className="text-sm text-teal-600 hover:text-teal-700 transition-colors mr-2">
                    Switch to Assist →
                  </Link>
                  <Link href="/progress">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <TrendingUp className="w-4 h-4 mr-1" />
                      Progress
                    </Button>
                  </Link>
                  {sessions.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <History className="w-4 h-4 mr-1" />
                      History
                    </Button>
                  )}
                  {sessionStarted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      New
                    </Button>
                  )}
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </SignInButton>
                  <SignInButton mode="modal">
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600">
                      Save Progress
                    </Button>
                  </SignInButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Session History Sidebar */}
      <AnimatePresence>
        {showHistory && isSignedIn && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="fixed left-0 top-16 bottom-0 w-80 bg-white/95 backdrop-blur-lg border-r border-blue-100 z-40 overflow-y-auto"
          >
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Session History</h2>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer relative group ${
                      currentSessionId === session.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <button
                      onClick={(e) => deleteSession(session.id, e)}
                      className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="text-sm font-medium text-gray-800 truncate pr-6">
                      {session.title || 'Untitled Session'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(session.createdAt).toLocaleDateString()} • {session.messages.length} messages
                    </p>
                    {session.coreBelief && (
                      <p className="text-xs text-blue-600 mt-1 truncate">
                        Core belief: {session.coreBelief}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Chat Section */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Welcome State */}
            {!sessionStarted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1 flex flex-col items-center justify-center py-12"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatType: 'loop',
                  }}
                  className="mb-8"
                >
                  <div className="w-24 h-24 relative">
                    <img 
                      src="/logo.svg" 
                      alt="Optimism Engine" 
                      className="w-full h-full rounded-3xl shadow-2xl"
                    />
                  </div>
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                  <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-sky-500 bg-clip-text text-transparent">
                    What&apos;s on your mind?
                  </span>
                </h2>

                <p className="text-gray-600 text-center max-w-md mb-8 text-lg">
                  Share a thought that&apos;s been weighing on you. Let&apos;s explore it together — surface, trigger, emotion, and the core belief beneath.
                </p>

                {!isSignedIn && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md">
                    <p className="text-sm text-blue-700">
                      <strong>Sign in</strong> to save your sessions and track your progress over time!
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Messages */}
            {sessionStarted && (
              <div className="flex-1 overflow-y-auto pb-4 space-y-4 max-h-[calc(100vh-300px)]">
                <AnimatePresence>
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={message.id}
                      message={message}
                      isLatest={index === messages.length - 1}
                    />
                  ))}
                </AnimatePresence>

                {/* Loading indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 pl-4"
                  >
                    <div className="w-10 h-10">
                      <img 
                        src="/logo.svg" 
                        alt="" 
                        className="w-full h-full rounded-full animate-pulse"
                      />
                    </div>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2 h-2 rounded-full bg-blue-400"
                          animate={{ y: [0, -6, 0] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Input Area */}
            <div className="mt-4">
              <ThoughtInput
                onSubmit={handleSubmit}
                isLoading={isLoading || isSaving}
                placeholder={
                  messages.length === 0
                    ? "What's on your mind? Share a thought that's been troubling you..."
                    : 'Continue your reflection...'
                }
              />
            </div>

            {/* Export Button */}
            {sessionStarted && messages.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportSession}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Export Session
                </Button>
              </div>
            )}
          </div>

          {/* Iceberg Visualization - Desktop */}
          {sessionStarted && (
            <div className="hidden lg:block w-80 flex-shrink-0">
              <div className="sticky top-24">
                <div className="bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 shadow-lg p-4">
                  <IcebergVisualization
                    currentLayer={currentLayer}
                    discoveredInsights={discoveredInsights}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Draggable Journey Bubble - Mobile */}
          {sessionStarted && (
            <DraggableBubble
              currentLayer={currentLayer}
              discoveredInsights={discoveredInsights}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white/80 to-transparent h-16 pointer-events-none" />

      {/* Disclaimer */}
      <div className="fixed bottom-2 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-gray-400">
          Not a replacement for professional help. If in crisis, call 988 (US) or your local helpline.
        </p>
      </div>
    </div>
  );
}
