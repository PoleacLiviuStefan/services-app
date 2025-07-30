// app/api/provider/[providerId]/update-name/route.ts - ACTUALIZAT cu suport pentru slug-uri

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withProviderAuth } from "@/lib/api/logout/providerMiddleware/withProviderAuth";
import { formatForUrl } from "@/utils/helper";

export const runtime = "nodejs";

// Generează slug unic
async function generateUniqueSlug(name: string, excludeUserId?: string): Promise<string> {
  const baseSlug = formatForUrl(name);
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const whereClause: any = { slug: slug };
    if (excludeUserId) {
      whereClause.id = { not: excludeUserId };
    }
    
    const existingUser = await prisma.user.findFirst({
      where: whereClause
    });
    
    if (!existingUser) break;
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

// 🆕 Funcție pentru actualizarea completă a numelui și slug-ului în toate locurile
async function updateUserNameEverywhere(userId: string, oldName: string, newName: string, newSlug: string, oldSlug?: string) {
  const updates = [];
  
  try {
    // 1. 🏷️ Actualizează User.name și User.slug
    const userUpdate = prisma.user.update({
      where: { id: userId },
      data: { 
        name: newName,
        slug: newSlug
      }
    });
    updates.push(userUpdate);

    // 2. 💬 Actualizează Message.fromUsername
    const messageFromUpdate = prisma.message.updateMany({
      where: { fromUsername: oldName },
      data: { fromUsername: newName }
    });
    updates.push(messageFromUpdate);

    // 3. 💬 Actualizează Message.toUsername
    const messageToUpdate = prisma.message.updateMany({
      where: { toUsername: oldName },
      data: { toUsername: newName }
    });
    updates.push(messageToUpdate);

    // 4. 💬 Actualizează Message.username (pentru backward compatibility)
    const messageUsernameUpdate = prisma.message.updateMany({
      where: { username: oldName },
      data: { username: newName }
    });
    updates.push(messageUsernameUpdate);

    // 🆕 5. 🏷️ Actualizează Message.fromUserSlug
    if (oldSlug) {
      const messageFromSlugUpdate = prisma.message.updateMany({
        where: { fromUserSlug: oldSlug },
        data: { fromUserSlug: newSlug }
      });
      updates.push(messageFromSlugUpdate);
    }

    // 🆕 6. 🏷️ Actualizează Message.toUserSlug
    if (oldSlug) {
      const messageToSlugUpdate = prisma.message.updateMany({
        where: { toUserSlug: oldSlug },
        data: { toUserSlug: newSlug }
      });
      updates.push(messageToSlugUpdate);
    }

    // 🆕 7. 🏷️ Actualizează Message.userSlug (pentru mesaje globale)
    if (oldSlug) {
      const messageUserSlugUpdate = prisma.message.updateMany({
        where: { userSlug: oldSlug },
        data: { userSlug: newSlug }
      });
      updates.push(messageUserSlugUpdate);
    }

    // 8. 🏢 Actualizează BillingDetails.companyName
    const billingUpdate = prisma.billingDetails.updateMany({
      where: { 
        userId: userId,
        companyName: oldName
      },
      data: { companyName: newName }
    });
    updates.push(billingUpdate);

    // 🚀 Execută toate actualizările într-o tranzacție
    const results = await prisma.$transaction(updates);
    
    // 📊 Loghează rezultatele
    console.log(`✅ Nume și slug actualizate complet pentru utilizatorul ${userId}:`);
    console.log(`   👤 User: ${oldName} → ${newName}`);
    console.log(`   🏷️ Slug: ${oldSlug || 'NULL'} → ${newSlug}`);
    console.log(`   💬 Mesaje FROM (username) actualizate: ${results[1].count}`);
    console.log(`   💬 Mesaje TO (username) actualizate: ${results[2].count}`);
    console.log(`   💬 Mesaje USERNAME actualizate: ${results[3].count}`);
    
    if (oldSlug) {
      console.log(`   🏷️ Mesaje FROM (slug) actualizate: ${results[4].count}`);
      console.log(`   🏷️ Mesaje TO (slug) actualizate: ${results[5].count}`);
      console.log(`   🏷️ Mesaje USER (slug) actualizate: ${results[6].count}`);
      console.log(`   🏢 Billing details actualizate: ${results[7].count}`);
    } else {
      console.log(`   🏢 Billing details actualizate: ${results[4].count}`);
    }

    return {
      user: results[0],
      messagesFromUpdated: results[1].count,
      messagesToUpdated: results[2].count,
      messagesUsernameUpdated: results[3].count,
      messagesFromSlugUpdated: oldSlug ? results[4].count : 0,
      messagesToSlugUpdated: oldSlug ? results[5].count : 0,
      messagesUserSlugUpdated: oldSlug ? results[6].count : 0,
      billingDetailsUpdated: results[oldSlug ? 7 : 4].count
    };

  } catch (error) {
    console.error("💥 Eroare la actualizarea completă a numelui și slug-ului:", error);
    throw error;
  }
}

// ----------------------------
// HANDLER pentru GET
// ----------------------------
async function getHandler(
  _req: Request,
  context: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await context.params;

  const record = await prisma.provider.findUnique({
    where: { id: providerId },
    select: {
      user: {
        select: { 
          name: true,
          slug: true
        },
      },
    },
  });

  if (!record) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  return NextResponse.json({ 
    name: record.user.name,
    slug: record.user.slug
  });
}

export const GET = withProviderAuth(getHandler);

// ----------------------------
// HANDLER pentru PUT - ACTUALIZARE COMPLETĂ cu SLUG-URI
// ----------------------------
async function putHandler(
  req: Request,
  context: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await context.params;

  // 1) Parsăm JSON-ul din body
  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // 2) Validăm numele
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return NextResponse.json(
      { error: "name must be a non-empty string" },
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  const newName = body.name.trim();

  // 3) Găsim provider-ul și utilizatorul
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { 
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
  });
  
  if (!provider) {
    return new NextResponse(
      JSON.stringify({ error: "Provider not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const oldName = provider.user.name;
  const oldSlug = provider.user.slug; // 🆕 Salvăm și slug-ul vechi
  const userId = provider.userId;

  // 4) Verificăm dacă numele chiar se schimbă
  if (oldName === newName) {
    return NextResponse.json({ 
      name: newName,
      slug: provider.user.slug,
      message: "No changes needed"
    });
  }

  // 5) Generăm slug-ul nou
  let newSlug: string;
  try {
    newSlug = await generateUniqueSlug(newName, userId);
    console.log(`🏷️ Slug nou generat pentru "${newName}": ${newSlug}`);
  } catch (error) {
    console.error("Eroare la generarea slug-ului:", error);
    return NextResponse.json(
      { error: "Error generating slug" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // 6) 🚀 ACTUALIZARE COMPLETĂ în toate locurile (inclusiv slug-uri)
  try {
    const updateResults = await updateUserNameEverywhere(
      userId,
      oldName || "",
      newName,
      newSlug,
      oldSlug || undefined // 🆕 Trecem și slug-ul vechi
    );

    return NextResponse.json({ 
      success: true,
      name: newName,
      slug: newSlug,
      oldName: oldName,
      oldSlug: oldSlug, // 🆕 Afișăm și slug-ul vechi în răspuns
      summary: {
        messagesFromUpdated: updateResults.messagesFromUpdated,
        messagesToUpdated: updateResults.messagesToUpdated,
        messagesUsernameUpdated: updateResults.messagesUsernameUpdated,
        messagesFromSlugUpdated: updateResults.messagesFromSlugUpdated, // 🆕
        messagesToSlugUpdated: updateResults.messagesToSlugUpdated, // 🆕
        messagesUserSlugUpdated: updateResults.messagesUserSlugUpdated, // 🆕
        billingDetailsUpdated: updateResults.billingDetailsUpdated
      },
      message: "Name and slug updated successfully in all locations"
    });

  } catch (error) {
    console.error("Eroare la actualizarea numelui:", error);
    return NextResponse.json(
      { error: "Error updating name in database" },
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export const PUT = withProviderAuth(putHandler);

// 🆕 ENDPOINT pentru verificarea inconsistențelor (inclusiv slug-uri)
async function checkHandler(
  _req: Request,
  context: { params: Promise<{ providerId: string }> }
) {
  const { providerId } = await context.params;

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { 
      user: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  const userName = provider.user.name;
  const userSlug = provider.user.slug;
  const expectedSlug = userName ? formatForUrl(userName) : null;

  // Verifică inconsistențele
  const issues = [];

  if (!userSlug) {
    issues.push("User has no slug");
  }

  if (userName && userSlug && expectedSlug !== userSlug) {
    issues.push(`Slug mismatch: expected "${expectedSlug}", got "${userSlug}"`);
  }

  // Verifică mesajele - inclusiv slug-urile
  const messageStats = await Promise.all([
    // Statistici pentru nume
    prisma.message.count({ where: { fromUsername: userName } }),
    prisma.message.count({ where: { toUsername: userName } }),
    prisma.message.count({ where: { username: userName } }),
    // 🆕 Statistici pentru slug-uri
    prisma.message.count({ where: { fromUserSlug: userSlug } }),
    prisma.message.count({ where: { toUserSlug: userSlug } }),
    prisma.message.count({ where: { userSlug: userSlug } })
  ]);

  return NextResponse.json({
    user: {
      name: userName,
      slug: userSlug,
      expectedSlug: expectedSlug
    },
    issues: issues,
    messageStats: {
      // Statistici pentru nume
      messagesFromUsername: messageStats[0],
      messagesToUsername: messageStats[1],
      messagesUsername: messageStats[2],
      // 🆕 Statistici pentru slug-uri
      messagesFromSlug: messageStats[3],
      messagesToSlug: messageStats[4],
      messagesUserSlug: messageStats[5],
      // 🆕 Total mesaje
      totalByUsername: messageStats[0] + messageStats[1] + messageStats[2],
      totalBySlug: messageStats[3] + messageStats[4] + messageStats[5]
    }
  });
}

export const HEAD = withProviderAuth(checkHandler);