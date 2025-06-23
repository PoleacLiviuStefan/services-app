// File: components/ProviderDetails.tsx
"use client";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var react_1 = require("react");
var navigation_1 = require("next/navigation");
var button_1 = require("@/components/atoms/button");
var modal_1 = require("@/components/ui/modal");
var addAttributeProvider_1 = require("@/components/ui/addAttributeProvider");
var editButton_1 = require("@/components/ui/editButton");
var catalog_1 = require("@/store/catalog");
var ProviderDetails = function (_a) {
    var _b, _c, _d, _e, _f, _g;
    var provider = _a.provider;
    console.log("provider: ", provider);
    var specialitiesStore = catalog_1.useCatalogStore(function (s) { return s.specialities; });
    var readingsStore = catalog_1.useCatalogStore(function (s) { return s.readings; });
    var toolsStore = catalog_1.useCatalogStore(function (s) { return s.tools; });
    var _h = react_1.useState(provider), localProvider = _h[0], setLocalProvider = _h[1];
    var _j = react_1.useState(""), showEditModal = _j[0], setShowEditModal = _j[1];
    // Form fields
    var _k = react_1.useState(provider.description || ""), description = _k[0], setDescription = _k[1];
    var _l = react_1.useState(provider.online), status = _l[0], setStatus = _l[1];
    var _m = react_1.useState(provider.videoUrl || ""), videoUrl = _m[0], setVideoUrl = _m[1];
    var _o = react_1.useState(provider.scheduleLink || ""), scheduleLink = _o[0], setScheduleLink = _o[1];
    var _p = react_1.useState(((_b = provider.reading) === null || _b === void 0 ? void 0 : _b.id) || ""), readingId = _p[0], setReadingId = _p[1];
    var _q = react_1.useState(((_c = provider.mainSpeciality) === null || _c === void 0 ? void 0 : _c.id) || ""), mainSpecialityId = _q[0], setMainSpecialityId = _q[1];
    var _r = react_1.useState(((_d = provider.mainTool) === null || _d === void 0 ? void 0 : _d.id) || ""), mainToolId = _r[0], setMainToolId = _r[1];
    var _s = react_1.useState(provider.specialities.map(function (s) { return s.name; })), selectedSpecialities = _s[0], setSelectedSpecialities = _s[1];
    var _t = react_1.useState(provider.tools.map(function (t) { return t.name; })), selectedTools = _t[0], setSelectedTools = _t[1];
    var _u = react_1.useState(provider.providerPackages.map(function (p) { return p.id; })), selectedPackages = _u[0], setSelectedPackages = _u[1];
    var _v = react_1.useState(""), newSpecialityName = _v[0], setNewSpecialityName = _v[1];
    var _w = react_1.useState(""), newToolName = _w[0], setNewToolName = _w[1];
    var _x = react_1.useState(""), newReadingName = _x[0], setNewReadingName = _x[1];
    var _y = react_1.useState(""), newPackageService = _y[0], setNewPackageService = _y[1];
    var _z = react_1.useState(""), newPackageSessions = _z[0], setNewPackageSessions = _z[1];
    var _0 = react_1.useState(""), newPackagePrice = _0[0], setNewPackagePrice = _0[1];
    var _1 = react_1.useState(""), newPackageExpiresAt = _1[0], setNewPackageExpiresAt = _1[1];
    var _2 = react_1.useState([]), calendlyEvents = _2[0], setCalendlyEvents = _2[1];
    var _3 = react_1.useState({}), mapping = _3[0], setMapping = _3[1];
    var _4 = react_1.useState(false), loadingCalendly = _4[0], setLoadingCalendly = _4[1];
    var _5 = react_1.useState(false), savingMapping = _5[0], setSavingMapping = _5[1];
    var _6 = react_1.useState(""), newPackageEventUri = _6[0], setNewPackageEventUri = _6[1];
    var _7 = react_1.useState(null), editingPkgId = _7[0], setEditingPkgId = _7[1];
    var router = navigation_1.useRouter();
    // Sync initial state only when provider.id changes (prevents resetting on avatar update)
    react_1.useEffect(function () {
        var _a, _b, _c;
        setLocalProvider(provider);
        setDescription(provider.description || "");
        setStatus(provider.online);
        setVideoUrl(provider.videoUrl || "");
        setScheduleLink(provider.scheduleLink || "");
        setReadingId(((_a = provider.reading) === null || _a === void 0 ? void 0 : _a.id) || "");
        setMainSpecialityId(((_b = provider.mainSpeciality) === null || _b === void 0 ? void 0 : _b.id) || "");
        setMainToolId(((_c = provider.mainTool) === null || _c === void 0 ? void 0 : _c.id) || "");
        setSelectedSpecialities(provider.specialities.map(function (s) { return s.name; }));
        setSelectedTools(provider.tools.map(function (t) { return t.name; }));
        // setSelectedPackages(provider.providerPackages.map((p) => p.id));
        var initMap = {};
        provider.providerPackages.forEach(function (pkg) {
            if (pkg.calendlyEventTypeUri)
                initMap[pkg.calendlyEventTypeUri] = pkg.id;
        });
        setMapping(initMap);
    }, [localProvider.id]);
    var toggleMulti = function (val, key) {
        if (key === "Specialities") {
            setSelectedSpecialities(function (prev) {
                return prev.includes(val) ? prev.filter(function (v) { return v !== val; }) : __spreadArrays(prev, [val]);
            });
        }
        else if (key === "Tools") {
            setSelectedTools(function (prev) {
                return prev.includes(val) ? prev.filter(function (v) { return v !== val; }) : __spreadArrays(prev, [val]);
            });
        }
        // } else if (key === "Packages") {
        //   setSelectedPackages((prev) =>
        //     prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
        //   );
        // }
    };
    react_1.useEffect(function () {
        if (!provider.isCalendlyConnected)
            return;
        setLoadingCalendly(true);
        fetch("/api/provider/" + provider.id + "/calendly/event-types")
            .then(function (r) { return r.json(); })
            .then(function (data) {
            setCalendlyEvents(data.eventTypes);
            setMapping(data.existingMappings || {});
        })["catch"](console.error)["finally"](function () { return setLoadingCalendly(false); });
    }, [provider.id, provider.isCalendlyConnected]);
    var handleMapChange = function (uri, pkgId) {
        setMapping(function (prev) {
            var _a;
            return (__assign(__assign({}, prev), (_a = {}, _a[uri] = pkgId, _a)));
        });
    };
    var saveAllMappings = function () { return __awaiter(void 0, void 0, void 0, function () {
        var _i, _a, _b, uri, pkgId, e_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    setSavingMapping(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 6, 7, 8]);
                    _i = 0, _a = Object.entries(mapping);
                    _c.label = 2;
                case 2:
                    if (!(_i < _a.length)) return [3 /*break*/, 5];
                    _b = _a[_i], uri = _b[0], pkgId = _b[1];
                    if (!pkgId)
                        return [3 /*break*/, 4];
                    return [4 /*yield*/, fetch("/api/provider/" + localProvider.id + "/calendly/map-event-type", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                calendlyEventTypeUri: uri,
                                packageId: pkgId
                            })
                        })];
                case 3:
                    _c.sent();
                    _c.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    alert("Mapări salvate cu succes!");
                    return [3 /*break*/, 8];
                case 6:
                    e_1 = _c.sent();
                    console.error(e_1);
                    alert("Eroare la salvarea mapărilor.");
                    return [3 /*break*/, 8];
                case 7:
                    setSavingMapping(false);
                    return [7 /*endfinally*/];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    var mappingInverse = react_1["default"].useMemo(function () {
        var inv = {};
        Object.entries(mapping).forEach(function (_a) {
            var uri = _a[0], pkgId = _a[1];
            inv[pkgId] = uri;
        });
        return inv;
    }, [mapping]);
    var handleAddRequest = function (type) { return __awaiter(void 0, void 0, void 0, function () {
        var url, body, res, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    url = "";
                    body = {};
                    if (type === "Specialities") {
                        url = "/api/requests/speciality";
                        body = { name: newSpecialityName.trim() };
                    }
                    else if (type === "Tools") {
                        url = "/api/requests/tool";
                        body = { name: newToolName.trim() };
                    }
                    else if (type === "Reading") {
                        url = "/api/requests/reading";
                        body = { name: newReadingName.trim() };
                    }
                    return [4 /*yield*/, fetch(url, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body)
                        })];
                case 1:
                    res = _c.sent();
                    if (!res.ok) return [3 /*break*/, 2];
                    alert("Cerere trimisă pentru aprobare.");
                    if (type === "Specialities")
                        setNewSpecialityName("");
                    if (type === "Tools")
                        setNewToolName("");
                    if (type === "Reading")
                        setNewReadingName("");
                    return [3 /*break*/, 4];
                case 2:
                    _b = (_a = console).error;
                    return [4 /*yield*/, res.text()];
                case 3:
                    _b.apply(_a, [_c.sent()]);
                    alert("Eroare la trimiterea cererii.");
                    _c.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleSaveChanges = function (type) { return __awaiter(void 0, void 0, void 0, function () {
        var url, body, res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = "/api/provider/" + localProvider.id;
                    body = {};
                    switch (type) {
                        case "Description":
                            url += "/description";
                            body = { description: description };
                            break;
                        case "Status":
                            url += "/status";
                            body = { online: status };
                            break;
                        case "VideoUrl":
                            url += "/video-url";
                            body = { videoUrl: videoUrl };
                            break;
                        case "ScheduleLink":
                            url += "/schedule-link";
                            body = { scheduleLink: scheduleLink };
                            break;
                        case "Reading":
                            url += "/reading";
                            body = { readingId: readingId };
                            break;
                        case "MainSpeciality":
                            url += "/main-speciality";
                            body = { mainSpecialityId: mainSpecialityId };
                            break;
                        case "MainTool":
                            url += "/main-tool";
                            body = { mainToolId: mainToolId };
                            break;
                        case "Specialities":
                            url += "/specialities";
                            body = { specialities: selectedSpecialities };
                            break;
                        case "Tools":
                            url += "/tools";
                            body = { tools: selectedTools };
                            break;
                        case "Packages":
                            url += "/packages";
                            body = { packages: selectedPackages };
                            break;
                        default:
                            return [2 /*return*/];
                    }
                    return [4 /*yield*/, fetch(url, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(body)
                        })];
                case 1:
                    res = _a.sent();
                    if (!res.ok)
                        return [2 /*return*/];
                    setLocalProvider(function (prev) {
                        var copy = __assign({}, prev);
                        switch (type) {
                            case "Description":
                                copy.description = description;
                                break;
                            case "Status":
                                copy.online = status;
                                break;
                            case "VideoUrl":
                                copy.videoUrl = videoUrl;
                                break;
                            case "ScheduleLink":
                                copy.scheduleLink = scheduleLink;
                                break;
                            case "Reading":
                                copy.reading = readingsStore.find(function (r) { return r.id === readingId; }) || null;
                                break;
                            case "MainSpeciality":
                                copy.mainSpeciality =
                                    specialitiesStore.find(function (s) { return s.id === mainSpecialityId; }) || null;
                                break;
                            case "MainTool":
                                copy.mainTool = toolsStore.find(function (t) { return t.id === mainToolId; }) || null;
                                break;
                            case "Specialities":
                                copy.specialities = selectedSpecialities.map(function (name) { return ({
                                    id: specialitiesStore.find(function (s) { return s.name === name; }).id,
                                    name: name
                                }); });
                                break;
                            case "Tools":
                                copy.tools = selectedTools.map(function (name) { return ({
                                    id: toolsStore.find(function (t) { return t.name === name; }).id,
                                    name: name
                                }); });
                                break;
                            case "Packages":
                                copy.providerPackages = prev.providerPackages.filter(function (p) {
                                    return selectedPackages.includes(p.id);
                                });
                                break;
                        }
                        return copy;
                    });
                    setShowEditModal("");
                    return [2 /*return*/];
            }
        });
    }); };
    //eit package
    var handleEditClick = function (pkg) {
        setEditingPkgId(pkg.id);
        setNewPackageService(pkg.service);
        setNewPackageSessions(pkg.totalSessions.toString());
        setNewPackagePrice(pkg.price.toString());
        setNewPackageEventUri(pkg.calendlyEventTypeUri || "");
        setShowEditModal("Packages");
    };
    // ================= STRIPE CONNECT =======================
    var createStripeConnectUrl = function () {
        var clientId = process.env.NEXT_PUBLIC_STRIPE_CLIENT_ID;
        var redirectUri = process.env.NEXT_PUBLIC_BASE_URL + "/api/stripe/connect/callback";
        var params = new URLSearchParams({
            response_type: "code",
            client_id: clientId,
            redirect_uri: redirectUri,
            state: "stripe:" + localProvider.id,
            "stripe_user[country]": "RO",
            scope: "read_write"
        });
        return "https://connect.stripe.com/oauth/authorize?" + params.toString();
    };
    // ================= CALENDLY CONNECT (cu PKCE) =====================
    var handleCalendlyConnect = function () { return __awaiter(void 0, void 0, void 0, function () {
        var resp, _a, _b, _c, codeChallenge, clientId, redirectUri, params, authorizeUrl;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, fetch("/api/calendly/oauth/start", {
                        credentials: "include"
                    })];
                case 1:
                    resp = _d.sent();
                    if (!!resp.ok) return [3 /*break*/, 3];
                    _b = (_a = console).error;
                    _c = ["Nu am putut iniția PKCE:"];
                    return [4 /*yield*/, resp.text()];
                case 2:
                    _b.apply(_a, _c.concat([_d.sent()]));
                    return [2 /*return*/];
                case 3: return [4 /*yield*/, resp.json()];
                case 4:
                    codeChallenge = (_d.sent()).codeChallenge;
                    clientId = process.env.CALENDLY_CLIENT_ID;
                    redirectUri = process.env.NEXT_PUBLIC_BASE_URL + "/api/calendly/oauth/callback";
                    params = new URLSearchParams({
                        response_type: "code",
                        client_id: clientId,
                        redirect_uri: redirectUri,
                        state: "calendly:" + localProvider.id,
                        code_challenge: codeChallenge,
                        code_challenge_method: "S256"
                    });
                    authorizeUrl = "https://auth.calendly.com/oauth/authorize?" + params.toString();
                    window.location.href = authorizeUrl;
                    return [2 /*return*/];
            }
        });
    }); };
    var savePackages = function () { return __awaiter(void 0, void 0, void 0, function () {
        var allPackages, res, _a, _b, updated;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // Ensure calendlyEventTypeUri selected
                    if (!newPackageEventUri) {
                        alert("Trebuie să selectezi tipul de ședință din Calendly.");
                        return [2 /*return*/];
                    }
                    allPackages = editingPkgId
                        ? localProvider.providerPackages.map(function (p) {
                            return p.id === editingPkgId
                                ? __assign(__assign({}, p), { service: newPackageService.trim(), totalSessions: +newPackageSessions, price: +newPackagePrice, calendlyEventTypeUri: newPackageEventUri }) : p;
                        })
                        : __spreadArrays(localProvider.providerPackages, [
                            { id: '', service: newPackageService.trim(), totalSessions: +newPackageSessions, price: +newPackagePrice, calendlyEventTypeUri: newPackageEventUri }
                        ]);
                    return [4 /*yield*/, fetch("/api/provider/" + provider.id + "/packages", {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ packages: allPackages })
                        })];
                case 1:
                    res = _c.sent();
                    if (!!res.ok) return [3 /*break*/, 3];
                    _b = (_a = console).error;
                    return [4 /*yield*/, res.text()];
                case 2:
                    _b.apply(_a, [_c.sent()]);
                    return [2 /*return*/];
                case 3: return [4 /*yield*/, res.json()];
                case 4:
                    updated = (_c.sent()).packages;
                    setLocalProvider(function (prev) { return (__assign(__assign({}, prev), { providerPackages: updated })); });
                    // reset
                    setShowEditModal("");
                    setEditingPkgId(null);
                    setNewPackageService("");
                    setNewPackageSessions("");
                    setNewPackagePrice("");
                    setNewPackageEventUri("");
                    return [2 /*return*/];
            }
        });
    }); };
    // Render Stripe & Calendly connect sections
    var renderIntegrationSections = function () { return (react_1["default"].createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6" },
        react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
            react_1["default"].createElement("div", null,
                react_1["default"].createElement("strong", null, "Cont Stripe:"),
                " ",
                localProvider.stripeAccountId ? (react_1["default"].createElement("span", { className: "text-green-700" },
                    "Conectat (",
                    localProvider.stripeAccountId,
                    ")")) : (react_1["default"].createElement("span", { className: "text-red-600" }, "Nu e\u0219ti conectat"))),
            !localProvider.stripeAccountId ? (react_1["default"].createElement(button_1["default"], { onClick: function () {
                    window.location.href = createStripeConnectUrl();
                }, className: "mt-2 px-4 py-2 bg-primaryColor text-white rounded hover:bg-primaryColor-dark" }, "Conecteaz\u0103-te cu Stripe")) : (react_1["default"].createElement(button_1["default"], { onClick: function () { return __awaiter(void 0, void 0, void 0, function () {
                    var res;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fetch("/api/provider/" + localProvider.id + "/stripe-account", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ stripeAccountId: null })
                                })];
                            case 1:
                                res = _a.sent();
                                if (res.ok) {
                                    setLocalProvider(function (prev) { return (__assign(__assign({}, prev), { stripeAccountId: null })); });
                                }
                                return [2 /*return*/];
                        }
                    });
                }); }, className: "mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" }, "Deconecteaz\u0103 Stripe"))),
        react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
            react_1["default"].createElement("div", null,
                react_1["default"].createElement("strong", null, "Conectare Calendly:"),
                " ",
                localProvider.isCalendlyConnected ? (react_1["default"].createElement("span", { className: "text-green-700" }, "Conectat")) : (react_1["default"].createElement("span", { className: "text-red-600" }, "Nu e\u0219ti conectat"))),
            !localProvider.isCalendlyConnected ? (react_1["default"].createElement(button_1["default"], { onClick: handleCalendlyConnect, className: "mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" }, "Conecteaz\u0103-te cu Calendly")) : (react_1["default"].createElement(button_1["default"], { onClick: function () { return __awaiter(void 0, void 0, void 0, function () {
                    var res;
                    return __generator(this, function (_a) {
                        switch (_a.label) {
                            case 0: return [4 /*yield*/, fetch("/api/provider/" + localProvider.id + "/calendly-account", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ calendlyCalendarUri: null })
                                })];
                            case 1:
                                res = _a.sent();
                                if (res.ok) {
                                    setLocalProvider(function (prev) { return (__assign(__assign({}, prev), { calendlyCalendarUri: null })); });
                                }
                                return [2 /*return*/];
                        }
                    });
                }); }, className: "mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600" }, "Deconectare Calendly"))))); };
    return (react_1["default"].createElement(react_1["default"].Fragment, null,
        showEditModal === "VideoUrl" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Video URL" },
            react_1["default"].createElement("input", { type: "text", value: videoUrl, onChange: function (e) { return setVideoUrl(e.target.value); }, className: "w-full p-2 border rounded" }),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("VideoUrl"); }, className: "mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "ScheduleLink" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Link Program\u0103ri" },
            react_1["default"].createElement("input", { type: "text", value: scheduleLink, onChange: function (e) { return setScheduleLink(e.target.value); }, className: "w-full p-2 border rounded" }),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("ScheduleLink"); }, className: "mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "MainSpeciality" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Specialitatea Principal\u0103" },
            react_1["default"].createElement("div", { className: "space-y-2 max-h-[60vh] overflow-auto" }, specialitiesStore.map(function (spec) { return (react_1["default"].createElement(addAttributeProvider_1["default"], { key: spec.id, title: spec.name, selected: mainSpecialityId === spec.id, setSelect: function () { return setMainSpecialityId(spec.id); } })); })),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("MainSpeciality"); }, className: "mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "MainTool" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Unealta Principal\u0103" },
            react_1["default"].createElement("div", { className: "space-y-2 max-h-[60vh] overflow-auto" }, toolsStore.map(function (tool) { return (react_1["default"].createElement(addAttributeProvider_1["default"], { key: tool.id, title: tool.name, selected: mainToolId === tool.id, setSelect: function () { return setMainToolId(tool.id); } })); })),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("MainTool"); }, className: "mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "Description" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Descrierea" },
            react_1["default"].createElement("textarea", { value: description, onChange: function (e) { return setDescription(e.target.value); }, className: "w-full p-2 border rounded h-32" }),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("Description"); }, className: "mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "Status" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Stare" },
            react_1["default"].createElement("label", { className: "flex items-center space-x-2" },
                react_1["default"].createElement("input", { type: "checkbox", checked: status, onChange: function (e) { return setStatus(e.target.checked); } }),
                react_1["default"].createElement("span", null, "Online")),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("Status"); }, className: "mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "Specialities" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Specializ\u0103rile" },
            react_1["default"].createElement("div", { className: "mb-4 flex items-center space-x-2" },
                react_1["default"].createElement("input", { type: "text", value: newSpecialityName, onChange: function (e) { return setNewSpecialityName(e.target.value); }, placeholder: "Adaug\u0103 specialitate nou\u0103", className: "flex-1 p-2 border rounded" }),
                react_1["default"].createElement(button_1["default"], { className: "py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor", disabled: !newSpecialityName.trim(), onClick: function () { return handleAddRequest("Specialities"); } }, "Adaug\u0103")),
            react_1["default"].createElement("div", { className: "space-y-2 max-h-[60vh] overflow-auto" }, specialitiesStore.map(function (spec) { return (react_1["default"].createElement(addAttributeProvider_1["default"], { key: spec.id, title: spec.name, selected: selectedSpecialities.includes(spec.name), setSelect: function () { return toggleMulti(spec.name, "Specialities"); } })); })),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("Specialities"); }, className: "mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "Tools" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Uneltele" },
            react_1["default"].createElement("div", { className: "mb-4 flex items-center space-x-2" },
                react_1["default"].createElement("input", { type: "text", value: newToolName, onChange: function (e) { return setNewToolName(e.target.value); }, placeholder: "Adaug\u0103 unealt\u0103 nou\u0103", className: "flex-1 p-2 border rounded" }),
                react_1["default"].createElement(button_1["default"], { className: "py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor", disabled: !newToolName.trim(), onClick: function () { return handleAddRequest("Tools"); } }, "Adaug\u0103")),
            react_1["default"].createElement("div", { className: "space-y-2 max-h-[60vh] overflow-auto" }, toolsStore.map(function (tool) { return (react_1["default"].createElement(addAttributeProvider_1["default"], { key: tool.id, title: tool.name, selected: selectedTools.includes(tool.name), setSelect: function () { return toggleMulti(tool.name, "Tools"); } })); })),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("Tools"); }, className: " py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "Reading" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () { return setShowEditModal(""); }, title: "Editeaz\u0103 Reading" },
            react_1["default"].createElement("div", { className: "mb-4 flex items-center space-x-2" },
                react_1["default"].createElement("input", { type: "text", value: newReadingName, onChange: function (e) { return setNewReadingName(e.target.value); }, placeholder: "Adaug\u0103 reading nou", className: "flex-1 p-2 border rounded" }),
                react_1["default"].createElement(button_1["default"], { className: "py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor", disabled: !newReadingName.trim(), onClick: function () { return handleAddRequest("Reading"); } }, "Adaug\u0103")),
            react_1["default"].createElement("div", { className: "space-y-2 max-h-[60vh] overflow-auto" }, readingsStore.map(function (r) { return (react_1["default"].createElement(addAttributeProvider_1["default"], { key: r.id, title: r.name, selected: readingId === r.id, setSelect: function () { return setReadingId(r.id); } })); })),
            react_1["default"].createElement(button_1["default"], { onClick: function () { return handleSaveChanges("Reading"); }, className: "mt-4 py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor" }, "Salveaz\u0103"))),
        showEditModal === "Packages" && (react_1["default"].createElement(modal_1["default"], { closeModal: function () {
                setShowEditModal("");
                setEditingPkgId(null);
                setNewPackageService("");
                setNewPackageSessions("");
                setNewPackagePrice("");
                setNewPackageEventUri("");
            }, title: "Editeaz\u0103 Tipuri de \u0218edin\u021Be" },
            react_1["default"].createElement("div", { className: "mb-4" },
                react_1["default"].createElement("label", { htmlFor: "newPackageEventUri", className: "block mb-1 font-medium" },
                    "Tip \u0218edin\u021B\u0103 Calendly ",
                    react_1["default"].createElement("span", { className: "text-red-500" }, "*")),
                react_1["default"].createElement("select", { id: "newPackageEventUri", className: "w-full p-2 border rounded", value: newPackageEventUri, onChange: function (e) { return setNewPackageEventUri(e.target.value); } },
                    react_1["default"].createElement("option", { value: "" }, "\u2014 Alege din Calendly \u2014"), calendlyEvents === null || calendlyEvents === void 0 ? void 0 :
                    calendlyEvents.map(function (et) { return (react_1["default"].createElement("option", { key: et.uri, value: et.uri }, et.name)); }))),
            react_1["default"].createElement("div", { className: "mb-4 space-y-2" },
                react_1["default"].createElement("input", { type: "text", value: newPackageService, onChange: function (e) { return setNewPackageService(e.target.value); }, placeholder: "Serviciu", className: "w-full p-2 border rounded" }),
                react_1["default"].createElement("input", { type: "number", value: newPackageSessions, onChange: function (e) { return setNewPackageSessions(e.target.value); }, placeholder: "Num\u0103r sesiuni", className: "w-full p-2 border rounded" }),
                react_1["default"].createElement("input", { type: "number", value: newPackagePrice, onChange: function (e) { return setNewPackagePrice(e.target.value); }, placeholder: "Pre\u021B (RON)", className: "w-full p-2 border rounded" })),
            react_1["default"].createElement("div", { className: "mb-4" },
                react_1["default"].createElement("h4", { className: "font-medium mb-2" }, "Pachete existente"),
                react_1["default"].createElement("ul", { className: "space-y-2 max-h-48 overflow-auto" }, localProvider.providerPackages.map(function (pkg) { return (react_1["default"].createElement("li", { key: pkg.id, className: "flex justify-between items-center" },
                    react_1["default"].createElement("span", null,
                        pkg.service,
                        " \u2013 ",
                        pkg.totalSessions,
                        " sesiuni @ ",
                        pkg.price,
                        " RON"),
                    react_1["default"].createElement("div", { className: "space-x-2" },
                        react_1["default"].createElement(button_1["default"], { onClick: function () { return handleEditClick(pkg); }, className: "text-blue-600 hover:underline" }, "Editeaz\u0103"),
                        react_1["default"].createElement(button_1["default"], { onClick: function () { return __awaiter(void 0, void 0, void 0, function () {
                                var res, _a, _b, _c, remaining;
                                return __generator(this, function (_d) {
                                    switch (_d.label) {
                                        case 0: return [4 /*yield*/, fetch("/api/provider/" + provider.id + "/packages/" + pkg.id, { method: "DELETE" })];
                                        case 1:
                                            res = _d.sent();
                                            if (!!res.ok) return [3 /*break*/, 3];
                                            _b = (_a = console).error;
                                            _c = ["Eroare la ștergere pachet:"];
                                            return [4 /*yield*/, res.text()];
                                        case 2:
                                            _b.apply(_a, _c.concat([_d.sent()]));
                                            return [2 /*return*/];
                                        case 3: return [4 /*yield*/, res.json()];
                                        case 4:
                                            remaining = (_d.sent()).packages;
                                            setLocalProvider(function (prev) { return (__assign(__assign({}, prev), { providerPackages: remaining })); });
                                            return [2 /*return*/];
                                    }
                                });
                            }); }, className: "text-red-600 hover:underline" }, "\u0218terge")))); }))),
            react_1["default"].createElement(button_1["default"], { className: "py-3 w-full bg-primaryColor text-white hover:bg-secondaryColor disabled:opacity-50", onClick: savePackages, disabled: !newPackageEventUri ||
                    !newPackageService.trim() ||
                    !newPackageSessions ||
                    !newPackagePrice }, editingPkgId ? "Salvează modificări" : "Adaugă pachet nou"))),
        react_1["default"].createElement("div", { className: "max-w-3xl mx-auto bg-white shadow rounded p-6" },
            react_1["default"].createElement("h3", { className: "text-lg font-semibold mb-4" }, "Detalii Furnizor"),
            renderIntegrationSections(),
            react_1["default"].createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch" },
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Descriere:"),
                        " ",
                        localProvider.description || "—"),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("Description"); } })),
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Stare:"),
                        " ",
                        localProvider.online ? "Online" : "Offline")),
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Video URL:"),
                        " ",
                        localProvider.videoUrl || "—"),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("VideoUrl"); } })),
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Link Program\u0103ri:"),
                        " ",
                        localProvider.scheduleLink || "—"),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("ScheduleLink"); } })),
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Citire:"),
                        " ",
                        ((_e = localProvider.reading) === null || _e === void 0 ? void 0 : _e.name) || "—"),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("Reading"); } })),
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Specialitate Principal\u0103:"),
                        " ",
                        ((_f = localProvider.mainSpeciality) === null || _f === void 0 ? void 0 : _f.name) || "—"),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("MainSpeciality"); } })),
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Unealt\u0103 Principal\u0103:"),
                        " ",
                        ((_g = localProvider.mainTool) === null || _g === void 0 ? void 0 : _g.name) || "—"),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("MainTool"); } })),
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Specializ\u0103ri:"),
                        " ",
                        localProvider.specialities.map(function (s) { return s.name; }).join(", ") || "—"),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("Specialities"); } })),
                react_1["default"].createElement("div", { className: "h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Instrumente:"),
                        " ",
                        localProvider.tools.map(function (t) { return t.name; }).join(", ") || "—"),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("Tools"); } })),
                react_1["default"].createElement("div", { className: "col-span-1 sm:col-span-2 h-full flex flex-col justify-between bg-gray-50 p-4 rounded" },
                    react_1["default"].createElement("div", null,
                        react_1["default"].createElement("strong", null, "Tipuri de Sedinte:"),
                        react_1["default"].createElement("ul", { className: "list-disc ml-6 mt-2" }, localProvider.providerPackages.map(function (pkg) { return (react_1["default"].createElement("li", { key: pkg.id },
                            pkg.service,
                            " \u2013 ",
                            pkg.totalSessions,
                            " sesiuni @ ",
                            pkg.price,
                            " ",
                            "RON")); }) || react_1["default"].createElement("span", null, "\u2014"))),
                    react_1["default"].createElement(editButton_1["default"], { showEditModal: function () { return setShowEditModal("Packages"); } }))))));
};
exports["default"] = ProviderDetails;
