// =============================
// ✅ CONSTANTS & LOGIN CHECK
// =============================
const SHECKLES_ITEM = "x1 700T+ Sheckles";
const PET_REWARD_IMG = "images/pet_reward.png";
const PET_CHANCE = 0.03; // 🎯 Tỷ lệ ra pet: 5% (giảm hoặc tăng tùy ý)

let currentUser = null; 
let currentUserDocRef = null; 

const auth = firebase.auth();
const db = firebase.firestore();

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUserDocRef = db.collection('users').doc(user.uid);
    const doc = await currentUserDocRef.get();
    if (!doc.exists) {
      alert("User data not found!");
      auth.signOut();
      window.location.href = "login.html";
      return;
    }
    currentUser = { uid: user.uid, ...doc.data() };
    updateUIBalance();
    if (typeof renderPetShop === "function") renderPetShop();
    if (typeof renderInventory === "function") renderInventory();
  } else {
    if (!window.location.href.includes("login.html")) {
      alert("⚠️ Please login first!");
      window.location.href = "login.html";
    }
  }
});

// =============================
// ✅ UI UPDATE
// =============================
function updateUIBalance() {
  const userInfo = document.getElementById("userInfo");
  if (currentUser && userInfo) {
    userInfo.innerHTML = `
      👤 ${currentUser.username} | 💰 $${(currentUser.balance || 0).toFixed(2)}
      <button id="addFundsBtn" style="background:#0080ff;color:white;padding:4px 10px;border:none;border-radius:4px;margin-left:8px;">Add Funds</button>
      <button id="logoutBtn" style="background:red;color:white;padding:4px 10px;border:none;border-radius:4px;margin-left:8px;">Logout</button>
    `;
    document.getElementById("addFundsBtn").onclick = showAddFundsDialog;
    document.getElementById("logoutBtn").onclick = logout;
  }
}

// =============================
// ✅ BASIC FUNCTIONS
// =============================
function logout() { auth.signOut().then(() => window.location.href = "login.html"); }
async function updateBalance(amount) {
  if (!currentUserDocRef) return;
  const newBalance = (currentUser.balance || 0) + amount;
  await currentUserDocRef.update({ balance: newBalance });
  currentUser.balance = newBalance;
  updateUIBalance();
}

