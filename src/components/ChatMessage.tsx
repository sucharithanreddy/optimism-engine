'use client';

import { motion } from 'framer-motion';
import { User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  distortionType?: string;
  distortionExplanation?: string;
  reframe?: string;
  probingQuestion?: string;
  encouragement?: string;
  icebergLayer?: string;
  layerInsight?: string;
}

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
}

// Map clinical terms to varied friendly language - arrays for variety
const FRIENDLY_DISTORTION_LABELS: Record<string, string[]> = {
  'Catastrophizing': ['Worst-case thinking', 'Catastrophe mode', 'Disaster mindset'],
  'All-or-Nothing Thinking': ['Black & white thinking', 'All-or-nothing mode', 'Extreme thinking'],
  'Mind Reading': ['Assuming others\' thoughts', 'Mind reading mode', 'Assuming the worst'],
  'Fortune Telling': ['Predicting the future', 'Fortune telling', 'Crystal ball thinking'],
  'Emotional Reasoning': ['Feelings as facts', 'Trusting feelings over facts', 'Emotion-based truth'],
  'Should Statements': ['Rigid expectations', 'Should-ing on yourself', 'Harsh rules'],
  'Labeling': ['Harsh self-labeling', 'Self-name calling', 'Negative labels'],
  'Personalization': ['Taking too much blame', 'Over-owning it', 'Self-blame mode'],
  'Mental Filtering': ['Focusing on negatives', 'Filtering out the good', 'Negative spotlight'],
  'Overgeneralization': ['Always/never thinking', 'Pattern projection', 'One becomes all'],
  'Rumination': ['Stuck in a loop', 'Overthinking spiral', 'Thought loop'],
  'Disqualifying the Positive': ['Discounting good things', 'Rejecting positives', 'Good doesn\'t count'],
  'Self-Criticism': ['Being hard on yourself', 'Inner critic active', 'Self-judgment mode'],
  'Exploring Patterns': ['Noticing a pattern', 'Something here', 'Worth exploring'],
  'Reacting to uncertainty': ['Processing ambiguity', 'Making sense of signals', 'Navigating uncertainty'],
};

// Friendly reframe labels that rotate
const REFRAME_LABELS = [
  'Another way to see it',
  'A gentler perspective',
  'What if...',
  'Maybe consider...',
  'A different angle',
];

// Variety of emojis for encouragement
const ENCOURAGEMENT_EMOJIS = ['✨', '💪', '🌟', '💙', '🌻', '💫', '🤝', '☀️'];

// Track used items to avoid repetition
let labelIndex = 0;
let emojiIndex = 0;

function getFriendlyLabel(distortionType: string): string {
  const labels = FRIENDLY_DISTORTION_LABELS[distortionType] || [distortionType];
  // Rotate through labels for variety
  const chosen = labels[labelIndex % labels.length];
  labelIndex++;
  return chosen;
}

function getEncouragementEmoji(): string {
  const emoji = ENCOURAGEMENT_EMOJIS[emojiIndex % ENCOURAGEMENT_EMOJIS.length];
  emojiIndex++;
  return emoji;
}

// Get a consistent reframe label based on message ID (avoids hydration mismatch)
function getReframeLabel(messageId: string): string {
  // Use the last character of the message ID to deterministically pick a label
  const lastChar = messageId.slice(-1);
  const index = parseInt(lastChar, 10) % REFRAME_LABELS.length || 0;
  return REFRAME_LABELS[index];
}

export function ChatMessage({ message, isLatest }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={cn(
        'flex w-full gap-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-4 shadow-sm',
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-teal-600 text-white rounded-br-md'
            : 'bg-white/80 backdrop-blur-sm border border-blue-100 text-gray-800 rounded-bl-md'
        )}
      >
        {isUser ? (
          <p className="text-[15px] leading-relaxed">{message.content}</p>
        ) : (
          <div className="space-y-4">
            {/* Acknowledgment */}
            <p className="text-[15px] leading-relaxed text-gray-700">
              {message.content}
            </p>

            {/* Distortion Type Badge */}
            {message.distortionType && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block"
              >
                <span className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                  {getFriendlyLabel(message.distortionType)}
                </span>
              </motion.div>
            )}

            {/* Distortion Explanation */}
            {message.distortionExplanation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-gray-600 italic pl-3 border-l-2 border-blue-200"
              >
                {message.distortionExplanation}
              </motion.div>
            )}

            {/* Reframe Section */}
            {message.reframe && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-100"
              >
                <p className="text-xs font-semibold text-teal-600 mb-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {getReframeLabel(message.id)}
                </p>
                <div className="text-[15px] text-gray-700 leading-relaxed prose prose-sm max-w-none">
                  <ReactMarkdown>
                    {message.reframe}
                  </ReactMarkdown>
                </div>
              </motion.div>
            )}

            {/* Probing Question */}
            {message.probingQuestion && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-100"
              >
                <p className="text-[15px] text-blue-700 font-medium">
                  {message.probingQuestion}
                </p>
              </motion.div>
            )}

            {/* Encouragement */}
            {message.encouragement && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-sm text-blue-600 font-medium"
              >
                {getEncouragementEmoji()} {message.encouragement}
              </motion.p>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </motion.div>
  );
}
