document
  .getElementById("fetch-data-button")
  .addEventListener("click", async function fetchPlayerData() {
    const input = document.getElementById("textInput").value;

    const resultElement = document.getElementById("result");
    resultElement.innerHTML = "";

    const feedbackElement = document.getElementById("feedback");
    feedbackElement.innerText = "";

    if (!input.trim()) {
      feedbackElement.innerText = "Please enter a player name.";
      return;
    }

    try {
      const response = await fetch(`/api/player/${encodeURIComponent(input)}`);

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (Object.keys(data).length === 0) {
        feedbackElement.innerText =
          "No associated user data found for that player name.";
      } else {
        displayPlayerData(data);
      }
    } catch (error) {
      feedbackElement.innerText = `Failed to fetch data. Error: ${error.message}`;
    }
  });

function displayPlayerData(data) {
  const resultElement = document.getElementById("result");

  resultElement.innerHTML = `
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

document.addEventListener("DOMContentLoaded", async function () {
  await populateSeasons();
});

document
  .getElementById("fetch-data-button")
  .addEventListener("click", async function fetchPlayerData() {
    const input = document.getElementById("textInput").value;
    const season = document.getElementById("seasonSelect").value;

    const resultElement = document.getElementById("result");
    resultElement.innerHTML = "";

    const feedbackElement = document.getElementById("feedback");
    feedbackElement.innerText = "";

    if (!input.trim()) {
      feedbackElement.innerText = "Please enter a player name.";
      return;
    }

    try {
      const queryString = season ? `?season=${encodeURIComponent(season)}` : "";
      const response = await fetch(
        `/api/player/${encodeURIComponent(input)}${queryString}`
      );

      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      const data = await response.json();

      if (Object.keys(data).length === 0) {
        feedbackElement.innerText =
          "No associated user data found for that player name.";
      } else {
        displayPlayerData(data);
      }
    } catch (error) {
      feedbackElement.innerText = `Failed to fetch data. Error: ${error.message}`;
    }
  });

async function populateSeasons() {
  const seasonSelect = document.getElementById("seasonSelect");

  try {
    const response = await fetch("/api/seasons");
    if (!response.ok) {
      throw new Error(`Failed to fetch seasons: ${response.status}`);
    }

    const seasons = await response.json();

    const activeSeasonResponse = await fetch("/api/seasons?active=true");
    if (!activeSeasonResponse.ok) {
      throw new Error(
        `Failed to fetch active season: ${activeSeasonResponse.status}`
      );
    }
    const activeSeason = await activeSeasonResponse.json();

    seasons.forEach((season) => {
      const option = document.createElement("option");
      option.value = season.number;
      option.textContent = `Season ${season.number}`;
      if (season.number === activeSeason.number) {
        option.selected = true;
      }

      seasonSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching seasons:", error);
  }
}
