const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');
const sgMail = require('@sendgrid/mail');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      
      try {
        // Generate download link
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('ebooks')
          .createSignedUrl('ai-mastery-2025.pdf', 86400); // 24 hours expiry

        if (urlError) {
          console.error('Supabase URL error:', urlError);
          break;
        }

        // Store purchase record
        const { error: dbError } = await supabase
          .from('purchases')
          .insert([
            {
              stripe_session_id: session.id,
              customer_email: session.customer_email || session.metadata.email,
              product: 'ai-mastery-ebook-2025',
              amount: session.amount_total,
              currency: session.currency,
              payment_status: session.payment_status,
              created_at: new Date().toISOString()
            }
          ]);

        if (dbError) {
          console.error('Database error:', dbError);
        }

        // Send confirmation email with download link
        const emailContent = {
          to: session.customer_email || session.metadata.email,
          from: {
            email: 'chris.t@ventarosales.com',
            name: 'AI Mastery 2025'
          },
          subject: '🎉 Your AI Mastery 2025 Ebook is Ready!',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: white; margin-bottom: 10px;">🎉 Payment Successful!</h1>
                <p style="font-size: 18px; margin: 0;">Your AI Mastery 2025 Ebook is ready</p>
              </div>
              
              <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; margin-bottom: 30px;">
                <h2 style="color: white; margin-top: 0;">Thank You for Your Purchase!</h2>
                <p style="margin-bottom: 25px;">You've just taken the first step towards mastering AI in 2025. Your comprehensive guide is ready for immediate download.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${signedUrlData.signedUrl}" 
                     style="display: inline-block; background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    📥 Download Your Ebook Now
                  </a>
                </div>
                
                <p style="font-size: 14px; color: #E5E7EB;">
                  <strong>Note:</strong> This download link is valid for 24 hours. Save the file to your device for permanent access.
                </p>
              </div>
              
              <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                <h3 style="color: white; margin-top: 0;">What You'll Learn:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>500+ AI prompts for ChatGPT, Claude, and other tools</li>
                  <li>How to build AI agents with Manus and AutoGPT</li>
                  <li>Proven strategies to make money with AI</li>
                  <li>Complete website creation workflow</li>
                  <li>Future AI trends and positioning strategies</li>
                  <li>Daily AI workflow essentials</li>
                </ul>
              </div>
              
              <div style="background: rgba(16, 185, 129, 0.2); padding: 20px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #10B981;">
                <h3 style="color: white; margin-top: 0;">💡 Quick Start Tip</h3>
                <p style="margin: 0;">Begin with Chapter 1: AI Fundamentals, then jump to the sections most relevant to your goals. Each chapter is designed to deliver immediate value.</p>
              </div>
              
              <div style="text-align: center; padding: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
                <p style="margin: 0 0 10px 0; font-size: 14px;">
                  Questions? We're here to help!
                </p>
                <p style="margin: 0; font-size: 14px;">
                  Contact: <a href="mailto:chris.t@ventarosales.com" style="color: #60A5FA;">chris.t@ventarosales.com</a>
                </p>
              </div>
            </div>
          `
        };

        await sgMail.send(emailContent);
        console.log('Purchase confirmation email sent successfully');

      } catch (error) {
        console.error('Error processing successful payment:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      console.log('Payment failed:', event.data.object);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

