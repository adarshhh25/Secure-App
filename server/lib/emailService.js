import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    // Validate environment variables
    if (!process.env.EMAIL_USER) {
      throw new Error('EMAIL_USER environment variable is required');
    }
    if (!process.env.EMAIL_PASS) {
      throw new Error('EMAIL_PASS environment variable is required');
    }
    
    // Create Nodemailer transporter with Gmail SMTP
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false // For development; remove in production if using proper certs
      }
    });
    
    this.fromEmail = process.env.EMAIL_USER;
    console.log(`📧 Email service initialized with: ${this.getMaskedEmail(this.fromEmail)}`);
  }

  async sendStegOtp(email, otp, purpose) {
    // Validate email before sending
    if (!email || !email.includes('@')) {
      throw new Error('Invalid email address');
    }

    const subject = 'Your OTP Code';
    
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">🔐 Secure App Verification</h2>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; font-size: 36px; margin: 0; letter-spacing: 8px;">${otp}</h1>
        </div>
        <p style="margin: 20px 0; color: #666;">
          Use this OTP to ${purpose === 'SEND' ? 'send your secure message' : 'decode the hidden message'}.
        </p>
        <p style="color: #999; font-size: 14px;">
          • This OTP expires in 5 minutes<br>
          • Do not share this code with anyone<br>
          • If you didn't request this, please ignore
        </p>
      </div>
    `;

    try {
      console.log(`📧 Sending OTP to: ${email}`);
      console.log(`📤 From: ${this.getMaskedEmail(this.fromEmail)}`);
      
      // Send email via Nodemailer
      const info = await this.transporter.sendMail({
        from: `"Secure App" <${this.fromEmail}>`,
        to: email,
        subject: subject,
        html: htmlContent
      });

      console.log(`✅ OTP email sent successfully to ${email}`);
      console.log(`📨 Message ID: ${info.messageId}`);
      console.log(`📬 Response: ${info.response}`);
      
      return info;
    } catch (error) {
      console.error(`❌ Failed to send OTP email to ${email}`);
      console.error('Error details:', error.message);
      console.error('Error code:', error.code);
      console.error('Error command:', error.command);
      
      // Throw descriptive error
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  // Verify SMTP connection
  async verifyConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Gmail SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('❌ Gmail SMTP connection failed:', error.message);
      return false;
    }
  }

  // Mask email for logging
  getMaskedEmail(email) {
    const [local, domain] = email.split('@');
    if (local.length <= 2) return email;
    
    const maskedLocal = local.charAt(0) + '*'.repeat(local.length - 2) + local.charAt(local.length - 1);
    return `${maskedLocal}@${domain}`;
  }
}

export default new EmailService();