// =============================
// ✅ HISTORY & INVENTORY
// =============================
async function saveHistory(type, msg) {
  if (!currentUser) return;
  await db.collection('history').add({ userId: currentUser.uid, username: currentUser.username, type, msg, date: new Date() });
}
async function addInventory(itemName, type) {
  if (!currentUser) return;
  await db.collection('inventory').add({
    userId: currentUser.uid,
    username: currentUser.username,
    item: itemName,
    type,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// =============================
// ✅ HELPERS
// =============================
function getRandomPet() {
  let total = petList.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let p of petList) { if (r < p.weight) return p; r -= p.weight; }
}
function showFloatingText(text) {
  const msg = document.createElement("div");
  msg.className = "neon-fly";
  msg.innerHTML = text;
  document.body.appendChild(msg);
  setTimeout(() => msg.remove(), 2000);
}
function showAddFundsDialog() {
  if (document.getElementById("addFundsPopup")) return;
  const popup = document.createElement("div");
  popup.id = "addFundsPopup";
  popup.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000c;padding:20px;color:white;border-radius:8px;box-shadow:0 0 15px #ff00ff;z-index:2000;text-align:center";
  popup.innerHTML = `
    <h2>Add Funds</h2>
    <p>Contact admin on Discord: <a href="https://discord.gg/Cheapestgag" style="color:#00ffff" target="_blank">BearShop</a></p>
    <button onclick="document.getElementById('addFundsPopup').remove()" style="margin-top:10px;background:#ff00ff;color:white;padding:6px 12px;border:none;border-radius:4px;">Close</button>
  `;
  document.body.appendChild(popup);
}

// =============================
// 🎯 CASE OPENING
// =============================
const strip = document.getElementById("caseStrip");
const btnOpen = document.getElementById("openCase");
const result = document.getElementById("result");
const casePrice = 1, itemWidth = 120, containerWidth = strip.parentElement.offsetWidth;
let spinning = false, currentWheel = 1, lastPet = null;

function createMainStrip(isPetWin, winIndex) {
  strip.innerHTML = "";
  for (let i = 0; i < 80; i++) {
    strip.innerHTML += `<div class="item"><img src="${i === winIndex && isPetWin ? PET_REWARD_IMG : 'images/Sheckles.png'}"><span>${i === winIndex && isPetWin ? 'Pet Reward' : SHECKLES_ITEM}</span></div>`;
  }
}
function createPetStrip() {
  strip.innerHTML = Array(80).fill(`<div class="item"><img src="${PET_REWARD_IMG}"><span>Pet Reward</span></div>`).join("");
}
function spinAnimation(target, cb) {
  let pos = 0, vel = 90;
  (function anim() {
    pos += vel; vel *= 0.965;
    strip.style.transform = `translateX(-${pos}px)`;
    if (vel < 0.5 || pos >= target) { strip.style.transform = `translateX(-${target}px)`; cb(); return; }
    requestAnimationFrame(anim);
  })();
}
function resetUI() {
  spinning = false; currentWheel = 1; btnOpen.textContent = "OPEN CASE ($1.00)";
  btnOpen.disabled = false; btnOpen.style.opacity = "1"; result.innerHTML = ""; createMainStrip(false, 0);
}

// =============================
// ✅ MAIN CLICK
// =============================
btnOpen.addEventListener("click", () => {
  if (spinning) return;
  if ((currentUser.balance || 0) < casePrice) return alert("❌ Not enough balance!");
  spinning = true; btnOpen.disabled = true; btnOpen.style.opacity = "0.5"; result.innerHTML = "";
  updateBalance(-casePrice);

  const isPetWin = Math.random() < PET_CHANCE; // 🎯 Tỷ lệ ra pet
  const winIndex = Math.floor(Math.random() * 50) + 15;
  createMainStrip(isPetWin, winIndex);
  const targetOffset = winIndex * itemWidth - containerWidth / 2 + itemWidth / 2;

  spinAnimation(targetOffset, () => {
    if (isPetWin) {
      currentWheel = 2; btnOpen.textContent = "SPIN PET WHEEL"; createPetStrip();
      const pIdx = Math.floor(Math.random() * 50) + 15;
      const petTargetOffset = pIdx * itemWidth - containerWidth / 2 + itemWidth / 2;

      spinAnimation(petTargetOffset, async () => {
        const pet = getRandomPet(); lastPet = pet;
        await addInventory(pet.name, "pet");
        await saveHistory("case", `Got pet ${pet.name}`);
        result.innerHTML = `🎉 You got pet: ${pet.name}`; showFloatingText(`🎉 ${pet.name}`); resetUI();
      });
    } else {
      (async () => {
        await addInventory(SHECKLES_ITEM, "money");
        await saveHistory("case", `Got ${SHECKLES_ITEM}`);
        result.innerHTML = `💰 You got ${SHECKLES_ITEM}`; showFloatingText(`💰 ${SHECKLES_ITEM}`); resetUI();
      })();
    }
  });
});

// =============================
// 🛒 PET SHOP
// =============================
function renderPetShop() {
  const shopContainer = document.getElementById("shopContainer");
  if (!shopContainer || typeof petList === "undefined") return;
  shopContainer.innerHTML = "";
  petList.forEach(p => {
    shopContainer.innerHTML += `
      <div class="pet-card">
        <img src="${p.img}" alt="${p.name}">
        <h3>${p.name}</h3>
        <p>Price: $${(p.price || 5).toFixed(2)}</p>
        <button onclick="buyPet('${p.name}', ${p.price})">Buy</button>
      </div>`;
  });
}
async function buyPet(name, price) {
  if ((currentUser.balance || 0) < price) return alert("❌ Not enough balance!");
  await updateBalance(-price);
  await addInventory(name, "pet");
  await saveHistory("buy", `Bought pet ${name} for $${price}`);
  alert(`✅ Bought ${name} for $${price} and added to inventory.`);
}
