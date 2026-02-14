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

  /* --- 1. INITIALIZE & LOAD SETTINGS (ASYNC) --- */
  chrome.storage.local.get(
    ["pipboy-theme", "pipboy-quests"],
    function (result) {
      // A. Apply Theme
      if (result["pipboy-theme"] === "amber") {
        document.body.classList.add("amber-theme");
      }

      // B. Load Quests
      const savedQuests = result["pipboy-quests"] || [];
      savedQuests.forEach((quest) => addQuestToDOM(quest.text, quest.done));
    },
  );

  /* --- 2. CLOCK & DATE --- */
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

  /* --- 3. QUEST LOG LOGIC (AUTO-DELETE) --- */
  const questInput = document.getElementById("new-quest");
  const questList = document.getElementById("quest-list");

  function addQuestToDOM(text, done = false) {
    const li = document.createElement("li");
    li.innerText = text;
    if (done) li.classList.add("done");

    // Setup transition for smooth deletion
    li.style.transition = "opacity 0.5s, background-color 0.2s";

    li.addEventListener("click", () => {
      li.classList.toggle("done");
      saveQuests(); // Save the "crossed out" state immediately

      if (li.classList.contains("done")) {
        // Start 3-second timer
        const timer = setTimeout(() => {
          // 1. Fade out visually
          li.style.opacity = "0";

          // 2. Remove from DOM after fade finishes (0.5s)
          setTimeout(() => {
            li.remove();
            saveQuests(); // Save the deletion to storage
          }, 500);
        }, 3000); // 3 Seconds wait

        // Save timer ID to the element so we can cancel it
        li.dataset.deleteTimer = timer;
      } else {
        // User unchecked it! Cancel the deletion.
        if (li.dataset.deleteTimer) {
          clearTimeout(parseInt(li.dataset.deleteTimer));
          delete li.dataset.deleteTimer;
          li.style.opacity = "1"; // Restore visibility
        }
      }
    });

    // Right click to remove immediately
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
      // Only save if it's not currently fading out (opacity is not 0)
      if (li.style.opacity !== "0") {
        quests.push({
          text: li.innerText,
          done: li.classList.contains("done"),
        });
      }
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

  /* --- 4. COLOR THEME TOGGLE --- */
  const toggleBtn = document.getElementById("color-toggle");
  const body = document.body;

  toggleBtn.addEventListener("click", () => {
    body.classList.toggle("amber-theme");

    const currentTheme = body.classList.contains("amber-theme")
      ? "amber"
      : "green";
    chrome.storage.local.set({ "pipboy-theme": currentTheme });
  });

  /* --- 5. SYSTEM STATS (CPU & RAM) --- */
  function updateSystemStats() {
    // RAM
    if (chrome.system && chrome.system.memory) {
      chrome.system.memory.getInfo(function (info) {
        const capacity = info.capacity;
        const available = info.availableCapacity;
        const used = capacity - available;
        const percentage = Math.round((used / capacity) * 100);
        document.getElementById("ram-bar").style.width = percentage + "%";
      });
    }

    // CPU
    if (chrome.system && chrome.system.cpu) {
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
              totalUsage += (user + kernel) / total;
            }
          }
          const avgLoad = Math.round(
            (totalUsage / info.processors.length) * 100,
          );
          document.getElementById("cpu-bar").style.width = avgLoad + "%";
        }
        lastCpuInfo = info;
      });
    }
  }
  let lastCpuInfo = null;
  setInterval(updateSystemStats, 2000);

  /* --- 6. BATTERY --- */
  if ("getBattery" in navigator) {
    navigator.getBattery().then(function (battery) {
      function updateBattery() {
        const level = Math.round(battery.level * 100);
        document.getElementById("battery-level").textContent = level + "%";
        document.getElementById("battery-bar").style.width = level + "%";
      }
      updateBattery();
      battery.addEventListener("levelchange", updateBattery);
    });
  }

  /* --- 7. NETWORK STRENGTH --- */
  function updateNetwork() {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    if (connection) {
      const speed = connection.downlink;
      const type = connection.effectiveType;
      document.getElementById("net-speed").textContent = speed || "--";
      document.getElementById("net-type").textContent = (
        type || "unknown"
      ).toUpperCase();
    }
  }
  updateNetwork();
  if (navigator.connection) {
    navigator.connection.addEventListener("change", updateNetwork);
  }
};
