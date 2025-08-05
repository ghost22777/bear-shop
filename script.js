// =============================
// ✅ CONSTANTS & LOGIN CHECK
// =============================
const SHECKLES_ITEM = "x1 700T+ Sheckles";
const PET_REWARD_IMG = "images/pet_reward.png";
const currentUser = JSON.parse(localStorage.getItem("currentUser"));

if (!currentUser && !window.location.href.includes("login.html")) {
  alert("⚠️ Please login first!");
  window.location.href = "login.html";
}

// =============================
// ✅ UI UPDATE
// =============================
function updateUIBalance() {
  const userInfo = document.getElementById("userInfo");
  if (currentUser && userInfo) {
    userInfo.innerHTML = `
      👤 ${currentUser.username} | 💰 $${currentUser.balance.toFixed(2)}
      <button id="addFundsBtn" style="background:#0080ff;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:8px;">
        Add Funds
      </button>
      <button id="logoutBtn" style="background:red;color:white;border:none;padding:4px 10px;border-radius:4px;cursor:pointer;margin-left:8px;">
        Logout
      </button>
    `;

    const addFundsBtn = document.getElementById("addFundsBtn");
    if (addFundsBtn) {
      addFundsBtn.removeEventListener("click", showAddFundsDialog);
      addFundsBtn.addEventListener("click", showAddFundsDialog);
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.removeEventListener("click", logout);
      logoutBtn.addEventListener("click", logout);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateUIBalance();
  const adminLink = document.getElementById("adminLink");
  if (adminLink && (!currentUser || currentUser.username !== "duc")) adminLink.style.display = "none";

  // Khởi tạo vòng quay chính ban đầu
  resetUI();

  // Render shop nếu có
  if (typeof renderPetShop === "function") renderPetShop();

  // Nếu có inventory page
  if (typeof renderInventory === "function") renderInventory();
});

// =============================
// ✅ BASIC FUNCTIONS
// =============================
function logout() {
  localStorage.removeItem("currentUser");
  window.location.href = "login.html";
}

function updateBalance(amount) {
  currentUser.balance += amount;
  const users = JSON.parse(localStorage.getItem("users")) || [];
  const idx = users.findIndex(u => u.username === currentUser.username);
  if (idx >= 0) users[idx] = currentUser;
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("currentUser", JSON.stringify(currentUser));
  updateUIBalance();
}

// =============================
// ✅ LƯU LỊCH SỬ RIÊNG THEO USER
// =============================
function saveHistory(type, msg) {
  const key = `history_${currentUser.username}`;
  const history = JSON.parse(localStorage.getItem(key)) || [];
  history.push({ user: currentUser.username, type, msg, date: new Date().toLocaleString() });
  localStorage.setItem(key, JSON.stringify(history));
}

function addInventory(itemName, type) {
  const inv = JSON.parse(localStorage.getItem("inventory")) || [];
  inv.push({ id: Date.now() + Math.random(), user: currentUser.username, item: itemName, type });
  localStorage.setItem("inventory", JSON.stringify(inv));
}

// =============================
// ✅ HELPER FUNCTIONS
// =============================
function getRandomPet() {
  let total = petList.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let p of petList) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
}

// =============================
// ✅ ANIMATION & UI HELPERS
// =============================
function showFloatingText(text) {
  const msg = document.createElement("div");
  msg.className = "neon-fly";
  msg.innerHTML = text;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 2000);
}

// =============================
// ✅ ADD FUNDS POPUP
// =============================
function showAddFundsDialog() {
  if (document.getElementById("addFundsPopup")) return;

  const popup = document.createElement("div");
  popup.id = "addFundsPopup";
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.backgroundColor = "rgba(0,0,0,0.9)";
  popup.style.color = "white";
  popup.style.padding = "20px";
  popup.style.borderRadius = "8px";
  popup.style.boxShadow = "0 0 15px #ff00ff";
  popup.style.zIndex = "2000";
  popup.style.maxWidth = "400px";
  popup.style.textAlign = "center";

  popup.innerHTML = `
    <h2>Add Funds</h2>
    <p>To add funds, please contact our admin on Discord BearShop:</p>
    <p><a href="https://discord.gg/Cheapestgag" target="_blank" style="color:#00ffff;">https://discord.gg/Cheapestgag</a></p>
    <p>Or create a support ticket for payment.</p>
    <p>Payment Methods: <b>Paypal, Steam, Crypto</b></p>
    <button id="closeAddFunds" style="margin-top:20px; padding: 8px 20px; background:#ff00ff; border:none; border-radius:6px; cursor:pointer;">Close</button>
  `;

  document.body.appendChild(popup);

  document.getElementById("closeAddFunds").addEventListener("click", () => {
    popup.remove();
  });
}

