import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, CreditCard, Shield, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          priceId: import.meta.env.VITE_STRIPE_PRICE_ID,
        }),
      });

      const session = await response.json();
      
      if (session.error) {
        throw new Error(session.error);
      }

      const stripe = await stripePromise;
      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="p-6">
        <nav className="flex justify-between items-center max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            AI Mastery 2025
          </div>
          <div className="text-sm text-gray-300">
            Support: chris.t@ventarosales.com
          </div>
        </nav>
      </header>

      <div className="px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Secure Checkout
            </h1>
            <p className="text-xl text-gray-300">
              You're one step away from mastering AI in 2025
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
            >
              <h2 className="text-2xl font-bold mb-6 text-white">Order Summary</h2>
              
              <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center py-4 border-b border-white/10">
                  <div>
                    <h3 className="font-semibold text-white">AI Mastery 2025 Ebook</h3>
                    <p className="text-gray-400 text-sm">Digital download • Instant access</p>
                  </div>
                  <div className="text-2xl font-bold text-green-400">$10.00</div>
                </div>
                
                <div className="flex justify-between items-center py-4 border-b border-white/10">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="text-white">$10.00</span>
                </div>
                
                <div className="flex justify-between items-center py-4">
                  <span className="text-xl font-bold text-white">Total</span>
                  <span className="text-2xl font-bold text-green-400">$10.00</span>
                </div>
              </div>

              {/* What You Get */}
              <div className="space-y-3">
                <h3 className="font-semibold text-white mb-4">What You Get:</h3>
                {[
                  "500+ AI prompts for maximum productivity",
                  "Complete guide to AI agents and bots",
                  "Proven strategies to make money with AI",
                  "Website creation workflow (GPT → Manus → Cursor → Git → Vercel)",
                  "Future AI trends and positioning strategies",
                  "Daily AI workflow essentials"
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Checkout Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10"
            >
              <h2 className="text-2xl font-bold mb-6 text-white">Payment Details</h2>
              
              <form onSubmit={(e) => { e.preventDefault(); handleCheckout(); }} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                    placeholder="your@email.com"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    We'll send your ebook download link to this email
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg text-white font-bold text-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CreditCard className="w-6 h-6" />
                      Complete Purchase - $10
                    </>
                  )}
                </button>
              </form>

              {/* Security Features */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-green-400" />
                  <span className="text-white font-medium">Secure Payment</span>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Powered by Stripe</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Instant download after payment</span>
                  </div>
                </div>
              </div>

              {/* Money Back Guarantee */}
              <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <div className="text-center">
                  <div className="text-green-400 font-semibold mb-1">30-Day Money Back Guarantee</div>
                  <div className="text-xs text-gray-400">
                    Not satisfied? Get a full refund, no questions asked.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;

