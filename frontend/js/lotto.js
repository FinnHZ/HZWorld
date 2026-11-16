(async () => {
  const F = window.FinnsWorld;
  const $ = id => document.getElementById(id);

  const state = {
    dimension: "date",
    ballSet: "both",
    distributionChart: null,
    drawTimingChart: null,
    numberProbabilityChart: null,
    fullHistoryStart: null,
    fullHistoryEnd: null
  };

  function showMessage(message, type = "info") {
    const el = $("lotto-message");
    el.textContent = message;
    el.className = `lotto-message ${type}`;
  }

  function queryString(extra = {}) {
    const params = new URLSearchParams();
    const start = $("lotto-start").value;
    const end = $("lotto-end").value;
    if (start) params.set("start_date", start);
    if (end) params.set("end_date", end);
    Object.entries(extra).forEach(([key, value]) => params.set(key, value));
    return params.toString();
  }

  function validateDateRange() {
    const start = $("lotto-start").value;
    const end = $("lotto-end").value;
    if (start && end && start > end) {
      throw new Error("Start date must not be later than end date.");
    }
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-lotto-lib="${src}"]`);
      if (existing?.dataset.loaded === "true") return resolve();
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.dataset.lottoLib = src;
      script.onload = () => {
        script.dataset.loaded = "true";
        resolve();
      };
      script.onerror = () => reject(new Error(`Unable to load chart library: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function ensureECharts() {
    if (!window.echarts) await loadScript("js/echarts.min.js");
    await loadScript("js/echarts-gl.min.js");
    if (!window.echarts) throw new Error("ECharts did not initialise.");
  }

  function initCharts() {
    const createOrReuse = (id, current) => current || window.echarts.init($(id));
    state.distributionChart = createOrReuse("distribution-chart", state.distributionChart);
    state.drawTimingChart = createOrReuse("draw-timing-chart", state.drawTimingChart);
    state.numberProbabilityChart = createOrReuse("number-probability-chart", state.numberProbabilityChart);
  }

  function render3D(data) {
    const option = {
      tooltip: {
        formatter: params => {
          const value = params.value || [];
          const ball = data.x_ball[value[0]];
          const category = data.y_dateday[value[1]];
          return `Number: ${ball}<br>${category}<br>Average frequency: ${Number(value[2]).toFixed(3)}`;
        }
      },
      visualMap: {
        max: Math.max(0.5, ...data.z_count.map(item => item[2])),
        inRange: {
          color: ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8",
            "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"]
        }
      },
      xAxis3D: { type: "category", name: "Number", data: data.x_ball },
      yAxis3D: { type: "category", name: state.dimension === "date" ? "Day" : state.dimension, data: data.y_dateday },
      zAxis3D: { type: "value", name: "Average frequency" },
      grid3D: {
        boxWidth: 190,
        boxDepth: 90,
        viewControl: { projection: "perspective", autoRotate: false },
        light: {
          main: { intensity: 1.2, shadow: true },
          ambient: { intensity: 0.35 }
        }
      },
      series: [{
        type: "bar3D",
        data: data.z_count.map(item => ({ value: item })),
        shading: "lambert",
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 12, color: "#173f76" },
          itemStyle: { color: "#e87936" }
        }
      }]
    };
    state.distributionChart.setOption(option, true);
  }

  function renderDrawTiming(data) {
    const points = data || [];
    state.drawTimingChart.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "cross" },
        formatter(params) {
          if (!params.length) return "";
          const point = params[0].value;
          return `<strong>${point[0]}</strong><br>Sum of six main numbers: <strong>${point[1]}</strong>`;
        }
      },
      grid: { left: 58, right: 24, top: 28, bottom: 78, containLabel: true },
      xAxis: {
        type: "time",
        name: "Draw date",
        nameLocation: "middle",
        nameGap: 34,
        boundaryGap: false,
        axisLabel: { color: "#68819b", hideOverlap: true }
      },
      yAxis: {
        type: "value",
        name: "Sum",
        min: 20,
        max: 230,
        interval: 30,
        axisLabel: { color: "#68819b" },
        splitLine: { lineStyle: { color: "#edf2f7" } }
      },
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: 0,
          start: 0,
          end: 100,
          height: 22,
          bottom: 16,
          borderColor: "#dbe8f5",
          fillerColor: "rgba(41, 152, 232, 0.14)",
          handleStyle: { color: "#2998e8" }
        },
        { type: "inside", xAxisIndex: 0, filterMode: "filter" }
      ],
      series: [{
        name: "Sum of six main numbers",
        type: "line",
        data: points.map(item => [item.date, item.sum]),
        showSymbol: points.length < 100,
        symbol: "circle",
        symbolSize: 5,
        connectNulls: false,
        lineStyle: { width: 2.2, color: "#2998e8" },
        itemStyle: { color: "#2998e8" },
        emphasis: { focus: "series", scale: true }
      }]
    }, true);
  }

  function renderNumberProbability(data, expectedAverage = 15) {
    const rows = data || [];
    const highestProbability = Math.max(0, ...rows.map(item => Number(item.probability) || 0));
    const yAxisMax = Math.max(20, Math.ceil(highestProbability / 5) * 5);
    const yAxisInterval = yAxisMax <= 40 ? 5 : 10;
    state.numberProbabilityChart.setOption({
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter(params) {
          if (!params.length) return "";
          const item = params[0].data;
          return `<strong>Number ${item.number}</strong><br>` +
            `Appeared in ${item.count} draws<br>` +
            `Occurrence probability: <strong>${item.probability.toFixed(2)}%</strong>`;
        }
      },
      grid: { left: 58, right: 22, top: 28, bottom: 62, containLabel: true },
      xAxis: {
        type: "category",
        name: "Lotto number",
        nameLocation: "middle",
        nameGap: 36,
        data: rows.map(item => item.number),
        axisTick: { alignWithLabel: true },
        axisLabel: {
          color: "#68819b",
          interval: 0,
          rotate: window.innerWidth < 700 ? 45 : 0,
          fontSize: 10
        }
      },
      yAxis: {
        type: "value",
        name: "Probability (%)",
        min: 0,
        max: yAxisMax,
        interval: yAxisInterval,
        axisLabel: { color: "#68819b", formatter: "{value}%" },
        splitLine: { lineStyle: { color: "#edf2f7" } }
      },
      series: [{
        name: "Occurrence probability",
        type: "bar",
        barMaxWidth: 16,
        data: rows.map(item => ({
          value: item.probability,
          number: item.number,
          count: item.count,
          probability: item.probability
        })),
        itemStyle: { color: "#2998e8", borderRadius: [4, 4, 0, 0] },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: "#d99b35", type: "dashed", width: 1.5 },
          label: {
            formatter: `Expected average: ${expectedAverage}%`,
            color: "#b47a1c",
            position: "insideEndTop"
          },
          data: [{ yAxis: expectedAverage }]
        }
      }]
    }, true);
  }

  async function loadCharts(analysisData = null) {
    validateDateRange();
    const analysis = analysisData || await F.request(`/lotto/analysis?${queryString()}`);
    $("stat-draw-count").textContent = Number(analysis.draw_count || 0).toLocaleString();
    $("stat-first-date").textContent = analysis.date_summary.start_date || "—";
    $("stat-last-date").textContent = analysis.date_summary.end_date || "—";

    const distribution = await F.request(
      `/lotto/distribution?${queryString({
        dimension: state.dimension,
        ball_set: state.ballSet
      })}`
    );

    render3D(distribution);
    renderDrawTiming(analysis.analysis.draw_timing || analysis.analysis.sum_by_draw || []);
    renderNumberProbability(
      analysis.analysis.number_probability || [],
      analysis.analysis.theoretical_average_probability ?? 15
    );
  }

  function setActiveButton(selector, attribute, value) {
    document.querySelectorAll(selector).forEach(button => {
      button.classList.toggle("active", button.getAttribute(attribute) === value);
    });
  }

  async function loadAllHistoryAndSetDefaultDates() {
    // An unfiltered request returns every stored draw. Use its first/last dates
    // to populate the date inputs before loading the page's initial charts.
    const allHistory = await F.request("/lotto/analysis");
    const firstDate = allHistory.date_summary.start_date;
    const lastDate = allHistory.date_summary.end_date;

    state.fullHistoryStart = firstDate || null;
    state.fullHistoryEnd = lastDate || null;
    $("lotto-start").value = firstDate || "";
    $("lotto-end").value = lastDate || "";
    $("stat-total-count").textContent = Number(allHistory.draw_count || 0).toLocaleString();

    if (!firstDate || !lastDate) {
      showMessage("No historical Lotto draws are stored yet. Import your TXT history, then refresh.", "error");
      await loadCharts(allHistory);
      return;
    }

    await loadCharts(allHistory);
    showMessage(`Showing all available history: ${firstDate} to ${lastDate}.`, "success");
  }

  document.querySelectorAll("[data-dimension]").forEach(button => {
    button.addEventListener("click", async () => {
      state.dimension = button.dataset.dimension;
      setActiveButton("[data-dimension]", "data-dimension", state.dimension);
      try {
        const data = await F.request(`/lotto/distribution?${queryString({
          dimension: state.dimension,
          ball_set: state.ballSet
        })}`);
        render3D(data);
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
  });

  document.querySelectorAll("[data-ball-set]").forEach(button => {
    button.addEventListener("click", async () => {
      state.ballSet = button.dataset.ballSet;
      setActiveButton("[data-ball-set]", "data-ball-set", state.ballSet);
      try {
        const data = await F.request(`/lotto/distribution?${queryString({
          dimension: state.dimension,
          ball_set: state.ballSet
        })}`);
        render3D(data);
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
  });

  $("lotto-apply").addEventListener("click", async () => {
    try {
      await loadCharts();
      showMessage("Analysis updated for the selected date range.", "success");
    } catch (error) {
      showMessage(error.message, "error");
    }
  });

  $("lotto-refresh").addEventListener("click", async () => {
    const button = $("lotto-refresh");
    button.disabled = true;
    button.textContent = "Refreshing…";
    showMessage("Checking the archive for missing and newer Lotto draws…", "info");

    try {
      const oldStart = $("lotto-start").value;
      const oldEnd = $("lotto-end").value;
      const wasShowingFullHistory = oldStart === state.fullHistoryStart && oldEnd === state.fullHistoryEnd;

      const result = await F.request("/lotto/refresh", { method: "POST", body: {} });
      const allHistory = await F.request("/lotto/analysis");
      state.fullHistoryStart = allHistory.date_summary.start_date || null;
      state.fullHistoryEnd = allHistory.date_summary.end_date || null;

      // If the page was showing all history, extend its default range to include
      // newly downloaded draws. A custom user-selected range is left untouched.
      if (wasShowingFullHistory) {
        $("lotto-start").value = state.fullHistoryStart || "";
        $("lotto-end").value = state.fullHistoryEnd || "";
      }

      $("stat-total-count").textContent = Number(allHistory.draw_count || 0).toLocaleString();
      await loadCharts();
      showMessage(
        `Refresh completed. ${result.new_draws} new draws added; ` +
        `${result.checked_or_updated} existing draws checked. ` +
        `CSV now contains ${result.total_draws} draws. Latest: ${result.latest_date}.`,
        "success"
      );
    } catch (error) {
      showMessage(
        `Refresh failed. ${error.message} Your existing CSV data has not been intentionally cleared.`,
        "error"
      );
    } finally {
      button.disabled = false;
      button.textContent = "↻ Refresh history";
    }
  });

  function readNumber(input) {
    const raw = input.value.trim();
    if (!/^\d{1,2}$/.test(raw)) return null;
    const value = Number(raw);
    return Number.isInteger(value) && value >= 1 && value <= 40 ? value : null;
  }

  document.querySelectorAll(".lotto-number").forEach(input => {
    input.addEventListener("input", () => {
      input.value = input.value.replace(/[^0-9]/g, "").slice(0, 2);
    });
  });

  function renderMatchTable(result) {
    const tbody = $("match-results");
    tbody.replaceChildren();

    result.distribution.forEach(row => {
      const tr = document.createElement("tr");
      const values = [
        `${row.match_count} / 7`,
        `${row.percentage.toFixed(2)}%`,
        row.draw_count.toLocaleString(),
        row.sample_dates.join(", ") || "—"
      ];
      values.forEach((value, index) => {
        const td = document.createElement("td");
        td.textContent = value;
        if (index === 1) td.className = "rate-cell";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    $("check-summary").textContent =
      `Compared against ${result.draw_count.toLocaleString()} historical draws.`;
  }

  $("check-btn").addEventListener("click", async () => {
    try {
      validateDateRange();
      const mainInputs = [...document.querySelectorAll(".number-group:not(.bonus-group) .lotto-number")];
      const mainNumbers = mainInputs.map(readNumber);
      const bonusNumber = readNumber($("bonus-number"));

      if (mainNumbers.some(n => n === null) || bonusNumber === null) {
        throw new Error("Enter an integer from 1 to 40 in all seven fields.");
      }
      if (new Set([...mainNumbers, bonusNumber]).size !== 7) {
        throw new Error("All six main numbers and the Bonus number must be different.");
      }

      const result = await F.request("/lotto/check", {
        method: "POST",
        body: {
          main_numbers: mainNumbers,
          bonus_number: bonusNumber,
          start_date: $("lotto-start").value || null,
          end_date: $("lotto-end").value || null
        }
      });
      renderMatchTable(result);
      $("check-message").textContent = "Comparison completed.";
    } catch (error) {
      $("check-message").textContent = error.message;
    }
  });

  window.addEventListener("resize", () => {
    state.distributionChart?.resize();
    state.drawTimingChart?.resize();
    state.numberProbabilityChart?.resize();
  });

  try {
    await ensureECharts();
    initCharts();
    await loadAllHistoryAndSetDefaultDates();
  } catch (error) {
    showMessage(`Unable to load Lotto analysis: ${error.message}`, "error");
  }
})();
