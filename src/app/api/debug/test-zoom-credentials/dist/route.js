"use strict";
// File: app/api/debug/test-zoom-credentials/route.ts
// Test endpoint for debugging Zoom Video SDK credentials
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.GET = exports.POST = void 0;
var server_1 = require("next/server");
var jsrsasign_1 = require("jsrsasign");
function generateTestVideoSDKToken(sessionName, userIdentity, roleType) {
    var iat = Math.round(Date.now() / 1000) - 30; // 30 seconds ago
    var exp = iat + 7200; // 2 hours
    // Correct Video SDK payload format
    var payload = {
        app_key: process.env.ZOOM_API_PUBLIC,
        tpc: sessionName,
        role_type: roleType,
        iat: iat,
        exp: exp,
        user_identity: userIdentity,
        session_key: '',
        alg: 'HS256'
    };
    var header = {
        alg: 'HS256',
        typ: 'JWT'
    };
    var token = jsrsasign_1["default"].jws.JWS.sign('HS256', JSON.stringify(header), JSON.stringify(payload), process.env.ZOOM_API_SECRET);
    return token;
}
function validateCredentials() {
    var issues = [];
    var recommendations = [];
    if (!process.env.ZOOM_API_PUBLIC) {
        issues.push('ZOOM_API_PUBLIC environment variable is missing');
        recommendations.push('Set ZOOM_API_PUBLIC with your Video SDK key from Zoom Marketplace');
    }
    if (!process.env.ZOOM_API_SECRET) {
        issues.push('ZOOM_API_SECRET environment variable is missing');
        recommendations.push('Set ZOOM_API_SECRET with your Video SDK secret from Zoom Marketplace');
    }
    if (process.env.ZOOM_API_PUBLIC) {
        // Video SDK keys typically start with certain patterns
        var key = process.env.ZOOM_API_PUBLIC;
        if (key.length < 10) {
            issues.push('API key seems too short');
            recommendations.push('Verify you copied the complete Video SDK key');
        }
    }
    if (process.env.ZOOM_API_SECRET) {
        var secret = process.env.ZOOM_API_SECRET;
        if (secret.length < 10) {
            issues.push('API secret seems too short');
            recommendations.push('Verify you copied the complete Video SDK secret');
        }
    }
    return {
        valid: issues.length === 0,
        issues: issues,
        recommendations: recommendations
    };
}
function analyzeToken(token) {
    var issues = [];
    var recommendations = [];
    try {
        var parts = token.split('.');
        if (parts.length !== 3) {
            issues.push("Token has " + parts.length + " parts, should have 3");
            recommendations.push('Check token generation - should be header.payload.signature');
            return { valid: false, issues: issues, recommendations: recommendations };
        }
        var payload = JSON.parse(atob(parts[1]));
        // Check required fields
        if (!payload.app_key) {
            issues.push('Missing app_key field');
            recommendations.push('Add app_key field with your Video SDK key');
        }
        if (!payload.tpc) {
            issues.push('Missing tpc field');
            recommendations.push('Add tpc field with session name');
        }
        if (payload.role_type === undefined) {
            issues.push('Missing role_type field');
            recommendations.push('Add role_type field (0 for participant, 1 for host)');
        }
        if (!payload.iat) {
            issues.push('Missing iat field');
            recommendations.push('Add iat field with issued timestamp');
        }
        if (!payload.exp) {
            issues.push('Missing exp field');
            recommendations.push('Add exp field with expiration timestamp');
        }
        // Check for common mistakes (Meeting SDK fields)
        if (payload.iss && !payload.app_key) {
            issues.push('Using Meeting SDK field "iss" instead of Video SDK field "app_key"');
            recommendations.push('Replace "iss" with "app_key" for Video SDK');
        }
        if (payload.aud) {
            issues.push('Found Meeting SDK field "aud" - not needed for Video SDK');
            recommendations.push('Remove "aud" field - not used in Video SDK');
        }
        if (payload.appKey && !payload.app_key) {
            issues.push('Using camelCase "appKey" instead of snake_case "app_key"');
            recommendations.push('Change "appKey" to "app_key"');
        }
        if (payload.topic && !payload.tpc) {
            issues.push('Using "topic" instead of "tpc"');
            recommendations.push('Change "topic" to "tpc"');
        }
        if (payload.roleType !== undefined && payload.role_type === undefined) {
            issues.push('Using camelCase "roleType" instead of snake_case "role_type"');
            recommendations.push('Change "roleType" to "role_type"');
        }
        // Check expiration
        if (payload.exp) {
            var now = Math.floor(Date.now() / 1000);
            if (payload.exp <= now) {
                issues.push('Token is expired');
                recommendations.push('Generate new token with future expiration time');
            }
            else if (payload.exp - now < 300) {
                issues.push('Token expires very soon');
                recommendations.push('Use longer expiration time (recommended: 1-2 hours)');
            }
        }
        // Check issued time
        if (payload.iat) {
            var now = Math.floor(Date.now() / 1000);
            if (payload.iat > now + 300) {
                issues.push('Token issued time is in the future');
                recommendations.push('Set iat to current time or slightly in the past');
            }
        }
        return { valid: issues.length === 0, issues: issues, recommendations: recommendations };
    }
    catch (error) {
        issues.push('Failed to parse token');
        recommendations.push('Check token format and base64 encoding');
        return { valid: false, issues: issues, recommendations: recommendations };
    }
}
function POST(req) {
    return __awaiter(this, void 0, void 0, function () {
        var body, sessionName, userIdentity, roleType, credentialCheck, token, tokenAnalysis, parts, payload, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, req.json()];
                case 1:
                    body = _a.sent();
                    sessionName = body.sessionName, userIdentity = body.userIdentity, roleType = body.roleType;
                    // Validate input
                    if (!sessionName || !userIdentity || roleType === undefined) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Missing required fields: sessionName, userIdentity, roleType',
                                credentialsValid: false,
                                recommendations: ['Provide all required test parameters']
                            })];
                    }
                    credentialCheck = validateCredentials();
                    if (!credentialCheck.valid) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Invalid credentials configuration',
                                credentialsValid: false,
                                recommendations: credentialCheck.recommendations
                            })];
                    }
                    // Try to generate token
                    try {
                        token = generateTestVideoSDKToken(sessionName, userIdentity, roleType);
                        tokenAnalysis = analyzeToken(token);
                        parts = token.split('.');
                        payload = JSON.parse(atob(parts[1]));
                        result = {
                            success: tokenAnalysis.valid,
                            token: token,
                            payload: payload,
                            credentialsValid: true,
                            recommendations: tokenAnalysis.recommendations
                        };
                        if (!tokenAnalysis.valid) {
                            result.error = 'Generated token has issues: ' + tokenAnalysis.issues.join(', ');
                        }
                        return [2 /*return*/, server_1.NextResponse.json(result)];
                    }
                    catch (tokenError) {
                        return [2 /*return*/, server_1.NextResponse.json({
                                success: false,
                                error: 'Failed to generate token: ' + (tokenError instanceof Error ? tokenError.message : 'Unknown error'),
                                credentialsValid: true,
                                recommendations: [
                                    'Check that ZOOM_API_SECRET is correct',
                                    'Verify environment variables are properly loaded',
                                    'Test with Zoom\'s official sample code'
                                ]
                            })];
                    }
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    return [2 /*return*/, server_1.NextResponse.json({
                            success: false,
                            error: 'Request processing failed: ' + (error_1 instanceof Error ? error_1.message : 'Unknown error'),
                            credentialsValid: false,
                            recommendations: ['Check request format and try again']
                        }, { status: 400 })];
                case 3: return [2 /*return*/];
            }
        });
    });
}
exports.POST = POST;
// GET endpoint for basic health check
function GET() {
    return __awaiter(this, void 0, void 0, function () {
        var credentialCheck;
        return __generator(this, function (_a) {
            credentialCheck = validateCredentials();
            return [2 /*return*/, server_1.NextResponse.json({
                    status: 'Debug endpoint active',
                    credentialsConfigured: credentialCheck.valid,
                    issues: credentialCheck.issues,
                    recommendations: credentialCheck.recommendations,
                    usage: 'POST with { sessionName, userIdentity, roleType } to test token generation'
                })];
        });
    });
}
exports.GET = GET;
