import { Resend } from 'resend';
import { logger } from '../utils/logger';

// Initialize Resend client lazily to ensure env vars are loaded
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    resend = new Resend(apiKey);
    logger.info('Resend client initialized');
  }
  return resend;
}

interface AlertEmailParams {
  to: string;
  companyName: string;
  domain: string;
  eventType: string;
  severity: string;
  oldSnippet?: string;
  newSnippet?: string;
  sourceUrl: string;
  eventId: string;
}

export const sendAlertEmail = async (params: AlertEmailParams): Promise<void> => {
  try {
    const {
      to,
      companyName,
      domain,
      eventType,
      severity,
      oldSnippet,
      newSnippet,
      sourceUrl,
      eventId,
    } = params;

    const appUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    const viewDiffUrl = `${appUrl}/events/${eventId}`;

    let summary = '';
    switch (eventType) {
      case 'REMOVED':
        summary = `Critical: Trust claim removed from Acme Corp (Demo)`;
        break;
      case 'WEAKENED':
        summary = `Critical: Trust claim weakened on Acme Corp (Demo)}`;
        break;
      case 'REVERSED':
        summary = `Critical: Trust claim reversed on Acme Corp (Demo)`;
        break;
      case 'NUMBER_CHANGED':
        summary = `Medium: Numeric claim changed on Acme Corp (Demo)`;
        break;
      case 'ADDED':
        summary = `Info: New trust claim added to Acme Corp (Demo)`;
        break;
      default:
        summary = `Change detected on Acme Corp (Demo)`;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header.medium { background: #f59e0b; }
    .header.info { background: #3b82f6; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
    .snippet { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #dc2626; }
    .snippet.old { border-left-color: #ef4444; }
    .snippet.new { border-left-color: #22c55e; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header ${severity.toLowerCase()}">
      <h1>🔍 TrustWatch Alert</h1>
      <p style="margin: 0; font-size: 18px;">${summary}</p>
    </div>
    <div class="content">
      <p><strong>Company:</strong> ${companyName}</p>
      <p><strong>Domain:</strong> ${domain}</p>
      <p><strong>Severity:</strong> <span style="color: ${severity === 'Critical' ? '#dc2626' : severity === 'Medium' ? '#f59e0b' : '#3b82f6'};">${severity}</span></p>
      <p><strong>Event Type:</strong> ${eventType}</p>
      <p><strong>Source:</strong> <a href="${sourceUrl}">${sourceUrl}</a></p>
      
      ${oldSnippet ? `
      <div class="snippet old">
        <strong>❌ Previous:</strong>
        <p>${oldSnippet}</p>
      </div>
      ` : ''}
      
      ${newSnippet ? `
      <div class="snippet new">
        <strong>✅ Current:</strong>
        <p>${newSnippet}</p>
      </div>
      ` : ''}
      
      ${!newSnippet && oldSnippet ? `
      <div class="snippet">
        <strong>⚠️ This claim has been removed from the page</strong>
      </div>
      ` : ''}
      
      <a href="${viewDiffUrl}" class="button">View Full Diff →</a>
      
      <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 6px;">
        <strong>Recommended Action:</strong>
        ${getRecommendedAction(eventType, severity)}
      </div>
    </div>
    <div class="footer">
      <p>This is an automated alert from TrustWatch. You're receiving this because a critical change was detected in a company you're monitoring.</p>
      <p>To manage your alerts, visit your <a href="${appUrl}/dashboard">dashboard</a>.</p>
    </div>
  </div>
</body>
</html>
    `;

    logger.info(`Sending alert email to ${to} for event ${eventId}`);

    const resendClient = getResendClient();
    const result = await resendClient.emails.send({
      from: process.env.ALERT_FROM_EMAIL || 'alerts@trustwatch.com',
      to,
      subject: `[${severity}] ${summary}`,
      html,
    });

    logger.info(`Alert email sent successfully`, { emailId: result.data?.id });
  } catch (error: any) {
    logger.error('Failed to send alert email:', {
      error: error.message,
      params,
    });
    throw error;
  }
};

const getRecommendedAction = (eventType: string, severity: string): string => {
  if (eventType === 'REMOVED' && severity === 'Critical') {
    return 'Contact the vendor immediately to verify if their compliance certification has expired or been revoked. Consider pausing new onboarding until verified.';
  }
  if (eventType === 'WEAKENED' && severity === 'Critical') {
    return 'Review your data processing agreement with this vendor. Their privacy policy has changed in a way that may affect your obligations.';
  }
  if (eventType === 'NUMBER_CHANGED') {
    return 'Review your SLA and determine if this change violates your agreement. Consider requesting an updated service level agreement.';
  }
  return 'Review the change and assess impact on your risk posture.';
};

export const sendTestEmail = async (to: string): Promise<void> => {
  try {
    const resendClient = getResendClient();
    const result = await resendClient.emails.send({
      from: process.env.ALERT_FROM_EMAIL || 'alerts@trustwatch.com',
      to,
      subject: 'TrustWatch Test Email',
      html: '<h1>✅ TrustWatch Email Integration Working</h1><p>This is a test email from TrustWatch. If you received this, Resend integration is configured correctly.</p>',
    });

    logger.info('Test email sent successfully', { emailId: result.data?.id });
  } catch (error) {
    logger.error('Test email failed:', error);
    throw error;
  }
};
