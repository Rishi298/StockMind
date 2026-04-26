import nodemailer from 'nodemailer';

const EMAIL_FROM = process.env.EMAIL_FROM ?? '';
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD ?? '';

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: EMAIL_FROM, pass: EMAIL_APP_PASSWORD },
  });
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!EMAIL_FROM || !EMAIL_APP_PASSWORD) {
    console.warn('Email not configured. Set EMAIL_FROM and EMAIL_APP_PASSWORD in .env.local');
    return;
  }
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `StockMind Terminal <${EMAIL_FROM}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}

export function buildDigestHtml(params: {
  totalValue: number;
  totalPnL: number;
  totalPnLPct: number;
  topGainers: Array<{ symbol: string; pnlPct: number }>;
  topLosers: Array<{ symbol: string; pnlPct: number }>;
  recentAlerts: Array<{ title: string; message: string; severity: string }>;
}): string {
  const pnlColor = params.totalPnL >= 0 ? '#22c55e' : '#ef4444';
  const fmt = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const alertRows = params.recentAlerts.map((a) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #292524;">
        <span style="color:${a.severity === 'high' ? '#ef4444' : a.severity === 'medium' ? '#f59e0b' : '#6b7280'};font-weight:600;">${a.title}</span><br>
        <span style="color:#a8a29e;font-size:12px;">${a.message}</span>
      </td>
    </tr>`).join('');

  const gainerRows = params.topGainers.map((g) =>
    `<tr><td style="padding:6px;color:#d6d3d1;">${g.symbol}</td><td style="padding:6px;color:#22c55e;font-weight:600;">+${fmt(g.pnlPct)}%</td></tr>`
  ).join('');

  const loserRows = params.topLosers.map((l) =>
    `<tr><td style="padding:6px;color:#d6d3d1;">${l.symbol}</td><td style="padding:6px;color:#ef4444;font-weight:600;">${fmt(l.pnlPct)}%</td></tr>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="background:#1c1917;font-family:Arial,sans-serif;color:#d6d3d1;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#292524;border-radius:12px;overflow:hidden;border:1px solid #44403c;">
    <div style="background:#f59e0b;padding:16px 24px;">
      <h1 style="color:#1c1917;margin:0;font-size:18px;">📊 StockMind Daily Portfolio Digest</h1>
      <p style="color:#44403c;margin:4px 0 0;font-size:12px;">${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <div style="padding:24px;">
      <div style="background:#1c1917;border-radius:8px;padding:16px;margin-bottom:20px;text-align:center;">
        <p style="margin:0;color:#a8a29e;font-size:12px;">TOTAL PORTFOLIO VALUE</p>
        <p style="margin:8px 0;font-size:28px;font-weight:700;color:#fafaf9;">₹${fmt(params.totalValue)}</p>
        <p style="margin:0;font-size:16px;color:${pnlColor};font-weight:600;">
          ${params.totalPnL >= 0 ? '+' : ''}₹${fmt(params.totalPnL)} (${params.totalPnL >= 0 ? '+' : ''}${fmt(params.totalPnLPct)}%)
        </p>
      </div>

      ${params.topGainers.length > 0 || params.topLosers.length > 0 ? `
      <div style="display:flex;gap:16px;margin-bottom:20px;">
        ${params.topGainers.length > 0 ? `
        <div style="flex:1;background:#1c1917;border-radius:8px;padding:12px;">
          <p style="margin:0 0 8px;color:#22c55e;font-size:12px;font-weight:600;">TOP GAINERS</p>
          <table style="width:100%;border-collapse:collapse;">${gainerRows}</table>
        </div>` : ''}
        ${params.topLosers.length > 0 ? `
        <div style="flex:1;background:#1c1917;border-radius:8px;padding:12px;">
          <p style="margin:0 0 8px;color:#ef4444;font-size:12px;font-weight:600;">TOP LOSERS</p>
          <table style="width:100%;border-collapse:collapse;">${loserRows}</table>
        </div>` : ''}
      </div>` : ''}

      ${params.recentAlerts.length > 0 ? `
      <div style="background:#1c1917;border-radius:8px;padding:12px;margin-bottom:20px;">
        <p style="margin:0 0 8px;color:#f59e0b;font-size:12px;font-weight:600;">RECENT ALERTS</p>
        <table style="width:100%;border-collapse:collapse;">${alertRows}</table>
      </div>` : ''}

      <div style="text-align:center;border-top:1px solid #44403c;padding-top:16px;margin-top:4px;">
        <p style="color:#57534e;font-size:11px;margin:0;">
          StockMind Terminal · Educational use only · Not investment advice<br>
          Data from Yahoo Finance & MFAPI.in
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
