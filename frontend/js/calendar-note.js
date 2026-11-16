
(() => {

    console.log("Calendar module loading...");

    const F = window.FinnsWorld;

    if (!F) {
        console.error("FinnsWorld has not been initialised.");
        return;
    }

    const C = window.FinnsWorldCalendar =
        window.FinnsWorldCalendar || {};


    // Capture the current script URL before asynchronous loading.
    const currentScript = document.currentScript;

    const baseUrl = currentScript
        ? currentScript.src
        : new URL("calendar-note.js", document.baseURI).href;


    // Resolve module paths relative to calendar-note.js.
    function resolvePath(path) {
        return new URL(path, baseUrl).href;
    }


    // Load a classic JavaScript file.
    function loadScript(path) {

        return new Promise((resolve, reject) => {

            const script = document.createElement("script");

            script.src = resolvePath(path);

            script.onload = () => {
                console.log(`Loaded: ${path}`);
                resolve();
            };

            script.onerror = () => {
                reject(new Error(`Failed to load: ${path}`));
            };

            document.body.appendChild(script);
        });
    }


    // --------------------------------------------------
    // Load all calendar dependencies sequentially
    // --------------------------------------------------

    async function startCalendar() {

        try {

            const scripts = [

                // ECharts must be available before chart initialisation.
                "echarts.min.js",

                // Shared calendar state and helpers.
                "calendar/calendar-core.js",

                // Calendar rendering and modal UI.
                "calendar/calendar-ui.js",

                // ECharts visualisations.
                "calendar/calendar-charts.js",

                // API operations and event handlers.
                "calendar/calendar-actions.js"

            ];


            for (const path of scripts) {
                await loadScript(path);
            }


            // Make sure the calendar page is still active.
            if (!document.querySelector(".calendar-page")) {
                console.warn("Calendar page is no longer active.");
                return;
            }


            // Initialise the calendar.
            if (typeof C.init !== "function") {
                throw new Error(
                    "Calendar initialisation function was not found."
                );
            }

            await C.init();

            console.log("Calendar module initialised successfully.");

        } catch (error) {

            console.error("Calendar initialisation failed:", error);

            F.toast(
                error.message || "Unable to initialise calendar.",
                "error"
            );
        }
    }


    startCalendar();

})();
