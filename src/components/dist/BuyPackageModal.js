// File: components/BuyPackageModal.tsx
"use client";
"use strict";
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
var react_1 = require("react");
var PackageCard_1 = require("./PackageCard");
var react_2 = require("next-auth/react");
var react_stripe_js_1 = require("@stripe/react-stripe-js");
var stripe_js_1 = require("@stripe/stripe-js");
var CheckoutForm_1 = require("./CheckoutForm");
// Încarcă Stripe.js cu cheia publicabilă
var stripePromise = stripe_js_1.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
var BuyPackageModal = function (_a) {
    var _b, _c;
    var providerStripeAccountId = _a.providerStripeAccountId, providerId = _a.providerId, packages = _a.packages, isOpen = _a.isOpen, onClose = _a.onClose;
    console.log("packages sunt: ", packages);
    var session = react_2.useSession().data;
    console.log("session:", session);
    var _d = react_1.useState(null), selectedPackageId = _d[0], setSelectedPackageId = _d[1];
    var _e = react_1.useState(null), clientSecret = _e[0], setClientSecret = _e[1];
    var _f = react_1.useState(null), error = _f[0], setError = _f[1];
    var _g = react_1.useState(false), paymentSuccess = _g[0], setPaymentSuccess = _g[1];
    // Ținem suma totală și comisionul (în subunități)
    var _h = react_1.useState(0), currentAmount = _h[0], setCurrentAmount = _h[1];
    var _j = react_1.useState(0), currentFeeAmount = _j[0], setCurrentFeeAmount = _j[1];
    // Resetăm la deschiderea modalului
    react_1.useEffect(function () {
        if (isOpen) {
            setSelectedPackageId(null);
            setClientSecret(null);
            setError(null);
            setPaymentSuccess(false);
            setCurrentAmount(0);
            setCurrentFeeAmount(0);
        }
    }, [isOpen]);
    // 1. Conectare Stripe (dacă nu există providerStripeAccountId)
    var handleConnect = function () { return __awaiter(void 0, void 0, void 0, function () {
        var resp, data, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!providerStripeAccountId) {
                        setError("Contul Stripe al furnizorului nu există. Crează contul Connect mai întâi.");
                        return [2 /*return*/];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, fetch("/api/stripe/connect/account-link?accountId=" + providerStripeAccountId)];
                case 2:
                    resp = _a.sent();
                    return [4 /*yield*/, resp.json()];
                case 3:
                    data = _a.sent();
                    console.log("account-link răspuns:", data);
                    if (data.error || !data.url) {
                        setError(data.error || "Eroare la generarea link-ului de conectare Stripe.");
                        return [2 /*return*/];
                    }
                    window.location.href = data.url;
                    return [3 /*break*/, 5];
                case 4:
                    err_1 = _a.sent();
                    console.error("handleConnect error:", err_1);
                    setError(err_1.message || "Eroare neașteptată la conectarea Stripe.");
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    // 2. Când userul apasă "Cumpără" pe un pachet
    var handleBuy = function (pkgId) { return __awaiter(void 0, void 0, void 0, function () {
        var pkg, amountInCents, feeAmount, params, resp, data, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setError(null);
                    setPaymentSuccess(false);
                    setSelectedPackageId(pkgId);
                    setClientSecret(null);
                    pkg = packages.find(function (p) { return p.id === pkgId; });
                    if (!pkg) {
                        setError("Pachetul selectat nu există.");
                        return [2 /*return*/];
                    }
                    if (!providerStripeAccountId) {
                        setError("Contul Stripe al furnizorului nu este configurat.");
                        return [2 /*return*/];
                    }
                    amountInCents = Math.round(pkg.price * 100);
                    feeAmount = Math.round((amountInCents * 10) / 100);
                    setCurrentAmount(amountInCents);
                    setCurrentFeeAmount(feeAmount);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    params = new URLSearchParams({
                        amount: amountInCents.toString(),
                        currency: "ron",
                        fee_percent: "10"
                    });
                    return [4 /*yield*/, fetch("/api/stripe/create-payment-intent?" + params.toString(), {
                            method: "GET"
                        })];
                case 2:
                    resp = _a.sent();
                    return [4 /*yield*/, resp.json()];
                case 3:
                    data = _a.sent();
                    console.log("create-payment-intent răspuns:", data);
                    if (data.error) {
                        setError(data.error);
                        return [2 /*return*/];
                    }
                    if (data.clientSecret) {
                        setClientSecret(data.clientSecret);
                    }
                    else {
                        setError("Nu am primit clientSecret de la server.");
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_2 = _a.sent();
                    console.error("handleBuy error:", err_2);
                    setError(err_2.message || "Eroare la solicitarea clientSecret.");
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    // 3. Callback când CheckoutForm confirmă plata
    var handlePaymentSuccess = function (paymentIntentId) { return __awaiter(void 0, void 0, void 0, function () {
        var transferAmount, respTransfer, jsonTransfer, respPurchase, jsonPurchase, err_3;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log("🔔 handlePaymentSuccess a fost apelat cu ID:", paymentIntentId);
                    console.log("  session.user.id:", (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id);
                    console.log("  providerId:", providerId);
                    console.log("  selectedPackageId:", selectedPackageId);
                    console.log("  providerStripeAccountId:", providerStripeAccountId);
                    if (!((_b = session === null || session === void 0 ? void 0 : session.user) === null || _b === void 0 ? void 0 : _b.id)) {
                        setError("Trebuie să fii autentificat pentru a finaliza comanda.");
                        console.log("Trebuie să fii autentificat pentru a finaliza comanda.");
                        return [2 /*return*/];
                    }
                    if (!providerId || !selectedPackageId) {
                        setError("Date incomplete pentru finalizarea comenzii.");
                        console.log("Date incomplete pentru finalizarea comenzii.");
                        return [2 /*return*/];
                    }
                    if (!providerStripeAccountId) {
                        setError("Contul Stripe al furnizorului nu este configurat.");
                        console.log("Contul Stripe al furnizorului nu este configurat.");
                        return [2 /*return*/];
                    }
                    transferAmount = currentAmount - currentFeeAmount;
                    console.log("⚙️ Transfer către furnizor:", {
                        paymentIntentId: paymentIntentId,
                        destinationAccount: providerStripeAccountId,
                        transferAmount: transferAmount
                    });
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, , 7]);
                    console.log("inainte de request");
                    return [4 /*yield*/, fetch("/api/stripe/create-transfer", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                paymentIntentId: paymentIntentId,
                                destinationAccount: providerStripeAccountId,
                                transferAmount: transferAmount
                            })
                        })];
                case 2:
                    respTransfer = _c.sent();
                    return [4 /*yield*/, respTransfer.json()];
                case 3:
                    jsonTransfer = _c.sent();
                    console.log("create-transfer răspuns:", jsonTransfer);
                    if (!respTransfer.ok) {
                        setError(jsonTransfer.error || "Eroare la transferul către furnizor.");
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, fetch("/api/purchase", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                userId: session.user.id,
                                providerId: providerId,
                                packageId: selectedPackageId
                            })
                        })];
                case 4:
                    respPurchase = _c.sent();
                    return [4 /*yield*/, respPurchase.json()];
                case 5:
                    jsonPurchase = _c.sent();
                    console.log("purchase răspuns:", jsonPurchase);
                    if (!respPurchase.ok) {
                        setError(jsonPurchase.error || "Eroare la activarea pachetului.");
                        return [2 /*return*/];
                    }
                    // 3.4. Totul a mers bine → închidem modalul
                    setPaymentSuccess(true);
                    onClose(); // închide modalul
                    return [3 /*break*/, 7];
                case 6:
                    err_3 = _c.sent();
                    console.error("handlePaymentSuccess error:", err_3);
                    setError(err_3.message || "Eroare neașteptată la finalizarea comenzii.");
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    var handlePaymentError = function (msg) {
        console.error("handlePaymentError:", msg);
        setError(msg);
    };
    // 3.5. Dacă userul dă "Renunță" înainte de confirmare
    var handleCancelPayment = function () {
        setSelectedPackageId(null);
        setClientSecret(null);
        setError(null);
        setPaymentSuccess(false);
    };
    if (!isOpen)
        return null;
    return (react_1["default"].createElement("div", { className: "fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50", onClick: onClose },
        react_1["default"].createElement("div", { className: "relative bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 lg:w-1/2 max-h-[80vh] overflow-y-auto", onClick: function (e) { return e.stopPropagation(); } },
            react_1["default"].createElement("button", { className: "absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold", onClick: onClose }, "\u00D7"),
            react_1["default"].createElement("div", { className: "p-6" },
                react_1["default"].createElement("h2", { className: "text-xl font-semibold mb-4" }, "Achizi\u021Bie pachet"),
                !providerStripeAccountId && !paymentSuccess && (react_1["default"].createElement("div", { className: "flex flex-col items-center space-y-4" },
                    react_1["default"].createElement("p", { className: "text-center text-red-600" }, "Furnizorul nu este conectat la Stripe."),
                    react_1["default"].createElement("button", { className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700", onClick: handleConnect }, "Conecteaz\u0103-te la Stripe"),
                    error && (react_1["default"].createElement("div", { className: "p-3 bg-red-100 text-red-700 rounded mt-4" }, error)))),
                providerStripeAccountId && !selectedPackageId && !paymentSuccess && (react_1["default"].createElement("div", { className: "space-y-4" },
                    packages.map(function (pkg) { return (react_1["default"].createElement(PackageCard_1["default"], { key: pkg.id, pkg: pkg, onBuy: handleBuy })); }),
                    error && (react_1["default"].createElement("div", { className: "p-3 bg-red-100 text-red-700 rounded mt-4" }, error)))),
                selectedPackageId && !clientSecret && !paymentSuccess && (react_1["default"].createElement("div", { className: "mt-4 text-center" }, error ? (react_1["default"].createElement("div", { className: "p-3 bg-red-100 text-red-700 rounded" },
                    error,
                    react_1["default"].createElement("button", { onClick: handleCancelPayment, className: "block mt-3 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" }, "\u00CEnapoi la pachete"))) : (react_1["default"].createElement("p", null, "Se preg\u0103te\u0219te formularul de plat\u0103\u2026")))),
                selectedPackageId && clientSecret && !paymentSuccess && (react_1["default"].createElement("div", { className: "flex flex-col items-center w-full mt-6 " },
                    react_1["default"].createElement("h3", { className: "text-lg font-medium mb-2" },
                        "Confirm\u0103 plata pentru \u201C", (_b = packages.find(function (p) { return p.id === selectedPackageId; })) === null || _b === void 0 ? void 0 :
                        _b.service,
                        "\u201D"),
                    react_1["default"].createElement("span", { className: "font-bold" },
                        "TOTAL: ", (_c = packages.find(function (p) { return p.id === selectedPackageId; })) === null || _c === void 0 ? void 0 :
                        _c.price,
                        " RON"),
                    react_1["default"].createElement(react_stripe_js_1.Elements, { stripe: stripePromise, options: { clientSecret: clientSecret } },
                        react_1["default"].createElement(CheckoutForm_1["default"], { clientSecret: clientSecret, onSuccess: handlePaymentSuccess, onError: handlePaymentError }),
                        react_1["default"].createElement("button", { type: "button", onClick: handleCancelPayment, className: "mt-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" }, "Renun\u021B\u0103 \u0219i alege alt pachet")))),
                paymentSuccess && (react_1["default"].createElement("div", { className: "mb-4 p-4 bg-green-100 text-green-800 rounded" }, "Pachetul a fost activat cu succes! Modalul se va \u00EEnchide acum."))))));
};
exports["default"] = BuyPackageModal;
