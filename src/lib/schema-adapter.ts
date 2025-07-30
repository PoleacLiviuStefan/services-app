// lib/schema-adapter.ts - ADAPTER ACTUALIZAT PENTRU RUTA CALENDLY
import { prisma } from './prisma';

/**
 * Adapter pentru sistemul de reminder-uri care funcționează perfect cu ruta Calendly existentă
 */

// 🆕 TIPURI SPECIFICE PENTRU INTEGRAREA CU CALENDLY
export interface CalendlySessionData {
  sessionId: string;
  clientId: string;
  providerId: string;
  clientEmail: string;
  clientName: string;
  providerName: string;
  sessionStartTime: Date;
  sessionEndTime: Date;
  dailyRoomUrl?: string;
  sessionNotes?: string;
  packageInfo?: {
    packageId: string;
    sessionNumber: number;
    remainingSessions: number;
    packageName: string;
  };
}

// Tipuri pentru sesiunile existente (compatibile cu schema ta)
export interface ExistingConsultingSession {
  id: string;
  providerId: string;
  clientId: string;
  startDate: Date | null;
  endDate: Date | null;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  dailyRoomUrl: string | null;
  notes: string | null;
  packageId: string | null;
  client: {
    id: string;
    name: string | null;
    email: string | null;
  };
  provider: {
    id: string;
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  };
  userPackage?: {
    id: string;
    providerPackage: {
      service: string;
    };
  } | null;
}

/**
 * Funcții adapter pentru compatibilitate cu ruta Calendly existentă
 */
export class ConsultationReminderAdapter {
  
  /**
   * 🆕 HELPER PENTRU RUTA CALENDLY - convertește datele în formatul așteptat de queue
   */
  static convertCalendlyDataToReminderData(data: CalendlySessionData) {
    return {
      sessionId: data.sessionId,
      clientId: data.clientId,
      providerId: data.providerId,
      clientEmail: data.clientEmail,
      clientName: data.clientName,
      providerName: data.providerName,
      sessionStartTime: data.sessionStartTime,
      sessionEndTime: data.sessionEndTime,
      dailyRoomUrl: data.dailyRoomUrl,
      sessionNotes: data.sessionNotes,
      consultationType: 'CONSULTATION', // Default pentru schema existentă
    };
  }

  /**
   * 🆕 FUNCȚIE SPECIFICĂ PENTRU RUTA CALENDLY - programează reminder-uri
   */
  static async scheduleRemindersForCalendlySession(data: CalendlySessionData) {
    // Import dinamic pentru a evita dependențele circulare
    const { scheduleConsultationReminders } = await import('./queue');

    const reminderData = this.convertCalendlyDataToReminderData(data);
    return await scheduleConsultationReminders(reminderData);
  }

  /**
   * 🆕 FUNCȚIE PENTRU TRIMIS EMAIL DE CONFIRMARE CU PACHETE
   */
  static async sendCalendlyConfirmationEmail(data: CalendlySessionData) {
    const { sendConsultationConfirmation } = await import('./mail');

    return await sendConsultationConfirmation(
      data.clientEmail,
      data.clientName,
      data.providerName,
      data.sessionId,
      data.sessionStartTime.toISOString(),
      data.sessionEndTime.toISOString(),
      data.packageInfo ? {
        packageName: data.packageInfo.packageName,
        sessionNumber: data.packageInfo.sessionNumber,
        remainingSessions: data.packageInfo.remainingSessions
      } : undefined
    );
  }

