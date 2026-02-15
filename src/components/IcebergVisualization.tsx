'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Brain, Zap, Heart, Sparkles } from 'lucide-react';

export type IcebergLayer = 'surface' | 'trigger' | 'emotion' | 'coreBelief';

interface LayerConfig {
  id: IcebergLayer;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

const layers: LayerConfig[] = [
  {
    id: 'surface',
    label: 'Surface Thought',
    shortLabel: 'Thought',
    description: 'What you shared',
    icon: <Brain className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  {
    id: 'trigger',
    label: 'The Trigger',
    shortLabel: 'Trigger',
    description: 'What set this off',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  {
    id: 'emotion',
    label: 'Deeper Feeling',
    shortLabel: 'Feeling',
    description: 'What\'s underneath',
    icon: <Heart className="w-4 h-4" />,
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
  },
  {
    id: 'coreBelief',
    label: 'Core Belief',
    shortLabel: 'Belief',
    description: 'The deeper truth',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
  },
];

interface IcebergVisualizationProps {
  currentLayer: IcebergLayer;
  discoveredInsights: Record<IcebergLayer, string | null>;
}

export function IcebergVisualization({
  currentLayer,
  discoveredInsights,
}: IcebergVisualizationProps) {
  const currentIndex = layers.findIndex((l) => l.id === currentLayer);

  return (
    <div className="relative">
      {/* Title */}
      <div className="text-center mb-4">
        <h3 className="text-sm font-semibold text-gray-700">Your Journey</h3>
        <p className="text-xs text-gray-500 mt-1">Peeling back the layers</p>
      </div>

      {/* Layers */}
      <div className="space-y-2">
        {layers.map((layer, index) => {
          const isDiscovered = discoveredInsights[layer.id] !== null;
          const isCurrent = currentLayer === layer.id;
          const isPast = index <= currentIndex;

          return (
            <motion.div
              key={layer.id}
              initial={{ opacity: 0.5, scale: 0.95 }}
              animate={{
                opacity: isPast ? 1 : 0.5,
                scale: isCurrent ? 1.02 : 1,
              }}
              transition={{ duration: 0.3 }}
              className={cn(
                'relative rounded-xl p-3 border-2 transition-all duration-300',
                isDiscovered
                  ? `${layer.bgColor} ${layer.borderColor}`
                  : 'bg-gray-50 border-gray-200',
                isCurrent && 'ring-2 ring-offset-2 ring-blue-300'
              )}
            >
              <div className="flex items-start gap-2">
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    isDiscovered ? layer.bgColor : 'bg-gray-100'
                  )}
                >
                  <span className={isDiscovered ? layer.color : 'text-gray-400'}>
                    {layer.icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        isDiscovered ? layer.color : 'text-gray-400'
                      )}
                    >
                      {layer.label}
                    </span>
                    {isDiscovered && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full"
                      >
                        ✓
                      </motion.span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {layer.description}
                  </p>

                  {/* Show insight if discovered */}
                  {isDiscovered && discoveredInsights[layer.id] && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-xs text-gray-600 mt-1.5 italic line-clamp-2"
                    >
                      &ldquo;{discoveredInsights[layer.id]}&rdquo;
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Connection line to next layer */}
              {index < layers.length - 1 && (
                <div
                  className={cn(
                    'absolute left-[19px] bottom-0 w-0.5 h-2 translate-y-full',
                    index < currentIndex ? 'bg-blue-200' : 'bg-gray-200'
                  )}
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
