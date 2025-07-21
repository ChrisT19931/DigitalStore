import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Download, Mail, ArrowRight, Star, Gift } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const SuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [downloadUrl, setDownloadUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      fetchDownloadLink(sessionId);
    } else {
      setLoading(false);
    }
  }, [searchParams]);

  const fetchDownloadLink = async (sessionId) => {
    try {
      const response = await fetch(`/api/get-download-link?session_id=${sessionId}`);
      const data = await response.json();
      
      if (data.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
        setEmail(data.email);
      }
    } catch (error) {
      console.error('Error fetching download link:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-xl text-gray-300">Preparing your download...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        <motion.div
          className="absolute w-96 h-96 bg-green-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI Mastery 2025
          </div>
          <div className="text-sm text-gray-300">
            Support: chris.t@ventarosales.com
          </div>
        </nav>
      </header>

      <div className="relative z-10 px-6 py-12">
        <div className="max-w-4xl mx-auto text-center">
          {/* Success Animation */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="mb-8"
          >
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-12"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Payment Successful!
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Welcome to the AI revolution! Your ebook is ready for download.
            </p>
          </motion.div>

          {/* Download Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 mb-12"
          >
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-white mb-4">Your AI Mastery Ebook</h2>
              <p className="text-gray-300">
                Click the button below to download your copy. We've also sent a download link to your email.
              </p>
            </div>

            <button
              onClick={handleDownload}
              className="group relative px-12 py-6 bg-gradient-to-r from-green-600 to-emerald-600 rounded-full text-xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl mb-6"
            >
              <span className="flex items-center gap-3">
                <Download className="w-6 h-6" />
                Download Your Ebook Now
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </span>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 blur opacity-50 group-hover:opacity-75 transition-opacity"></div>
            </button>

            {email && (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Mail className="w-4 h-4" />
                <span className="text-sm">Download link sent to {email}</span>
              </div>
            )}
          </motion.div>

          {/* What's Next */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          >
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-purple-400 mb-4">
                <Star className="w-8 h-8 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Start Reading</h3>
              <p className="text-gray-300 text-sm">
                Begin with Chapter 1: AI Fundamentals and work your way through the complete guide.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-pink-400 mb-4">
                <Gift className="w-8 h-8 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Join Community</h3>
              <p className="text-gray-300 text-sm">
                Connect with other AI enthusiasts and share your success stories.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 border border-white/10">
              <div className="text-blue-400 mb-4">
                <ArrowRight className="w-8 h-8 mx-auto" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Take Action</h3>
              <p className="text-gray-300 text-sm">
                Implement the strategies immediately and start seeing results within days.
              </p>
            </div>
          </motion.div>

          {/* Support */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-sm rounded-xl p-6 border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-3">Need Help?</h3>
            <p className="text-gray-300 mb-4">
              If you have any questions or need support, don't hesitate to reach out.
            </p>
            <a
              href="mailto:chris.t@ventarosales.com"
              className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Mail className="w-4 h-4" />
              chris.t@ventarosales.com
            </a>
          </motion.div>

          {/* Back to Home */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-12"
          >
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SuccessPage;

