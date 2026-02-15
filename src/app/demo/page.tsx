'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Copy, Check, X, ExternalLink, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function DemoPage() {
  const [showWidget, setShowWidget] = useState(false);
  const [copied, setCopied] = useState(false);
  const [widgetSize, setWidgetSize] = useState<'small' | 'medium' | 'large'>('medium');

  const embedCode = `<script src="https://optimism-engine.vercel.app/widget.js"></script>
<script>
  OptimismWidget.init({
    position: 'bottom-right',
    primaryColor: '#3b82f6',
    greeting: "Hi! I'm here to help you transform negative thoughts."
  });
</script>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Widget Demo</h1>
                <p className="text-xs text-gray-500">See how it looks on your website</p>
              </div>
            </div>
            <a
              href="https://optimism-engine.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
            >
              Full App <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Demo Website Simulation */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">1. Preview on Your Website</h2>
          <p className="text-gray-600 mb-4">
            Click the chat bubble to see how the widget appears to your clients.
          </p>

          {/* Simulated Website */}
          <div className="relative bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            {/* Fake browser bar */}
            <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-gray-500 flex items-center gap-2">
                  <span className="text-green-600">🔒</span>
                  www.your-therapy-website.com
                </div>
              </div>
            </div>

            {/* Fake website content */}
            <div className="p-8 min-h-[400px]">
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-200 to-teal-200 mx-auto mb-4" />
                  <div className="h-8 bg-gray-200 rounded-lg w-64 mx-auto mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-48 mx-auto" />
                </div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-5/6" />
                  <div className="h-4 bg-gray-100 rounded w-4/6" />
                  <div className="h-32 bg-gray-50 rounded-xl border border-gray-200 mt-6" />
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="h-24 bg-blue-50 rounded-xl border border-blue-100" />
                    <div className="h-24 bg-teal-50 rounded-xl border border-teal-100" />
                    <div className="h-24 bg-sky-50 rounded-xl border border-sky-100" />
                  </div>
                </div>
              </div>
            </div>

            {/* Widget Chat Bubble */}
            <button
              onClick={() => setShowWidget(true)}
              className={cn(
                'fixed bottom-6 right-6 z-50',
                'w-14 h-14 rounded-full shadow-lg',
                'bg-gradient-to-br from-blue-500 to-teal-500',
                'flex items-center justify-center',
                'hover:scale-110 transition-transform',
                showWidget && 'opacity-0 pointer-events-none'
              )}
            >
              <MessageCircle className="w-6 h-6 text-white" />
            </button>

            {/* Widget Popup */}
            <AnimatePresence>
              {showWidget && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  className={cn(
                    'fixed bottom-6 right-6 z-50',
                    'bg-white rounded-2xl shadow-2xl overflow-hidden',
                    'border border-blue-100',
                    widgetSize === 'small' && 'w-80 h-[500px]',
                    widgetSize === 'medium' && 'w-96 h-[600px]',
                    widgetSize === 'large' && 'w-[450px] h-[700px]'
                  )}
                >
                  <iframe
                    src="/widget"
                    className="w-full h-full border-0"
                    title="Optimism Widget"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Size Controls */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-sm text-gray-600">Widget size:</span>
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setWidgetSize(size)}
                className={cn(
                  'px-3 py-1 rounded-lg text-sm transition-colors',
                  widgetSize === size
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {size.charAt(0).toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Embed Code */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">2. Copy the Embed Code</h2>
          <p className="text-gray-600 mb-4">
            Just paste this into your website&apos;s HTML, anywhere before the closing <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag.
          </p>

          <div className="bg-gray-900 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Button
                onClick={handleCopy}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <pre className="text-green-400 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
              {embedCode}
            </pre>
          </div>
        </div>

        {/* Customization Options */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">3. Customize (Optional)</h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                <select className="w-full px-3 py-2 rounded-lg border border-gray-200">
                  <option>Bottom Right</option>
                  <option>Bottom Left</option>
                  <option>Bottom Center</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    defaultValue="#3b82f6"
                    className="w-12 h-10 rounded border border-gray-200"
                  />
                  <input
                    type="text"
                    value="#3b82f6"
                    readOnly
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Welcome Message</label>
                <input
                  type="text"
                  defaultValue="Hi! I'm here to help you transform negative thoughts."
                  className="w-full px-3 py-2 rounded-lg border border-gray-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-gradient-to-r from-blue-500 to-teal-500 rounded-2xl p-8 text-white">
          <h2 className="text-xl font-bold mb-4">Why Embed the Widget?</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl mb-2">🏠</div>
              <h3 className="font-semibold mb-1">Stay on Your Site</h3>
              <p className="text-sm text-white/80">Clients never leave your website</p>
            </div>
            <div>
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold mb-1">Easy Setup</h3>
              <p className="text-sm text-white/80">Just copy and paste 2 lines of code</p>
            </div>
            <div>
              <div className="text-2xl mb-2">🎨</div>
              <h3 className="font-semibold mb-1">Match Your Brand</h3>
              <p className="text-sm text-white/80">Customize colors and messages</p>
            </div>
          </div>
        </div>
      </main>

      {/* Close button for widget */}
      {showWidget && (
        <button
          onClick={() => setShowWidget(false)}
          className="fixed bottom-[620px] right-8 z-50 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      )}
    </div>
  );
}
