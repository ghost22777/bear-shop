// =============================
// ✅ CONSTANTS & FIREBASE INIT
// =============================
const SHECKLES_ITEM = "x1 700T+ Sheckles";
const PET_REWARD_IMG = "images/pet_reward.png";
const PET_CHANCE = 0.005;

let currentUser = null;
let userDocRef = null;
const auth = firebase.auth();
const db = firebase.firestore();

// =============================
// ✅ LOGIN CHECK
// =============================
auth.onAuthStateChanged(async (user) => {
  if (!user) return location.href = "login.html";
  userDocRef = db.collection('users').doc(user.uid);
  const snap = await userDocRef.get();
  if (!snap.exists) { alert("❌ User data not found!"); auth.signOut(); return location.href = "login.html"; }
  currentUser = { uid: user.uid, ...snap.data() };
  updateUIBalance();
  if (typeof renderPetShop === "function") renderPetShop();
});

// =============================
// ✅ UI BALANCE
// =============================
function updateUIBalance() {
  const info = document.getElementById("userInfo");
  if (!info) return;
  info.innerHTML = `
    👤 ${currentUser.username} | 💰 $${(currentUser.balance || 0).toFixed(2)}
    <button id="addFundsBtn">Add Funds</button>
    <button id="logoutBtn">Logout</button>
  `;
  document.getElementById("addFundsBtn").onclick = showAddFundsDialog;
  document.getElementById("logoutBtn").onclick = () => auth.signOut().then(() => location.href = "login.html");
}

async function getBalance() {
  const snap = await userDocRef.get();
  currentUser.balance = snap.data().balance;
  return currentUser.balance;
}

async function deductBalance(amount) {
  const bal = await getBalance();
  if (bal < amount) throw new Error("❌ Not enough balance!");
  await userDocRef.update({ balance: bal - amount });
  currentUser.balance -= amount;
  updateUIBalance();
}

// =============================
// ✅ FIRESTORE HELPERS
// =============================
async function saveHistory(type, msg) {
  await db.collection('history').add({
    userId: auth.currentUser.uid,
    username: currentUser.username,
    type, msg,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function addInventory(item, type) {
  await db.collection('inventory').add({
    userId: auth.currentUser.uid,
    username: currentUser.username,
    item, type,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// =============================
// ✅ UI HELPERS
// =============================
function showFloatingText(t) {
  const d = document.createElement("div");
  d.className = "neon-fly";
  d.textContent = t;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2000);
}

function showAddFundsDialog() {
  if (document.getElementById("funds")) return;
  const d = document.createElement("div");
  d.id = "funds";
  d.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#000c;padding:20px;color:white;border-radius:8px;box-shadow:0 0 10px #ff00ff;z-index:1000";
  d.innerHTML = `<h2>Add Funds</h2>
    <p>Contact admin on Discord: <a href="https://discord.gg/Cheapestgag" target="_blank">BearShop</a></p>
    <button onclick="this.parentNode.remove()">Close</button>`;
  document.body.appendChild(d);
}

// =============================
// 🎯 CASE OPENING
// =============================
const strip = document.getElementById("caseStrip");
const btnOpen = document.getElementById("openCase");
const result = document.getElementById("result");
const casePrice = 1;
const itemWidth = 120;
const containerWidth = strip ? strip.parentElement.offsetWidth : 0;
let spinning = false;

function createMainStrip(isPet, idx) {
  strip.innerHTML = "";
  for (let i = 0; i < 80; i++) {
    strip.innerHTML += `<div class="item"><img src="${i === idx && isPet ? PET_REWARD_IMG : 'images/Sheckles.png'}"><span>${i === idx && isPet ? 'Pet Reward' : SHECKLES_ITEM}</span></div>`;
  }
}

function createPetStrip() {
  strip.innerHTML = Array(80).fill(`<div class="item"><img src="${PET_REWARD_IMG}"><span>Pet Reward</span></div>`).join("");
}

function spinAnimation(target, cb) {
  let pos = 0, v = 90;
  (function anim() {
    pos += v; v *= 0.965;
    strip.style.transform = `translateX(-${pos}px)`;
    if (v < 0.5 || pos >= target) { strip.style.transform = `translateX(-${target}px)`; cb(); return; }
    requestAnimationFrame(anim);
  })();
}

function resetUI() {
  spinning = false;
  btnOpen.textContent = "OPEN CASE ($1.00)";
  btnOpen.disabled = false;
  btnOpen.style.opacity = "1";
}

if (btnOpen) {
  btnOpen.onclick = async () => {
    if (spinning) return;
    try { await deductBalance(casePrice); } catch (e) { return alert(e.message); }
    spinning = true; btnOpen.disabled = true; btnOpen.style.opacity = "0.5";

    const isPet = Math.random() < PET_CHANCE;
    const idx = Math.floor(Math.random() * 50) + 15;
    createMainStrip(isPet, idx);
    const target = idx * itemWidth - containerWidth / 2 + itemWidth / 2;

    spinAnimation(target, async () => {
      if (isPet) {
        createPetStrip();
        const pIdx = Math.floor(Math.random() * 50) + 15;
        const petTarget = pIdx * itemWidth - containerWidth / 2 + itemWidth / 2;
        spinAnimation(petTarget, async () => {
          const pet = petList[Math.floor(Math.random() * petList.length)];
          await addInventory(pet.name, "pet");
          await saveHistory("case", `Got pet ${pet.name}`);
          result.textContent = `🎉 You got pet: ${pet.name}`;
          showFloatingText(`🎉 ${pet.name}`);
          resetUI();
        });
      } else {
        await addInventory(SHECKLES_ITEM, "money");
        await saveHistory("case", `Got ${SHECKLES_ITEM}`);
        result.textContent = `💰 You got ${SHECKLES_ITEM}`;
        showFloatingText(`💰 ${SHECKLES_ITEM}`);
        resetUI();
      }
    });
  };
}

// =============================
// 🛒 PET SHOP
// =============================
function renderPetShop() {
  const shop = document.getElementById("shopContainer");
  if (!shop || typeof petList === "undefined") return;
  shop.innerHTML = "";
  petList.forEach(p => {
    shop.innerHTML += `
      <div class="pet-card">
        <img src="${p.img}" alt="${p.name}">
        <h3>${p.name}</h3>
        <p>Price: $${p.price.toFixed(2)}</p>
        <button onclick="buyPet('${p.name}', ${p.price})">Buy</button>
      </div>`;
  });
}

async function buyPet(name, price) {
  try {
    await deductBalance(price);
    await addInventory(name, "pet");
    await saveHistory("buy", `Bought pet ${name} for $${price}`);
    alert(`✅ Bought ${name} for $${price} and added to inventory.`);
  } catch (e) { alert(e.message); }
}
