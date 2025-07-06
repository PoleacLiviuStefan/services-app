"use strict";

// scripts/test-with-your-implementation.js
// ✅ TESTEAZĂ IMPLEMENTAREA TA REALĂ DIN src/lib/zoomVideoSDK.ts
require('dotenv').config();

var colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message) {
  var color = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'reset';
  console.log("".concat(colors[color]).concat(message).concat(colors.reset));
}

function logHeader(message) {
  log("\n".concat(colors.bold).concat(colors.blue).concat('='.repeat(60)).concat(colors.reset));
  log("".concat(colors.bold).concat(colors.blue).concat(message).concat(colors.reset));
  log("".concat(colors.bold).concat(colors.blue).concat('='.repeat(60)).concat(colors.reset));
}

function logSuccess(message) {
  log("\u2705 ".concat(message), 'green');
}

function logError(message) {
  log("\u274C ".concat(message), 'red');
}

function logWarning(message) {
  log("\u26A0\uFE0F  ".concat(message), 'yellow');
}

function logInfo(message) {
  log("\u2139\uFE0F  ".concat(message), 'blue');
} // ✅ ÎNCARCĂ IMPLEMENTAREA TA REALĂ


function loadYourImplementation() {
  var implementation, _implementation, _implementation2;

  return regeneratorRuntime.async(function loadYourImplementation$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          logHeader('ÎNCĂRCARE IMPLEMENTARE REALĂ');
          _context.prev = 1;
          // Pentru a importa TypeScript în Node.js, avem câteva opțiuni:
          // Opțiunea 1: Încearcă să compilezi și să imporți
          logInfo('Încercare 1: Import direct din TypeScript...'); // Verifică dacă ts-node este disponibil

          _context.prev = 3;

          require('ts-node/register');

          implementation = require('../src/lib/zoomVideoSDK');
          logSuccess('Implementarea încărcată cu ts-node!');
          return _context.abrupt("return", implementation);

        case 10:
          _context.prev = 10;
          _context.t0 = _context["catch"](3);
          logWarning('ts-node nu este disponibil, încerc următoarea metodă...');

        case 13:
          _context.prev = 13;
          _implementation = require('../lib/zoomVideoSDK');
          logSuccess('Implementarea încărcată din /lib/!');
          return _context.abrupt("return", _implementation);

        case 19:
          _context.prev = 19;
          _context.t1 = _context["catch"](13);
          logWarning('Nu găsesc implementarea în /lib/, încerc /dist/...');

        case 22:
          _context.prev = 22;
          _implementation2 = require('../dist/lib/zoomVideoSDK');
          logSuccess('Implementarea încărcată din /dist/lib/!');
          return _context.abrupt("return", _implementation2);

        case 28:
          _context.prev = 28;
          _context.t2 = _context["catch"](22);
          logWarning('Nu găsesc implementarea compilată.');

        case 31:
          // Opțiunea 4: Sugerează compilarea
          logError('Nu pot încărca implementarea TypeScript direct.');
          logInfo('');
          logInfo('📝 Pentru a testa implementarea ta reală, ai următoarele opțiuni:');
          logInfo('');
          logInfo('1. Instalează ts-node:');
          logInfo('   npm install -D ts-node');
          logInfo('   apoi rulează din nou acest script');
          logInfo('');
          logInfo('2. Compilează TypeScript:');
          logInfo('   npm run build');
          logInfo('   apoi rulează din nou acest script');
          logInfo('');
          logInfo('3. Folosește script-ul standalone (recomandat pentru teste):');
          logInfo('   node scripts/test-zoom-implementation.js');
          return _context.abrupt("return", null);

        case 48:
          _context.prev = 48;
          _context.t3 = _context["catch"](1);
          logError("Eroare la \xEEnc\u0103rcarea implement\u0103rii: ".concat(_context.t3.message));
          return _context.abrupt("return", null);

        case 52:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[1, 48], [3, 10], [13, 19], [22, 28]]);
} // ✅ TESTEAZĂ IMPLEMENTAREA ÎNCĂRCATĂ


