
(() => {

    const C = window.FinnsWorldCalendar;


    // --------------------------------------------------
    // Render calendar
    // --------------------------------------------------

    C.renderCalendar = function () {

        const grid = C.$("calendar-grid");

        if (!grid) return;

        const year = C.state.cursor.getFullYear();
        const month = C.state.cursor.getMonth();

        const firstDay = new Date(year, month, 1);

        const start = new Date(
            year,
            month,
            1 - firstDay.getDay()
        );

        const todayKey = C.dateKey(new Date());

        const eventsByDate = {};

        C.state.events.forEach(event => {

            if (!eventsByDate[event.event_date]) {
                eventsByDate[event.event_date] = [];
            }

            eventsByDate[event.event_date].push(event);
        });


        let html = "";

        for (let i = 0; i < 42; i++) {

            const date = new Date(start);

            date.setDate(start.getDate() + i);

            const dateKey = C.dateKey(date);

            const dayEvents = eventsByDate[dateKey] || [];

            const isCurrentMonth = date.getMonth() === month;

            const isSelected =
                dateKey === C.state.selectedDate;

            const isToday = dateKey === todayKey;


            const classes = [
                "day",
                !isCurrentMonth ? "other-month" : "",
                isSelected ? "selected" : "",
                isToday ? "today" : ""
            ].filter(Boolean).join(" ");


            const addButton = C.isAdmin()
                ? `
                    <button
                        type="button"
                        class="day-add"
                        data-date="${dateKey}"
                        aria-label="Add event on ${dateKey}"
                        title="Add event">
                        +
                    </button>
                `
                : "";


            const eventIndicator = dayEvents.length
                ? `
                    <span class="day-event-count">
                        ${dayEvents.length}
                    </span>
                `
                : "";


            html += `
                <div
                    class="${classes}"
                    data-date="${dateKey}"
                    role="button"
                    tabindex="0"
                    aria-label="${C.escapeHTML(
                        C.formatDate(date)
                    )}">

                    <span class="day-number">
                        ${date.getDate()}
                    </span>

                    ${addButton}

                    ${eventIndicator}

                </div>
            `;
        }

        grid.innerHTML = html;


        const title = C.$("month-title");

        if (title) {

            title.textContent =
                C.state.cursor.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long"
                });
        }
    };


    // --------------------------------------------------
    // Select date
    // --------------------------------------------------

    C.selectDate = function (dateKey) {

        if (!C.requireAdmin()) return;

        C.state.selectedDate = dateKey;

        C.renderCalendar();

        C.renderSelectedEvents();
    };


    // --------------------------------------------------
    // Selected date event list
    // --------------------------------------------------

    C.renderSelectedEvents = function () {

        const title = C.$("selected-date-title");
        const count = C.$("selected-event-count");
        const list = C.$("selected-events-list");

        if (!title || !count || !list) return;


        title.textContent = C.formatDate(
            C.state.selectedDate
        );


        


        if (!C.isAdmin()) {

            count.textContent = "";

            list.innerHTML = `
                <div class="permission-message">
                    Permission requirement
                </div>
            `;

            return;
        }


        if (C.state.isLoading) {

            count.textContent = "";

            list.innerHTML = `
                <div class="empty-message">
                    Loading events...
                </div>
            `;

            return;
        }


        const events = C.state.events.filter(
            event =>
                event.event_date === C.state.selectedDate
        );


        count.textContent =
            `${events.length} event${events.length === 1 ? "" : "s"}`;


        if (events.length === 0) {

            list.innerHTML = `
                <div class="empty-message">
                    No events for this date.
                </div>
            `;

            return;
        }


        // list.innerHTML = events.map(event => {

        //     const completed = C.toBoolean(event.completed);

        //     const remoteSync = C.toBoolean(event.remote_sync);

        //     return `
        list.innerHTML = events.map(event => {

            const completed = C.toBoolean(event.completed);

            const remoteSync = C.toBoolean(event.remote_sync);

            // Determine the event category CSS class.
            const eventType = String(
                event.event_type || "other"
            ).toLowerCase();

            const categoryClassMap = {
                work: "work",
                personal: "personal",
                family: "family",
                other: "other"
            };

            const categoryClass =
                categoryClassMap[eventType] || "other";

            return `

                <article class="event-card event-type-${categoryClass}">

                    <div class="event-card-header">

                        <h3>
                            ${C.escapeHTML(event.title)}
                        </h3>

                        <span class="priority-badge priority-${C.escapeHTML(
                            event.priority
                        )}">
                            ${C.escapeHTML(event.priority)}
                        </span>

                    </div>


                    <div class="event-description">
                        ${C.escapeHTML(
                            event.description || "No description"
                        )}
                    </div>


                    <div class="event-details">

                        <p>
                            <strong>Type:</strong>
                            ${C.escapeHTML(event.event_type)}
                        </p>

                        <p>
                            <strong>Status:</strong>
                            ${completed ? "Completed" : "Pending"}
                        </p>

                        <p>
                            <strong>Remote sync:</strong>
                            ${remoteSync ? "Yes" : "No"}
                        </p>

                        <p>
                            <strong>Created:</strong>
                            ${C.escapeHTML(
                                C.formatDateTime(event.created_at)
                            )}
                        </p>

                        <p>
                            <strong>Updated:</strong>
                            ${C.escapeHTML(
                                C.formatDateTime(event.updated_at)
                            )}
                        </p>

                    </div>


                    <div class="event-card-actions">

                        <button
                            type="button"
                            class="outline-btn"
                            data-edit-event="${C.escapeHTML(event.id)}">
                            Edit
                        </button>

                        <button
                            type="button"
                            class="danger-btn"
                            data-delete-event="${C.escapeHTML(event.id)}">
                            Delete
                        </button>

                    </div>

                </article>

            `;

        }).join("");
    };


    // --------------------------------------------------
    // Open Add Event modal
    // --------------------------------------------------

    C.openAddEvent = function (date) {

        if (!C.requireAdmin()) return;

        const form = C.$("event-form");

        if (!form) return;

        form.reset();

        C.$("event-id").value = "";

        C.$("event-date").value = date;

        C.$("event-priority").value = "medium";

        C.$("event-type").value = "work";

        C.$("event-remote").checked = false;

        C.$("event-completed").checked = false;


        const modalTitle = C.$("event-modal-title");

        if (modalTitle) {
            modalTitle.textContent = "Add Event";
        }

        C.openModal();
    };


    // --------------------------------------------------
    // Open Edit Event modal
    // --------------------------------------------------

    C.openEditEvent = function (id) {

        if (!C.requireAdmin()) return;

        const event = C.state.events.find(
            item => String(item.id) === String(id)
        );

        if (!event) {

            C.F.toast("Event not found.", "error");

            return;
        }


        C.$("event-id").value = event.id;

        C.$("event-date").value = event.event_date;

        C.$("event-title").value = event.title || "";

        C.$("event-description").value =
            event.description || "";

        C.$("event-priority").value =
            event.priority || "medium";

        C.$("event-type").value =
            event.event_type || "work";

        C.$("event-remote").checked =
            C.toBoolean(event.remote_sync);

        C.$("event-completed").checked =
            C.toBoolean(event.completed);


        const modalTitle = C.$("event-modal-title");

        if (modalTitle) {
            modalTitle.textContent = "Edit Event";
        }

        C.openModal();
    };


    // --------------------------------------------------
    // Modal controls
    // --------------------------------------------------

    C.openModal = function () {

        const modal = C.$("event-modal");

        if (!modal) return;

        modal.hidden = false;

        modal.classList.add("open");

        modal.setAttribute("aria-hidden", "false");
    };


    C.closeModal = function () {

        const modal = C.$("event-modal");

        if (!modal) return;

        modal.classList.remove("open");

        modal.hidden = true;

        modal.setAttribute("aria-hidden", "true");
    };

})();
