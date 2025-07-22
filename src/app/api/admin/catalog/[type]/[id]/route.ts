// /api/admin/catalog/[type]/[id]/route.ts - CORECTAT PENTRU RELAȚII MANY-TO-MANY IMPLICITE
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = ['specialities', 'tools', 'readings'] as const;
type CatalogType = typeof VALID_TYPES[number];

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> } // 🔧 FIX: Promise pentru Next.js 15
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

    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!adminUser || adminUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acces interzis. Doar adminii pot șterge din catalog." },
        { status: 403 }
      );
    }

    // 🔧 FIX: Await params înainte de utilizare
    const { type, id } = await params;

    // Validează tipul
    if (!VALID_TYPES.includes(type as CatalogType)) {
      return NextResponse.json(
        { error: `Tip invalid. Tipuri permise: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    console.log(`🗑️ Admin ${session.user.id} încearcă să șteargă ${type}/${id} (cu forța)`);

    // 🆕 Funcții pentru ștergerea forțată (cu relații) - CORECTAT PENTRU RELAȚII IMPLICITE
    const deleteFunctions = {
      specialities: async () => {
        // Verifică dacă specialitatea există și obține informații despre ea
        const speciality = await prisma.speciality.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                providers: true,
                sessions: true,
                mainFor: true // provideri care au aceasta ca specialitate principală
              }
            }
          }
        });

        if (!speciality) {
          throw new Error("Specialitatea nu a fost găsită");
        }

        console.log(`🔍 Specialitate găsită: ${speciality.name}`);
        console.log(`📊 Relații: ${speciality._count.providers} provideri, ${speciality._count.sessions} sesiuni, ${speciality._count.mainFor} provideri principali`);

        // 🆕 ȘTERGERE ÎN TRANZACȚIE CU RELAȚII - CORECTAT PENTRU RELAȚII IMPLICITE
        return await prisma.$transaction(async (tx) => {
          let updatedRelations = 0;

          // 1. 🔧 FIX: Elimină relațiile many-to-many prin disconnect
          // Găsește toți providerii care au această specialitate
          const providersWithSpeciality = await tx.provider.findMany({
            where: {
              specialities: {
                some: { id }
              }
            },
            select: { id: true }
          });

          // Disconnect specialitatea de la toți providerii
          for (const provider of providersWithSpeciality) {
            await tx.provider.update({
              where: { id: provider.id },
              data: {
                specialities: {
                  disconnect: { id }
                }
              }
            });
            updatedRelations++;
          }
          console.log(`🔗 Disconnectate ${updatedRelations} relații Provider-Speciality`);

          // 2. Elimină ca specialitate principală (setează mainSpecialityId la NULL)
          const updatedMainProviders = await tx.provider.updateMany({
            where: { mainSpecialityId: id },
            data: { mainSpecialityId: null }
          });
          console.log(`🎯 Eliminată ca specialitate principală de la ${updatedMainProviders.count} provideri`);

          // 3. ATENȚIE: Sesiunile rămân pentru istoric - nu le șterg
          // Sesiunile sunt importante pentru raportare și istoric

          // 4. Șterge specialitatea
          await tx.speciality.delete({ where: { id } });

          return {
            name: speciality.name,
            type: 'specialitate',
            relatedCount: speciality._count.providers + speciality._count.sessions + speciality._count.mainFor,
            disconnectedRelations: updatedRelations,
            updatedMainProviders: updatedMainProviders.count,
            sessionsKept: speciality._count.sessions // sesiunile rămân pentru istoric
          };
        });
      },

      tools: async () => {
        const tool = await prisma.tool.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                providers: true,
                mainForProviders: true // provideri care au acesta ca tool principal
              }
            }
          }
        });

        if (!tool) {
          throw new Error("Instrumentul nu a fost găsit");
        }

        console.log(`🔍 Instrument găsit: ${tool.name}`);
        console.log(`📊 Relații: ${tool._count.providers} provideri, ${tool._count.mainForProviders} provideri principali`);

        // 🆕 ȘTERGERE ÎN TRANZACȚIE CU RELAȚII - CORECTAT PENTRU RELAȚII IMPLICITE
        return await prisma.$transaction(async (tx) => {
          let updatedRelations = 0;

          // 1. 🔧 FIX: Elimină relațiile many-to-many prin disconnect
          // Găsește toți providerii care au acest tool
          const providersWithTool = await tx.provider.findMany({
            where: {
              tools: {
                some: { id }
              }
            },
            select: { id: true }
          });

          // Disconnect tool-ul de la toți providerii
          for (const provider of providersWithTool) {
            await tx.provider.update({
              where: { id: provider.id },
              data: {
                tools: {
                  disconnect: { id }
                }
              }
            });
            updatedRelations++;
          }
          console.log(`🔗 Disconnectate ${updatedRelations} relații Provider-Tool`);

          // 2. Elimină ca tool principal (setează mainToolId la NULL)
          const updatedMainProviders = await tx.provider.updateMany({
            where: { mainToolId: id },
            data: { mainToolId: null }
          });
          console.log(`🛠️ Eliminat ca tool principal de la ${updatedMainProviders.count} provideri`);

          // 3. Șterge instrumentul
          await tx.tool.delete({ where: { id } });

          return {
            name: tool.name,
            type: 'instrument',
            relatedCount: tool._count.providers + tool._count.mainForProviders,
            disconnectedRelations: updatedRelations,
            updatedMainProviders: updatedMainProviders.count
          };
        });
      },

      readings: async () => {
        const reading = await prisma.reading.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                providers: true // provideri care au acest reading
              }
            }
          }
        });

        if (!reading) {
          throw new Error("Reading-ul nu a fost găsit");
        }

        console.log(`🔍 Reading găsit: ${reading.name}`);
        console.log(`📊 Relații: ${reading._count.providers} provideri`);

        // 🆕 ȘTERGERE ÎN TRANZACȚIE CU RELAȚII
        return await prisma.$transaction(async (tx) => {
          // 1. Elimină reading-ul de la provideri (setează readingId la NULL)
          const updatedProviders = await tx.provider.updateMany({
            where: { readingId: id },
            data: { readingId: null }
          });
          console.log(`📖 Eliminat reading-ul de la ${updatedProviders.count} provideri`);

          // 2. Șterge reading-ul
          await tx.reading.delete({ where: { id } });

          return {
            name: reading.name,
            type: 'reading',
            relatedCount: reading._count.providers,
            updatedProviders: updatedProviders.count
          };
        });
      }
    };

    // Execută ștergerea forțată
    const result = await deleteFunctions[type as CatalogType]();

    console.log(`✅ ${result.type} "${result.name}" a fost șters(ă) cu forța`);
    console.log(`📊 Statistici ștergere:`, result);

    return NextResponse.json({
      success: true,
      message: `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} "${result.name}" a fost șters(ă) cu succes împreună cu toate relațiile`,
      deletedItem: {
        id,
        name: result.name,
        type: result.type,
        deletedAt: new Date().toISOString(),
        deletedBy: session.user.id,
        forceDeleted: true,
        relationsDisconnected: result.disconnectedRelations || 0,
        providersUpdated: result.updatedMainProviders || result.updatedProviders || 0,
        ...(result.sessionsKept && { sessionsKept: result.sessionsKept })
      }
    });

  } catch (error) {
    // 🔧 FIX: Safe error logging
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    const { type: paramsType, id: paramsId } = await params;
    
    console.error(`❌ Eroare la ștergerea forțată din catalog (${paramsType}/${paramsId}):`, errorMessage);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    
    // Erori de căutare
    if (errorMessage.includes("nu a fost găsit")) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    // Erori de referință (foreign key constraints)
    if (errorMessage.includes("Foreign key constraint") || errorMessage.includes("violates foreign key")) {
      return NextResponse.json(
        { 
          error: "Nu se poate șterge din cauza dependințelor existente",
          details: "Există încă referințe către acest element în baza de date"
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        error: "Eroare internă la ștergerea din catalog",
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}

// Endpoint pentru a obține informații despre un element din catalog înainte de ștergere
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> } // 🔧 FIX: Promise pentru Next.js 15
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
    const { type, id } = await params;

    if (!VALID_TYPES.includes(type as CatalogType)) {
      return NextResponse.json(
        { error: `Tip invalid. Tipuri permise: ${VALID_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const getFunctions = {
      specialities: async () => {
        const speciality = await prisma.speciality.findUnique({
          where: { id },
          include: {
            providers: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            },
            mainFor: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            },
            _count: {
              select: {
                providers: true,
                sessions: true,
                mainFor: true
              }
            }
          }
        });

        if (!speciality) {
          throw new Error("Specialitatea nu a fost găsită");
        }

        return {
          item: {
            id: speciality.id,
            name: speciality.name,
            description: speciality.description,
            price: speciality.price
          },
          relations: {
            providersCount: speciality._count.providers,
            sessionsCount: speciality._count.sessions,
            mainForCount: speciality._count.mainFor,
            providers: speciality.providers.map(p => ({
              name: p.user.name || p.user.email,
              email: p.user.email
            })),
            mainForProviders: speciality.mainFor.map(p => ({
              name: p.user.name || p.user.email,
              email: p.user.email
            }))
          },
          canDelete: true, // 🆕 Acum se poate șterge întotdeauna cu forța
          willDisconnectRelations: speciality._count.providers + speciality._count.mainFor,
          sessionsWillBeKept: speciality._count.sessions,
          deleteMethod: "force", // indica că se va face ștergere forțată
          warnings: [
            speciality._count.providers > 0 ? `Se vor disconnecta ${speciality._count.providers} provideri de la această specialitate` : null,
            speciality._count.mainFor > 0 ? `${speciality._count.mainFor} provideri vor avea specialitatea principală resetată` : null,
            speciality._count.sessions > 0 ? `${speciality._count.sessions} sesiuni vor fi păstrate pentru istoric` : null
          ].filter(Boolean)
        };
      },

      tools: async () => {
        const tool = await prisma.tool.findUnique({
          where: { id },
          include: {
            providers: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            },
            mainForProviders: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            },
            _count: {
              select: {
                providers: true,
                mainForProviders: true
              }
            }
          }
        });

        if (!tool) {
          throw new Error("Instrumentul nu a fost găsit");
        }

        return {
          item: {
            id: tool.id,
            name: tool.name,
            description: tool.description
          },
          relations: {
            providersCount: tool._count.providers,
            mainForCount: tool._count.mainForProviders,
            providers: tool.providers.map(p => ({
              name: p.user.name || p.user.email,
              email: p.user.email
            })),
            mainForProviders: tool.mainForProviders.map(p => ({
              name: p.user.name || p.user.email,
              email: p.user.email
            }))
          },
          canDelete: true, // 🆕 Acum se poate șterge întotdeauna cu forța
          willDisconnectRelations: tool._count.providers + tool._count.mainForProviders,
          deleteMethod: "force",
          warnings: [
            tool._count.providers > 0 ? `Se vor disconnecta ${tool._count.providers} provideri de la acest instrument` : null,
            tool._count.mainForProviders > 0 ? `${tool._count.mainForProviders} provideri vor avea instrumentul principal resetat` : null
          ].filter(Boolean)
        };
      },

      readings: async () => {
        const reading = await prisma.reading.findUnique({
          where: { id },
          include: {
            providers: {
              include: {
                user: {
                  select: { name: true, email: true }
                }
              }
            },
            _count: {
              select: {
                providers: true
              }
            }
          }
        });

        if (!reading) {
          throw new Error("Reading-ul nu a fost găsit");
        }

        return {
          item: {
            id: reading.id,
            name: reading.name,
            description: reading.description
          },
          relations: {
            providersCount: reading._count.providers,
            providers: reading.providers.map(p => ({
              name: p.user.name || p.user.email,
              email: p.user.email
            }))
          },
          canDelete: true, // 🆕 Acum se poate șterge întotdeauna cu forța
          willUpdateProviders: reading._count.providers,
          deleteMethod: "force",
          warnings: [
            reading._count.providers > 0 ? `${reading._count.providers} provideri vor avea reading-ul resetat` : null
          ].filter(Boolean)
        };
      }
    };

    const result = await getFunctions[type as CatalogType]();

    return NextResponse.json(result);

  } catch (error) {
    // 🔧 FIX: Safe error logging
    const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
    const { type: paramsType, id: paramsId } = await params;
    
    console.error(`❌ Eroare la obținerea informațiilor catalog (${paramsType}/${paramsId}):`, errorMessage);
    
    if (errorMessage.includes("nu a fost găsit")) {
      return NextResponse.json({ error: errorMessage }, { status: 404 });
    }

    return NextResponse.json({ 
      error: "Eroare internă",
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}