  /**
   * Găsește o sesiune cu toate datele necesare pentru reminder-uri
   */
  static async findSessionForReminder(sessionId: string): Promise<ExistingConsultingSession | null> {
    return await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        provider: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        userPackage: {
          select: {
            id: true,
            providerPackage: {
              select: {
                service: true
              }
            }
          }
        }
      }
    });
  }

  /**
   * Programează reminder-uri pentru o sesiune existentă
   */
  static async scheduleRemindersForExistingSession(sessionId: string) {
    const session = await this.findSessionForReminder(sessionId);
    
    if (!session || !session.startDate || !session.endDate) {
      throw new Error(`Session ${sessionId} not found or missing dates`);
    }

    if (!session.client.email) {
      throw new Error(`Client ${session.client.id} has no email address`);
    }

    // Import dinamic pentru a evita dependențele circulare
    const { scheduleConsultationReminders } = await import('./queue');

    return await scheduleConsultationReminders({
      sessionId: session.id,
      clientId: session.client.id,
      providerId: session.provider.id,
      clientEmail: session.client.email,
      clientName: session.client.name || 'Client',
      providerName: session.provider.user.name || 'Provider',
      sessionStartTime: session.startDate,
      sessionEndTime: session.endDate,
      dailyRoomUrl: session.dailyRoomUrl || undefined,
      sessionNotes: session.notes || undefined,
      consultationType: 'CONSULTATION', // default pentru schema existentă
    });
  }

  /**
   * Anulează reminder-urile pentru o sesiune
   */
  static async cancelRemindersForSession(sessionId: string) {
    const { cancelConsultationReminders } = await import('./queue');
    return await cancelConsultationReminders(sessionId);
  }

  /**
   * Reprogramează reminder-urile pentru o sesiune
   */
  static async rescheduleRemindersForSession(
    sessionId: string, 
    newStartTime: Date, 
    newEndTime: Date
  ) {
    const session = await this.findSessionForReminder(sessionId);
    
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (!session.client.email) {
      throw new Error(`Client ${session.client.id} has no email address`);
    }

    const { rescheduleConsultationReminders } = await import('./queue');

    return await rescheduleConsultationReminders(sessionId, {
      clientId: session.client.id,
      providerId: session.provider.id,
      clientEmail: session.client.email,
      clientName: session.client.name || 'Client',
      providerName: session.provider.user.name || 'Provider',
      sessionStartTime: newStartTime,
      sessionEndTime: newEndTime,
      dailyRoomUrl: session.dailyRoomUrl || undefined,
      sessionNotes: session.notes || undefined,
      consultationType: 'CONSULTATION',
    });
  }

  /**
   * Verifică dacă o sesiune poate primi reminder-uri
   */
  static async canReceiveReminders(sessionId: string): Promise<{ 
    canReceive: boolean; 
    reason?: string; 
    session?: ExistingConsultingSession 
  }> {
    const session = await this.findSessionForReminder(sessionId);
    
    if (!session) {
      return { canReceive: false, reason: 'Session not found' };
    }

    if (session.status === 'CANCELLED') {
      return { canReceive: false, reason: 'Session is cancelled', session };
    }

    if (session.status === 'COMPLETED') {
      return { canReceive: false, reason: 'Session is completed', session };
    }

    if (!session.startDate || !session.endDate) {
      return { canReceive: false, reason: 'Session has no dates', session };
    }

    if (!session.client.email) {
      return { canReceive: false, reason: 'Client has no email', session };
    }

    const now = new Date();
    if (session.startDate <= now) {
      return { canReceive: false, reason: 'Session already started', session };
    }

    return { canReceive: true, session };
  }

  /**
   * Găsește toate sesiunile care au nevoie de reminder-uri în următoarele 48h
   */
  static async findUpcomingSessions(hoursAhead: number = 48) {
    const now = new Date();
    const endTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return await prisma.consultingSession.findMany({
      where: {
        status: 'SCHEDULED',
        startDate: {
          gte: now,
          lte: endTime
        },
        client: {
          email: { not: null }
        }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        provider: {
          select: {
            id: true,
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              }
            }
          }
        },
        userPackage: {
          select: {
            id: true,
            providerPackage: {
              select: {
                service: true
              }
            }
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });
  }

  /**
   * Programează în bloc reminder-uri pentru toate sesiunile viitoare
   */
  static async scheduleAllUpcomingReminders(hoursAhead: number = 48) {
    const sessions = await this.findUpcomingSessions(hoursAhead);
    const results = [];

    for (const session of sessions) {
      try {
        const result = await this.scheduleRemindersForExistingSession(session.id);
        results.push({
          sessionId: session.id,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          sessionId: session.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      total: sessions.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  }

  /**
   * Helper pentru actualizarea statusului unei sesiuni
   */
  static async updateSessionStatus(
    sessionId: string, 
    status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
  ) {
    return await prisma.consultingSession.update({
      where: { id: sessionId },
      data: { 
        status,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Helper pentru reprogramarea unei sesiuni
   */
  static async rescheduleSession(
    sessionId: string,
    newStartDate: Date,
    newEndDate: Date,
    reason?: string
  ) {
    // Actualizează sesiunea în DB
    const updatedSession = await prisma.consultingSession.update({
      where: { id: sessionId },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
        updatedAt: new Date(),
        // Adaugă reason în notes dacă există
        ...(reason && {
          notes: reason
        })
      }
    });

    // Reprogramează reminder-urile
    await this.rescheduleRemindersForSession(sessionId, newStartDate, newEndDate);

    return updatedSession;
  }

  /**
   * Helper pentru anularea unei sesiuni
   */
  static async cancelSession(sessionId: string, reason?: string) {
    // Actualizează statusul în DB
    const cancelledSession = await prisma.consultingSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
        ...(reason && {
          notes: reason
        })
      }
    });

    // Anulează reminder-urile
    await this.cancelRemindersForSession(sessionId);

    return cancelledSession;
  }

  /**
   * 🆕 HELPER PENTRU OBȚINEREA INFORMAȚIILOR DESPRE PACHETE
   */
  static async getPackageInfoForSession(sessionId: string) {
    const session = await prisma.consultingSession.findUnique({
      where: { id: sessionId },
      include: {
        userPackage: {
          include: {
            providerPackage: {
              select: {
                service: true,
                totalSessions: true
              }
            },
            _count: {
              select: {
                sessions: {
                  where: {
                    wasPackageSession: true,
                    status: { not: 'CANCELLED' }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!session?.userPackage) {
      return null;
    }

    const usedSessions = session.userPackage._count.sessions;
    const totalSessions = session.userPackage.totalSessions;
    const remainingSessions = totalSessions - usedSessions;

    return {
      packageId: session.userPackage.id,
      packageName: session.userPackage.providerPackage.service,
      sessionNumber: session.packageSessionNumber || usedSessions,
      totalSessions,
      usedSessions,
      remainingSessions
    };
  }
}

// Export pentru backwards compatibility
export const scheduleRemindersForSession = ConsultationReminderAdapter.scheduleRemindersForExistingSession;
export const cancelRemindersForSession = ConsultationReminderAdapter.cancelRemindersForSession;
export const rescheduleRemindersForSession = ConsultationReminderAdapter.rescheduleRemindersForSession;

// 🆕 Export pentru integrarea cu Calendly
export const scheduleRemindersForCalendlySession = ConsultationReminderAdapter.scheduleRemindersForCalendlySession;
export const sendCalendlyConfirmationEmail = ConsultationReminderAdapter.sendCalendlyConfirmationEmail;