// server/utils/mailer.js
import nodemailer from "nodemailer";

function createTransport() {
	if (!process.env.SMTP_HOST) return null;
	const port = Number(process.env.SMTP_PORT || 587);
	const secure = port === 465;
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port,
		secure,
		auth: process.env.SMTP_USER
			? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
			: undefined,
	});
}

export async function sendShareInvite({ to, url, role, mediaTitle, inviterName }) {
	const transport = createTransport();
	if (!transport) {
		console.warn("SMTP not configured; skipping invite email to", to);
		return { skipped: true };
	}
	const from = process.env.SMTP_FROM || "no-reply@example.com";
	const subject = `You've been invited to ${role} access: ${mediaTitle}`;
	const html = `
		<div style="font-family:Arial,sans-serif;line-height:1.5">
			<p>Hi,</p>
			<p><strong>${inviterName || "Someone"}</strong> has shared media with you as a <strong>${role}</strong>.</p>
			<p>Click the button below to accept the invitation:</p>
			<p><a href="${url}" style="background:#16a34a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Accept invitation</a></p>
			<p>If the button doesn't work, copy and paste this link:</p>
			<p><a href="${url}">${url}</a></p>
			<p>This link may expire for security reasons.</p>
		</div>
	`;
	await transport.sendMail({ from, to, subject, html });
	return { sent: true };
}


