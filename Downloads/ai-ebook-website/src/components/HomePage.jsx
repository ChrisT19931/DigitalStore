import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Star, Download, Zap, Brain, TrendingUp, Users, CheckCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handlePurchase = () => {
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <motion.div
          className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x / 10,
            y: mousePosition.y / 10,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
        />
        <motion.div
          className="absolute top-1/2 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"
          animate={{
            x: -mousePosition.x / 15,
            y: -mousePosition.y / 15,
          }}
          transition={{ type: "spring", stiffness: 50, damping: 30 }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            AI Mastery 2025
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-sm text-gray-300"
          >
            Support: chris.t@ventarosales.com
          </motion.div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-6xl md:text-8xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                Master AI
              </span>
              <br />
              <span className="text-white">in 2025</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              The ultimate guide to AI tools, prompts, agents, and making money online. 
              Everything you need to dominate the AI revolution for just <span className="text-green-400 font-bold">$10</span>
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mb-12"
          >
            <button
              onClick={handlePurchase}
              className="group relative px-12 py-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
            >
              <span className="flex items-center gap-3">
                Get Your Copy Now - $10
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
            </button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-20"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">100+</div>
              <div className="text-gray-300">AI Tools Covered</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-pink-400 mb-2">500+</div>
              <div className="text-gray-300">Proven Prompts</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">$10K+</div>
              <div className="text-gray-300">Earning Potential</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-6 py-20 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-bold text-center mb-16 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            What's Inside This Game-Changing Ebook
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="w-8 h-8" />,
                title: "AI Prompts Mastery",
                description: "500+ proven prompts for ChatGPT, Claude, and other AI tools to maximize productivity and creativity"
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "AI Agents & Bots",
                description: "Build powerful AI agents with Manus, AutoGPT, and custom solutions for automation"
              },
              {
                icon: <TrendingUp className="w-8 h-8" />,
                title: "Make Money with AI",
                description: "Proven strategies to generate income using AI tools, from freelancing to building SaaS products"
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Website Creation",
                description: "Complete guide: GPT for ideas → Manus for structure → Cursor for optimization → Git & Vercel deployment"
              },
              {
                icon: <Sparkles className="w-8 h-8" />,
                title: "Future of AI 2025",
                description: "What's coming next in AI and how to position yourself ahead of the curve"
              },
              {
                icon: <CheckCircle className="w-8 h-8" />,
                title: "Daily AI Workflow",
                description: "Essential daily practices and tools every AI power user needs to know"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-purple-500/50 transition-all duration-300 hover:transform hover:scale-105"
              >
                <div className="text-purple-400 mb-4 group-hover:text-pink-400 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="relative z-10 px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl font-bold mb-16 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"
          >
            Why This Ebook is Priceless
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-3xl p-12 border border-white/10"
          >
            <div className="flex justify-center mb-6">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-8 h-8 text-yellow-400 fill-current" />
              ))}
            </div>
            <blockquote className="text-2xl md:text-3xl font-medium text-white mb-8 leading-relaxed">
              "This isn't just another AI guide. It's a complete roadmap to AI mastery. 
              The strategies inside have already helped me build multiple income streams. 
              Worth 100x the price."
            </blockquote>
            <div className="text-gray-300">
              <div className="font-semibold">AI Entrepreneur</div>
              <div className="text-sm">Generated $50K+ using these methods</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20 bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-5xl font-bold mb-8 text-white">
              Don't Miss the AI Revolution
            </h2>
            <p className="text-xl text-gray-300 mb-12 leading-relaxed">
              While others struggle to keep up, you'll be ahead of the curve. 
              Get instant access to the most comprehensive AI guide of 2025.
            </p>
            
            <div className="mb-8">
              <div className="text-6xl font-bold text-green-400 mb-2">$10</div>
              <div className="text-gray-300">One-time payment • Instant download • Lifetime access</div>
            </div>

            <button
              onClick={handlePurchase}
              className="group relative px-16 py-8 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full text-2xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl"
            >
              <span className="flex items-center gap-4">
                <Download className="w-8 h-8" />
                Get Instant Access Now
                <ArrowRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto text-center">
          <div className="text-gray-400 mb-4">
            © 2025 AI Mastery Ebook. All rights reserved.
          </div>
          <div className="text-gray-500">
            Support: chris.t@ventarosales.com
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

