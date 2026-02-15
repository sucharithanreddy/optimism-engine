'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { ChatMessage, Message } from '@/components/ChatMessage';
import { ThoughtInput } from '@/components/ThoughtInput';
import { IcebergLayer } from '@/components/IcebergVisualization';
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

export default function WidgetPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [currentLayer, setCurrentLayer] = useState<IcebergLayer>('surface');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for parent messages (for embed control)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'CLOSE_WIDGET') {
        window.parent?.postMessage({ type: 'WIDGET_CLOSED' }, '*');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleSubmit = async (thought: string) => {
    if (!sessionStarted) {
      setSessionStarted(true);
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

      // Extract previous questions to prevent repetition
      const previousQuestions = messages
        .filter(m => m.role === 'assistant' && m.probingQuestion)
        .map(m => m.probingQuestion)
        .filter(Boolean) as string[];

      const sessionContext = {
        previousQuestions,
        sessionCount: 1,
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

      const data: ReframeResponse = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.acknowledgment,
        distortionType: data.distortionType,
        distortionExplanation: data.distortionExplanation,
        reframe: data.reframe,
        probingQuestion: data.probingQuestion,
        encouragement: data.encouragement,
        icebergLayer: data.icebergLayer,
        layerInsight: data.layerInsight,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentLayer(data.icebergLayer);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm having trouble connecting. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    setMessages([]);
    setSessionStarted(false);
    setCurrentLayer('surface');
  };

  const handleClose = () => {
    window.parent?.postMessage({ type: 'CLOSE_WIDGET' }, '*');
  };

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-sky-50 via-blue-50 to-teal-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white/90 backdrop-blur-lg border-b border-blue-100 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">Optimism Engine</h1>
              <p className="text-[10px] text-gray-500">Transform your thoughts</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {sessionStarted && messages.length > 0 && (
              <button
                onClick={handleNewSession}
                className="text-xs text-blue-600 hover:text-blue-700 mr-2"
              >
                New Session
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!sessionStarted ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-teal-500 to-sky-400 flex items-center justify-center shadow-xl mb-4"
            >
              <Sparkles className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-xl font-bold mb-2">
              <span className="bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                Hack Your Thought
              </span>
            </h2>
            <p className="text-gray-500 text-sm max-w-[200px]">
              Share a negative thought and let&apos;s transform it together.
            </p>
          </div>
        ) : (
          <>
            <AnimatePresence>
              {messages.map((message, index) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  isLatest={index === messages.length - 1}
                />
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 pl-2"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-blue-400"
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 border-t border-blue-100 bg-white/80 backdrop-blur-lg">
        <ThoughtInput
          onSubmit={handleSubmit}
          isLoading={isLoading}
          placeholder={
            messages.length === 0
              ? "What's troubling you?"
              : 'Continue...'
          }
        />
      </div>

      {/* Layer Progress */}
      {sessionStarted && messages.length > 0 && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="flex items-center gap-1 justify-center">
            {['surface', 'trigger', 'emotion', 'coreBelief'].map((layer, i) => (
              <div
                key={layer}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  currentLayer === layer ||
                  i < ['surface', 'trigger', 'emotion', 'coreBelief'].indexOf(currentLayer)
                    ? 'bg-gradient-to-r from-blue-500 to-teal-500 w-8'
                    : 'bg-gray-200 w-4'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
