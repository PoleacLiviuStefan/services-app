"use strict";
// File: app/api/oblio/create-invoice/route.ts
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
exports.POST = void 0;
var server_1 = require("next/server");
var oblioapi_1 = require("@obliosoftware/oblioapi");
var next_auth_1 = require("next-auth");
var auth_1 = require("@/lib/auth");
var prisma_1 = require("@/lib/prisma");
var mail_1 = require("@/lib/mail");
var oblio = new oblioapi_1["default"](process.env.OBLIO_CLIENT_ID, process.env.OBLIO_CLIENT_SECRET);
function POST(req) {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function () {
        var session, userId, body, _e, packageId, products, issueDate, dueDate, userPkg, billing, vatPayer, clientPayload, invoicePayload, oblioData, resp, err_1, invoiceRecord, dbErr_1, customerEmail, mailErr_1;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0: return [4 /*yield*/, next_auth_1.getServerSession(auth_1.authOptions)];
                case 1:
                    session = _f.sent();
                    if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 })];
                    }
                    userId = session.user.id;
                    _f.label = 2;
                case 2:
                    _f.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, req.json()];
                case 3:
                    body = _f.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _e = _f.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Body invalid JSON" }, { status: 400 })];
                case 5:
                    packageId = body.packageId, products = body.products, issueDate = body.issueDate, dueDate = body.dueDate;
                    if (!packageId || !Array.isArray(products) || products.length === 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Lipsește packageId sau produse" }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.userProviderPackage.findFirst({
                            where: { packageId: packageId, userId: userId }
                        })];
                case 6:
                    userPkg = _f.sent();
                    if (!userPkg) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Nu ai cump\u0103rat pachetul cu id=" + packageId }, { status: 400 })];
                    }
                    return [4 /*yield*/, prisma_1.prisma.billingDetails.findUnique({
                            where: { userId: userId }
                        })];
                case 7:
                    billing = _f.sent();
                    if (!billing) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Nu există detaliile de facturare pentru acest utilizator" }, { status: 400 })];
                    }
                    console.log("billing este: ", billing);
                    vatPayer = ((_b = billing.bank) === null || _b === void 0 ? void 0 : _b.trim()) && ((_c = billing.iban) === null || _c === void 0 ? void 0 : _c.trim()) ? 1 : 0;
                    clientPayload = {
                        cif: billing.cif,
                        name: billing.companyName,
                        email: (_d = session.user.email) !== null && _d !== void 0 ? _d : undefined,
                        phone: billing.phone,
                        address: billing.address,
                        vatPayer: vatPayer
                    };
                    invoicePayload = {
                        cif: process.env.OBLIO_CIF,
                        client: clientPayload,
                        issueDate: issueDate || new Date().toISOString().slice(0, 10),
                        dueDate: dueDate || new Date().toISOString().slice(0, 10),
                        seriesName: process.env.OBLIO_SERIES_NAME,
                        language: "RO",
                        precision: 2,
                        currency: "RON",
                        products: products,
                        workStation: "Sediu",
                        useStock: 0
                    };
                    _f.label = 8;
                case 8:
                    _f.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, oblio.createInvoice(invoicePayload)];
                case 9:
                    resp = _f.sent();
                    oblioData = resp.data;
                    return [3 /*break*/, 11];
                case 10:
                    err_1 = _f.sent();
                    console.error("[create-invoice] Oblio error:", err_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: err_1.message || "Eroare la Oblio" }, { status: err_1.statusCode || 500 })];
                case 11:
                    _f.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, prisma_1.prisma.invoice.create({
                            data: {
                                number: oblioData.number,
                                url: oblioData.link,
                                packageId: userPkg.id
                            }
                        })];
                case 12:
                    invoiceRecord = _f.sent();
                    return [3 /*break*/, 14];
                case 13:
                    dbErr_1 = _f.sent();
                    console.error("[create-invoice] DB error:", dbErr_1);
                    return [2 /*return*/, server_1.NextResponse.json({
                            error: "Factura emisă, dar nu s-a putut salva în DB",
                            detail: dbErr_1.message
                        }, { status: 500 })];
                case 14:
                    _f.trys.push([14, 16, , 17]);
                    customerEmail = session.user.email;
                    return [4 /*yield*/, mail_1.sendInvoiceEmail(customerEmail, oblioData.number, oblioData.link)];
                case 15:
                    _f.sent();
                    return [3 /*break*/, 17];
                case 16:
                    mailErr_1 = _f.sent();
                    console.error("[create-invoice] Email error:", mailErr_1);
                    return [3 /*break*/, 17];
                case 17: 
                // 9. Răspuns final
                return [2 /*return*/, server_1.NextResponse.json({
                        status: 200,
                        statusMessage: "Success",
                        oblio: oblioData,
                        invoice: invoiceRecord
                    }, { status: 200 })];
            }
        });
    });
}
exports.POST = POST;
