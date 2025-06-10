"use client";
"use strict";
exports.__esModule = true;
var react_1 = require("react");
var button_1 = require("@/components/atoms/button");
var EntityRequestApproval = function (_a) {
    var title = _a.title, description = _a.description, price = _a.price, status = _a.status, createdByName = _a.createdByName, createdAt = _a.createdAt, onApprove = _a.onApprove, onReject = _a.onReject;
    // Format date in Romanian locale
    var formattedDate = new Date(createdAt).toLocaleString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    return (react_1["default"].createElement("div", { className: "bg-white p-4 w-full lg:w-[200px] rounded shadow" },
        react_1["default"].createElement("h3", { className: "font-semibold mb-1" }, title),
        react_1["default"].createElement("p", { className: "text-xs text-gray-500 mb-2" },
            "Creat de ",
            createdByName,
            " pe ",
            formattedDate),
        description && react_1["default"].createElement("p", { className: "text-sm text-gray-600 mb-2" }, description),
        price != null && react_1["default"].createElement("p", { className: "text-sm text-gray-600 mb-4" },
            "Pre\u021B: ",
            price),
        react_1["default"].createElement("div", { className: "flex space-x-2" }, status === 'PENDING' ? (react_1["default"].createElement(react_1["default"].Fragment, null,
            react_1["default"].createElement(button_1["default"], { className: "bg-green-400 text-white px-3 py-1 rounded hover:bg-green-500", onClick: onApprove }, "Approve"),
            react_1["default"].createElement(button_1["default"], { className: "bg-red-400 text-white px-3 py-1 rounded hover:bg-red-500", onClick: onReject }, "Reject"))) : status === 'APPROVED' ? (react_1["default"].createElement("span", { className: "text-green-600 font-medium" }, "Approved")) : (react_1["default"].createElement("span", { className: "text-red-600 font-medium" }, "Rejected")))));
};
exports["default"] = EntityRequestApproval;
