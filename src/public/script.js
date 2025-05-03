let eloChart = null;

document.addEventListener("DOMContentLoaded", function () {
  initEloChart();
  populateSeasons();
  document
    .getElementById("fetch-data-button")
    .addEventListener("click", onFetchData);
});

async function onFetchData() {
  const ignInput = document.getElementById("textInput").value.trim();
  const season = document.getElementById("seasonSelect").value;
  const feedback = document.getElementById("feedback");
  const result = document.getElementById("result");

  feedback.textContent = "";
  result.innerHTML = "";

  if (!ignInput) {
    feedback.textContent = "Please enter a player name.";
    return;
  }

  try {
    // 1) Fetch player stats
    const statsUrl =
      "/api/player/" +
      encodeURIComponent(ignInput) +
      (season ? "?season=" + encodeURIComponent(season) : "");
    const statsRes = await fetch(statsUrl);
    if (!statsRes.ok) {
      throw new Error("Stats fetch failed: " + statsRes.status);
    }
    const stats = await statsRes.json();
    if (!Object.keys(stats).length) {
      feedback.textContent = "No user data found for that player.";
      return;
    }

    // 2) Fetch Elo history
    const histUrl =
      "/api/elohistory/" +
      encodeURIComponent(ignInput) +
      (season ? "?season=" + encodeURIComponent(season) : "");
    const historyRes = await fetch(histUrl);

    let history = [];
    if (historyRes.ok) {
      history = await historyRes.json();
    } else if (historyRes.status !== 404) {
      throw new Error("History fetch failed: " + historyRes.status);
    }

    // 3) Render stats + chart
    displayPlayerData(stats);
    renderEloHistory(
      history.map((pt) => ({ date: pt.createdAt, elo: pt.elo }))
    );
  } catch (err) {
    feedback.textContent = "Error: " + err.message;
    // Clear chart on error
    renderEloHistory([]);
  }
}

// Renders the stats section
function displayPlayerData(data) {
  document.getElementById("result").innerHTML = `
    <div class="stat"><span>Player Name:</span> ${data.latestIGN}</div>
    <div class="stat"><span>Elo:</span> ${data.elo}</div>
    <div class="stat"><span>Wins:</span> ${data.wins}</div>
    <div class="stat"><span>Losses:</span> ${data.losses}</div>
    <div class="stat"><span>Win Streak:</span> ${data.winStreak}</div>
    <div class="stat"><span>Lose Streak:</span> ${data.loseStreak}</div>
    <div class="stat"><span>Biggest Win Streak:</span> ${data.biggestWinStreak}</div>
    <div class="stat"><span>Biggest Losing Streak:</span> ${data.biggestLosingStreak}</div>
    <div class="stat"><span>Primary Minecraft Account:</span> ${data.primaryMinecraftAccount}</div>
  `;
}

async function populateSeasons() {
  const seasonSelect = document.getElementById("seasonSelect");
  try {
    const [allRes, activeRes] = await Promise.all([
      fetch("/api/seasons"),
      fetch("/api/seasons?active=true"),
    ]);
    if (!allRes.ok || !activeRes.ok) {
      throw new Error("Season fetch failed");
    }

    const seasons = await allRes.json();
    const active = await activeRes.json();

    seasons.forEach(function (s) {
      const opt = document.createElement("option");
      opt.value = s.number;
      opt.text = "Season " + s.number;
      if (s.number === active.number) opt.selected = true;
      seasonSelect.appendChild(opt);
    });
  } catch (e) {
    console.error("Error fetching seasons:", e);
  }
}

function initEloChart() {
  const ctx = document.getElementById("eloChart").getContext("2d");
  eloChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Elo Rating",
          data: [],
          fill: false,
          tension: 0.1,
          borderWidth: 2,
          pointRadius: 3,
        },
      ],
    },
    options: {
      scales: {
        x: {
          type: "time",
          time: { unit: "day", tooltipFormat: "MMM DD, YYYY" },
          title: { display: true, text: "Game Date", color: "#e0e0e0" },
          ticks: { color: "#e0e0e0" },
        },
        y: {
          title: { display: true, text: "Elo", color: "#e0e0e0" },
          ticks: { color: "#e0e0e0" },
        },
      },
      plugins: {
        legend: { labels: { color: "#e0e0e0" } },
        tooltip: { mode: "index", intersect: false },
      },
      maintainAspectRatio: false,
    },
  });
}

function renderEloHistory(historyData) {
  if (!eloChart) return;

  const elos = historyData.map(pt => pt.elo);
  let minElo = Math.min(...elos, 800); // default floor
  let maxElo = Math.max(...elos, 1300); // default ceiling

  // Add 5% padding
  const padding = (maxElo - minElo) * 0.05;
  minElo = Math.max(0, minElo - padding);
  maxElo = maxElo + padding;

  eloChart.data.labels = historyData.map(pt => pt.date);
  eloChart.data.datasets[0].data = elos;

  // Apply dynamic bounds
  eloChart.options.scales.y.min = minElo;
  eloChart.options.scales.y.max = maxElo;

  eloChart.update();
}

