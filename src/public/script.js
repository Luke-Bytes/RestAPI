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
