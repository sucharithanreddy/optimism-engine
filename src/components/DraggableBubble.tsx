'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { IcebergVisualization, IcebergLayer } from './IcebergVisualization';

interface DraggableBubbleProps {
  currentLayer: IcebergLayer;
  discoveredInsights: Record<IcebergLayer, string | null>;
}

export function DraggableBubble({
  currentLayer,
  discoveredInsights,
}: DraggableBubbleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedPosition = localStorage.getItem('journey-bubble-position');
      if (savedPosition) {
        try {
          return JSON.parse(savedPosition);
        } catch (e) {
          console.error('Failed to parse saved position', e);
        }
      }
    }
    return { x: 16, y: 100 };
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging && typeof window !== 'undefined') {
      localStorage.setItem('journey-bubble-position', JSON.stringify(position));
    }
  }, [position, isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    elementStartPos.current = { ...position };
    if (dragRef.current) {
      dragRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const bubbleSize = isExpanded ? 280 : 60;
    let newX = elementStartPos.current.x + deltaX;
    let newY = elementStartPos.current.y + deltaY;
    newX = Math.max(8, Math.min(newX, screenWidth - bubbleSize - 8));
    newY = Math.max(60, Math.min(newY, screenHeight - bubbleSize - 120));
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      dragRef.current.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  return (
    <div
      ref={dragRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 50,
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className="lg:hidden"
    >
      <motion.div
        animate={{ scale: isDragging ? 1.05 : 1 }}
        transition={{ duration: 0.15 }}
      >
        {!isExpanded ? (
          <motion.div
            className="bg-gradient-to-br from-blue-500 to-teal-500 rounded-full shadow-xl flex items-center justify-center"
            style={{ width: 60, height: 60 }}
            onClick={() => !isDragging && setIsExpanded(true)}
          >
            <div className="text-white text-center">
              <div className="text-[10px] font-bold">Your</div>
              <div className="text-[10px] opacity-90">Journey</div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white/95 backdrop-blur-lg rounded-2xl border border-blue-100 shadow-xl overflow-hidden"
            style={{ width: 280 }}
          >
            <div className="bg-gradient-to-r from-blue-500 to-teal-500 px-4 py-2 flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Your Journey</span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-white/80 hover:text-white"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 max-h-60 overflow-y-auto">
              <IcebergVisualization
                currentLayer={currentLayer}
                discoveredInsights={discoveredInsights}
              />
            </div>

            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 text-center">
                Drag to move • Tap header to collapse
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
