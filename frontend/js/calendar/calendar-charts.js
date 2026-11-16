
(() => {

    const C = window.FinnsWorldCalendar;


    // --------------------------------------------------
    // Initialise charts
    // --------------------------------------------------

    C.initCharts = function () {

        if (!window.echarts) {

            console.error("ECharts library has not been loaded.");

            return;
        }

        const typeElement = C.$("event-type-chart");

        const countElement = C.$("event-count-chart");


        if (typeElement) {

            C.state.typeChart = window.echarts.init(typeElement);
        }

        if (countElement) {

            C.state.countChart = window.echarts.init(countElement);
        }

        C.updateCharts();
    };


    // --------------------------------------------------
    // Update charts
    // --------------------------------------------------

    C.updateCharts = function () {

        if (!C.state.typeChart && !C.state.countChart) {
            return;
        }


        const year = C.state.cursor.getFullYear();

        const month = C.state.cursor.getMonth();


        // Only include events belonging to the displayed month.
        const monthEvents = C.state.events.filter(event => {

            const date = C.parseDate(event.event_date);

            return date.getFullYear() === year &&
                date.getMonth() === month;
        });


        // --------------------------------------------------
        // Pie chart: Event types
        // --------------------------------------------------

        const typeNames = [
            "work",
            "personal",
            "family",
            "other"
        ];

        const typeCounts = {};

        typeNames.forEach(type => {
            typeCounts[type] = 0;
        });


        monthEvents.forEach(event => {

            const type = String(
                event.event_type || "other"
            ).toLowerCase();

            if (Object.prototype.hasOwnProperty.call(
                typeCounts,
                type
            )) {

                typeCounts[type]++;

            } else {

                typeCounts.other++;
            }
        });


        const pieData = typeNames.map(type => ({
            name: type.charAt(0).toUpperCase() + type.slice(1),
            value: typeCounts[type]
        }));


        if (C.state.typeChart) {

            C.state.typeChart.setOption({

                title: {
                    text: "Events by Type",
                    left: "center",
                    top: 5
                },

                tooltip: {
                    trigger: "item",
                    formatter: "{b}: {c} ({d}%)"
                },

                legend: {
                    bottom: 5,
                    left: "center"
                },

                color: [
                    '#505372', // Work
                    '#B6D634', // Personal
                    '#FF994D', // Family
                    '#0CA8DF'  // Other
                ],

                series: [
                    {
                        name: "Event Type",
                        type: "pie",
                        radius: ["35%", "70%"],
                        center: ["50%", "48%"],

                        avoidLabelOverlap: true,

                        itemStyle: {
                            borderRadius: 8,
                            borderColor: "#fff",
                            borderWidth: 2
                        },

                        label: {
                            show: true,
                            formatter: "{b}: {c}"
                        },

                        emphasis: {
                            label: {
                                show: true,
                                fontSize: 15,
                                fontWeight: "bold"
                            }
                        },

                        data: pieData
                    }
                ]

            }, true);
        }


        // --------------------------------------------------
        // Bar chart: Daily event count
        // --------------------------------------------------

        const daysInMonth = new Date(
            year,
            month + 1,
            0
        ).getDate();


        const categories = [];

        const totalCounts = [];

        const completedCounts = [];


        for (let day = 1; day <= daysInMonth; day++) {

            const date = new Date(year, month, day);

            const dateKey = C.dateKey(date);

            const dayEvents = monthEvents.filter(
                event => event.event_date === dateKey
            );

            categories.push(String(day));

            totalCounts.push(dayEvents.length);

            completedCounts.push(
                dayEvents.filter(
                    event => C.toBoolean(event.completed)
                ).length
            );
        }


        if (C.state.countChart) {

            C.state.countChart.setOption({

                title: {
                    text: "Daily Event Count",
                    left: "center",
                    top: 5
                },

                tooltip: {
                    trigger: "axis"
                },

                legend: {
                    top: 32,
                    data: ["Total", "Completed"]
                },

                grid: {
                    left: 45,
                    right: 20,
                    bottom: 35,
                    top: 75
                },

                xAxis: {
                    type: "category",
                    name: "Day",
                    data: categories
                },

                yAxis: {
                    type: "value",
                    minInterval: 1,
                    name: "Events"
                },

              
                series: [

                    {
                        name: "Total",
                        type: "bar",
                        data: totalCounts,
                        itemStyle: {
                            color: "#FD7E55"
                        }
                    },

                    {
                        name: "Completed",
                        type: "bar",
                        data: completedCounts,
                        itemStyle: {
                            color: "#5E90E5"
                        }
                    }

                ]

            }, true);
        }
    };


    // --------------------------------------------------
    // Resize charts
    // --------------------------------------------------

    C.resizeCharts = function () {

        C.state.typeChart?.resize();

        C.state.countChart?.resize();
    };


})();
