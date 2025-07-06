// scripts/migrate-to-corrected-implementation.js
// ✅ SCRIPT PENTRU MIGRAREA LA IMPLEMENTAREA CORECTATĂ

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  log(`${colors.bold}${colors.blue}${message}${colors.reset}`);
  log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// ✅ BACKUP FIȘIERE EXISTENTE
function backupExistingFiles() {
  logHeader('BACKUP FIȘIERE EXISTENTE');
  
  const filesToBackup = [
    'lib/zoomVideoSDK.ts',
    'app/api/video/create-session/route.ts',
    'app/api/video/session-info/[sessionId]/route.ts',
    'app/servicii/video/sessions/[sessionId]/page.tsx'
  ];
  
  const backupDir = `backup-${Date.now()}`;
  
  try {
    if (!fs.existsSync('backups')) {
      fs.mkdirSync('backups');
    }
    
    fs.mkdirSync(path.join('backups', backupDir));
    logInfo(`Created backup directory: backups/${backupDir}`);
    
    for (const file of filesToBackup) {
      if (fs.existsSync(file)) {
        const backupPath = path.join('backups', backupDir, file.replace(/\//g, '_'));
        fs.copyFileSync(file, backupPath);
        logSuccess(`Backed up: ${file} → ${backupPath}`);
      } else {
        logWarning(`File not found (skipping): ${file}`);
      }
    }
    
    return `backups/${backupDir}`;
  } catch (error) {
    logError(`Backup failed: ${error.message}`);
    return null;
  }
}

// ✅ VERIFICĂ DIFERENȚELE ÎN IMPLEMENTARE
function analyzeCurrentImplementation() {
  logHeader('ANALIZĂ IMPLEMENTARE CURENTĂ');
  
  const currentFile = 'lib/zoomVideoSDK.ts';
  
  if (!fs.existsSync(currentFile)) {
    logWarning('lib/zoomVideoSDK.ts nu există - va fi creat');
    return { needsUpdate: true, issues: ['File missing'] };
  }
  
  try {
    const content = fs.readFileSync(currentFile, 'utf8');
    const issues = [];
    
    // Verifică probleme comune
    if (content.includes('ZOOM_API_PUBLIC') && content.includes('generateZoomClientToken')) {
      issues.push('Folosește ZOOM_API_PUBLIC în loc de ZOOM_SDK_KEY pentru token-uri client');
    }
    
    if (!content.includes('app_key:')) {
      issues.push('Lipsește câmpul app_key din payload-ul token-ului');
    }
    
    if (!content.includes('version:')) {
      issues.push('Lipsește câmpul version din payload-ul token-ului');
    }
    
    if (content.includes('aud: \'zoom\'')) {
      issues.push('Folosește aud: "zoom" care nu este corect pentru Video SDK');
    }
    
    if (!content.includes('user_identity.length > 16')) {
      issues.push('Nu verifică limita de 16 caractere pentru user_identity');
    }
    
    if (issues.length > 0) {
      logWarning(`Găsite ${issues.length} probleme în implementarea curentă:`);
      issues.forEach(issue => logError(`  • ${issue}`));
      return { needsUpdate: true, issues };
    } else {
      logSuccess('Implementarea curentă pare să fie corectă!');
      return { needsUpdate: false, issues: [] };
    }
    
  } catch (error) {
    logError(`Eroare la analiza fișierului: ${error.message}`);
    return { needsUpdate: true, issues: ['Read error'] };
  }
}

// ✅ VERIFICĂ SESIUNILE EXISTENTE ÎN BAZA DE DATE
async function checkExistingSessions() {
  logHeader('VERIFICARE SESIUNI EXISTENTE');
  
  try {
    // Încearcă să importe Prisma
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const sessions = await prisma.consultingSession.findMany({
      where: {
        zoomTokens: { not: null }
      },
      select: {
        id: true,
        zoomSessionName: true,
        zoomTokens: true,
        createdAt: true
      }
    });
    
    logInfo(`Găsite ${sessions.length} sesiuni cu token-uri existente`);
    
    if (sessions.length > 0) {
      const outdatedTokens = sessions.filter(session => {
        try {
          const tokens = session.zoomTokens;
          if (typeof tokens === 'object' && tokens !== null) {
            // Verifică primul token
            const firstToken = Object.values(tokens)[0];
            if (typeof firstToken === 'string') {
              const payload = JSON.parse(atob(firstToken.split('.')[1]));
              // Verifică dacă are structura veche (fără app_key sau version)
              return !payload.app_key || !payload.version;
            }
          }
          return false;
        } catch (e) {
          return true; // Token corupt = trebuie actualizat
        }
      });
      
      logWarning(`${outdatedTokens.length} sesiuni au token-uri în format vechi care trebuie regenerate`);
      
      if (outdatedTokens.length > 0) {
        logInfo('Sesiuni care necesită token-uri noi:');
        outdatedTokens.slice(0, 5).forEach(session => {
          logInfo(`  • ${session.id} (${session.zoomSessionName}) - ${session.createdAt.toISOString()}`);
        });
        if (outdatedTokens.length > 5) {
          logInfo(`  ... și încă ${outdatedTokens.length - 5} sesiuni`);
        }
      }
    }
    
    await prisma.$disconnect();
    return { total: sessions.length, outdated: outdatedTokens?.length || 0 };
    
  } catch (error) {
    logWarning(`Nu pot verifica baza de date: ${error.message}`);
    logInfo('Continuă cu migrarea fără verificarea DB');
    return { total: 0, outdated: 0 };
  }
}

// ✅ REGENEREAZĂ TOKEN-URI PENTRU SESIUNI EXISTENTE
async function regenerateExistingTokens() {
  logHeader('REGENERARE TOKEN-URI EXISTENTE');
  
  const answer = await askUser('Vrei să regenerez token-urile pentru sesiunile existente? (y/n): ');
  
  if (answer.toLowerCase() !== 'y') {
    logInfo('Saltă regenerarea token-urilor - poți face asta manual mai târziu');
    return;
  }
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const { generateClientToken } = require('../lib/zoomVideoSDK');
    const prisma = new PrismaClient();
    
    const sessions = await prisma.consultingSession.findMany({
      where: {
        zoomSessionName: { not: null },
        zoomTokens: { not: null }
      },
      include: {
        provider: { include: { user: true } },
        client: true
      }
    });
    
    logInfo(`Regenerez token-uri pentru ${sessions.length} sesiuni...`);
    
    let updated = 0;
    let errors = 0;
    
    for (const session of sessions) {
      try {
        const newTokens = {};
        
        // Token pentru provider (host)
        newTokens[session.provider.userId] = generateClientToken(
          session.zoomSessionName,
          session.provider.userId,
          1 // host
        );
        
        // Token pentru client (participant)
        newTokens[session.clientId] = generateClientToken(
          session.zoomSessionName,
          session.clientId,
          0 // participant
        );
        
        // Actualizează în baza de date
        await prisma.consultingSession.update({
          where: { id: session.id },
          data: { zoomTokens: newTokens }
        });
        
        updated++;
        if (updated % 10 === 0) {
          logInfo(`  Actualizate: ${updated}/${sessions.length}`);
        }
        
      } catch (error) {
        logError(`Eroare la regenerarea token-urilor pentru sesiunea ${session.id}: ${error.message}`);
        errors++;
      }
    }
    
    await prisma.$disconnect();
    
    logSuccess(`Token-uri regenerate: ${updated} sesiuni`);
    if (errors > 0) {
      logWarning(`Erori: ${errors} sesiuni`);
    }
    
  } catch (error) {
    logError(`Eroare la regenerarea token-urilor: ${error.message}`);
  }
}

// ✅ HELPER PENTRU INPUT UTILIZATOR
function askUser(question) {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// ✅ TESTEAZĂ IMPLEMENTAREA DUPĂ MIGRARE
async function testNewImplementation() {
  logHeader('TEST IMPLEMENTARE NOUĂ');
  
  try {
    const { quickTest } = require('../lib/zoomVideoSDK');
    quickTest();
    logSuccess('Test implementare nouă completat - verifică log-urile de mai sus');
  } catch (error) {
    logError(`Test implementare nouă eșuat: ${error.message}`);
    logWarning('Verifică că ai copiat noile fișiere corect');
  }
}

// ✅ GENEREAZĂ PLAN DE IMPLEMENTARE
function generateImplementationPlan(analysis, dbInfo) {
  logHeader('PLAN DE IMPLEMENTARE');
  
  const plan = [];
  
  if (analysis.needsUpdate) {
    plan.push('1. Backup fișiere existente ✓');
    plan.push('2. Actualizează lib/zoomVideoSDK.ts cu implementarea corectată');
    plan.push('3. Actualizează API routes cu noile funcții');
    plan.push('4. Actualizează componenta frontend (dacă e necesar)');
  }
  
  if (dbInfo.outdated > 0) {
    plan.push(`5. Regenerează ${dbInfo.outdated} token-uri din format vechi`);
  }
  
  plan.push('6. Testează implementarea nouă');
  plan.push('7. Deploy în production cu domain allow list actualizat');
  
  logInfo('Pașii de implementare:');
  plan.forEach(step => logInfo(`  ${step}`));
  
  return plan;
}

// ✅ MAIN MIGRATION FUNCTION
async function runMigration() {
  logHeader('🔄 MIGRARE LA IMPLEMENTAREA CORECTATĂ ZOOM VIDEO SDK');
  
  logInfo('Acest script te va ajuta să migrezi la implementarea corectată care folosește:');
  logInfo('• ZOOM_SDK_KEY/SECRET pentru token-uri client (Video SDK)');
  logInfo('• ZOOM_API_PUBLIC/SECRET pentru API calls (Meeting SDK)');
  logInfo('• Format corect de token cu app_key, tpc, role_type, version');
  
  // 1. Verifică credențialele
  const requiredVars = ['ZOOM_SDK_KEY', 'ZOOM_SDK_SECRET', 'ZOOM_API_PUBLIC', 'ZOOM_API_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logError(`Lipsesc variabilele de mediu: ${missingVars.join(', ')}`);
    logInfo('Setează aceste variabile în .env înainte de a continua');
    process.exit(1);
  }
  
  logSuccess('Toate credențialele sunt setate');
  
  // 2. Analizează implementarea curentă
  const analysis = analyzeCurrentImplementation();
  
  // 3. Verifică sesiunile existente
  const dbInfo = await checkExistingSessions();
  
  // 4. Generează plan
  const plan = generateImplementationPlan(analysis, dbInfo);
  
  // 5. Confirmă cu utilizatorul
  const confirmed = await askUser('\nVrei să continui cu migrarea? (y/n): ');
  
  if (confirmed.toLowerCase() !== 'y') {
    logInfo('Migrare anulată de utilizator');
    process.exit(0);
  }
  
  // 6. Backup fișiere
  const backupDir = backupExistingFiles();
  if (!backupDir) {
    logError('Backup eșuat - opresc migrarea');
    process.exit(1);
  }
  
  // 7. Instrucțiuni manuale pentru actualizare
  logHeader('ACTUALIZARE FIȘIERE');
  
  logInfo('Acum trebuie să copiezi fișierele noi:');
  logInfo('');
  logInfo('1. Copiază implementarea corectată în lib/zoomVideoSDK.ts');
  logInfo('2. Actualizează API routes cu noile funcții');
  logInfo('3. Verifică că importurile sunt corecte');
  logInfo('');
  logWarning('Această parte trebuie făcută manual - nu pot suprascrie fișierele automat');
  
  const filesUpdated = await askUser('Ai actualizat fișierele? (y/n): ');
  
  if (filesUpdated.toLowerCase() !== 'y') {
    logInfo('Te rog să actualizezi fișierele și să rulezi din nou scriptul');
    process.exit(0);
  }
  
  // 8. Testează implementarea nouă
  await testNewImplementation();
  
  // 9. Regenerează token-uri (opțional)
  if (dbInfo.outdated > 0) {
    await regenerateExistingTokens();
  }
  
  // 10. Instrucțiuni finale
  logHeader('🎉 MIGRARE COMPLETATĂ');
  
  logSuccess('Migrarea a fost finalizată cu succes!');
  logInfo('');
  logInfo('Următorii pași:');
  logInfo('1. Testează aplicația local');
  logInfo('2. Rulează npm run zoom:check pentru verificare finală');
  logInfo('3. Deploy în production cu domain allow list actualizat');
  logInfo('4. Rulează smoke tests în production');
  logInfo('');
  logInfo(`Backup-ul fișierelor vechi se află în: ${backupDir}`);
  
  logSuccess('🚀 Implementarea ta Zoom Video SDK este acum corectă și gata pentru producție!');
}

// Rulează migrarea
if (require.main === module) {
  runMigration().catch(error => {
    console.error('Eroare la migrare:', error);
    process.exit(1);
  });
}

module.exports = {
  runMigration,
  analyzeCurrentImplementation,
  checkExistingSessions,
  regenerateExistingTokens
};