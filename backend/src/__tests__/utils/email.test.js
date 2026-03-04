const nodemailer = require('nodemailer');

jest.mock('nodemailer');

const { createTransporter, sendEmailWithAttachment } = require('../../utils/email');

describe('Email Utility', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createTransporter', () => {
    test('should return null when SMTP_HOST is not set', () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const transporter = createTransporter();

      expect(transporter).toBeNull();
    });

    test('should return null when SMTP_USER is not set', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      delete process.env.SMTP_USER;
      process.env.SMTP_PASS = 'password123';

      const transporter = createTransporter();

      expect(transporter).toBeNull();
    });

    test('should return null when SMTP_PASS is not set', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_USER = 'user@example.com';
      delete process.env.SMTP_PASS;

      const transporter = createTransporter();

      expect(transporter).toBeNull();
    });

    test('should create transporter with correct config when all env vars set', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password123';

      const mockTransporter = { sendMail: jest.fn() };
      nodemailer.createTransport.mockReturnValue(mockTransporter);

      const transporter = createTransporter();

      expect(transporter).toBe(mockTransporter);
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: {
          user: 'user@example.com',
          pass: 'password123',
        },
      });
    });

    test('should default to port 587 when SMTP_PORT is not set', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      delete process.env.SMTP_PORT;
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password123';

      const mockTransporter = { sendMail: jest.fn() };
      nodemailer.createTransport.mockReturnValue(mockTransporter);

      createTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ port: 587 })
      );
    });

    test('should set secure to true when SMTP_SECURE is true', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password123';
      process.env.SMTP_SECURE = 'true';

      const mockTransporter = { sendMail: jest.fn() };
      nodemailer.createTransport.mockReturnValue(mockTransporter);

      createTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true })
      );
    });

    test('should set secure to true when port is 465', () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '465';
      process.env.SMTP_USER = 'user@example.com';
      process.env.SMTP_PASS = 'password123';

      const mockTransporter = { sendMail: jest.fn() };
      nodemailer.createTransport.mockReturnValue(mockTransporter);

      createTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({ secure: true, port: 465 })
      );
    });
  });

  describe('sendEmailWithAttachment', () => {
    test('should throw error when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      await expect(
        sendEmailWithAttachment('to@example.com', 'Subject', 'Body', 'file.csv', '/path/to/file.csv')
      ).rejects.toThrow('SMTP is not configured');
    });

    test('should send email with correct options when SMTP is configured', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'sender@example.com';
      process.env.SMTP_PASS = 'password123';

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '123' });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      const result = await sendEmailWithAttachment(
        'recipient@example.com',
        'Test Subject',
        'Test Body',
        'report.csv',
        '/tmp/report.csv'
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test Subject',
        text: 'Test Body',
        attachments: [
          {
            filename: 'report.csv',
            path: '/tmp/report.csv',
          },
        ],
      });
      expect(result).toEqual({ messageId: '123' });
    });

    test('should use SMTP_FROM as sender when set', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'sender@example.com';
      process.env.SMTP_PASS = 'password123';
      process.env.SMTP_FROM = 'noreply@example.com';

      const mockSendMail = jest.fn().mockResolvedValue({ messageId: '456' });
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await sendEmailWithAttachment(
        'recipient@example.com',
        'Subject',
        'Body',
        'file.csv',
        '/tmp/file.csv'
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'noreply@example.com' })
      );
    });

    test('should propagate sendMail errors', async () => {
      process.env.SMTP_HOST = 'smtp.example.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'sender@example.com';
      process.env.SMTP_PASS = 'password123';

      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP connection failed'));
      nodemailer.createTransport.mockReturnValue({ sendMail: mockSendMail });

      await expect(
        sendEmailWithAttachment('to@example.com', 'Subject', 'Body', 'file.csv', '/path/file.csv')
      ).rejects.toThrow('SMTP connection failed');
    });
  });
});
