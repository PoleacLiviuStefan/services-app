// /api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 🔧 FIX: Adaugă Promise<>
) {
  try {
    // Verifică autentificarea și rolul de admin
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Neautentificat" },
        { status: 401 }
      );
    }

    // Verifică dacă utilizatorul este admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acces interzis. Doar adminii pot șterge utilizatori." },
        { status: 403 }
      );
    }

    // 🔧 FIX: Await params înainte de utilizare
    const { id: userId } = await params;

    console.log(`🗑️ Admin ${session.user.id} încearcă să șteargă utilizatorul ${userId}`);

    // Verifică că utilizatorul de șters există
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        provider: {
          include: {
            _count: {
              select: {
                sessions: true,
                userProviderPackages: true, // 🔧 FIX: userPackages → userProviderPackages
                providerPackages: true
              }
            }
          }
        },
        _count: {
          select: {
            sessions: true,
            providerPackages: true // 🔧 FIX: userPackages → providerPackages
          }
        }
      }
    });

    if (!userToDelete) {
      return NextResponse.json(
        { error: "Utilizatorul nu a fost găsit" },
        { status: 404 }
      );
    }

    // Previne ștergerea propriului cont de admin
    if (userToDelete.id === session.user.id) {
      return NextResponse.json(
        { error: "Nu vă puteți șterge propriul cont" },
        { status: 400 }
      );
    }

    // Previne ștergerea altor admini
    if (userToDelete.role === "ADMIN") {
      return NextResponse.json(
        { error: "Nu se pot șterge alți administratori" },
        { status: 400 }
      );
    }

    console.log(`👤 Utilizator de șters: ${userToDelete.name || userToDelete.email}`);
    console.log(`🔍 Statistici:`, {
      isProvider: !!userToDelete.provider,
      sessionsAsClient: userToDelete._count.sessions,
      userPackagesPurchased: userToDelete._count.providerPackages, // 🔧 FIX: actualizat numele
      providerSessions: userToDelete.provider?._count.sessions || 0,
      userPackagesSold: userToDelete.provider?._count.userProviderPackages || 0, // 🔧 FIX: actualizat numele
      providerPackages: userToDelete.provider?._count.providerPackages || 0
    });

    // Verifică dacă utilizatorul are sesiuni active (ca să prevină ștergerea accidentală)
    const activeSessions = await prisma.consultingSession.count({
      where: {
        OR: [
          { clientId: userId },
          { provider: { userId: userId } }
        ],
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS']
        }
      }
    });

    if (activeSessions > 0) {
      return NextResponse.json(
        { 
          error: "Nu se poate șterge utilizatorul",
          message: `Utilizatorul are ${activeSessions} sesiuni active. Anulați mai întâi sesiunile active.`,
          code: "HAS_ACTIVE_SESSIONS"
        },
        { status: 409 }
      );
    }

    // Șterge în tranzacție pentru consistența datelor
    const deletionResult = await prisma.$transaction(async (tx) => {
      const deletionStats = {
        sessionsDeleted: 0,
        packagesDeleted: 0,
        providerDataDeleted: false,
        userDeleted: false
      };

      // 1. Șterge sesiunile utilizatorului (ca client și ca provider)
      const sessionsAsClient = await tx.consultingSession.deleteMany({
        where: { clientId: userId }
      });
      deletionStats.sessionsDeleted += sessionsAsClient.count;

      if (userToDelete.provider) {
        const sessionsAsProvider = await tx.consultingSession.deleteMany({
          where: { providerId: userToDelete.provider.id }
        });
        deletionStats.sessionsDeleted += sessionsAsProvider.count;
      }

      // 2. Șterge pachetele cumpărate de utilizator
      const userPackages = await tx.userProviderPackage.deleteMany({
        where: { userId: userId }
      });
      deletionStats.packagesDeleted += userPackages.count;

      // 3. Dacă este provider, șterge datele de provider
      if (userToDelete.provider) {
        // Șterge pachetele oferite de provider
        const providerPackages = await tx.providerPackage.deleteMany({
          where: { providerId: userToDelete.provider.id }
        });
        deletionStats.packagesDeleted += providerPackages.count;

        // Șterge relațiile many-to-many pentru provider (doar specialities și tools)
        await tx.providerSpeciality.deleteMany({
          where: { providerId: userToDelete.provider.id }
        });

        await tx.providerTool.deleteMany({
          where: { providerId: userToDelete.provider.id }
        });

        // Nu trebuie să ștergem manual reading - se va seta NULL automat prin onDelete: SetNull

        // Șterge înregistrarea de provider
        await tx.provider.delete({
          where: { id: userToDelete.provider.id }
        });
        deletionStats.providerDataDeleted = true;
      }

      // 4. Șterge conturile OAuth asociate
      await tx.account.deleteMany({
        where: { userId: userId }
      });

      // 5. Șterge sesiunile de autentificare
      await tx.session.deleteMany({
        where: { userId: userId }
      });

      // 6. În final, șterge utilizatorul
      await tx.user.delete({
        where: { id: userId }
      });
      deletionStats.userDeleted = true;

      return deletionStats;
    });

    console.log(`✅ Utilizatorul ${userToDelete.name || userToDelete.email} a fost șters cu succes`);
    console.log(`📊 Statistici ștergere:`, deletionResult);

    return NextResponse.json({
      success: true,
      message: `Utilizatorul ${userToDelete.name || userToDelete.email} a fost șters cu succes`,
      deletionStats: {
        userName: userToDelete.name || userToDelete.email,
        userEmail: userToDelete.email,
        wasProvider: !!userToDelete.provider,
        sessionsDeleted: deletionResult.sessionsDeleted,
        packagesDeleted: deletionResult.packagesDeleted,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    // 🔧 FIX: Safe error logging
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    console.error("❌ Eroare la ștergerea utilizatorului:", errorMessage);
    
    // Erori specifice Prisma
    if (error instanceof Error) {
      if (error.message.includes("Foreign key constraint")) {
        return NextResponse.json(
          { 
            error: "Nu se poate șterge utilizatorul",
            message: "Utilizatorul are date asociate care nu pot fi șterse automat.",
            code: "CONSTRAINT_ERROR"
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: "Eroare internă la ștergerea utilizatorului",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint pentru a obține informații despre utilizator înainte de ștergere
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 🔧 FIX: Adaugă Promise<>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Neautentificat" }, { status: 401 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces interzis" }, { status: 403 });
    }

    // 🔧 FIX: Await params înainte de utilizare
    const { id: userId } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        provider: {
          include: {
            _count: {
              select: {
                sessions: true,
                userProviderPackages: true,
                providerPackages: true,
                specialities: true,
                tools: true,
                reviews: true, // 🔧 FIX: Nu readings, ci reviews (relație validă)
                calendlySubscriptions: true // 🔧 FIX: adăugat relația validă
              }
            }
          }
        },
        _count: {
          select: {
            sessions: true,
            providerPackages: true, // 🔧 FIX: userPackages → providerPackages  
            accounts: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilizatorul nu a fost găsit" }, { status: 404 });
    }

    // Calculează sesiunile active
    const activeSessions = await prisma.consultingSession.count({
      where: {
        OR: [
          { clientId: userId },
          { provider: { userId: userId } }
        ],
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] }
      }
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
        createdAt: user.createdAt,
        isProvider: !!user.provider
      },
      stats: {
        sessionsAsClient: user._count.sessions,
        userPackagesPurchased: user._count.providerPackages, // 🔧 FIX: actualizat numele
        oauthAccounts: user._count.accounts,
        activeSessions: activeSessions,
        provider: user.provider ? {
          sessionsAsProvider: user.provider._count.sessions,
          packagesOffered: user.provider._count.providerPackages,
          userPackagesSold: user.provider._count.userProviderPackages,
          specialitiesCount: user.provider._count.specialities,
          toolsCount: user.provider._count.tools,
          reviewsCount: user.provider._count.reviews, // 🔧 FIX: readingsCount → reviewsCount
          calendlySubscriptionsCount: user.provider._count.calendlySubscriptions // 🔧 FIX: adăugat
        } : null
      },
      canDelete: activeSessions === 0 && user.role !== "ADMIN" && user.id !== session.user.id,
      warnings: [
        ...(activeSessions > 0 ? [`Are ${activeSessions} sesiuni active`] : []),
        ...(user.role === "ADMIN" ? ["Este administrator"] : []),
        ...(user.id === session.user.id ? ["Este contul dvs. curent"] : [])
      ]
    });

  } catch (error) {
    // 🔧 FIX: Safe error logging
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    console.error("❌ Eroare la obținerea informațiilor utilizatorului:", errorMessage);
    return NextResponse.json({ error: "Eroare internă" }, { status: 500 });
  }
}