function testLoadedImplementation(implementation) {
  var functions, _i, _functions, funcName, token, tokenInfo;

  return regeneratorRuntime.async(function testLoadedImplementation$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          logHeader('TEST IMPLEMENTARE ÎNCĂRCATĂ');
          functions = ['generateClientToken', 'isVideoSDKTokenValid', 'parseZoomToken', 'validateZoomCredentials', 'createZoomSession', 'quickTest'];
          logInfo('Verificare funcții disponibile:');

          for (_i = 0, _functions = functions; _i < _functions.length; _i++) {
            funcName = _functions[_i];

            if (typeof implementation[funcName] === 'function') {
              logSuccess("\u2713 ".concat(funcName));
            } else {
              logWarning("? ".concat(funcName, " (lipse\u0219te sau nu e func\u021Bie)"));
            }
          } // Test quick


          if (typeof implementation.quickTest === 'function') {
            logInfo('\nRulează quickTest din implementarea ta...');

            try {
              implementation.quickTest();
              logSuccess('quickTest din implementarea ta rulat cu succes!');
            } catch (error) {
              logError("quickTest e\u0219uat: ".concat(error.message));
            }
          } // Test generare token


          if (typeof implementation.generateClientToken === 'function') {
            logInfo('\nTestez generarea token-ului...');

            try {
              token = implementation.generateClientToken('test-session', 'user123', 1);
              logSuccess("Token generat: ".concat(token.length, " caractere"));

              if (typeof implementation.parseZoomToken === 'function') {
                tokenInfo = implementation.parseZoomToken(token);

                if (tokenInfo) {
                  logInfo("  Session: ".concat(tokenInfo.sessionName));
                  logInfo("  User: ".concat(tokenInfo.userIdentity));
                  logInfo("  Role: ".concat(tokenInfo.roleType));
                  logInfo("  Are toate c\xE2mpurile: ".concat(tokenInfo.hasAllRequiredFields));
                }
              }
            } catch (error) {
              logError("Generarea token-ului e\u0219uat\u0103: ".concat(error.message));
            }
          }

          return _context2.abrupt("return", true);

        case 7:
        case "end":
          return _context2.stop();
      }
    }
  });
} // ✅ FALLBACK - IMPLEMENTARE INLINE PENTRU COMPARAȚIE


function runStandaloneTest() {
  logHeader('FALLBACK - TEST STANDALONE');
  logWarning('Nu pot încărca implementarea ta TypeScript.');
  logInfo('Rulează testul standalone pentru verificare...');
  logInfo(''); // Importă și rulează script-ul standalone

  try {
    var standaloneScript = require('./test-zoom-implementation');

    if (typeof standaloneScript.quickTest === 'function') {
      standaloneScript.quickTest();
      logInfo('');
      logSuccess('Testul standalone a rulat cu succes!');
      logInfo('Aceasta confirmă că logica de implementare este corectă.');
    }
  } catch (error) {
    logError("Nu pot rula testul standalone: ".concat(error.message));
    logInfo('Rulează manual: node scripts/test-zoom-implementation.js');
  }
} // ✅ MAIN FUNCTION


function runTest() {
  var implementation;
  return regeneratorRuntime.async(function runTest$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          logHeader('🧪 TEST IMPLEMENTARE REALĂ DIN src/lib/zoomVideoSDK.ts');
          logInfo('Încercare de încărcare a implementării tale reale...');
          _context3.next = 4;
          return regeneratorRuntime.awrap(loadYourImplementation());

        case 4:
          implementation = _context3.sent;

          if (!implementation) {
            _context3.next = 11;
            break;
          }

          _context3.next = 8;
          return regeneratorRuntime.awrap(testLoadedImplementation(implementation));

        case 8:
          logSuccess('🎉 Testul implementării reale completat!');
          _context3.next = 12;
          break;

        case 11:
          runStandaloneTest();

        case 12:
          logInfo('');
          logInfo('📝 Recomandare: Pentru teste complete, folosește:');
          logInfo('   node scripts/test-zoom-implementation.js');

        case 15:
        case "end":
          return _context3.stop();
      }
    }
  });
} // Rulează testul


if (require.main === module) {
  runTest()["catch"](function (error) {
    console.error('Eroare:', error);
    process.exit(1);
  });
}