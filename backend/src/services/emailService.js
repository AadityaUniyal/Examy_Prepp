import nodemailer from 'nodemailer';

/**
 * Sends user feedback as an email to aadityacheeks@gmail.com
 * Supports configuration via environment variables: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
export async function sendFeedbackEmail({ userEmail, userName, rating, feedbackType, message }) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  console.log(`[EmailService] Attempting to send feedback email from ${userEmail} (${userName})...`);

  let transporter;
  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } else {
    console.warn('[EmailService] SMTP credentials not provided in env. Creating a test Ethereal SMTP transporter...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.error('[EmailService] Failed to create Ethereal account. Using console logger fallback.', err.message);
      transporter = {
        sendMail: async (options) => {
          console.log('====== MOCK EMAIL START ======');
          console.log('To:', options.to);
          console.log('Subject:', options.subject);
          console.log('Body Text:', options.text);
          console.log('====== MOCK EMAIL END ======');
          return { messageId: 'mock-id-123' };
        }
      };
    }
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f8fafc; color: #1e293b;">
      <h2 style="color: #4f46e5; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-top: 0;">New Feedback Received!</h2>
      <p><strong>From User:</strong> ${userName} (${userEmail})</p>
      <p><strong>Feedback Type:</strong> <span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 13px;">${feedbackType}</span></p>
      <p><strong>Rating:</strong> <span style="color: #eab308; font-size: 18px;">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</span> (${rating}/5)</p>
      <div style="background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; margin-top: 15px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);">
        <p style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.5; color: #334155;">${message}</p>
      </div>
      <footer style="margin-top: 25px; font-size: 11px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px;">
        Sent via ExamEve Feedback System • ${new Date().toLocaleString()}
      </footer>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"ExamEve Feedback" <${user || 'feedback@exameve.com'}>`,
      to: 'aadityacheeks@gmail.com',
      subject: `[ExamEve Feedback] ${feedbackType} from ${userName}`,
      text: `New Feedback from ${userName} (${userEmail}):\nType: ${feedbackType}\nRating: ${rating}/5\nMessage: ${message}`,
      html: htmlContent,
    });

    console.log(`[EmailService] Feedback email sent! Message ID: ${info.messageId}`);
    if (!user || !pass) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EmailService] Preview URL for test email: ${previewUrl}`);
      }
    }
    return true;
  } catch (err) {
    console.error('[EmailService] Error occurred during email dispatch:', err.message);
    throw new Error('Failed to send feedback email: ' + err.message);
  }
}
