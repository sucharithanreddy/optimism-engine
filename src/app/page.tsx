'use client';

import { motion } from 'framer-motion';
import { Sparkles, Heart, HandHeart, ArrowRight, Users, Shield, Zap } from 'lucide-react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();

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
              <div className="w-10 h-10 relative">
                <img 
                  src="/logo.svg" 
                  alt="Optimism Engine Logo" 
                  className="w-full h-full rounded-xl shadow-lg"
                />
              </div>
              <div>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                  The Optimism Engine
                </h1>
                <p className="text-xs text-gray-500">Understand the message before responding to it</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSignedIn ? (
                <>
                  <Link href="/reflect" className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                    My Sessions
                  </Link>
                  <UserButton afterSignOutUrl="/" />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <SignInButton mode="modal">
                    <button className="text-sm text-gray-600 hover:text-blue-600 transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-teal-500 text-white text-sm rounded-lg hover:from-blue-600 hover:to-teal-600 transition-all">
                      Sign Up
                    </button>
                  </SignUpButton>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
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
            className="mb-6 inline-block"
          >
            <div className="w-20 h-20 relative mx-auto">
              <img 
                src="/logo.svg" 
                alt="Optimism Engine" 
                className="w-full h-full rounded-3xl shadow-2xl"
              />
            </div>
          </motion.div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-sky-500 bg-clip-text text-transparent">
              Understand the Message
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Before responding to it.
          </p>
          <p className="text-gray-500 mt-3 max-w-xl mx-auto">
            People often hesitate before replying to emotional messages. The Optimism Engine analyzes the message and suggests a safe, appropriate response.
          </p>
        </motion.div>

        {/* Mode Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <p className="text-center text-sm text-gray-500 mb-6 uppercase tracking-wide font-medium">
            Who is this message from?
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Reflect Mode */}
            <Link href="/reflect">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="group bg-white rounded-2xl border-2 border-blue-100 p-8 cursor-pointer transition-all hover:border-blue-300 hover:shadow-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <Heart className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                      Reflect
                      <ArrowRight className="w-4 h-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-gray-600 mb-4">
                      <span className="text-blue-600 font-medium">From me.</span> I'm feeling something and want to understand it.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">Journaling</span>
                      <span className="text-xs px-2 py-1 bg-teal-50 text-teal-600 rounded-full">Reframing</span>
                      <span className="text-xs px-2 py-1 bg-sky-50 text-sky-600 rounded-full">Self-reflection</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* Assist Mode */}
            <Link href="/assist">
              <motion.div
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className="group bg-white rounded-2xl border-2 border-teal-100 p-8 cursor-pointer transition-all hover:border-teal-300 hover:shadow-xl"
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                    <HandHeart className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                      Assist
                      <ArrowRight className="w-4 h-4 text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className="text-gray-600 mb-4">
                      <span className="text-teal-600 font-medium">From someone I'm helping.</span> I need to respond thoughtfully.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs px-2 py-1 bg-teal-50 text-teal-600 rounded-full">Coaching</span>
                      <span className="text-xs px-2 py-1 bg-cyan-50 text-cyan-600 rounded-full">Mentoring</span>
                      <span className="text-xs px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full">Support</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">
            One Engine. Two Perspectives.
          </h2>
          
          <div className="bg-white/80 backdrop-blur rounded-2xl border border-blue-100 p-8 max-w-3xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Same Analysis</h3>
                <p className="text-sm text-gray-600">
                  Both modes use the same AI engine to interpret emotional content, detect patterns, and understand context.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Different Context</h3>
                <p className="text-sm text-gray-600">
                  Reflect helps you understand yourself. Assist helps you understand others and respond effectively.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-6 h-6 text-sky-600" />
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">Privacy First</h3>
                <p className="text-sm text-gray-600">
                  Messages are processed privately and not stored.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Social Proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
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
            <span>Early users are testing this in real conversations</span>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-white/80 to-transparent h-16 pointer-events-none" />
      <div className="fixed bottom-2 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-gray-400">
          Not a replacement for professional help. If in crisis, call 988 (US) or your local helpline.
        </p>
      </div>
    </div>
  );
}
