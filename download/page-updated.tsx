'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  History,
  TrendingUp,
  Download,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { ChatMessage, Message } from '@/components/ChatMessage';
import { IcebergVisualization, IcebergLayer } from '@/components/IcebergVisualization';
import { ThoughtInput } from '@/components/ThoughtInput';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ReframeResponse {
  acknowledgment: string;
  distortionType: string;
  distortionExplanation: string;
  reframe: string;
  probingQuestion: string;
  encouragement: string;
  icebergLayer: IcebergLayer;
  layerInsight: string;
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

export default function Home() {
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
  const [showIceberg, setShowIceberg] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
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

      const response = await fetch('/api/reframe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: thought,
          conversationHistory,
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
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-100 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: '4s' }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-blue-100">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  The Optimism Engine
                </h1>
                <p className="text-xs text-gray-500">Transform negative thoughts into power</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Audio Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoPlay(!autoPlay)}
                className={cn(
                  "text-gray-500 hover:text-gray-700",
                  autoPlay && "text-blue-600 hover:text-blue-700"
                )}
                title={autoPlay ? "Auto-play ON" : "Auto-play OFF"}
              >
                {autoPlay ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </Button>
              {isSignedIn ? (
                <>
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
                      New Session
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
                  <SignUpButton mode="modal">
                    <Button size="sm" className="bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600">
                      Sign Up
                    </Button>
                  </SignUpButton>
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
                  <button
                    key={session.id}
                    onClick={() => loadSession(session.id)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border transition-all',
                      currentSessionId === session.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    )}
                  >
                    <p className="text-sm font-medium text-gray-800 truncate">
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
                  </button>
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
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 via-teal-500 to-sky-400 flex items-center justify-center shadow-2xl mb-8"
                >
                  <Sparkles className="w-12 h-12 text-white" />
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
                  <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-sky-500 bg-clip-text text-transparent">
                    Hack Your Thoughts
                  </span>
                </h2>

                <p className="text-gray-600 text-center max-w-md mb-8 text-lg">
                  Share a negative thought that&apos;s been weighing on you. Let&apos;s transform it together
                  into something empowering.
                </p>

                {!isSignedIn && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md">
                    <p className="text-sm text-blue-700">
                      <strong>Sign in</strong> to save your sessions and track your progress over time!
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="flex -space-x-2">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-gradient-to-br border-2 border-white"
                        style={{
                          backgroundImage: `linear-gradient(135deg, ${
                            ['from-blue-400 to-teal-400', 'from-sky-400 to-blue-400', 'from-teal-400 to-emerald-400', 'from-cyan-400 to-sky-400'][i]
                          })`,
                        }}
                      />
                    ))}
                  </div>
                  <span>Join thousands finding their inner optimist</span>
                </div>
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
                      autoPlay={autoPlay}
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white animate-pulse" />
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

            {/* Session Summary */}
            <AnimatePresence>
              {showSummary && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="mt-6 bg-gradient-to-br from-blue-100 to-teal-100 rounded-2xl p-6 border border-blue-200"
                >
                  <h3 className="text-lg font-bold text-blue-800 mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Your Journey Summary
                  </h3>

                  <div className="space-y-4">
                    {discoveredInsights.coreBelief && (
                      <div>
                        <p className="text-xs font-semibold text-gray-600 mb-1">Core Belief Discovered</p>
                        <p className="text-sm text-blue-700 font-medium bg-blue-50 rounded-lg p-3 border border-blue-200">
                          {discoveredInsights.coreBelief}
                        </p>
                      </div>
                    )}

                    <div className="pt-3 border-t border-blue-200">
                      <Button
                        onClick={handleReset}
                        className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600"
                      >
                        Start a New Journey
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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

          {/* Iceberg Visualization - Mobile */}
          {sessionStarted && (
            <div className="lg:hidden fixed bottom-24 left-4 right-4 z-40">
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl border border-blue-100 shadow-xl overflow-hidden">
                <button
                  onClick={() => setShowIceberg(!showIceberg)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left border-b border-blue-100"
                >
                  <span className="text-sm font-semibold text-gray-700">Your Journey</span>
                  {showIceberg ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                <AnimatePresence>
                  {showIceberg && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 max-h-64 overflow-y-auto">
                        <IcebergVisualization
                          currentLayer={currentLayer}
                          discoveredInsights={discoveredInsights}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white/80 to-transparent h-16 pointer-events-none" />
    </div>
  );
}
