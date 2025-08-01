'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import AddToCartButton from '@/components/AddToCartButton';
import BuyNowButton from '@/components/BuyNowButton';



// Define the product type
type Product = {
  id: string;
  name: string;
  price: number;
  description?: string;
  image_url?: string;
  category?: string;
  is_featured?: boolean;
  is_active?: boolean;
  productType: 'digital' | 'physical'; // Required by AddToCartButton
  [key: string]: any;
};
// Fallback products data
const fallbackProducts = {
  '1': {
    id: '1',
    name: 'AI Tools Mastery Guide 2025',
    description: '30 powerful lessons to help you build a profitable online business using AI tools like ChatGPT, Gemini, Claude, and Trae/Cursor. Master the art of AI-powered entrepreneurship with step-by-step implementation guides.',
    price: 25.00,
    originalPrice: 50.00,
    image_url: '/images/products/ai-tools-mastery-guide.svg',
    category: 'courses',
    is_active: true,
    featured: true,
    product_type: 'digital',
    created_at: new Date().toISOString(),
    benefits: [
      'Master ChatGPT, Gemini, Claude & Trae/Cursor for business',
      '30 actionable lessons for online business building',
      'AI-powered content creation and automation strategies',
      'Proven business models and revenue generation tactics',
      'Step-by-step implementation guides with real examples',
      'Transform AI tools into profitable business opportunities'
    ],
    details: {
      description: 'Transform your entrepreneurial dreams into reality with 30 comprehensive lessons designed to help you build a thriving online business using cutting-edge AI tools. From ChatGPT and Gemini to Claude and Trae/Cursor, master the tools that are revolutionizing how businesses operate and generate revenue.',
      features: [
        'ChatGPT mastery for content creation and customer service',
        'Gemini integration for data analysis and insights',
        'Claude utilization for advanced writing and research',
        'Trae/Cursor for automated coding and development',
        'AI-powered marketing and sales strategies',
        'Business automation and workflow optimization'
      ],
      includes: [
        '30 comprehensive business-building lessons',
        'AI tool mastery guides for each platform',
        'Ready-to-use prompts and templates',
        'Business model frameworks and strategies',
        'Revenue generation tactics and case studies',
        'Implementation roadmaps and action plans'
      ],
      pages: 30,
      format: 'PDF',
      language: 'English',
      level: 'Beginner to Advanced',
      downloadSize: '2.5 MB',
      readingTime: '45 minutes'
    }
  },
  '2': {
    id: '2',
    name: 'AI Prompts Arsenal 2025',
    description: '30 professional AI prompts to make money online in 2025. Proven ChatGPT and Claude prompts for content creation, marketing, SEO, business automation, e-commerce, and personal branding.',
    price: 10.00,
    image_url: '/images/products/ai-prompts-arsenal.svg',
    category: 'tools',
    is_active: true,
    featured: false,
    product_type: 'digital',
    created_at: new Date().toISOString(),
    benefits: [
      '30 proven prompts for building online business',
      'Copy-paste ready for immediate use',
      'Works with ChatGPT, Claude, and other AI tools',
      'Organized by business category',
      'Simple instructions included',
      'Start implementing immediately'
    ],
    details: {
      description: 'Get 30 expertly crafted AI prompts that help you build your online business across multiple categories. Each prompt is tested and ready to use - just copy, paste, and start implementing your AI-powered business strategy.',
      features: [
        'Content creation prompts for blogs, social media, and marketing',
        'SEO and visibility enhancement prompts',
        'Business automation workflow prompts',
        'E-commerce and product description generators',
        'Personal branding and networking prompts'
      ],
      includes: [
        'PDF with all 30 categorized prompts',
        'Copy-paste ready format',
        'Usage instructions for each prompt',
        'Implementation suggestions',
        'Compatible with all major AI platforms'
      ],
      promptCount: 30,
      format: 'PDF',
      language: 'English',
      compatibility: 'ChatGPT, Claude, Gemini, and other AI tools',
      downloadSize: '1.2 MB'
    }
  },
  '3': {
    id: '3',
    name: 'AI Business Strategy Session 2025',
    description: '60-minute screen-recorded Google Meet session where I guide you step-by-step through building, deploying, and launching your own online store/website. Includes complete walkthrough from start to finish with detailed implementation report. 🔥 LAUNCH OFFER: $500 (reduced from $3000) until September 1st, 2025!',
    price: 500.00,
    image_url: '/images/products/ai-business-strategy-session.svg',
    category: 'services',
    is_active: true,
    featured: false,
    product_type: 'digital',
    created_at: new Date().toISOString(),
    benefits: [
      '60-minute screen-recorded Google Meet session',
      'Personal step-by-step guidance and mentoring',
      'Complete online store/website building tutorial',
      'Live deployment and launch walkthrough',
      'Real-time problem solving and implementation',
      'Detailed implementation report included',
      'Start-to-finish guidance with practical examples'
    ],
    details: {
      description: 'Join a personalized 60-minute screen-recorded Google Meet session where I will guide you step-by-step through the entire process of building, deploying, and launching your own online store/website. This comprehensive session includes hands-on guidance and a detailed implementation report.',
      features: [
        'Screen-recorded Google Meet session with expert guidance',
        'Step-by-step website/online store building tutorial',
        'Live deployment and launch demonstration',
        'Real-time troubleshooting and problem solving',
        'Complete development workflow walkthrough',
        'Professional implementation strategies'
      ],
      includes: [
        'Full 60-minute screen-recorded Google Meet session',
        'Step-by-step building and deployment guidance',
        'Complete walkthrough from start to finish',
        'Live demonstration of best practices',
        'Comprehensive detailed implementation report',
        'Session recording for future reference',
        'Follow-up email support for questions'
      ],
      duration: '60 minutes',
      format: 'Screen-recorded Google Meet session',
      language: 'English',
      deliverables: 'Detailed implementation report + session recording',
      followUp: 'Email support included',
      note: 'Full package options available - email us for custom quotes and comprehensive solutions'
    }
  }
};

