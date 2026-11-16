
(() => {

    const C = window.FinnsWorldCalendar;


    // --------------------------------------------------
    // Save event
    // --------------------------------------------------

    C.saveEvent = async function () {

        if (!C.requireAdmin()) return;

        const form = C.$("event-form");

        if (!form) return;


        const id = C.$("event-id").value.trim();

        const body = {

            event_date: C.$("event-date").value,

            title: C.$("event-title").value.trim(),

            description:
                C.$("event-description").value.trim(),

            priority: C.$("event-priority").value,

            event_type: C.$("event-type").value,

            remote_sync:
                C.$("event-remote").checked,

            completed:
                C.$("event-completed").checked
        };


        if (!body.event_date || !body.title) {

            C.F.toast(
                "Please enter the event date and title.",
                "error"
            );

            return;
        }


        const submitButton = form.querySelector(
            'button[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
        }


        try {

            const isEditing = Boolean(id);

            const path = isEditing
                ? `/calendar/events/${encodeURIComponent(id)}`
                : "/calendar/events";


            await C.F.request(path, {

                method: isEditing ? "PUT" : "POST",

                body

            });


            // Update the selected date and displayed month.
            C.state.selectedDate = body.event_date;

            const selected = C.parseDate(body.event_date);

            C.state.cursor = new Date(
                selected.getFullYear(),
                selected.getMonth(),
                1
            );


            C.closeModal();

            C.F.toast(
                isEditing
                    ? "Event updated successfully."
                    : "Event created successfully."
            );


            await C.loadEvents();

        } catch (error) {

            C.F.toast(
                error.message || "Unable to save event.",
                "error"
            );

        } finally {

            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    };


    // --------------------------------------------------
    // Delete event
    // --------------------------------------------------

    C.deleteEvent = async function (id) {

        if (!C.requireAdmin()) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this event?"
        );

        if (!confirmed) return;


        try {

            await C.F.request(
                `/calendar/events/${encodeURIComponent(id)}`,
                {
                    method: "DELETE"
                }
            );


            C.F.toast("Event deleted successfully.");

            await C.loadEvents();

        } catch (error) {

            C.F.toast(
                error.message || "Unable to delete event.",
                "error"
            );
        }
    };


    // --------------------------------------------------
    // Calendar grid interactions
    // --------------------------------------------------

    function bindCalendarGrid() {

        const grid = C.$("calendar-grid");

        if (!grid) return;


        grid.addEventListener("click", event => {

            const addButton = event.target.closest(".day-add");


            // Add button has priority over date selection.
            if (addButton) {

                event.stopPropagation();

                if (!C.requireAdmin()) return;

                C.openAddEvent(addButton.dataset.date);

                return;
            }


            const day = event.target.closest(".day");

            if (!day) return;

            if (!C.requireAdmin()) return;

            C.selectDate(day.dataset.date);
        });


        // Keyboard support for date cells.
        grid.addEventListener("keydown", event => {

            const day = event.target.closest(".day");

            if (!day) return;

            if (event.target.closest(".day-add")) return;

            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }

            event.preventDefault();

            if (!C.requireAdmin()) return;

            C.selectDate(day.dataset.date);
        });
    }


    // --------------------------------------------------
    // Selected event interactions
    // --------------------------------------------------

    function bindSelectedEvents() {

        const list = C.$("selected-events-list");

        if (!list) return;


        list.addEventListener("click", event => {

            const editButton = event.target.closest(
                "[data-edit-event]"
            );

            if (editButton) {

                if (!C.requireAdmin()) return;

                C.openEditEvent(
                    editButton.dataset.editEvent
                );

                return;
            }


            const deleteButton = event.target.closest(
                "[data-delete-event]"
            );

            if (deleteButton) {

                if (!C.requireAdmin()) return;

                C.deleteEvent(
                    deleteButton.dataset.deleteEvent
                );
            }
        });
    }


    // --------------------------------------------------
    // Month navigation
    // --------------------------------------------------

    function bindMonthNavigation() {

        const previous = C.$("prev-month");

        const next = C.$("next-month");

        const today = C.$("today-btn");


        previous?.addEventListener("click", async () => {

            C.state.cursor = new Date(
                C.state.cursor.getFullYear(),
                C.state.cursor.getMonth() - 1,
                1
            );

            C.renderAll();

            if (C.isAdmin()) {
                await C.loadEvents();
            }
        });


        next?.addEventListener("click", async () => {

            C.state.cursor = new Date(
                C.state.cursor.getFullYear(),
                C.state.cursor.getMonth() + 1,
                1
            );

            C.renderAll();

            if (C.isAdmin()) {
                await C.loadEvents();
            }
        });


        today?.addEventListener("click", async () => {

            const date = new Date();

            C.state.cursor = new Date(
                date.getFullYear(),
                date.getMonth(),
                1
            );

            C.state.selectedDate = C.dateKey(date);

            C.renderAll();

            if (C.isAdmin()) {
                await C.loadEvents();
            }
        });
    }


    // --------------------------------------------------
    // Modal interactions
    // --------------------------------------------------

    function bindModal() {

        const modal = C.$("event-modal");

        const form = C.$("event-form");

        if (!modal || !form) return;


        form.addEventListener("submit", async event => {

            event.preventDefault();

            await C.saveEvent();
        });


        // Close buttons can use data-close-modal.
        modal.querySelectorAll("[data-close-modal]")
            .forEach(button => {

                button.addEventListener("click", () => {
                    C.closeModal();
                });

            });


        // Close when clicking the modal backdrop.
        modal.addEventListener("click", event => {

            if (event.target === modal) {
                C.closeModal();
            }
        });


        // Escape key closes the modal.
        modal.addEventListener("keydown", event => {

            if (event.key === "Escape") {
                C.closeModal();
            }
        });
    }


    // --------------------------------------------------
    // Bind all events
    // --------------------------------------------------

    C.bindEvents = function () {

        bindCalendarGrid();

        bindSelectedEvents();

        bindMonthNavigation();

        bindModal();
    };


    // --------------------------------------------------
    // Calendar initialisation
    // --------------------------------------------------

    C.init = async function () {

        C.state.isAdmin = C.isAdmin();


        // Initialise event handlers.
        C.bindEvents();


        // Initialise charts.
        C.initCharts();


        // Initial calendar display.
        C.renderAll();


        requestAnimationFrame(() => {
            C.resizeCharts();
        });

        // Only admins can retrieve calendar data.
        if (C.state.isAdmin) {

            await C.loadEvents();

        } else {

            C.state.events = [];

            C.renderAll();
        }


        // Avoid accumulating resize handlers when navigating
        // away from and back to the calendar page.
        if (C._resizeHandler) {

            window.removeEventListener(
                "resize",
                C._resizeHandler
            );
        }

        C._resizeHandler = C.resizeCharts;

        window.addEventListener(
            "resize",
            C._resizeHandler
        );
    };


})();
