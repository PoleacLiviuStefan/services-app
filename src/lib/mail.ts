// lib/mail.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,       // ex: smtp-relay.brevo.com
  port: Number(process.env.SMTP_PORT), // 587
  secure: false,                     // STARTTLS
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,     // ex: no-reply@domeniul-tau.ro
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/verificare-mail?token=${token}`;

  await transporter.sendMail({
    envelope: {
      from: process.env.FROM_MAIL,
      to,
    },
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: "Verifică-ți adresa de e-mail",
    html: `
      <p>Bine ai venit!</p>
      <p>Click <a href="${url}">aici</a> pentru a-ți verifica contul. Link-ul expiră în 24 ore.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/resetare-parola?token=${token}`;
  await transporter.sendMail({
    envelope: { from: process.env.FROM_MAIL, to },
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: "Resetare parolă",
    html: `
      <p>Ai cerut resetarea parolei.</p>
      <p>Click <a href="${url}">aici</a> pentru a-ți seta o parolă nouă. Link-ul expiră în 1h.</p>
    `,
  });
}