export default function ProductPage() {
  const router = useRouter();
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  
  const handleAddToCart = () => {
    if (product) {
      // This will be handled by the AddToCartButton component
      // but we need to provide a callback for the 3D component
      const event = new CustomEvent('addToCart', { detail: product });
      window.dispatchEvent(event);
    }
  };
  
  useEffect(() => {
    async function fetchProduct() {
      if (!params.id) return;
      
      const id = Array.isArray(params.id) ? params.id[0] : params.id;
      
      try {
        // Try to fetch from Supabase first
        const supabase = await createClient();
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
          .eq('is_active', true)
          .single();
        
        if (!error && data) {
          // Ensure productType is set (required by AddToCartButton)
          setProduct({
            ...data,
            productType: ((data.product_type as 'digital' | 'physical') || 'digital') as 'digital' | 'physical'
          });
          setLoading(false);
          return;
        }
        
        // Fallback to hardcoded products if not found in database
        if (fallbackProducts[id as keyof typeof fallbackProducts]) {
          const fallbackProduct = fallbackProducts[id as keyof typeof fallbackProducts];
          setProduct({
            ...fallbackProduct,
            description: fallbackProduct.description || '',
            productType: ((fallbackProduct.product_type as 'digital' | 'physical') || 'digital') as 'digital' | 'physical'
          });
        } else {
          // Product not found
          router.push('/not-found');
        }
      } catch (e) {
        console.error('Error fetching product:', e);
        // Try fallback
        if (fallbackProducts[id as keyof typeof fallbackProducts]) {
          const fallbackProduct = fallbackProducts[id as keyof typeof fallbackProducts];
          setProduct({
            ...fallbackProduct,
            description: fallbackProduct.description || '',
            productType: ((fallbackProduct.product_type as 'digital' | 'physical') || 'digital') as 'digital' | 'physical'
          });
        }
      } finally {
        setLoading(false);
      }
    }
    
    fetchProduct();
  }, [params.id, router]);
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!product) {
    return <div className="min-h-screen flex items-center justify-center">Product not found</div>;
  }
  
  // Add animation styles
  const animationStyles = `
    @keyframes book-flip {
      0%, 100% { transform: rotateY(0deg) scale(1); }
      25% { transform: rotateY(-15deg) scale(1.05); }
      50% { transform: rotateY(0deg) scale(1.1); }
      75% { transform: rotateY(15deg) scale(1.05); }
    }
    @keyframes page-turn {
      0%, 100% { transform: translateX(-100%) skewX(0deg); opacity: 0; }
      50% { transform: translateX(0%) skewX(-10deg); opacity: 0.3; }
    }
    @keyframes rocket-launch {
      0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
      25% { transform: translateY(-10px) rotate(-5deg) scale(1.05); }
      50% { transform: translateY(-20px) rotate(0deg) scale(1.1); }
      75% { transform: translateY(-10px) rotate(5deg) scale(1.05); }
    }
    @keyframes rocket-trail {
      0%, 100% { height: 20px; opacity: 0.8; }
      50% { height: 40px; opacity: 1; }
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.5); }
    }
    @keyframes target-focus {
      0%, 100% { transform: scale(1) rotateZ(0deg); }
      25% { transform: scale(1.05) rotateZ(-2deg); }
      50% { transform: scale(1.1) rotateZ(0deg); }
      75% { transform: scale(1.05) rotateZ(2deg); }
    }
    @keyframes target-ring-1 {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.2; }
      50% { transform: scale(1.1) rotate(180deg); opacity: 0.4; }
    }
    @keyframes target-ring-2 {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.3; }
      50% { transform: scale(1.15) rotate(-180deg); opacity: 0.5; }
    }
    @keyframes target-ring-3 {
      0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.4; }
      50% { transform: scale(1.2) rotate(180deg); opacity: 0.6; }
    }
    @keyframes coaching-arrow {
      0%, 100% { transform: translateX(-50%) translateY(-50%) rotate(0deg) scale(1); opacity: 0.8; }
      25% { transform: translateX(-50%) translateY(-50%) rotate(15deg) scale(1.1); opacity: 1; }
      50% { transform: translateX(-50%) translateY(-50%) rotate(0deg) scale(1.2); opacity: 1; }
      75% { transform: translateX(-50%) translateY(-50%) rotate(-15deg) scale(1.1); opacity: 1; }
    }
    .animate-book-flip {
      animation: book-flip 4s ease-in-out infinite;
      transform-style: preserve-3d;
    }
    .animate-page-turn {
      animation: page-turn 6s ease-in-out infinite;
    }
    .animate-rocket-launch {
      animation: rocket-launch 4s ease-in-out infinite;
    }
    .animate-rocket-trail {
      animation: rocket-trail 2s ease-in-out infinite;
    }
    .animate-twinkle {
      animation: twinkle 3s ease-in-out infinite;
    }
    .animate-target-focus {
      animation: target-focus 4s ease-in-out infinite;
      transform-style: preserve-3d;
    }
    .animate-target-ring-1 {
      animation: target-ring-1 6s linear infinite;
    }
    .animate-target-ring-2 {
      animation: target-ring-2 8s linear infinite;
    }
    .animate-target-ring-3 {
      animation: target-ring-3 10s linear infinite;
    }
    .animate-coaching-arrow {
      animation: coaching-arrow 3s ease-in-out infinite;
    }
  `;
  
  return (
    <div className="bg-black min-h-screen py-12">
      <style jsx>{animationStyles}</style>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Blurred Lesson Preview */}
          <div className="relative">
            {/* Ambient lighting effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-emerald-500/10 rounded-3xl blur-3xl animate-pulse"></div>
            <div className="absolute top-4 left-4 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-twinkle"></div>
            <div className="absolute bottom-4 right-4 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl animate-twinkle" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-emerald-400/10 rounded-full blur-3xl animate-twinkle" style={{animationDelay: '2s'}}></div>
            
            {/* Preview Container */}
            <div className="relative z-10 rounded-3xl bg-gradient-to-br from-gray-900/90 via-black/90 to-gray-800/90 backdrop-blur-sm border border-gray-700/50 shadow-2xl overflow-hidden">
              {/* Preview Header */}
              {product.id === '1' && (
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-center">
                  <h3 className="text-white font-bold text-lg">📖 Inside Preview</h3>
                  <p className="text-blue-100 text-sm">AI Tools Mastery Guide 2025</p>
                </div>
              )}
              {product.id === '2' && (
                <div className="bg-gradient-to-r from-green-600 to-blue-600 p-4 text-center">
                  <h3 className="text-white font-bold text-lg">🎯 Prompts Preview</h3>
                  <p className="text-green-100 text-sm">AI Prompts Arsenal 2025</p>
                </div>
              )}
              {product.id === '3' && (
                <div className="bg-gradient-to-r from-orange-600 to-red-600 p-4 text-center">
                  <h3 className="text-white font-bold text-lg">🎬 Session Preview</h3>
                  <p className="text-orange-100 text-sm">AI Business Strategy Session 2025</p>
                </div>
              )}
              
              {/* Blurred Content Preview */}
              <div className="p-6 h-96 overflow-hidden relative">
                {/* AI Tools Mastery Guide Preview */}
                {product.id === '1' && (
                  <div className="filter blur-sm select-none pointer-events-none">
                    <h4 className="text-xl font-bold text-white mb-4">Lesson 1: ChatGPT Setup for Business Success</h4>
                    <div className="space-y-3 text-gray-300">
                      <p>Welcome to your journey of building a profitable online business using AI tools. In this comprehensive lesson, you'll learn how to set up ChatGPT for maximum business impact.</p>
                      <h5 className="font-semibold text-white">What You'll Learn:</h5>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Setting up ChatGPT Plus vs Free - which is right for your business</li>
                        <li>Creating custom instructions for consistent business outputs</li>
                        <li>Essential prompt templates for content creation</li>
                        <li>Integrating ChatGPT into your daily workflow</li>
                        <li>Advanced features and plugins for business automation</li>
                      </ul>
                      <div className="mt-4 p-3 bg-blue-900/30 rounded-lg">
                        <h6 className="font-semibold text-blue-300">Pro Tip:</h6>
                        <p className="text-sm">Always start with clear, specific prompts. The quality of your output depends on the quality of your input.</p>
                      </div>
                      <h5 className="font-semibold text-white mt-4">Step-by-Step Implementation:</h5>
                      <div className="space-y-2 text-sm">
                        <p><strong>Step 1:</strong> Create your ChatGPT account and choose the right plan</p>
                        <p><strong>Step 2:</strong> Set up custom instructions for your business niche</p>
                        <p><strong>Step 3:</strong> Test and refine your prompt templates</p>
                        <p><strong>Step 4:</strong> Integrate with your existing tools and workflows</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* AI Prompts Arsenal Preview */}
                 {product.id === '2' && (
                   <div className="filter blur-sm select-none pointer-events-none">
                     <h4 className="text-xl font-bold text-white mb-4">Prompt #1: Blog Post Generator for Any Niche</h4>
                     <div className="space-y-3 text-gray-300">
                       <div className="bg-green-900/20 p-4 rounded-lg border border-green-500/30">
                         <h5 className="font-semibold text-green-400 mb-2">📝 Copy-Paste Ready Prompt:</h5>
                         <p className="text-sm font-mono bg-gray-800/50 p-3 rounded border-l-4 border-green-400">
                           "Act as an expert content writer and SEO specialist. Create a comprehensive blog post about [TOPIC] for [TARGET AUDIENCE]. The blog post should be [WORD COUNT] words and include:
                         </p>
                       </div>
                       <h5 className="font-semibold text-white">What This Prompt Generates:</h5>
                       <ul className="list-disc list-inside space-y-1 text-sm">
                         <li>SEO-optimized blog posts for any niche or industry</li>
                         <li>Engaging headlines that capture reader attention</li>
                         <li>Well-structured content with proper subheadings</li>
                         <li>Actionable tips and practical advice</li>
                         <li>Compelling calls-to-action that drive conversions</li>
                       </ul>
                       <div className="mt-4 p-3 bg-green-900/30 rounded-lg">
                         <h6 className="font-semibold text-green-300">Usage Instructions:</h6>
                         <p className="text-sm">Replace [TOPIC], [TARGET AUDIENCE], and [WORD COUNT] with your specific requirements. Works with ChatGPT, Claude, Gemini, and other AI tools.</p>
                       </div>
                       <h5 className="font-semibold text-white mt-4">More Prompts Include:</h5>
                       <div className="space-y-1 text-sm">
                         <p><strong>Prompt #2:</strong> Social Media Content Calendar Creator</p>
                         <p><strong>Prompt #3:</strong> Email Newsletter Template Builder</p>
                         <p><strong>Prompt #4:</strong> YouTube Video Script Writer</p>
                         <p className="text-green-400">...and 26 more professional prompts!</p>
                       </div>
                     </div>
                   </div>
                 )}
                 
                 {/* AI Business Strategy Session Preview */}
                 {product.id === '3' && (
                   <div className="filter blur-sm select-none pointer-events-none">
                     <h4 className="text-xl font-bold text-white mb-4">Session Sample: "Building Your E-commerce Store"</h4>
                     <div className="space-y-3 text-gray-300">
                       <div className="bg-orange-900/20 p-4 rounded-lg border border-orange-500/30">
                         <h5 className="font-semibold text-orange-400 mb-2">🎬 Live Screen Recording Sample:</h5>
                         <p className="text-sm bg-gray-800/50 p-3 rounded border-l-4 border-orange-400">
                           "Welcome to your personalized session! Today we'll build your complete online store from scratch. Let me share my screen and we'll start with setting up your development environment..."
                         </p>
                       </div>
                       <h5 className="font-semibold text-white">What You'll Experience:</h5>
                       <ul className="list-disc list-inside space-y-1 text-sm">
                         <li>Real-time screen recording of complete build process</li>
                         <li>Step-by-step guidance with personal explanations</li>
                         <li>Live problem-solving and troubleshooting</li>
                         <li>Professional deployment and launch demonstration</li>
                         <li>Interactive Q&A throughout the session</li>
                       </ul>
                       <div className="mt-4 p-3 bg-orange-900/30 rounded-lg">
                         <h6 className="font-semibold text-orange-300">Session Format:</h6>
                         <p className="text-sm">60-minute Google Meet session with screen recording. You'll receive the recording plus a detailed implementation report with all code and instructions.</p>
                       </div>
                       <h5 className="font-semibold text-white mt-4">Session Outcomes:</h5>
                       <div className="space-y-1 text-sm">
                         <p><strong>✓ Live Website:</strong> Fully functional online store</p>
                         <p><strong>✓ Complete Code:</strong> All source files and documentation</p>
                         <p><strong>✓ Deployment:</strong> Professional hosting setup</p>
                         <p className="text-orange-400">...plus ongoing email support!</p>
                       </div>
                     </div>
                   </div>
                 )}
                
                {/* Unlock overlay */}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-6">
                   <div className="text-center">
                     {product.id === '1' && (
                       <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
                         🔓 Unlock All 30 Lessons
                       </div>
                     )}
                     {product.id === '2' && (
                       <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
                         🔓 Unlock All 30 Prompts
                       </div>
                     )}
                     {product.id === '3' && (
                       <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
                         🔓 Book Your Session Now
                       </div>
                     )}
                     <p className="text-gray-300 text-sm mt-2">
                       {product.id === '1' ? 'Get instant access to the complete guide' : 
                        product.id === '2' ? 'Get instant access to all professional prompts' : 
                        'Get personalized guidance and implementation'}
                     </p>
                   </div>
                 </div>
              </div>
              
              {/* Interactive glow border */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-emerald-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-white mb-4 glow-text">{product.name}</h1>
              <p className="text-xl text-gray-300 mb-6">{product.description}</p>
              <div className="flex items-center gap-4 mb-8">
                <span className="text-4xl font-bold text-white glow-text">A${product.price.toFixed(2)} AUD</span>
                <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-blue-500 text-white rounded-full text-sm font-medium shadow-lg">
                  {product.category === 'services' ? 'Consultation' : 'Digital Download'}
                </span>
              </div>
            </div>

            {/* Complete Ebook Content */}
            {product.id === '1' && (
              <div className="space-y-8">
                {/* Table of Contents */}
                <div className="glass-panel rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2 glow-text">
                    <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    🔥 30 Lessons to Build Your AI-Powered Online Business
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">ChatGPT Business Mastery (Lessons 1-8)</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">1.</span>
                          <span>ChatGPT Setup for Business Success</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">2.</span>
                          <span>Content Creation with ChatGPT</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">3.</span>
                          <span>ChatGPT for Customer Service Automation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">4.</span>
                          <span>Email Marketing with ChatGPT</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">5.</span>
                          <span>Social Media Strategy & Content</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">6.</span>
                          <span>Product Descriptions & Sales Copy</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">7.</span>
                          <span>Blog Writing & SEO Optimization</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">8.</span>
                          <span>ChatGPT Business Automation</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Gemini & Claude Integration (Lessons 9-16)</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">9.</span>
                          <span>Gemini for Data Analysis & Insights</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">10.</span>
                          <span>Market Research with Gemini</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">11.</span>
                          <span>Claude for Advanced Writing Projects</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">12.</span>
                          <span>Research & Documentation with Claude</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">13.</span>
                          <span>Combining AI Tools for Maximum Impact</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">14.</span>
                          <span>AI-Powered Business Planning</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">15.</span>
                          <span>Competitive Analysis with AI</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">16.</span>
                          <span>AI Content Strategy Development</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Trae/Cursor Development (Lessons 17-24)</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">17.</span>
                          <span>Introduction to Trae/Cursor for Business</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">18.</span>
                          <span>Building Landing Pages with AI</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">19.</span>
                          <span>E-commerce Store Development</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">20.</span>
                          <span>Automated Code Generation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">21.</span>
                          <span>API Integration & Automation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">22.</span>
                          <span>Database Management with AI</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">23.</span>
                          <span>Mobile App Development Basics</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">24.</span>
                          <span>Deployment & Maintenance</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Business Launch & Scale (Lessons 25-30)</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">25.</span>
                          <span>AI-Powered Marketing Campaigns</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">26.</span>
                          <span>Customer Acquisition Strategies</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">27.</span>
                          <span>Revenue Optimization with AI</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">28.</span>
                          <span>Scaling Your AI Business</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">29.</span>
                          <span>Building AI-Powered Teams</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-blue-400 font-bold">30.</span>
                          <span>Future-Proofing Your Business</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>


              </div>
            )}

            {/* AI Prompts Arsenal Content */}
            {product.id === '2' && (
              <div className="space-y-8">
                {/* Prompts Preview */}
                <div className="glass-panel rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2 glow-text">
                    <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    💯 30 Professional AI Prompts for Business Success
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Content Creation Prompts (1-8)</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">1.</span>
                          <span>Blog Post Generator for Any Niche</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">2.</span>
                          <span>Social Media Content Calendar Creator</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">3.</span>
                          <span>Email Newsletter Template Builder</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">4.</span>
                          <span>YouTube Video Script Writer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">5.</span>
                          <span>Instagram Caption & Hashtag Generator</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">6.</span>
                          <span>LinkedIn Professional Post Creator</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">7.</span>
                          <span>Podcast Episode Outline Generator</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">8.</span>
                          <span>Website Copy & Landing Page Writer</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Marketing & SEO Prompts (9-16)</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">9.</span>
                          <span>SEO Keyword Research & Strategy</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">10.</span>
                          <span>Google Ads Campaign Creator</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">11.</span>
                          <span>Facebook & Instagram Ad Copy Writer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">12.</span>
                          <span>Email Marketing Sequence Builder</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">13.</span>
                          <span>Sales Funnel Strategy Designer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">14.</span>
                          <span>Competitor Analysis & Research Tool</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">15.</span>
                          <span>Brand Voice & Messaging Developer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">16.</span>
                          <span>Customer Persona & Avatar Creator</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Business Automation Prompts (17-24)</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">17.</span>
                          <span>Customer Service Chatbot Responses</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">18.</span>
                          <span>Business Process Documentation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">19.</span>
                          <span>Meeting Summary & Action Items</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">20.</span>
                          <span>Project Management & Task Planning</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">21.</span>
                          <span>Invoice & Contract Template Generator</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">22.</span>
                          <span>Employee Training Material Creator</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">23.</span>
                          <span>Financial Report & Analysis Tool</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">24.</span>
                          <span>Workflow Optimization Analyzer</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">E-commerce & Personal Branding (25-30)</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">25.</span>
                          <span>Product Description & Feature Writer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">26.</span>
                          <span>Amazon Listing Optimization Tool</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">27.</span>
                          <span>Personal Brand Story Developer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">28.</span>
                          <span>Professional Bio & About Page Writer</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">29.</span>
                          <span>Networking & Outreach Message Creator</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-400 font-bold">30.</span>
                          <span>Business Pitch & Proposal Generator</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Prompts Preview Sample */}
                <div className="glass-panel rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">📋</span>
                    Sample Prompt Preview
                  </h3>
                  <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-600">
                    <div className="filter blur-sm select-none pointer-events-none">
                      <h4 className="text-green-400 font-bold mb-2">Prompt #1: Blog Post Generator for Any Niche</h4>
                      <div className="text-gray-300 text-sm space-y-2">
                        <p><strong>Prompt:</strong> "Act as an expert content writer and SEO specialist. Create a comprehensive blog post about [TOPIC] for [TARGET AUDIENCE]. The blog post should be [WORD COUNT] words and include:</p>
                        <ul className="list-disc list-inside ml-4 space-y-1">
                          <li>An attention-grabbing headline</li>
                          <li>An engaging introduction that hooks the reader</li>
                          <li>5-7 main sections with subheadings</li>
                          <li>Actionable tips and practical advice</li>
                          <li>A compelling conclusion with a call-to-action</li>
                        </ul>
                        <p>Make sure to optimize for SEO with relevant keywords and maintain a [TONE] tone throughout..."</p>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end justify-center pb-4">
                      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-4 py-2 rounded-full font-semibold text-sm shadow-lg">
                        🔓 Unlock All 30 Prompts
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Business Strategy Session Content */}
            {product.id === '3' && (
              <div className="space-y-8">
                {/* Session Overview */}
                <div className="glass-panel rounded-lg p-6">
                  <h3 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2 glow-text">
                    <svg className="h-6 w-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    🎯 60-Minute Screen-Recorded Google Meet Session
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">Session Structure & Timeline</h4>
                      <ul className="space-y-3 text-gray-300">
                        <li className="flex items-start gap-3">
                          <span className="text-orange-400 font-bold text-sm bg-orange-400/20 px-2 py-1 rounded">0-10 min</span>
                          <span>Introduction & Goal Assessment</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-orange-400 font-bold text-sm bg-orange-400/20 px-2 py-1 rounded">10-25 min</span>
                          <span>Website/Store Planning & Setup</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-orange-400 font-bold text-sm bg-orange-400/20 px-2 py-1 rounded">25-45 min</span>
                          <span>Live Building & Development</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-orange-400 font-bold text-sm bg-orange-400/20 px-2 py-1 rounded">45-55 min</span>
                          <span>Deployment & Launch Process</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-orange-400 font-bold text-sm bg-orange-400/20 px-2 py-1 rounded">55-60 min</span>
                          <span>Q&A & Next Steps Planning</span>
                        </li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-4">What You'll Learn & Build</h4>
                      <ul className="space-y-2 text-gray-300">
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 font-bold">✓</span>
                          <span>Complete website/online store from scratch</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 font-bold">✓</span>
                          <span>Professional deployment on Vercel/Netlify</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 font-bold">✓</span>
                          <span>Payment integration & e-commerce setup</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 font-bold">✓</span>
                          <span>SEO optimization & performance tuning</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 font-bold">✓</span>
                          <span>Domain setup & custom branding</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 font-bold">✓</span>
                          <span>Analytics & tracking implementation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-orange-400 font-bold">✓</span>
                          <span>Maintenance & scaling strategies</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Session Preview */}
                <div className="glass-panel rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-2xl">🎬</span>
                    Session Preview & Deliverables
                  </h3>
                  <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-600 relative overflow-hidden">
                    <div className="filter blur-sm select-none pointer-events-none">
                      <h4 className="text-orange-400 font-bold mb-3">Sample Session Walkthrough:</h4>
                      <div className="text-gray-300 text-sm space-y-3">
                        <div className="bg-orange-900/20 p-3 rounded border-l-4 border-orange-400">
                          <p><strong>"Let's start by understanding your business goals..."</strong></p>
                          <p className="text-xs mt-1 text-gray-400">• Goal assessment and target audience identification</p>
                        </div>
                        <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-400">
                          <p><strong>"Now I'll show you how to set up your development environment..."</strong></p>
                          <p className="text-xs mt-1 text-gray-400">• Live screen recording of complete setup process</p>
                        </div>
                        <div className="bg-green-900/20 p-3 rounded border-l-4 border-green-400">
                          <p><strong>"Watch as we build your homepage step-by-step..."</strong></p>
                          <p className="text-xs mt-1 text-gray-400">• Real-time coding and implementation</p>
                        </div>
                        <div className="bg-purple-900/20 p-3 rounded border-l-4 border-purple-400">
                          <p><strong>"Finally, let's deploy your site and make it live..."</strong></p>
                          <p className="text-xs mt-1 text-gray-400">• Complete deployment and launch process</p>
                        </div>
                        <div className="mt-4 p-3 bg-gray-700/30 rounded">
                          <h5 className="font-semibold text-white mb-2">📋 Detailed Implementation Report Includes:</h5>
                          <ul className="text-xs space-y-1">
                            <li>• Complete code repository with documentation</li>
                            <li>• Step-by-step deployment instructions</li>
                            <li>• Recommended tools and resources list</li>
                            <li>• Performance optimization checklist</li>
                            <li>• Future enhancement roadmap</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-6">
                      <div className="text-center">
                        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 rounded-full font-semibold shadow-lg">
                          🔓 Book Your Session Now
                        </div>
                        <p className="text-gray-300 text-sm mt-2">Get personalized guidance and implementation</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <div className="glass-panel rounded-lg p-6 text-center">
              <BuyNowButton product={product} />
              <p className="text-gray-300 text-sm mt-4">Secure checkout • Instant download</p>
              <div className="mt-4 pt-4 border-t border-gray-600">
                <AddToCartButton product={product} />
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center gap-6 pt-6 border-t border-gray-700">
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="h-5 w-5 text-green-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm">Secure Payment</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="h-5 w-5 text-blue-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">{product.category === 'services' ? 'Quick Booking' : 'Instant Download'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <svg className="h-5 w-5 text-purple-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Quality Products</span>
              </div>
            </div>
          </div>
        </div>
        

      </div>
    </div>
  );
}