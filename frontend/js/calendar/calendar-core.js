
(() => {

    const C = window.FinnsWorldCalendar =
        window.FinnsWorldCalendar || {};



    // --------------------------------------------------
    // Shared event category colours
    // --------------------------------------------------

    C.categoryColors = {
        work: "#505372",
        personal: "#B6D634",
        family: "#FF994D",
        other: "#0CA8DF"
    };

    C.F = window.FinnsWorld;

    if (!C.F) {
        throw new Error("FinnsWorld has not been initialised.");
    }

    C.root = document.querySelector(".calendar-page") || document;

    C.$ = id => document.getElementById(id);


    // --------------------------------------------------
    // Permission
    // --------------------------------------------------

    C.isAdmin = function () {

        const user = C.F.currentUser;

        return String(user?.role || "").toLowerCase() === "admin";
    };


    C.requireAdmin = function () {

        if (C.isAdmin()) {
            return true;
        }

        C.F.toast("Permission requirement", "error");

        return false;
    };


    // --------------------------------------------------
    // Date helpers
    // --------------------------------------------------

    C.dateKey = function (date) {

        const year = date.getFullYear();

        const month = String(date.getMonth() + 1)
            .padStart(2, "0");

        const day = String(date.getDate())
            .padStart(2, "0");

        return `${year}-${month}-${day}`;
    };


    C.parseDate = function (value) {

        if (value instanceof Date) {
            return new Date(value.getTime());
        }

        return new Date(`${value}T00:00:00`);
    };


    C.formatDate = function (value, options = {}) {

        const date = value instanceof Date
            ? value
            : C.parseDate(value);

        if (Number.isNaN(date.getTime())) {
            return "";
        }

        return date.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            ...options
        });
    };


    C.formatDateTime = function (value) {

        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString();
    };


    C.escapeHTML = function (value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            })[character]
        );
    };


    C.toBoolean = function (value) {

        return value === true ||
            String(value).toLowerCase() === "true" ||
            value === 1 ||
            value === "1";
    };


    // --------------------------------------------------
    // Calendar state
    // --------------------------------------------------

    const today = new Date();

    C.state = {

        cursor: new Date(
            today.getFullYear(),
            today.getMonth(),
            1
        ),

        selectedDate: C.dateKey(today),

        events: [],

        isAdmin: false,

        isLoading: false,

        typeChart: null,

        countChart: null
    };


    // --------------------------------------------------
    // Visible calendar date range
    // --------------------------------------------------

    C.getVisibleRange = function () {

        const year = C.state.cursor.getFullYear();
        const month = C.state.cursor.getMonth();

        const firstDay = new Date(year, month, 1);

        const start = new Date(
            year,
            month,
            1 - firstDay.getDay()
        );

        const end = new Date(start);

        end.setDate(start.getDate() + 41);

        return {
            start: C.dateKey(start),
            end: C.dateKey(end)
        };
    };


    // --------------------------------------------------
    // Event loading
    // --------------------------------------------------

    C.loadEvents = async function () {

        if (!C.isAdmin()) {

            C.state.events = [];

            C.renderAll();

            return;
        }

        const range = C.getVisibleRange();

        C.state.isLoading = true;

        try {

            const query = new URLSearchParams({
                start_date: range.start,
                end_date: range.end
            });

            const result = await C.F.request(
                `/calendar/events?${query.toString()}`
            );

            C.state.events = Array.isArray(result)
                ? result
                : [];

            C.state.isLoading = false;

            C.renderAll();

        } catch (error) {

            C.state.events = [];

            C.state.isLoading = false;

            C.renderAll();

            C.F.toast(
                error.message || "Unable to load calendar events.",
                "error"
            );
        }
    };


    // --------------------------------------------------
    // Render coordination
    // --------------------------------------------------

    C.renderAll = function () {

        if (typeof C.renderCalendar === "function") {
            C.renderCalendar();
        }

        if (typeof C.renderSelectedEvents === "function") {
            C.renderSelectedEvents();
        }

        if (typeof C.updateCharts === "function") {
            C.updateCharts();
        }
    };

})();
