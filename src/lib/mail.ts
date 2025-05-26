// lib/mail.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // folosește TLS
  auth: {
    user: process.env.EMAIL_USER, // de ex. yourname@gmail.com
    pass: process.env.EMAIL_PASS, // parola sau, mai bine, parola de aplicație
  },
});

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: `"My App" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verifică-ți adresa de e-mail",
    html: `
      <p>Bine ai venit!</p>
      <p>Click <a href="${url}">aici</a> pentru a-ți verifica contul. Link-ul expiră în 24h.</p>
    `,
  });
}
