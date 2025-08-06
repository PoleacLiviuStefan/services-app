'use client';
"use strict";
exports.__esModule = true;
var react_1 = require("react");
var link_1 = require("next/link");
var fa_1 = require("react-icons/fa");
var button_1 = require("./atoms/button");
var react_2 = require("next-auth/react");
var useTranslation_1 = require("@/hooks/useTranslation");
var mysticnoblack_svg_1 = require("../../public/mysticnoblack.svg");
var image_1 = require("next/image");
// import { useCatalogStore } from '@/store/catalog';
var constants_1 = require("@/utils/constants");
var logout_1 = require("@/lib/api/logout/logout");
var navigation_1 = require("next/navigation");
var LanguageSwitcher_1 = require("./LanguageSwitcher");
var NavbarMobile = function () {
    var _a, _b;
    var _c = react_2.useSession(), session = _c.data, status = _c.status;
    var t = useTranslation_1.useTranslation().t;
    var _d = react_1.useState(false), isOpen = _d[0], setIsOpen = _d[1];
    var _e = react_1.useState(false), isPsychologistsOpen = _e[0], setIsPsychologistsOpen = _e[1];
    var user = session === null || session === void 0 ? void 0 : session.user;
    var toggleMenu = function () { return setIsOpen(!isOpen); };
    var togglePsychologists = function () { return setIsPsychologistsOpen(!isPsychologistsOpen); };
    // const specialities = useCatalogStore((state) => state.specialities);
    var specialities = constants_1.displayedServices;
    var rawName = (_b = (_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "";
    var slug = encodeURIComponent(rawName.trim().split(/\s+/).join("-"));
    var router = navigation_1.useRouter();
    var handleDespreNoiClick = function (e) {
        e.preventDefault();
        // Verifică dacă suntem pe homepage
        if (window.location.pathname === "/") {
            // Scrollează direct către secțiune
            var element = document.getElementById("despre-noi");
            if (element) {
                element.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        }
        else {
            // Mergi la homepage și apoi scrollează
            router.push("/");
            setTimeout(function () {
                var element = document.getElementById("despre-noi");
                if (element) {
                    element.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });
                }
            }, 100); // Mic delay pentru a permite încărcarea paginii
        }
    };
    return (react_1["default"].createElement("nav", { className: "lg:hidden fixed top-0 left-0 w-full h-[50px] z-50 bg-primaryColor" },
        react_1["default"].createElement("div", { className: "flex items-center justify-between px-4 h-full z-50" },
            react_1["default"].createElement("div", { className: "w-10 flex items-center" },
                react_1["default"].createElement("button", { onClick: toggleMenu, className: "relative w-8 h-8 focus:outline-none z-50" },
                    react_1["default"].createElement("span", { className: "block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out " + (isOpen ? "rotate-45 top-3.5" : "top-1") }),
                    react_1["default"].createElement("span", { className: "block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out " + (isOpen ? "opacity-0" : "top-3.5") }),
                    react_1["default"].createElement("span", { className: "block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out " + (isOpen ? "-rotate-45 top-3.5" : "top-6") }))),
            react_1["default"].createElement("div", { className: "absolute z-10 left-1/2 transform -translate-x-1/2" },
                react_1["default"].createElement(link_1["default"], { href: "/", onClick: toggleMenu },
                    react_1["default"].createElement(image_1["default"], { src: mysticnoblack_svg_1["default"], alt: "Mystic Gold Logo", className: "w-[60px] h-full" }))),
            react_1["default"].createElement("div", { className: "w-10 flex items-center justify-end" }, status === "loading" ? (react_1["default"].createElement("p", { className: "text-white" }, "...")) : (user === null || user === void 0 ? void 0 : user.name) ? (react_1["default"].createElement("div", { className: "relative group z-50" },
                react_1["default"].createElement("div", { className: "flex items-center gap-4" },
                    react_1["default"].createElement(LanguageSwitcher_1["default"], null),
                    react_1["default"].createElement(button_1["default"], { className: "px-2 py-1 z-50 gap-4 shadow-md shadow-primaryColor bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30 text-white" },
                        react_1["default"].createElement(fa_1.FaUserAlt, null))),
                react_1["default"].createElement("div", { className: "absolute right-0 mt-2 w-36 bg-white text-primaryColor rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300" },
                    react_1["default"].createElement(link_1["default"], { href: "/profil" },
                        react_1["default"].createElement("p", { className: "px-4 py-2 hover:bg-gray-100 cursor-pointer" }, "Profil")),
                    react_1["default"].createElement("button", { onClick: function () { return logout_1["default"](slug); }, className: "w-full bg-red-600 text-white font-bold text-left px-4 py-2 hover:bg-red-700 cursor-pointer" }, t("navigation.logout"))))) : (react_1["default"].createElement("div", { className: "flex items-center gap-4" },
                react_1["default"].createElement(LanguageSwitcher_1["default"], null),
                react_1["default"].createElement(link_1["default"], { href: "/autentificare" },
                    react_1["default"].createElement(button_1["default"], { className: "px-2 py-1 gap-4 z-50 shadow-md shadow-primaryColor bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30 text-white" },
                        react_1["default"].createElement(fa_1.FaUserAlt, null))))))),
        react_1["default"].createElement("div", { className: "fixed top-[50px] left-0 w-full bg-primaryColor transform transition-transform duration-300 ease-in-out " + (isOpen ? "translate-y-0" : "-translate-y-full") },
            react_1["default"].createElement("ul", { className: "flex flex-col items-center justify-center h-screen space-y-8 text-white text-xl z-50" },
                react_1["default"].createElement("li", { onClick: function () {
                        setIsOpen(false);
                        toggleMenu();
                    } },
                    react_1["default"].createElement(link_1["default"], { href: "/" }, t("navbar.home"))),
                react_1["default"].createElement("li", { className: "relative w-full text-center px-2" },
                    react_1["default"].createElement("button", { onClick: togglePsychologists, className: "flex items-center justify-center w-full text-white font-bold px-4 py-2 focus:outline-none" },
                        react_1["default"].createElement("span", null, t("navbar.services")),
                        react_1["default"].createElement(fa_1.FaChevronDown, { className: "ml-2 transition-transform duration-300 " + (isPsychologistsOpen ? "rotate-180" : "") })),
                    react_1["default"].createElement("div", { className: "overflow-hidden transition-all duration-300 ease-in-out " + (isPsychologistsOpen
                            ? "max-h-[365px] opacity-100"
                            : "max-h-0 opacity-0") },
                        react_1["default"].createElement("ul", { className: "mt-2 bg-white text-primaryColor text-center rounded-lg shadow-lg " },
                            react_1["default"].createElement(link_1["default"], { href: "/astrologi", onClick: function () {
                                    setIsOpen(false);
                                    setIsPsychologistsOpen(false);
                                } },
                                react_1["default"].createElement("li", { className: "py-2 px-4 hover:bg-primaryColor/10 cursor-pointer" }, t("navbar.general"))),
                            specialities.map(function (speciality, index) { return (react_1["default"].createElement(link_1["default"], { key: index, href: "/astrologi?speciality=" + speciality, onClick: function () {
                                    setIsOpen(false);
                                    setIsPsychologistsOpen(false);
                                }, className: "block w-full" },
                                react_1["default"].createElement("li", { className: "py-2 px-4 hover:bg-primaryColor/10 cursor-pointer" }, speciality))); })))),
                react_1["default"].createElement("li", { onClick: function () { return setIsOpen(false); } },
                    react_1["default"].createElement(button_1["default"], { className: "text-xl", onClick: handleDespreNoiClick }, t("navbar.about"))),
                react_1["default"].createElement("li", { onClick: function () { return setIsOpen(false); } },
                    react_1["default"].createElement(link_1["default"], { href: "/" }, t("navigation.articles")))))));
};
exports["default"] = NavbarMobile;
