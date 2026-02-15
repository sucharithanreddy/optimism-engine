'use client';

import { motion } from 'framer-motion';
import { User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Iceberg layers
  surface?: string;
  trigger?: string;
  emotion?: string;
  coreBelief?: string;
  question?: string;
  // Legacy fields (kept for backward compatibility)
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

const LAYER_STYLES = {
  surface: {
    icon: '🌊',
    label: 'Surface',
    bg: 'from-sky-50 to-blue-50',
    border: 'border-sky-200',
    text: 'text-sky-700',
  },
  trigger: {
    icon: '⚡',
    label: 'Trigger',
    bg: 'from-amber-50 to-orange-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  emotion: {
    icon: '💔',
    label: 'Emotion',
    bg: 'from-rose-50 to-pink-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
  },
  coreBelief: {
    icon: '🔮',
    label: 'Core Belief',
    bg: 'from-purple-50 to-violet-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
  },
};

export function ChatMessage({ message, isLatest }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  // Check if this is the new 5-layer format
  const hasIcebergLayers = message.surface || message.trigger || message.emotion || message.coreBelief;

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
        ) : hasIcebergLayers ? (
          // NEW: 5-layer Iceberg format
          <div className="space-y-3">
            {/* Acknowledgment */}
            {message.content && (
              <p className="text-[15px] leading-relaxed text-gray-700">
                {message.content}
              </p>
            )}

            {/* Surface Layer */}
            {message.surface && (
              <LayerSection
                icon={LAYER_STYLES.surface.icon}
                label={LAYER_STYLES.surface.label}
                content={message.surface}
                bg={LAYER_STYLES.surface.bg}
                border={LAYER_STYLES.surface.border}
                text={LAYER_STYLES.surface.text}
              />
            )}

            {/* Trigger Layer */}
            {message.trigger && (
              <LayerSection
                icon={LAYER_STYLES.trigger.icon}
                label={LAYER_STYLES.trigger.label}
                content={message.trigger}
                bg={LAYER_STYLES.trigger.bg}
                border={LAYER_STYLES.trigger.border}
                text={LAYER_STYLES.trigger.text}
              />
            )}

            {/* Emotion Layer */}
            {message.emotion && (
              <LayerSection
                icon={LAYER_STYLES.emotion.icon}
                label={LAYER_STYLES.emotion.label}
                content={message.emotion}
                bg={LAYER_STYLES.emotion.bg}
                border={LAYER_STYLES.emotion.border}
                text={LAYER_STYLES.emotion.text}
              />
            )}

            {/* Core Belief Layer */}
            {message.coreBelief && (
              <LayerSection
                icon={LAYER_STYLES.coreBelief.icon}
                label={LAYER_STYLES.coreBelief.label}
                content={message.coreBelief}
                bg={LAYER_STYLES.coreBelief.bg}
                border={LAYER_STYLES.coreBelief.border}
                text={LAYER_STYLES.coreBelief.text}
              />
            )}

            {/* Question */}
            {message.question && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-blue-50 to-teal-50 rounded-xl p-4 border border-blue-200"
              >
                <p className="text-[15px] text-blue-700 font-medium">
                  {message.question}
                </p>
              </motion.div>
            )}
          </div>
        ) : (
          // LEGACY: Old format (for backward compatibility)
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed text-gray-700">
              {message.content}
            </p>

            {message.distortionType && (
              <span className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                {message.distortionType}
              </span>
            )}

            {message.distortionExplanation && (
              <div className="text-sm text-gray-600 italic pl-3 border-l-2 border-blue-200">
                {message.distortionExplanation}
              </div>
            )}

            {message.reframe && (
              <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-4 border border-teal-100">
                <p className="text-[15px] text-gray-700">{message.reframe}</p>
              </div>
            )}

            {message.probingQuestion && (
              <div className="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl p-4 border border-blue-100">
                <p className="text-[15px] text-blue-700 font-medium">{message.probingQuestion}</p>
              </div>
            )}

            {message.encouragement && (
              <p className="text-sm text-blue-600 font-medium">✨ {message.encouragement}</p>
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

// Layer section component
function LayerSection({
  icon,
  label,
  content,
  bg,
  border,
  text,
}: {
  icon: string;
  label: string;
  content: string;
  bg: string;
  border: string;
  text: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-xl p-3 border', `bg-gradient-to-r ${bg}`, border)}
    >
      <p className={cn('text-xs font-semibold mb-1', text)}>
        {icon} {label}
      </p>
      <p className="text-[14px] text-gray-700 leading-relaxed">{content}</p>
    </motion.div>
  );
}
