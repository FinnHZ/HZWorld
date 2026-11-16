(async () => {
    const F = window.FinnsWorld;

    const root = document.getElementById("cv-sections");
    const editToggle = document.getElementById("cv-edit-toggle");

    if (!F || !root) {
        console.error("FinnsWorld or CV container not found.");
        return;
    }

    // Sections containing JSON data
    const JSON_SECTIONS = [
        "basic_information",
        "skills",
        "project_experience",
        "work_experience",
        "education"
    ];

    // Display names for CV sections
    const labels = {
        basic_information: "Basic Information",
        summary: "Professional Summary",
        skills: "Technical Skills",
        project_experience: "Project Experience",
        work_experience: "Work Experience",
        education: "Education"
    };

    let editing = false;
    let data = {};

    // --------------------------------------------------
    // Helper functions
    // --------------------------------------------------

    function escapeHtml(value) {
        return String(value ?? "").replace(/[&<>"']/g, char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    }

    // Convert JSON strings returned by the backend into
    // JavaScript objects or arrays.
    function parseSection(key, value) {
        if (value === null || value === undefined || value === "") {
            return key === "summary" ? "" : null;
        }

        if (!JSON_SECTIONS.includes(key)) {
            return value;
        }

        // Support both JSON strings and already-parsed objects.
        if (typeof value === "object") {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn(`Unable to parse CV section: ${key}`, error);
            return null;
        }
    }

    function getText(value) {
        return escapeHtml(value || "Not provided");
    }

    function formatDate(start, end) {
        if (!start && !end) return "";

        return `
            <span class="cv-date">
                ${escapeHtml(start || "")}
                ${start && end ? " – " : ""}
                ${escapeHtml(end || "")}
            </span>
        `;
    }

    function renderBulletList(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return "";
        }

        return `
            <ul class="cv-bullet-list">
                ${items.map(item => `
                    <li>${getText(item)}</li>
                `).join("")}
            </ul>
        `;
    }

    // --------------------------------------------------
    // Basic Information
    // --------------------------------------------------

    function renderBasicInformation(info) {
        if (!info || typeof info !== "object") {
            return `<p class="empty-message">No basic information configured.</p>`;
        }

        const fields = [
            ["Full Name", info.full_name],
            ["Preferred Name", info.preferred_name],
            ["Professional Title", info.professional_title],
            ["Email", info.email],
            ["Phone", info.phone],
            ["Location", info.location],
            ["GitHub", info.github],
            ["LinkedIn", info.linkedin]
        ];

        return `
            <div class="basic-info-grid">
                ${fields.map(([label, value]) => `
                    <div class="info-item">
                        <span class="info-label">${label}</span>
                        <span class="info-value">
                            ${value
                                ? (label === "GitHub" || label === "LinkedIn"
                                    ? `<a href="${escapeHtml(value)}"
                                         target="_blank"
                                         rel="noopener noreferrer">${escapeHtml(value)}</a>`
                                    : getText(value))
                                : `<span class="not-provided">Not provided</span>`
                            }
                        </span>
                    </div>
                `).join("")}
            </div>
        `;
    }

    // --------------------------------------------------
    // Professional Summary
    // --------------------------------------------------

    function renderSummary(summary) {
        if (!summary) {
            return `<p class="empty-message">No summary configured.</p>`;
        }

        return `
            <div class="summary-content">
                ${String(summary).split(/\n+/)
                    .filter(line => line.trim())
                    .map(line => `<p>${escapeHtml(line.trim())}</p>`)
                    .join("")}
            </div>
        `;
    }

    // --------------------------------------------------
    // Technical Skills
    // --------------------------------------------------

    function renderSkills(skills) {
        if (!Array.isArray(skills) || skills.length === 0) {
            return `<p class="empty-message">No skills configured.</p>`;
        }

        return `
            <div class="skills-grid">
                ${skills.map(group => `
                    <div class="skill-group">
                        <h4>${getText(group.category)}</h4>

                        <div class="skill-tags">
                            ${(group.items || []).map(skill => `
                                <span class="skill-tag">${getText(skill)}</span>
                            `).join("")}
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    }

    // --------------------------------------------------
    // Project Experience
    // --------------------------------------------------

    function renderProjects(projects) {
        if (!Array.isArray(projects) || projects.length === 0) {
            return `<p class="empty-message">No project experience configured.</p>`;
        }

        return `
            <div class="timeline">
                ${projects.map(project => `
                    <article class="timeline-item">
                        <div class="timeline-marker"></div>

                        <div class="timeline-content">
                            <div class="timeline-heading">
                                <h4>${getText(project.title)}</h4>
                                ${formatDate(project.start_date, project.end_date)}
                            </div>

                            ${renderBulletList(project.description)}
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    // --------------------------------------------------
    // Work Experience
    // --------------------------------------------------

    function renderWorkExperience(experiences) {
        if (!Array.isArray(experiences) || experiences.length === 0) {
            return `<p class="empty-message">No work experience configured.</p>`;
        }

        return `
            <div class="timeline">
                ${experiences.map(job => `
                    <article class="timeline-item">
                        <div class="timeline-marker"></div>

                        <div class="timeline-content">
                            <div class="timeline-heading">
                                <h4>${getText(job.job_title)}</h4>
                                ${formatDate(job.start_date, job.end_date)}
                            </div>

                            <div class="experience-company">
                                ${getText(job.company)}
                                ${job.location
                                    ? ` <span>· ${escapeHtml(job.location)}</span>`
                                    : ""}
                            </div>

                            ${renderBulletList(job.description)}
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    // --------------------------------------------------
    // Education
    // --------------------------------------------------

    function renderEducation(education) {
        if (!Array.isArray(education) || education.length === 0) {
            return `<p class="empty-message">No education information configured.</p>`;
        }

        return `
            <div class="education-list">
                ${education.map(item => `
                    <article class="education-item">
                        <div class="education-icon">EDU</div>

                        <div>
                            <h4>${getText(item.qualification)}</h4>
                            <p class="education-institution">
                                ${getText(item.institution)}
                            </p>
                            <p class="education-location">
                                ${getText(item.location)}
                            </p>
                            ${formatDate(item.start_date, item.end_date)}
                        </div>
                    </article>
                `).join("")}
            </div>
        `;
    }

    // --------------------------------------------------
    // Render individual CV section
    // --------------------------------------------------

    function renderSection(key) {
        const content = data[key];

        switch (key) {
            case "basic_information":
                return renderBasicInformation(content);

            case "summary":
                return renderSummary(content);

            case "skills":
                return renderSkills(content);

            case "project_experience":
                return renderProjects(content);

            case "work_experience":
                return renderWorkExperience(content);

            case "education":
                return renderEducation(content);

            default:
                return `<p class="empty-message">No display template available.</p>`;
        }
    }

    // --------------------------------------------------
    // Update profile header
    // --------------------------------------------------

    function renderProfile() {
        const info = data.basic_information || {};

        document.getElementById("cv-name").textContent =
            info.preferred_name
                ? `${info.full_name || ""} (${info.preferred_name})`
                : info.full_name || "My CV";

        document.getElementById("cv-title").textContent =
            info.professional_title || "";

        document.getElementById("cv-location").textContent =
            info.location ? `⌖ ${info.location}` : "";

        document.getElementById("cv-email").textContent =
            info.email ? `✉ ${info.email}` : "";

        document.getElementById("cv-phone").textContent =
            info.phone ? `☎ ${info.phone}` : "";
    }

    // --------------------------------------------------
    // Normal display mode
    // --------------------------------------------------

    function render() {
        renderProfile();

        root.innerHTML = Object.entries(labels).map(([key, label]) => `
            <article class="cv-card cv-card-${key}">
                <h3>${label}</h3>

                <div class="cv-content">
                    ${renderSection(key)}
                </div>
            </article>
        `).join("");
    }

    // --------------------------------------------------
    // Edit mode
    // --------------------------------------------------


    async function checkAdminPermission() {
        const editToggle = document.getElementById("cv-edit-toggle");

        if (!editToggle) {
            return;
        }

        try {
            const response = await F.request("/auth/me");
            const user = response;
            editToggle.hidden = user?.role !== "admin";

        } catch (error) {
            editToggle.hidden = true;
            console.error("Unable to verify user permission:", error);
        }
    }




    function getEditorValue(key) {
        const value = data[key];

        if (value === null || value === undefined) {
            return "";
        }

        if (JSON_SECTIONS.includes(key)) {
            return JSON.stringify(value, null, 2);
        }

        return String(value);
    }

    function renderEditor() {
        root.innerHTML = Object.entries(labels).map(([key, label]) => `
            <article class="cv-card cv-edit-card">
                <h3>${label}</h3>

                <textarea
                    class="cv-edit"
                    id="edit-${key}"
                    spellcheck="false"
                >${escapeHtml(getEditorValue(key))}</textarea>

                <div class="editor-hint">
                    ${JSON_SECTIONS.includes(key)
                        ? "JSON format required"
                        : "Plain text"}
                </div>

                <button
                    class="save-section"
                    type="button"
                    data-key="${key}"
                >
                    Save section
                </button>
            </article>
        `).join("");

        root.querySelectorAll(".save-section").forEach(button => {
            button.addEventListener("click", () => saveSection(button.dataset.key, button));
        });
    }

    // --------------------------------------------------
    // Save one section
    // --------------------------------------------------

    


    async function saveSection(key, button) {
        const textarea = document.getElementById(`edit-${key}`);
        const originalText = button.textContent;

        let content = textarea.value;

        // Validate and normalize structured JSON sections.
        if (JSON_SECTIONS.includes(key)) {
            try {
                const parsed = JSON.parse(content);

                if (parsed === null || typeof parsed !== "object") {
                    throw new Error("The content must be a JSON object or array.");
                }

                content = JSON.stringify(parsed);

            } catch (error) {
                F.toast(`Invalid JSON: ${error.message}`, "error");
                textarea.focus();
                return;
            }
        }

        button.disabled = true;
        button.textContent = "Saving...";

        try {
            const saved = await F.request(`/cv/${key}`, {
                method: "PUT",
                body: {
                    content: content
                }
            });

            // Parse the saved content for display.
            data[key] = parseSection(key, saved.content);

            F.toast(`${labels[key]} saved successfully.`);

            render();

        } catch (error) {


            F.toast(error.message, "error");

            button.disabled = false;
            button.textContent = originalText;
        }
    }

    // --------------------------------------------------
    // Edit / Finish(After Cancel) button
    // --------------------------------------------------

    editToggle?.addEventListener("click", () => {
        editing = !editing;

        editToggle.textContent = editing
            ? "Finish editing"
            : "Edit sections";

        if (editing) {
            renderEditor();
        } else {
            render();
        }
    });

    // --------------------------------------------------
    // Load CV from backend
    // --------------------------------------------------

    // 5. Define initialization
    async function init() {

        // Check the current user's permission first.
        await checkAdminPermission();

        // Then load CV data.
        try {
            const response = await F.request("/cv");

            Object.keys(labels).forEach(key => {
                data[key] = parseSection(key, response[key]);
            });

            render();

        } catch (error) {
            root.innerHTML = `
                <article class="cv-card">
                    <h3>Unable to load CV</h3>
                    <p class="empty-message">
                        ${escapeHtml(error.message)}
                    </p>
                </article>
            `;

            console.error("CV loading failed:", error);
        }
    }

    // 6. Execute initialization
    init();

})();