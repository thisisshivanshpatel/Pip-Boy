// pip boy

window.onload = () => {
  // ------ gif changer -----
  const gifs = [
    "vault-boy.gif",
    "walk.gif",
    "detective.gif",
    "radiation.gif",
    "robot-mechanic.gif",
    "take-this-gun.gif",
    "tap-water.gif",
  ];
  const gifIndex = Math.floor(Math.random() * gifs.length);
  document.getElementById("gif-change").src = `./gifs/${gifs[gifIndex]}`;

  /* --- 1. SYSTEM STATS (CPU & RAM) --- */

  function updateSystemStats() {
    // A. RAM USAGE
    chrome.system.memory.getInfo(function (info) {
      const capacity = info.capacity;
      const available = info.availableCapacity;
      const used = capacity - available;
      const percentage = Math.round((used / capacity) * 100);

      document.getElementById("ram-bar").style.width = percentage + "%";
    });

    // B. CPU LOAD (Requires comparing two snapshots)
    chrome.system.cpu.getInfo(function (info) {
      if (lastCpuInfo) {
        let totalUsage = 0;

        for (let i = 0; i < info.processors.length; i++) {
          const prev = lastCpuInfo.processors[i].usage;
          const curr = info.processors[i].usage;

          const user = curr.user - prev.user;
          const kernel = curr.kernel - prev.kernel;
          const idle = curr.idle - prev.idle;
          const total = user + kernel + idle;

          if (total > 0) {
            const usage = (user + kernel) / total;
            totalUsage += usage;
          }
        }

        const avgLoad = Math.round((totalUsage / info.processors.length) * 100);
        document.getElementById("cpu-bar").style.width = avgLoad + "%";
      }
      lastCpuInfo = info;
    });
  }

  let lastCpuInfo = null;
  setInterval(updateSystemStats, 2000); // Update every 2 seconds

  /* --- 2. NETWORK STRENGTH (Mbps) --- */
  function updateNetwork() {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (connection) {
      const speed = connection.downlink; // Estimated Mbps
      const type = connection.effectiveType; // '4g', '3g', etc

      document.getElementById("net-speed").textContent = speed;
      document.getElementById("net-type").textContent = type.toUpperCase();
    }
  }
  updateNetwork();
  // Listen for changes
  if (navigator.connection) {
    navigator.connection.addEventListener("change", updateNetwork);
  }

  /* --- 3. STORAGE & THEME --- */
  chrome.storage.local.get(
    ["pipboy-theme", "pipboy-quests"],
    function (result) {
      if (result["pipboy-theme"] === "amber") {
        document.body.classList.add("amber-theme");
      }
      const savedQuests = result["pipboy-quests"] || [];
      savedQuests.forEach((quest) => addQuestToDOM(quest.text, quest.done));
    },
  );

  /* --- 4. CLOCK --- */
  function updateClock() {
    const now = new Date();
    document.getElementById("time").textContent = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    document.getElementById("date").textContent = now.toLocaleDateString();
  }
  setInterval(updateClock, 1000);
  updateClock();

  /* --- 5. QUEST LOG --- */
  const questInput = document.getElementById("new-quest");
  const questList = document.getElementById("quest-list");

  function addQuestToDOM(text, done = false) {
    const li = document.createElement("li");
    li.innerText = text;
    if (done) li.classList.add("done");

    li.addEventListener("click", () => {
      li.classList.toggle("done");
      saveQuests();
    });
    li.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      li.remove();
      saveQuests();
    });
    questList.appendChild(li);
  }

  function saveQuests() {
    const quests = [];
    document.querySelectorAll("#quest-list li").forEach((li) => {
      quests.push({ text: li.innerText, done: li.classList.contains("done") });
    });
    chrome.storage.local.set({ "pipboy-quests": quests });
  }

  questInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && questInput.value.trim() !== "") {
      addQuestToDOM(questInput.value);
      saveQuests();
      questInput.value = "";
    }
  });

  /* --- 6. COLOR TOGGLE --- */
  document.getElementById("color-toggle").addEventListener("click", () => {
    document.body.classList.toggle("amber-theme");
    const theme = document.body.classList.contains("amber-theme")
      ? "amber"
      : "green";
    chrome.storage.local.set({ "pipboy-theme": theme });
  });

  /* --- 7. BATTERY & GEO --- */
  if ("getBattery" in navigator) {
    navigator.getBattery().then(function (battery) {
      function updateBattery() {
        const level = Math.round(battery.level * 100);
        document.getElementById("battery-level").textContent = level + "%";
        document.getElementById("battery-bar").style.width = level + "%";
      }
      updateBattery();
    });
  }
};
