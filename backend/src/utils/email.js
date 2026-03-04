const nodemailer = require('nodemailer');

/**
 * Create a nodemailer transporter using SMTP configuration from environment variables.
 * 
 * Required environment variables:
 *   SMTP_HOST - SMTP server hostname (e.g., smtp.gmail.com)
 *   SMTP_PORT - SMTP server port (e.g., 587)
 *   SMTP_USER - SMTP username/email
 *   SMTP_PASS - SMTP password or app password
 * 
 * Optional environment variables:
 *   SMTP_FROM - Sender email address (defaults to SMTP_USER)
 *   SMTP_SECURE - Use TLS (defaults to false; true for port 465)
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Send an email with a CSV file attachment.
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @param {string} filename - Attachment filename
 * @param {string} filePath - Path to the CSV file to attach
 * @returns {Promise<object>} - Nodemailer send result
 * @throws {Error} - If SMTP is not configured or sending fails
 */
async function sendEmailWithAttachment(to, subject, body, filename, filePath) {
  const transporter = createTransporter();

  if (!transporter) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const mailOptions = {
    from,
    to,
    subject,
    text: body,
    attachments: [
      {
        filename,
        path: filePath,
      },
    ],
  };

  return transporter.sendMail(mailOptions);
}

module.exports = {
  createTransporter,
  sendEmailWithAttachment,
};
