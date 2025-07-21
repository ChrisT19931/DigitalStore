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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not completed' });
    }

    const customerEmail = session.customer_email || session.metadata.email;

    // Generate a signed URL for the ebook download from Supabase Storage
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('ebooks')
      .createSignedUrl('ai-mastery-2025.pdf', 3600); // 1 hour expiry

    if (urlError) {
      console.error('Supabase URL error:', urlError);
      return res.status(500).json({ error: 'Failed to generate download link' });
    }

    // Store purchase record in database
    const { error: dbError } = await supabase
      .from('purchases')
      .insert([
        {
          stripe_session_id: session_id,
          customer_email: customerEmail,
          product: 'ai-mastery-ebook-2025',
          amount: session.amount_total,
          currency: session.currency,
          payment_status: session.payment_status,
          created_at: new Date().toISOString()
        }
      ]);

    if (dbError) {
      console.error('Database error:', dbError);
      // Continue even if DB insert fails - don't block download
    }

    // Send email with download link
    const emailContent = {
      to: customerEmail,
      from: {
        email: 'chris.t@ventarosales.com',
        name: 'AI Mastery 2025'
      },
      subject: 'Your AI Mastery 2025 Ebook is Ready!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin-bottom: 10px;">🎉 Welcome to AI Mastery!</h1>
            <p style="font-size: 18px; margin: 0;">Your ebook is ready for download</p>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; margin-bottom: 30px;">
            <h2 style="color: white; margin-top: 0;">AI Mastery 2025 Ebook</h2>
            <p style="margin-bottom: 25px;">Thank you for your purchase! You now have access to the most comprehensive AI guide of 2025.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signedUrlData.signedUrl}" 
                 style="display: inline-block; background: #10B981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📥 Download Your Ebook
              </a>
            </div>
            
            <p style="font-size: 14px; color: #E5E7EB;">
              <strong>Note:</strong> This download link will expire in 1 hour for security. If you need a new link, please contact support.
            </p>
          </div>
          
          <div style="background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: white; margin-top: 0;">What's Inside:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>500+ AI prompts for maximum productivity</li>
              <li>Complete guide to AI agents and bots</li>
              <li>Proven strategies to make money with AI</li>
              <li>Website creation workflow (GPT → Manus → Cursor → Git → Vercel)</li>
              <li>Future AI trends and positioning strategies</li>
              <li>Daily AI workflow essentials</li>
            </ul>
          </div>
          
          <div style="text-align: center; padding: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
            <p style="margin: 0; font-size: 14px;">
              Need help? Contact us at <a href="mailto:chris.t@ventarosales.com" style="color: #60A5FA;">chris.t@ventarosales.com</a>
            </p>
          </div>
        </div>
      `
    };

    try {
      await sgMail.send(emailContent);
    } catch (emailError) {
      console.error('Email error:', emailError);
      // Continue even if email fails - don't block download
    }

    res.status(200).json({
      downloadUrl: signedUrlData.signedUrl,
      email: customerEmail,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

