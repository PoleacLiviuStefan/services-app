// File: components/UserSessions.tsx - ACTUALIZAT
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
exports.__esModule = true;
var react_1 = require("react");
var link_1 = require("next/link");
var date_fns_1 = require("date-fns");
function UserSessions() {
    var _this = this;
    var _a = react_1.useState([]), sessions = _a[0], setSessions = _a[1];
    var _b = react_1.useState(true), loading = _b[0], setLoading = _b[1];
    var _c = react_1.useState(null), error = _c[0], setError = _c[1];
    var _d = react_1.useState(false), isProvider = _d[0], setIsProvider = _d[1];
    var _e = react_1.useState(null), stats = _e[0], setStats = _e[1];
    var _f = react_1.useState(null), loadingRecording = _f[0], setLoadingRecording = _f[1];
    var _g = react_1.useState(false), syncingRecordings = _g[0], setSyncingRecordings = _g[1];
    var _h = react_1.useState(null), modalUrl = _h[0], setModalUrl = _h[1];
    react_1.useEffect(function () {
        fetch("/api/user/sessions", { credentials: "include" })
            .then(function (res) { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!res.ok)
                    throw new Error("Status " + res.status);
                return [2 /*return*/, res.json()];
            });
        }); })
            .then(function (data) {
            setSessions(data.sessions || []);
            setIsProvider(data.isProvider || false);
            setStats(data.stats || null);
            setError(null);
        })["catch"](function (err) { return setError(err.message || "A apărut o eroare"); })["finally"](function () { return setLoading(false); });
    }, []);
    if (loading)
        return react_1["default"].createElement("p", null, "Se \u00EEncarc\u0103 \u0219edin\u021Bele\u2026");
    if (error)
        return react_1["default"].createElement("p", { className: "text-red-500" },
            "Eroare: ",
            error);
    if (!sessions.length)
        return react_1["default"].createElement("p", null, "Nu exist\u0103 \u0219edin\u021Be programate.");
    var renderTimeRemaining = function (start) {
        var now = new Date();
        var deltaMs = start.getTime() - now.getTime();
        if (deltaMs <= 0)
            return "este în curs sau a trecut";
        var days = date_fns_1.differenceInDays(start, now);
        var afterDays = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        var hours = date_fns_1.differenceInHours(start, afterDays);
        var afterHours = new Date(afterDays.getTime() + hours * 60 * 60 * 1000);
        var minutes = date_fns_1.differenceInMinutes(start, afterHours);
        var parts = [];
        if (days)
            parts.push(days + " " + (days === 1 ? "zi" : "zile"));
        if (hours)
            parts.push(hours + " " + (hours === 1 ? "oră" : "ore"));
        if (minutes || (!days && !hours))
            parts.push(minutes + " " + (minutes === 1 ? "minut" : "minute"));
        return "\u00EEn " + parts.join(", ");
    };
    var getStatusColor = function (status) {
        switch (status) {
            case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
            case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
            case 'COMPLETED': return 'bg-gray-100 text-gray-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            case 'NO_SHOW': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    var getStatusText = function (status) {
        switch (status) {
            case 'SCHEDULED': return 'Programată';
            case 'IN_PROGRESS': return 'În desfășurare';
            case 'COMPLETED': return 'Finalizată';
            case 'CANCELLED': return 'Anulată';
            case 'NO_SHOW': return 'Absent';
            default: return status;
        }
    };
    var formatPrice = function (price) {
        if (!price)
            return null;
        return (price / 100).toFixed(2) + ' RON';
    };
    var renderStars = function (rating) {
        return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '⭐' : '');
    };
    var openModal = function (url) {
        setModalUrl(url);
    };
    var closeModal = function () {
        setModalUrl(null);
    };
    // Funcție pentru refresh manual a unei sesiuni specifice
    var handleRefreshSession = function (sessionId) { return __awaiter(_this, void 0, void 0, function () {
        var response, data_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, fetch("/api/video/session/" + sessionId + "/recording", {
                            credentials: 'include'
                        })];
                case 1:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 2:
                    data_1 = _a.sent();
                    if (!(response.ok && data_1.recordingUrl)) return [3 /*break*/, 3];
                    // Actualizează sesiunea în lista locală
                    setSessions(sessions.map(function (sess) {
                        return sess.id === sessionId
                            ? __assign(__assign({}, sess), { recordingUrl: data_1.recordingUrl, recordingAvailable: true, hasRecording: true, recordingStatus: data_1.status || 'READY' }) : sess;
                    }));
                    alert('Sesiunea a fost actualizată! Înregistrarea este acum disponibilă.');
                    return [3 /*break*/, 5];
                case 3:
                    // Dacă nu găsește, rulează sync pentru toate sesiunile
                    console.log('Nu s-a găsit înregistrarea individual, rulează sync complet...');
                    return [4 /*yield*/, handleSyncRecordings()];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error('Eroare la refresh sesiune:', error_1);
                    alert('Eroare la actualizarea sesiunii: ' + error_1.message);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
    // Funcție pentru obținerea link-ului de înregistrare - ÎMBUNĂTĂȚITĂ
    var handleGetRecording = function (sessionId) { return __awaiter(_this, void 0, void 0, function () {
        var response, data_2, errorMessage, message, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoadingRecording(sessionId);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch("/api/video/session/" + sessionId + "/recording", {
                            credentials: 'include'
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data_2 = _a.sent();
                    if (!response.ok) {
                        errorMessage = data_2.error || 'Eroare la obținerea înregistrării';
                        if (data_2.debug) {
                            errorMessage += "\n\nInfo debug:\n- Camera: " + data_2.debug.roomName + "\n- Are URL \u00EEn BD: " + data_2.debug.hasRecordingInDb + "\n- Status: " + data_2.debug.recordingStatus;
                        }
                        throw new Error(errorMessage);
                    }
                    if (data_2.recordingUrl) {
                        // Deschide înregistrarea într-o fereastră nouă
                        window.open(data_2.recordingUrl, '_blank');
                        // Actualizează sesiunea în lista locală pentru a reflecta că înregistrarea e disponibilă
                        setSessions(sessions.map(function (sess) {
                            return sess.id === sessionId
                                ? __assign(__assign({}, sess), { recordingUrl: data_2.recordingUrl, recordingAvailable: true, recordingStatus: data_2.status || 'READY' }) : sess;
                        }));
                    }
                    else {
                        message = 'Înregistrarea nu este încă disponibilă.';
                        if (data_2.note) {
                            message += '\n\n' + data_2.note;
                        }
                        if (data_2.debug) {
                            message += "\n\nInfo: Camera " + data_2.debug.roomName;
                        }
                        alert(message);
                    }
                    return [3 /*break*/, 6];
                case 4:
                    error_2 = _a.sent();
                    console.error('Eroare la obținerea înregistrării:', error_2);
                    alert('Nu s-a putut obține înregistrarea.\n\n' + error_2.message);
                    return [3 /*break*/, 6];
                case 5:
                    setLoadingRecording(null);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    // Funcție pentru sincronizarea înregistrărilor cu Daily.co
    var handleSyncRecordings = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, result, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isProvider) {
                        alert('Doar providerii pot sincroniza înregistrările');
                        return [2 /*return*/];
                    }
                    if (!confirm('Vrei să sincronizezi înregistrările cu Daily.co? Aceasta va verifica și actualiza toate sesiunile recente.')) {
                        return [2 /*return*/];
                    }
                    setSyncingRecordings(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, fetch('/api/video/sync-recordings', {
                            method: 'POST',
                            credentials: 'include'
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    result = _a.sent();
                    if (!response.ok) {
                        throw new Error(result.error || 'Eroare la sincronizarea înregistrărilor');
                    }
                    alert("Sincronizare complet\u0103: " + result.updated + " sesiuni actualizate din " + result.total + " verificate");
                    // Reîncarcă lista de sesiuni
                    window.location.reload();
                    return [3 /*break*/, 6];
                case 4:
                    error_3 = _a.sent();
                    console.error('Eroare la sincronizarea înregistrărilor:', error_3);
                    alert('A apărut o eroare la sincronizarea înregistrărilor: ' + error_3.message);
                    return [3 /*break*/, 6];
                case 5:
                    setSyncingRecordings(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    function handleCancelSession(sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, errorData, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!confirm('Ești sigur că vrei să anulezi această sesiune?')) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, fetch("/api/video/session-info/" + sessionId, {
                                method: 'DELETE',
                                credentials: 'include'
                            })];
                    case 2:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, response.json()];
                    case 3:
                        errorData = _a.sent();
                        throw new Error(errorData.error || 'Eroare la anularea sesiunii');
                    case 4:
                        setSessions(sessions.map(function (sess) {
                            return sess.id === sessionId
                                ? __assign(__assign({}, sess), { status: 'CANCELLED' }) : sess;
                        }));
                        alert('Sesiunea a fost anulată cu succes!');
                        return [3 /*break*/, 6];
                    case 5:
                        error_4 = _a.sent();
                        console.error('Eroare la anularea sesiunii:', error_4);
                        alert('A apărut o eroare la anularea sesiunii. Te rugăm să încerci din nou.');
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
    function handleForceEndSession(sessionId) {
        return __awaiter(this, void 0, void 0, function () {
            var response, errorData, error_5;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!confirm('Ești sigur că vrei să închizi această sesiune definitiv?')) {
                            return [2 /*return*/];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, fetch("/api/video/session/" + sessionId + "/end", {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ forceEnd: true }),
                                credentials: 'include'
                            })];
                    case 2:
                        response = _a.sent();
                        if (!!response.ok) return [3 /*break*/, 4];
                        return [4 /*yield*/, response.json()];
                    case 3:
                        errorData = _a.sent();
                        throw new Error(errorData.error || 'Eroare la închiderea sesiunii');
                    case 4:
                        setSessions(sessions.map(function (sess) {
                            return sess.id === sessionId
                                ? __assign(__assign({}, sess), { status: 'COMPLETED', isFinished: true }) : sess;
                        }));
                        alert('Sesiunea a fost închisă cu succes!');
                        return [3 /*break*/, 6];
                    case 5:
                        error_5 = _a.sent();
                        console.error('Eroare la închiderea sesiunii:', error_5);
                        alert('A apărut o eroare la închiderea sesiunii. Te rugăm să încerci din nou.');
                        return [3 /*break*/, 6];
                    case 6: return [2 /*return*/];
                }
            });
        });
    }
    return (react_1["default"].createElement("div", { className: "space-y-4" },
        react_1["default"].createElement("div", { className: "flex justify-between items-center mb-6" },
            react_1["default"].createElement("h2", { className: "text-2xl font-bold" }, isProvider ? 'Sesiunile tale ca Provider' : 'Sesiunile tale ca Client'),
            react_1["default"].createElement("div", { className: "flex items-center gap-4" },
                react_1["default"].createElement("div", { className: "text-sm text-gray-600" },
                    "Total: ",
                    sessions.length,
                    " sesiuni"),
                isProvider && (react_1["default"].createElement(react_1["default"].Fragment, null,
                    react_1["default"].createElement("button", { onClick: handleSyncRecordings, disabled: syncingRecordings, className: "px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 transition-colors", title: "Sincronizeaz\u0103 \u00EEnregistr\u0103rile folosind strategii multiple de c\u0103utare" }, syncingRecordings ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                        react_1["default"].createElement("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                        "Sincronizare inregistrari...")) : (react_1["default"].createElement(react_1["default"].Fragment, null, "\uD83D\uDD04 Sincronizare inregistrari"))),
                    process.env.NODE_ENV === 'development' && (react_1["default"].createElement("button", { onClick: function () { return __awaiter(_this, void 0, void 0, function () {
                            var response, data, info, error_6;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        _a.trys.push([0, 3, , 4]);
                                        return [4 /*yield*/, fetch('/api/video/sync-recordings', {
                                                method: 'GET',
                                                credentials: 'include'
                                            })];
                                    case 1:
                                        response = _a.sent();
                                        return [4 /*yield*/, response.json()];
                                    case 2:
                                        data = _a.sent();
                                        info = "Debug Info \u00EEnregistr\u0103ri:\n                      \n\uD83D\uDCCA Total \u00EEnregistr\u0103ri Daily.co: " + data.dailyRecordings + "\n\uD83D\uDCCB Total sesiuni \u00EEn BD: " + data.sessions + "\n                      \n\uD83D\uDD0D Primele camere Daily.co:\n" + data.dailyRoomNames.join('\n') + "\n\n\uD83D\uDCCB Sesiuni \u00EEn BD:\n" + data.sessionDetails.map(function (s) { return s.roomName + ": " + (s.hasRecording ? '✅' : '❌') + " (" + s.recordingStatus + ")"; }).join('\n');
                                        alert(info);
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_6 = _a.sent();
                                        alert('Eroare la obținerea informațiilor debug: ' + error_6.message);
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        }); }, className: "px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm" }, "\uD83D\uDC1B Debug")))))),
        stats && (react_1["default"].createElement("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6" },
            react_1["default"].createElement("div", { className: "bg-blue-50 p-3 rounded-lg text-center" },
                react_1["default"].createElement("div", { className: "text-2xl font-bold text-blue-600" }, stats.scheduled),
                react_1["default"].createElement("div", { className: "text-sm text-blue-800" }, "Programate")),
            react_1["default"].createElement("div", { className: "bg-green-50 p-3 rounded-lg text-center" },
                react_1["default"].createElement("div", { className: "text-2xl font-bold text-green-600" }, stats.inProgress),
                react_1["default"].createElement("div", { className: "text-sm text-green-800" }, "\u00CEn curs")),
            react_1["default"].createElement("div", { className: "bg-gray-50 p-3 rounded-lg text-center" },
                react_1["default"].createElement("div", { className: "text-2xl font-bold text-gray-600" }, stats.completed),
                react_1["default"].createElement("div", { className: "text-sm text-gray-800" }, "Finalizate")),
            react_1["default"].createElement("div", { className: "bg-red-50 p-3 rounded-lg text-center" },
                react_1["default"].createElement("div", { className: "text-2xl font-bold text-red-600" }, stats.cancelled),
                react_1["default"].createElement("div", { className: "text-sm text-red-800" }, "Anulate")),
            react_1["default"].createElement("div", { className: "bg-yellow-50 p-3 rounded-lg text-center" },
                react_1["default"].createElement("div", { className: "text-2xl font-bold text-yellow-600" }, stats.noShow),
                react_1["default"].createElement("div", { className: "text-sm text-yellow-800" }, "Absent")),
            react_1["default"].createElement("div", { className: "bg-purple-50 p-3 rounded-lg text-center" },
                react_1["default"].createElement("div", { className: "text-2xl font-bold text-purple-600" }, stats.recordingReady || 0),
                react_1["default"].createElement("div", { className: "text-sm text-purple-800" }, "\u00CEnregistr\u0103ri gata")),
            react_1["default"].createElement("div", { className: "bg-orange-50 p-3 rounded-lg text-center" },
                react_1["default"].createElement("div", { className: "text-2xl font-bold text-orange-600" }, stats.recordingProcessing || 0),
                react_1["default"].createElement("div", { className: "text-sm text-orange-800" }, "\u00CEn procesare")),
            react_1["default"].createElement("div", { className: "bg-indigo-50 p-3 rounded-lg text-center" },
                react_1["default"].createElement("div", { className: "text-2xl font-bold text-indigo-600" }, stats.withRecording),
                react_1["default"].createElement("div", { className: "text-sm text-indigo-800" }, "Total \u00EEnregistr\u0103ri")))),
        react_1["default"].createElement("ul", { className: "space-y-4" }, sessions.map(function (sess) {
            var _a, _b;
            var date = sess.startDate ? date_fns_1.parseISO(sess.startDate) : null;
            var humanDate = date && date_fns_1.isValid(date)
                ? date.toLocaleString("ro-RO", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                })
                : "Data necunoscută";
            var remaining = date && date_fns_1.isValid(date) ? renderTimeRemaining(date) : "";
            // Determină dacă sesiunea poate fi accesată
            var canJoin = sess.joinUrl &&
                (sess.status === 'SCHEDULED' || sess.status === 'IN_PROGRESS') &&
                !sess.isFinished;
            // Determină statusul înregistrării - LOGICĂ ÎMBUNĂTĂȚITĂ
            var isCompleted = sess.status === 'COMPLETED' || sess.isFinished;
            var hasRecordingAvailable = sess.recordingAvailable;
            var hasRecordingProcessing = sess.recordingProcessing;
            var hasAnyRecording = sess.hasRecording;
            return (react_1["default"].createElement("li", { key: sess.id, className: "border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition-shadow" },
                react_1["default"].createElement("div", { className: "flex justify-between items-start space-x-4" },
                    react_1["default"].createElement("div", { className: "flex-1" },
                        react_1["default"].createElement("div", { className: "flex items-center gap-3 mb-2" },
                            react_1["default"].createElement("h3", { className: "font-semibold text-lg" }, sess.speciality),
                            react_1["default"].createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium " + getStatusColor(sess.status) }, getStatusText(sess.status)),
                            hasRecordingAvailable && isCompleted && (react_1["default"].createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800" }, "\uD83D\uDCF9 \u00CEnregistrare gata")),
                            hasRecordingProcessing && isCompleted && (react_1["default"].createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800" }, "\u23F3 \u00CEn procesare")),
                            hasAnyRecording && !hasRecordingAvailable && !hasRecordingProcessing && isCompleted && (react_1["default"].createElement("span", { className: "px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800" }, "\uD83D\uDCF9 Status necunoscut"))),
                        react_1["default"].createElement("div", { className: "space-y-1 text-sm text-gray-600" },
                            react_1["default"].createElement("div", { className: "flex items-center gap-2" },
                                sess.counterpartImage && (react_1["default"].createElement("img", { src: sess.counterpartImage, alt: sess.counterpart, className: "w-6 h-6 rounded-full" })),
                                react_1["default"].createElement("p", null,
                                    react_1["default"].createElement("span", { className: "font-medium" },
                                        isProvider ? 'Client' : 'Provider',
                                        ":"),
                                    " ",
                                    sess.counterpart)),
                            react_1["default"].createElement("p", null,
                                react_1["default"].createElement("span", { className: "font-medium" }, "Programat\u0103 pentru:"),
                                " ",
                                humanDate),
                            remaining && sess.status === 'SCHEDULED' && (react_1["default"].createElement("p", { className: "text-blue-600" },
                                react_1["default"].createElement("span", { className: "font-medium" }, "Timp r\u0103mas:"),
                                " ",
                                remaining)),
                            sess.actualDuration ? (react_1["default"].createElement("p", null,
                                react_1["default"].createElement("span", { className: "font-medium" }, "Durat\u0103 real\u0103:"),
                                " ",
                                sess.actualDuration,
                                " minute")) : sess.duration && (react_1["default"].createElement("p", null,
                                react_1["default"].createElement("span", { className: "font-medium" }, "Durat\u0103 estimat\u0103:"),
                                " ",
                                sess.duration,
                                " minute")),
                            sess.participantCount !== null && sess.participantCount > 0 && (react_1["default"].createElement("p", null,
                                react_1["default"].createElement("span", { className: "font-medium" }, "Participan\u021Bi:"),
                                " ",
                                sess.participantCount)),
                            sess.totalPrice && (react_1["default"].createElement("p", null,
                                react_1["default"].createElement("span", { className: "font-medium" }, "Pre\u021B:"),
                                " ",
                                formatPrice(sess.totalPrice))),
                            sess.rating && (react_1["default"].createElement("p", null,
                                react_1["default"].createElement("span", { className: "font-medium" }, "Rating:"),
                                " ",
                                renderStars(sess.rating),
                                " (",
                                sess.rating,
                                "/5)")),
                            sess.feedback && (react_1["default"].createElement("p", null,
                                react_1["default"].createElement("span", { className: "font-medium" }, "Feedback:"),
                                " ",
                                react_1["default"].createElement("span", { className: "italic" },
                                    "\"",
                                    sess.feedback,
                                    "\""))),
                            sess.notes && process.env.NODE_ENV === 'development' && (react_1["default"].createElement("p", null,
                                react_1["default"].createElement("span", { className: "font-medium" }, "Noti\u021Be:"),
                                " ",
                                react_1["default"].createElement("span", { className: "text-xs" }, sess.notes))),
                            process.env.NODE_ENV === 'development' && isCompleted && (react_1["default"].createElement("p", { className: "text-xs bg-gray-100 p-2 rounded" },
                                react_1["default"].createElement("span", { className: "font-medium" }, "Debug \u00EEnregistrare:"),
                                react_1["default"].createElement("br", null),
                                "\u2022 hasRecording: ",
                                sess.hasRecording.toString(),
                                react_1["default"].createElement("br", null),
                                "\u2022 recordingAvailable: ", (_a = sess.recordingAvailable) === null || _a === void 0 ? void 0 :
                                _a.toString(),
                                react_1["default"].createElement("br", null),
                                "\u2022 recordingProcessing: ", (_b = sess.recordingProcessing) === null || _b === void 0 ? void 0 :
                                _b.toString(),
                                react_1["default"].createElement("br", null),
                                "\u2022 recordingStatus: ",
                                sess.recordingStatus,
                                react_1["default"].createElement("br", null),
                                "\u2022 recordingUrl: ",
                                sess.recordingUrl ? 'DA' : 'NU',
                                react_1["default"].createElement("br", null),
                                "\u2022 roomName: ",
                                sess.roomName || 'N/A')),
                            sess.packageInfo && (react_1["default"].createElement("p", { className: "text-xs bg-gray-50 p-2 rounded" },
                                react_1["default"].createElement("span", { className: "font-medium" }, "Pachet:"),
                                " ",
                                sess.packageInfo.service,
                                "(",
                                sess.packageInfo.remainingSessions,
                                " sesiuni r\u0103mase din ",
                                sess.packageInfo.totalSessions,
                                ")")))),
                    react_1["default"].createElement("div", { className: "flex flex-col space-y-2" },
                        canJoin ? (react_1["default"].createElement(link_1["default"], { href: {
                                pathname: '/servicii/video/sessions',
                                query: {
                                    url: sess.joinUrl,
                                    sessionId: sess.id,
                                    end: sess.endDate,
                                    duration: sess.duration
                                }
                            }, className: "px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor text-center transition-colors" }, sess.status === 'IN_PROGRESS' ? 'Reintră în sesiune' : 'Intră în sesiune')) : isCompleted && hasRecordingAvailable ? (react_1["default"].createElement("button", { onClick: function () { return openModal(sess.recordingUrl); }, className: "px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-center transition-colors disabled:opacity-50 flex items-center gap-2 justify-center" }, loadingRecording === sess.id ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                            react_1["default"].createElement("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                            "Se \u00EEncarc\u0103...")) : (react_1["default"].createElement(react_1["default"].Fragment, null, "\uD83D\uDCF9 Vezi \u00EEnregistrarea")))) : isCompleted && hasRecordingProcessing ? (react_1["default"].createElement("div", { className: "px-4 py-2 bg-orange-100 text-orange-800 rounded text-center text-sm" }, "\u23F3 \u00CEnregistrare \u00EEn procesare")) : isCompleted && hasAnyRecording ? (react_1["default"].createElement("button", { onClick: function () { return handleGetRecording(sess.id); }, disabled: loadingRecording === sess.id, className: "px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-center transition-colors disabled:opacity-50 flex items-center gap-2 justify-center" }, loadingRecording === sess.id ? (react_1["default"].createElement(react_1["default"].Fragment, null,
                            react_1["default"].createElement("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }),
                            "Se \u00EEncarc\u0103...")) : (react_1["default"].createElement(react_1["default"].Fragment, null, "\uD83D\uDD0D Verific\u0103 \u00EEnregistrarea")))) : isCompleted && !hasAnyRecording ? (react_1["default"].createElement("div", { className: "px-4 py-2 bg-gray-100 text-gray-600 rounded text-center text-sm" }, "F\u0103r\u0103 \u00EEnregistrare")) : sess.status === 'CANCELLED' ? (react_1["default"].createElement("div", { className: "px-4 py-2 bg-red-100 text-red-800 rounded text-center text-sm" }, "Sesiune anulat\u0103")) : (react_1["default"].createElement("div", { className: "px-4 py-2 bg-gray-100 text-gray-600 rounded text-center text-sm" }, "Indisponibil\u0103")),
                        isProvider &&
                            sess.status === 'SCHEDULED' &&
                            date && date_fns_1.isValid(date) &&
                            date > new Date() && (react_1["default"].createElement("button", { onClick: function () { return handleCancelSession(sess.id); }, className: "px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 transition-colors" }, "Anuleaz\u0103")),
                        isProvider &&
                            sess.status === 'IN_PROGRESS' && (react_1["default"].createElement("button", { onClick: function () { return handleForceEndSession(sess.id); }, className: "px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors" }, "\u00CEnchide sesiunea")))),
                sess.roomName && (react_1["default"].createElement("div", { className: "mt-3 pt-3 border-t border-gray-200" },
                    react_1["default"].createElement("p", { className: "text-xs text-gray-500" },
                        react_1["default"].createElement("span", { className: "font-medium" }, "Camera video:"),
                        " ",
                        sess.roomName)))));
        })),
        modalUrl && (react_1["default"].createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center", onClick: closeModal },
            react_1["default"].createElement("div", { className: "bg-white rounded-lg overflow-hidden shadow-lg max-w-3xl w-full", onClick: function (e) { return e.stopPropagation(); } /* previne închiderea la click în modal */ },
                react_1["default"].createElement("div", { className: "flex justify-end p-2" },
                    react_1["default"].createElement("button", { onClick: closeModal, className: "text-gray-600 hover:text-gray-900" }, "\u00D7")),
                react_1["default"].createElement("div", { className: "px-4 pb-4" },
                    react_1["default"].createElement("video", { controls: true, src: modalUrl, className: "w-full rounded" }, "Browser-ul t\u0103u nu suport\u0103 video HTML5.")))))));
}
exports["default"] = UserSessions;
