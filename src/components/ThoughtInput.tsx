'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface ThoughtInputProps {
  onSubmit: (thought: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ThoughtInput({
  onSubmit,
  isLoading,
  placeholder = 'Share your thought here...',
}: ThoughtInputProps) {
  const [thought, setThought] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [thought]);

  const handleSubmit = () => {
    if (thought.trim() && !isLoading) {
      onSubmit(thought.trim());
      setThought('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      <div className="relative bg-white/80 backdrop-blur-lg rounded-2xl border border-blue-100 shadow-lg p-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className={cn(
                'min-h-[52px] max-h-[150px] resize-none border-0 bg-transparent',
                'focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
                'text-gray-700 placeholder:text-gray-400',
                'text-[15px] leading-relaxed'
              )}
              rows={1}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSubmit}
            disabled={!thought.trim() || isLoading}
            className={cn(
              'flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center',
              'bg-gradient-to-r from-blue-500 to-teal-500',
              'hover:from-blue-600 hover:to-teal-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all duration-200'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <Send className="w-5 h-5 text-white" />
            )}
          </button>
        </div>

        {/* Helper text */}
        <div className="flex items-center justify-between px-1 pt-2">
          <p className="text-xs text-gray-400">
            Press Enter to send, Shift+Enter for new line
          </p>
          {!isLoading && thought.trim() && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs text-blue-500"
            >
              <Sparkles className="w-3 h-3" />
              <span>Ready</span>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
