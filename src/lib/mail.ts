// lib/mail.ts - SISTEM COMPLET DE EMAIL-URI PENTRU CONSULTAȚII
import nodemailer from "nodemailer";

interface ConsultationReminderData {
  clientEmail: string;
  clientName: string;
  providerEmail: string;
  providerName: string;
  sessionId: string;
  scheduledTime: string;
  meetingLink?: string;
  consultationType: string;
  customMessage?: string;
  timeUntilSession?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Funcții existente pentru user management
export async function sendInvoiceEmail(to: string, invoiceNumber: string, invoiceUrl: string) {
  await transporter.sendMail({
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: `Achiziție Pachet MysticGold #${invoiceNumber}`,
    html: `
      <p>Bună ziua,</p>
      <p>În atașament găsiți factura dumneavoastră cu numărul <strong>${invoiceNumber}</strong>.</p>
      <p>Puteți descărca PDF-ul de aici: <a href="${invoiceUrl}">${invoiceUrl}</a></p>
      <p>Mulțumim pentru achiziție!</p>
    `,
  });
}

export async function sendVerificationEmail(to: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_BASE_URL}/verificare-mail?token=${token}`;
 
  await transporter.sendMail({
    envelope: { from: process.env.FROM_MAIL, to },
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

// 🆕 SISTEMA COMPLETĂ DE REMINDER-URI PENTRU CONSULTAȚII

export async function sendConsultationReminder24h(
  to: string,
  clientName: string,
  providerName: string,
  sessionStartTime: string,
  sessionEndTime: string,
  dailyRoomUrl?: string,
  sessionNotes?: string
) {
  const startDate = new Date(sessionStartTime);
  const endDate = new Date(sessionEndTime);
  
  const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeFormatter = new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest'
  });

  const sessionDate = dateFormatter.format(startDate);
  const sessionTime = `${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
  const joinUrl = dailyRoomUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/servicii/video/sessions`;
  
  await transporter.sendMail({
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: `🔔 Reminder: Consultația ta cu ${providerName} este mâine`,
    html: generateReminderEmailTemplate({
      type: '24h',
      clientName,
      providerName,
      sessionDate,
      sessionTime,
      sessionNotes,
      joinUrl,
      dailyRoomUrl
    }),
  });
}

export async function sendConsultationReminder1h(
  to: string,
  clientName: string,
  providerName: string,
  sessionStartTime: string,
  sessionEndTime: string,
  dailyRoomUrl?: string,
  sessionNotes?: string
) {
  const startDate = new Date(sessionStartTime);
  const endDate = new Date(sessionEndTime);
  
  const timeFormatter = new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest'
  });

  const sessionTime = `${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
  const joinUrl = dailyRoomUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/servicii/video/sessions`;
  
  await transporter.sendMail({
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: `🚀 Consultația ta cu ${providerName} începe în 1 oră!`,
    html: generateReminderEmailTemplate({
      type: '1h',
      clientName,
      providerName,
      sessionTime,
      sessionNotes,
      joinUrl,
      dailyRoomUrl
    }),
  });
}

// 🆕 FUNCȚIE NOUĂ: REMINDER LA TIMP (2 minute înainte)
export async function sendConsultationReminderAtTime(
  to: string,
  clientName: string,
  providerName: string,
  sessionStartTime: string,
  sessionEndTime: string,
  dailyRoomUrl?: string,
  sessionNotes?: string
) {
  const startDate = new Date(sessionStartTime);
  const endDate = new Date(sessionEndTime);
  
  const timeFormatter = new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest'
  });

  const sessionTime = `${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
  const joinUrl = dailyRoomUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/servicii/video/sessions`;
  
  await transporter.sendMail({
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: `⚡ URGENT: Consultația ta cu ${providerName} începe ACUM!`,
    html: generateReminderEmailTemplate({
      type: 'at_time',
      clientName,
      providerName,
      sessionTime,
      sessionNotes,
      joinUrl,
      dailyRoomUrl
    }),
  });
}

export async function sendConsultationConfirmation(
  to: string,
  clientName: string,
  providerName: string,
  sessionId: string,
  sessionStartTime: string,
  sessionEndTime: string,
  packageInfo?: {
    packageName: string;
    sessionNumber: number;
    remainingSessions: number;
  }
) {
  const startDate = new Date(sessionStartTime);
  const endDate = new Date(sessionEndTime);
  
  const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeFormatter = new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest'
  });

  const sessionDate = dateFormatter.format(startDate);
  const sessionTime = `${timeFormatter.format(startDate)} - ${timeFormatter.format(endDate)}`;
  const mySessionsUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/servicii/video/sessions`;
  
  await transporter.sendMail({
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: `✅ Consultația cu ${providerName} a fost confirmată`,
    html: generateConfirmationEmailTemplate({
      clientName,
      providerName,
      sessionId,
      sessionDate,
      sessionTime,
      mySessionsUrl,
      packageInfo
    }),
  });
}

// 🆕 FUNCȚII NOI: EMAIL-URI PENTRU ANULARE ȘI REPROGRAMARE

export async function sendConsultationCancellationEmail(
  to: string,
  clientName: string,
  providerName: string,
  sessionId: string,
  sessionStartTime: string,
  reason?: string,
  refundInfo?: string
) {
  const startDate = new Date(sessionStartTime);
  
  const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeFormatter = new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest'
  });

  const sessionDate = dateFormatter.format(startDate);
  const sessionTime = timeFormatter.format(startDate);
  
  await transporter.sendMail({
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: `❌ Consultația cu ${providerName} a fost anulată`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #f56565 0%, #c53030 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">❌ MysticGold</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Consultație Anulată</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
          <h2 style="color: #c53030; margin-top: 0;">Bună ziua, ${clientName}!</h2>
          
          <p>Ne pare rău să vă informăm că consultația cu <strong>${providerName}</strong> a fost anulată.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #c53030; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #c53030;">📅 Detalii Consultație Anulată</h3>
            <p style="margin: 5px 0;"><strong>🆔 ID Sesiune:</strong> ${sessionId}</p>
            <p style="margin: 5px 0;"><strong>📍 Data:</strong> ${sessionDate}</p>
            <p style="margin: 5px 0;"><strong>⏰ Ora:</strong> ${sessionTime}</p>
            <p style="margin: 5px 0;"><strong>👨‍⚕️ Consultant:</strong> ${providerName}</p>
            ${reason ? `<p style="margin: 5px 0;"><strong>📝 Motiv:</strong> ${reason}</p>` : ''}
          </div>
          
          ${refundInfo ? `
          <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #155724;">💰 Informații Rambursare</h3>
            <p style="margin: 0; color: #155724;">${refundInfo}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/servicii/video/sessions" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      font-weight: bold; 
                      display: inline-block;">
              📋 Programează o Nouă Consultație
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="text-align: center; color: #718096; font-size: 14px;">
            Pentru întrebări, ne poți contacta la <a href="mailto:${process.env.FROM_MAIL}">${process.env.FROM_MAIL}</a>
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendConsultationRescheduleEmail(
  to: string,
  clientName: string,
  providerName: string,
  sessionId: string,
  oldSessionTime: string,
  newSessionTime: string,
  newSessionEndTime: string,
  reason?: string
) {
  const oldDate = new Date(oldSessionTime);
  const newStartDate = new Date(newSessionTime);
  const newEndDate = new Date(newSessionEndTime);
  
  const dateFormatter = new Intl.DateTimeFormat('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const timeFormatter = new Intl.DateTimeFormat('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Bucharest'
  });

  const oldSessionDate = `${dateFormatter.format(oldDate)}, ${timeFormatter.format(oldDate)}`;
  const newSessionDate = dateFormatter.format(newStartDate);
  // const newSessionTime = `${timeFormatter.format(newStartDate)} - ${timeFormatter.format(newEndDate)}`;
  
  await transporter.sendMail({
    from: `"MysticGold" <${process.env.FROM_MAIL}>`,
    to,
    subject: `🔄 Consultația cu ${providerName} a fost reprogramată`,
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔄 MysticGold</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Consultație Reprogramată</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
          <h2 style="color: #ed8936; margin-top: 0;">Bună ziua, ${clientName}!</h2>
          
          <p>Consultația dumneavoastră cu <strong>${providerName}</strong> a fost reprogramată.</p>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #856404;">📅 Ora Veche (Anulată)</h3>
            <p style="margin: 5px 0;"><strong>🕐 Era programată:</strong> ${oldSessionDate}</p>
            ${reason ? `<p style="margin: 5px 0;"><strong>📝 Motiv:</strong> ${reason}</p>` : ''}
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #38a169; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #38a169;">📅 Noua Programare</h3>
            <p style="margin: 5px 0;"><strong>🆔 ID Sesiune:</strong> ${sessionId}</p>
            <p style="margin: 5px 0;"><strong>📍 Data:</strong> ${newSessionDate}</p>
            <p style="margin: 5px 0;"><strong>⏰ Ora:</strong> ${newSessionTime}</p>
            <p style="margin: 5px 0;"><strong>👨‍⚕️ Consultant:</strong> ${providerName}</p>
          </div>
          
          <div style="background: #e6fffa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #2d3748;">📬 Ce urmează:</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Vei primi reminder-uri noi pentru noua programare</li>
              <li>Reminder-urile pentru vechea oră au fost anulate</li>
              <li>Poți vedea detaliile în contul tău</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL}/servicii/video/sessions" 
               style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 5px; 
                      font-weight: bold; 
                      display: inline-block;">
              📋 Vezi Consultațiile Mele
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="text-align: center; color: #718096; font-size: 14px;">
            Pentru întrebări, ne poți contacta la <a href="mailto:${process.env.FROM_MAIL}">${process.env.FROM_MAIL}</a>
          </p>
        </div>
      </div>
    `,
  });
}

// 🛠️ FUNCȚII HELPER PENTRU TEMPLATE-URI

function generateReminderEmailTemplate(data: {
  type: '24h' | '1h' | 'at_time';
  clientName: string;
  providerName: string;
  sessionDate?: string;
  sessionTime: string;
  sessionNotes?: string;
  joinUrl: string;
  dailyRoomUrl?: string;
}) {
  const { type, clientName, providerName, sessionDate, sessionTime, sessionNotes, joinUrl, dailyRoomUrl } = data;
  
  const templates = {
    '24h': {
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      icon: '🔔',
      title: 'Reminder Consultație',
      urgency: 'mâine',
      urgencyStyle: '',
      content: `
        <p>Vă aducem aminte că aveți o consultație programată <strong>mâine</strong> cu <strong>${providerName}</strong>.</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #4c51bf; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #4c51bf;">📅 Detalii Consultație</h3>
          <p style="margin: 5px 0;"><strong>📍 Data:</strong> ${sessionDate}</p>
          <p style="margin: 5px 0;"><strong>⏰ Ora:</strong> ${sessionTime}</p>
          <p style="margin: 5px 0;"><strong>👨‍⚕️ Consultant:</strong> ${providerName}</p>
          ${sessionNotes ? `<p style="margin: 5px 0;"><strong>📝 Note:</strong> ${sessionNotes}</p>` : ''}
        </div>
        
        <div style="background: #e6fffa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #2d3748;">💡 Ce să faci până mâine:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Asigură-te că ai o conexiune stabilă la internet</li>
            <li>Testează camera și microfonul</li>
            <li>Pregătește întrebările pe care vrei să le adresezi</li>
            <li>Găsește un loc liniștit pentru consultație</li>
          </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;"><strong>⚠️ Important:</strong> Vei primi un alt reminder cu o oră înainte de consultație cu link-ul direct către camera video.</p>
        </div>
      `,
      buttonText: '🎥 Accesează Consultația'
    },
    
    '1h': {
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      icon: '⏰',
      title: 'Consultația începe în curând!',
      urgency: '1 oră',
      urgencyStyle: 'color: #e53e3e;',
      content: `
        <p>Consultația ta cu <strong>${providerName}</strong> începe în <strong style="color: #e53e3e;">1 oră</strong>!</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #e53e3e; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #e53e3e;">🎯 Consultația ta</h3>
          <p style="margin: 5px 0;"><strong>⏰ Ora:</strong> ${sessionTime}</p>
          <p style="margin: 5px 0;"><strong>👨‍⚕️ Consultant:</strong> ${providerName}</p>
          ${sessionNotes ? `<p style="margin: 5px 0;"><strong>📝 Note:</strong> ${sessionNotes}</p>` : ''}
        </div>
        
        <div style="background: #fed7d7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #2d3748;">🔥 Checklist rapid (5 minute):</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>✅ Verifică conexiunea la internet</li>
            <li>✅ Testează camera și microfonul</li>
            <li>✅ Închide aplicațiile care pot deranja</li>
            <li>✅ Găsește un loc liniștit</li>
            <li>✅ Pregătește întrebările</li>
          </ul>
        </div>
        
        <div style="background: #bee3f8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #2a69ac;"><strong>💡 Sfat:</strong> Recomandăm să intri în cameră cu 2-3 minute înainte pentru a testa totul.</p>
        </div>
        
        ${dailyRoomUrl ? `
        <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px dashed #cbd5e0;">
          <p style="margin: 0 0 10px 0; color: #2d3748;"><strong>🔗 Link direct către cameră:</strong></p>
          <p style="margin: 0; word-break: break-all;"><a href="${dailyRoomUrl}" style="color: #3182ce;">${dailyRoomUrl}</a></p>
        </div>
        ` : ''}
      `,
      buttonText: '🎥 INTRĂ ÎN CONSULTAȚIE ACUM'
    },
    
    'at_time': {
      gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
      icon: '⚡',
      title: 'CONSULTAȚIA ÎNCEPE ACUM!',
      urgency: 'ACUM',
      urgencyStyle: 'color: #ff0000; font-weight: bold; text-transform: uppercase;',
      content: `
        <p style="font-size: 18px; font-weight: bold; color: #c53030;">Consultația ta cu <strong>${providerName}</strong> începe <span style="color: #ff0000;">CHIAR ACUM</span>!</p>
        
        <div style="background: #fff5f5; padding: 20px; border-radius: 8px; border: 2px solid #fc8181; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #c53030;">⚡ INTRĂ URGENT ÎN CONSULTAȚIE</h3>
          <p style="margin: 5px 0; font-size: 16px;"><strong>⏰ Ora:</strong> ${sessionTime}</p>
          <p style="margin: 5px 0; font-size: 16px;"><strong>👨‍⚕️ Consultant:</strong> ${providerName}</p>
          ${sessionNotes ? `<p style="margin: 5px 0;"><strong>📝 Note:</strong> ${sessionNotes}</p>` : ''}
        </div>
        
        ${dailyRoomUrl ? `
        <div style="background: #e6fffa; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #4fd1c7;">
          <h3 style="margin: 0 0 15px 0; color: #234e52;">🔗 LINK DIRECT - CLICK ACUM:</h3>
          <p style="margin: 0;"><a href="${dailyRoomUrl}" style="color: #319795; font-weight: bold; font-size: 16px;">${dailyRoomUrl}</a></p>
        </div>
        ` : ''}
        
        <div style="background: #fef5e7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #744210;"><strong>⚠️ URGENT:</strong> Consultantul te așteaptă! Intră cât mai repede în cameră.</p>
        </div>
      `,
      buttonText: '⚡ INTRĂ URGENT ÎN CONSULTAȚIE'
    }
  };
  
  const template = templates[type];
  
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="background: ${template.gradient}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">${template.icon} MysticGold</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${template.title}</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
        <h2 style="${template.urgencyStyle} margin-top: 0;">Bună ziua, ${clientName}!</h2>
        
        ${template.content}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${joinUrl}" 
             style="background: ${template.gradient}; 
                    color: white; 
                    padding: ${type === 'at_time' ? '25px 50px' : '15px 30px'}; 
                    text-decoration: none; 
                    border-radius: 8px; 
                    font-weight: bold; 
                    font-size: ${type === 'at_time' ? '20px' : '16px'};
                    display: inline-block;
                    ${type === 'at_time' ? 'animation: pulse 2s infinite;' : ''}
                    box-shadow: 0 4px 15px rgba(240, 147, 251, 0.4);">
            ${template.buttonText}
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="text-align: center; color: #718096; font-size: 14px;">
          Pentru probleme tehnice urgente, ne poți contacta la <a href="mailto:${process.env.FROM_MAIL}">${process.env.FROM_MAIL}</a>
        </p>
      </div>
    </div>
    
    ${type === 'at_time' ? `
    <style>
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    </style>
    ` : ''}
  `;
}

function generateConfirmationEmailTemplate(data: {
  clientName: string;
  providerName: string;
  sessionId: string;
  sessionDate: string;
  sessionTime: string;
  mySessionsUrl: string;
  packageInfo?: {
    packageName: string;
    sessionNumber: number;
    remainingSessions: number;
  };
}) {
  const { clientName, providerName, sessionId, sessionDate, sessionTime, mySessionsUrl, packageInfo } = data;
  
  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">✅ MysticGold</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Consultație Confirmată</p>
      </div>
      
      <div style="padding: 30px; background: #f8f9fa; border-radius: 0 0 10px 10px;">
        <h2 style="color: #38a169; margin-top: 0;">Bună ziua, ${clientName}!</h2>
        
        <p>Consultația dumneavoastră cu <strong>${providerName}</strong> a fost programată cu succes!</p>
        
        <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #38a169; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #38a169;">📅 Detalii Consultație</h3>
          <p style="margin: 5px 0;"><strong>🆔 ID Sesiune:</strong> ${sessionId}</p>
          <p style="margin: 5px 0;"><strong>📍 Data:</strong> ${sessionDate}</p>
          <p style="margin: 5px 0;"><strong>⏰ Ora:</strong> ${sessionTime}</p>
          <p style="margin: 5px 0;"><strong>👨‍⚕️ Consultant:</strong> ${providerName}</p>
          ${packageInfo ? `
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 15px 0;">
          <p style="margin: 5px 0;"><strong>📦 Pachet:</strong> ${packageInfo.packageName}</p>
          <p style="margin: 5px 0;"><strong>🔢 Sesiunea:</strong> #${packageInfo.sessionNumber}</p>
          <p style="margin: 5px 0;"><strong>📊 Sesiuni rămase:</strong> ${packageInfo.remainingSessions}</p>
          ` : ''}
        </div>
        
        <div style="background: #e6fffa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #2d3748;">📬 Ce urmează:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Vei primi un reminder cu <strong>24 de ore înainte</strong></li>
            <li>Vei primi un reminder cu <strong>1 oră înainte</strong> cu link-ul direct către cameră</li>
            <li>Vei primi un reminder <strong>la timp</strong> (2 minute înainte)</li>
            <li>Poți vedea toate consultațiile tale în contul tău</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${mySessionsUrl}" 
             style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 5px; 
                    font-weight: bold; 
                    display: inline-block;">
            📋 Vezi Consultațiile Mele
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
        
        <p style="text-align: center; color: #718096; font-size: 14px;">
          Pentru întrebări sau modificări, ne poți contacta la <a href="mailto:${process.env.FROM_MAIL}">${process.env.FROM_MAIL}</a><br>
          Mulțumim că ai ales MysticGold! ✨
        </p>
      </div>
    </div>
  `;
}

// 🆕 FUNCȚIE PENTRU TESTAREA SISTEMULUI DE EMAIL
export async function sendTestEmail(to: string) {
  await transporter.sendMail({
    from: `"MysticGold Test" <${process.env.FROM_MAIL}>`,
    to,
    subject: "🧪 Test Email - MysticGold Reminder System",
    html: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; padding: 20px;">
        <h2>🧪 Test Email Successful!</h2>
        <p>Sistemul de email-uri pentru reminder-uri funcționează corect.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString('ro-RO')}</p>
        <p><strong>From:</strong> ${process.env.FROM_MAIL}</p>
        <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
      </div>
    `,
  });
}