// =============================
// 🎯 CASE OPENING LOGIC (2 WHEELS, AUTO CONTINUE)
// =============================
const strip = document.getElementById("caseStrip");
const btnOpen = document.getElementById("openCase");
const result = document.getElementById("result");
const casePrice = 1;
const itemWidth = 120;
let spinning = false;
let currentWheel = 1; // 1 = main wheel, 2 = pet wheel
let lastPet = null;
const containerWidth = strip.parentElement.offsetWidth;

function createMainStrip(isPetWin, winIndex) {
  strip.innerHTML = "";
  for (let i = 0; i < 80; i++) {
    const div = document.createElement("div");
    div.className = "item";
    if (i === winIndex) {
      div.innerHTML = isPetWin
        ? `<img src="${PET_REWARD_IMG}" alt="Pet Reward"><span>Pet Reward</span>`
        : `<img src="images/Sheckles.png" alt="Sheckles"><span>${SHECKLES_ITEM}</span>`;
    } else {
      div.innerHTML = `<img src="images/Sheckles.png" alt="Sheckles"><span>${SHECKLES_ITEM}</span>`;
    }
    strip.appendChild(div);
  }
}

function createPetStrip() {
  // Vòng pet chỉ hiển thị toàn hình pet_reward
  strip.innerHTML = "";
  for (let i = 0; i < 80; i++) {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `<img src="${PET_REWARD_IMG}" alt="Pet Reward"><span>Pet Reward</span>`;
    strip.appendChild(div);
  }
}

function spinAnimation(targetOffset, onFinish) {
  let pos = 0;
  let vel = 90;
  function animate() {
    pos += vel;
    vel *= 0.965;
    if (vel < 0.5 || pos >= targetOffset) {
      strip.style.transform = `translateX(-${targetOffset}px)`;
      onFinish();
      return;
    }
    strip.style.transform = `translateX(-${pos}px)`;
    requestAnimationFrame(animate);
  }
  animate();
}

function resetUI() {
  spinning = false;
  currentWheel = 1;
  lastPet = null;
  btnOpen.textContent = "OPEN CASE ($1.00)";
  btnOpen.disabled = false;
  btnOpen.style.opacity = "1";
  result.innerHTML = "";
  createMainStrip(false, 0);
}

btnOpen.addEventListener("click", () => {
  if (spinning) return;
  if (currentUser.balance < casePrice) {
    alert("❌ Not enough balance!");
    return;
  }

  spinning = true;
  btnOpen.disabled = true;
  btnOpen.style.opacity = "0.5";
  result.innerHTML = "";

  if (currentWheel === 1) {
    updateBalance(-casePrice);
    const isPetWin = Math.random() < 0.1;
    const winIndex = Math.floor(Math.random() * 50) + 15;
    createMainStrip(isPetWin, winIndex);
    const targetOffset = winIndex * itemWidth - containerWidth / 2 + itemWidth / 2;

    spinAnimation(targetOffset, () => {
      if (isPetWin) {
        currentWheel = 2;
        btnOpen.textContent = "SPIN PET WHEEL";
        createPetStrip();
        const petWinIndex = Math.floor(Math.random() * 50) + 15;
        const petTargetOffset = petWinIndex * itemWidth - containerWidth / 2 + itemWidth / 2;

        spinAnimation(petTargetOffset, () => {
          const pet = getRandomPet();
          lastPet = pet;
          addInventory(pet.name, "pet");
          saveHistory("case", `Got pet ${pet.name}`);
          result.innerHTML = `🎉 You got pet: ${pet.name}`;
          showFloatingText(`🎉 ${pet.name}`);
          resetUI();
        });
      } else {
        addInventory(SHECKLES_ITEM, "money");
        saveHistory("case", `Got ${SHECKLES_ITEM}`);
        result.innerHTML = `💰 You got ${SHECKLES_ITEM}`;
        showFloatingText(`💰 ${SHECKLES_ITEM}`);
        resetUI();
      }
    });
  }
});

// =============================
// 🛒 PET SHOP
// =============================
function renderPetShop() {
  const shopContainer = document.getElementById("shopContainer");
  if (!shopContainer || typeof petList === "undefined") return;
  shopContainer.innerHTML = "";

  petList.forEach(p => {
    const price = p.price || 5;
    const card = document.createElement("div");
    card.className = "pet-card";
    card.innerHTML = `
      <img src="${p.img}" alt="${p.name}">
      <h3>${p.name}</h3>
      <p>Price: $${price.toFixed(2)}</p>
      <button onclick="buyPet('${p.name}', ${price})">Buy</button>
    `;
    shopContainer.appendChild(card);
  });
}

function buyPet(name, price) {
  if (currentUser.balance < price) return alert("❌ Not enough balance!");
  updateBalance(-price);
  addInventory(name, "pet");
  saveHistory("buy", `Bought pet ${name} for $${price}`);
  alert(`✅ Bought ${name} for $${price} and added to inventory.`);
}
