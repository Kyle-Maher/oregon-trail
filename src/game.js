// ============= TITLE SCREEN =============

function goToOutfitter() {
    const titleScreen = document.getElementById('titleScreen');
    const outfitterScreen = document.getElementById('outfitterScreen');

    titleScreen.style.animation = 'fadeOut 0.5s ease-out';

    setTimeout(() => {
        titleScreen.style.display = 'none';
        outfitterScreen.style.display = 'block';
        outfitterScreen.style.animation = 'fadeIn 0.5s ease-in';
    }, 500);
}

function startGame() {
    const outfitterScreen = document.getElementById('outfitterScreen');
    const gameContainer = document.getElementById('gameContainer');

    outfitterScreen.style.animation = 'fadeOut 0.5s ease-out';

    setTimeout(() => {
        outfitterScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        gameContainer.style.animation = 'fadeIn 0.5s ease-in';

        initializeLandmarkMarkers();
        updateDisplay();
        logEntry("Your wagon departs Independence, Missouri. The trail stretches endlessly before you. Oregon City is 2000 miles away.", "system");
        showBeginTravelingPrompt();
    }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.getElementById('titleScreen').style.display !== 'none') {
            goToOutfitter();
        }
    });
});

// ============= OUTFITTER SHOP =============

const OUTFITTER_BUDGET = 150;
let outfitterBalance = OUTFITTER_BUDGET;

const shopItems = {
    oxen:     { price: 25, qty: 0, unit: 'ox',      plural: 'oxen' },
    food:     { price: 5,  qty: 0, unit: '25 lbs',  plural: '25 lbs', perUnit: 25 },
    bullets:  { price: 5,  qty: 0, unit: '10 bullets', plural: '10 bullets', perUnit: 10 },
    parts:    { price: 10, qty: 0, unit: 'set',     plural: 'sets' },
    medicine: { price: 15, qty: 0, unit: 'dose',    plural: 'doses' },
    clothing: { price: 10, qty: 0, unit: 'set',     plural: 'sets' }
};

function adjustItem(item, delta) {
    const shop = shopItems[item];
    const newQty = shop.qty + delta;

    if (newQty < 0) return;

    const cost = delta * shop.price;
    if (outfitterBalance - cost < 0) return;

    shop.qty = newQty;
    outfitterBalance -= cost;

    updateOutfitterDisplay();
}

function updateOutfitterDisplay() {
    document.getElementById('outfitterBudget').textContent = `$${outfitterBalance}`;

    const budgetEl = document.getElementById('outfitterBudget');
    if (outfitterBalance === 0) {
        budgetEl.style.color = '#ff6b6b';
    } else if (outfitterBalance < 30) {
        budgetEl.style.color = '#ffa94d';
    } else {
        budgetEl.style.color = '#51cf66';
    }

    for (const [key, item] of Object.entries(shopItems)) {
        document.getElementById(`qty-${key}`).textContent = item.qty;
    }

    const cartItems = document.getElementById('cartItems');
    const items = [];
    if (shopItems.oxen.qty > 0) items.push(`🐂 ${shopItems.oxen.qty} ${shopItems.oxen.qty === 1 ? 'ox' : 'oxen'}`);
    if (shopItems.food.qty > 0) items.push(`🌾 ${shopItems.food.qty * 25} lbs food`);
    if (shopItems.bullets.qty > 0) items.push(`⚫ ${shopItems.bullets.qty * 10} bullets`);
    if (shopItems.parts.qty > 0) items.push(`🔧 ${shopItems.parts.qty} spare ${shopItems.parts.qty === 1 ? 'part set' : 'part sets'}`);
    if (shopItems.medicine.qty > 0) items.push(`💊 ${shopItems.medicine.qty} medicine ${shopItems.medicine.qty === 1 ? 'dose' : 'doses'}`);
    if (shopItems.clothing.qty > 0) items.push(`🧥 ${shopItems.clothing.qty} clothing ${shopItems.clothing.qty === 1 ? 'set' : 'sets'}`);

    if (items.length === 0) {
        cartItems.innerHTML = '<span class="cart-empty">Your wagon is empty. Buy some supplies!</span>';
    } else {
        cartItems.innerHTML = items.map(i => `<span class="cart-item">${i}</span>`).join('');
    }

    const warning = document.getElementById('outfitterWarning');
    if (shopItems.oxen.qty === 0) {
        warning.style.display = 'block';
        warning.textContent = '⚠️ You need at least 1 ox to pull your wagon!';
        warning.className = 'outfitter-warning warning-critical';
    } else if (shopItems.food.qty === 0) {
        warning.style.display = 'block';
        warning.textContent = '⚠️ You have no food! Your party will starve quickly.';
        warning.className = 'outfitter-warning warning-caution';
    } else if (shopItems.food.qty * 25 < 50) {
        warning.style.display = 'block';
        warning.textContent = '⚠️ That\'s very little food. Consider buying more.';
        warning.className = 'outfitter-warning warning-caution';
    } else {
        warning.style.display = 'none';
    }
}

function departOutfitter() {
    if (shopItems.oxen.qty === 0) {
        const warning = document.getElementById('outfitterWarning');
        warning.style.display = 'block';
        warning.textContent = '⚠️ You MUST buy at least 1 ox before departing!';
        warning.className = 'outfitter-warning warning-critical';
        warning.style.animation = 'none';
        void warning.offsetWidth;
        warning.style.animation = 'shake 0.4s ease-in-out';
        return;
    }

    gameState.oxen = shopItems.oxen.qty;
    gameState.food = shopItems.food.qty * 25;
    gameState.bullets = shopItems.bullets.qty * 10;
    gameState.money = outfitterBalance;
    gameState.spareParts = shopItems.parts.qty;
    gameState.medicine = shopItems.medicine.qty;
    gameState.clothing = shopItems.clothing.qty;

    startGame();
}

// ============= CORE GAME STATE & LOGIC =============

let gameState = {
    distance: 0,
    food: 0,
    health: 100,
    money: 0,
    oxen: 0,
    sickOxen: 0,
    spareParts: 0,
    medicine: 0,
    clothing: 0,
    bullets: 0,
    day: 1,
    gameOver: false,
    currentLandmark: null,
    atFort: false,
    atRiver: false,
    awaitingChoice: false,
    visitedLandmarks: [],
    riverWaterLevels: {},
    currentRiverName: null,
    currentStrength: null,
    riverLockedWidth: false,
    riverLockedCurrent: false,
    riverScoutAttempts: 0,
    riverWaitAttempts: 0,
    _eventAmount: 0
};

const GOAL_DISTANCE = 2000;

// ============= TRAVEL LOG =============

function logEntry(text, type = "normal") {
    const log = document.getElementById('travelLog');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;

    const dayTag = document.createElement('span');
    dayTag.className = 'log-day';
    dayTag.textContent = type === 'system' ? '►' : `Day ${gameState.day}`;

    const textSpan = document.createElement('span');
    textSpan.className = 'log-text';
    textSpan.textContent = text;

    entry.appendChild(dayTag);
    entry.appendChild(textSpan);

    // Animate in
    entry.style.opacity = '0';
    entry.style.transform = 'translateY(8px)';
    log.appendChild(entry);

    requestAnimationFrame(() => {
        entry.style.transition = 'opacity 0.3s, transform 0.3s';
        entry.style.opacity = '1';
        entry.style.transform = 'translateY(0)';
    });

    // Auto-scroll to bottom
    log.scrollTop = log.scrollHeight;

    // Limit log entries to prevent memory bloat
    while (log.children.length > 100) {
        log.removeChild(log.firstChild);
    }
}

// ============= HEALTH RANK SYSTEM =============

const HEALTH_RANKS = [
    { name: "Good",      min: 80, color: "#51cf66" },
    { name: "Fair",      min: 60, color: "#ffd700" },
    { name: "Poor",      min: 40, color: "#ffa94d" },
    { name: "Very Poor", min: 20, color: "#ff6b6b" },
    { name: "Critical",  min: 1,  color: "#cc3333" }
];

function getHealthRank(health) {
    for (const rank of HEALTH_RANKS) {
        if (health >= rank.min) return rank;
    }
    return { name: "Dead", min: 0, color: "#666" };
}

function applyHealthChange(amount) {
    const before = getHealthRank(gameState.health);
    gameState.health += amount;
    if (gameState.health > 100) gameState.health = 100;
    if (gameState.health < 0) gameState.health = 0;
    const after = getHealthRank(gameState.health);

    if (after.name === before.name) return "";

    if (amount < 0) {
        return ` ⚠️ Health declined to ${after.name}.`;
    } else {
        return ` ❤️ Health improved to ${after.name}.`;
    }
}

// ============= LANDMARKS =============

const landmarks = [
    { name: "Kansas River Crossing", distance: 102, type: "river" },
    { name: "Big Blue River Crossing", distance: 185, type: "river" },
    { name: "Fort Kearney", distance: 304, type: "fort" },
    { name: "Chimney Rock", distance: 554, type: "landmark" },
    { name: "Fort Laramie", distance: 640, type: "fort" },
    { name: "Independence Rock", distance: 830, type: "landmark" },
    { name: "South Pass", distance: 932, type: "landmark" },
    { name: "Fort Bridger", distance: 1025, type: "fort" },
    { name: "Soda Springs", distance: 1180, type: "landmark" },
    { name: "Fort Hall", distance: 1288, type: "fort" },
    { name: "Snake River Crossing", distance: 1430, type: "river" },
    { name: "Fort Boise", distance: 1543, type: "fort" },
    { name: "Blue Mountains", distance: 1700, type: "landmark" },
    { name: "The Dalles", distance: 1850, type: "landmark" },
    { name: "Columbia River", distance: 1950, type: "river" },
    { name: "Oregon City", distance: 2000, type: "destination" }
];

// ============= UTILITY FUNCTIONS =============

const WATER_LEVELS = ["Narrow", "Wide", "Very Wide"];
const CURRENT_STRENGTHS = ["Weak", "Moderate", "Strong"];
const WIDTH_COLORS = { "Narrow": "#4caf50", "Wide": "#ffc107", "Very Wide": "#f44336" };
const CURRENT_COLORS = { "Weak": "#4caf50", "Moderate": "#ffc107", "Strong": "#f44336" };
function coloredWidth(val) { return `<span style="color:${WIDTH_COLORS[val]||'#f4e8d0'};font-weight:bold">${val}</span>`; }
function coloredCurrent(val) { return `<span style="color:${CURRENT_COLORS[val]||'#f4e8d0'};font-weight:bold">${val}</span>`; }

function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getRiverWaterLevel(riverName) {
    if (!gameState.riverWaterLevels[riverName]) {
        gameState.riverWaterLevels[riverName] = randomFrom(WATER_LEVELS);
    }
    return gameState.riverWaterLevels[riverName];
}

function rollCurrentStrength() {
    gameState.currentStrength = randomFrom(CURRENT_STRENGTHS);
    return gameState.currentStrength;
}

function getNextLandmark() {
    for (let landmark of landmarks) {
        if (gameState.distance < landmark.distance) return landmark;
    }
    return null;
}

function showMessage(message) {
    const box = document.getElementById('messageBox');
    box.innerHTML = message;
    box.style.display = message ? 'block' : 'none';
}

function hideMessage() {
    const box = document.getElementById('messageBox');
    box.textContent = '';
    box.style.display = 'none';
}

// ============= AUTO-TRAVEL ENGINE =============

const TICK_SPEED = 1800;

const travelEngine = {
    running: false,
    paused: false,
    tickTimer: null,
    pauseReason: null,

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.pauseReason = null;
        this.scheduleTick();
    },

    stop() {
        this.running = false;
        this.paused = false;
        if (this.tickTimer) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }
    },

    pause(reason) {
        this.paused = true;
        this.pauseReason = reason || 'manual';
        if (this.tickTimer) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }
    },

    resume() {
        if (!this.running) return;
        this.paused = false;
        this.pauseReason = null;
        hideMessage();
        this.scheduleTick();
    },

    scheduleTick() {
        if (!this.running || this.paused) return;
        this.tickTimer = setTimeout(() => this.tick(), TICK_SPEED);
    },

    tick() {
        if (!this.running || this.paused || gameState.gameOver) return;

        if (gameState.oxen <= 0) {
            logEntry("You have no oxen! You cannot continue. Game Over.", "danger");
            endGame(false);
            return;
        }

        // Advance one day: travel 10-15 miles (+oxen bonus)
        const healthyOxen = gameState.oxen - gameState.sickOxen;
        const distance = Math.floor(Math.random() * 6) + 10 + Math.min(healthyOxen - 1, 3);
        gameState.distance += distance;
        gameState.day++;
        gameState.food -= 5;
        checkOxenHealth();

        // Landmark arrival takes priority over encounters
        const arrivedAt = landmarks.find(lm =>
            gameState.distance >= lm.distance && !gameState.visitedLandmarks.includes(lm.name)
        );
        if (arrivedAt) {
            gameState.visitedLandmarks.push(arrivedAt.name);
            gameState.currentLandmark = arrivedAt;
            logEntry(`Traveled ${distance} miles.`, "travel");
            this.pause('landmark');
            handleLandmarkArrival(arrivedAt);
            checkGameState();
            updateDisplay();
            return;
        }

        // Interactive encounter pauses travel for a player choice
        const encounter = rollInteractiveEncounter(gameState);
        if (encounter) {
            logEntry(`Traveled ${distance} miles.`, "travel");
            this.pause('encounter');
            showInteractiveEncounter(encounter);
            checkGameState();
            updateDisplay();
            return;
        }

        // Passive event: apply effect and append to travel log entry
        const event = rollPassiveEvent(gameState);
        let eventText = "";
        if (event) {
            const effectMsg = event.effect ? event.effect(gameState) : "";
            eventText = getPassiveEventText(event, gameState);
            if (effectMsg) eventText += effectMsg;
        }

        logEntry(`Traveled ${distance} miles.${eventText ? ' ' + eventText : ''}`, eventText ? "event" : "travel");
        checkGameState();
        updateDisplay();
        this.scheduleTick();
    },

};

// ============= INTERACTIVE ENCOUNTER UI =============

function showInteractiveEncounter(encounter) {
    gameState.awaitingChoice = true;

    const prompt = getEncounterPrompt(encounter, gameState);
    const choices = getEncounterChoices(encounter, gameState);

    showMessage(prompt);

    const buttons = document.getElementById('actionButtons');
    buttons.innerHTML = '';
    buttons.style.display = 'flex';

    choices.forEach((choice) => {
        const btn = document.createElement('button');
        btn.className = 'choice-button';
        btn.textContent = choice.text;
        btn.onclick = () => resolveEncounterChoice(encounter, choice);
        buttons.appendChild(btn);
    });
}

function resolveEncounterChoice(encounter, choice) {
    const result = choice.effect ? choice.effect(gameState) : "You continue on.";

    logEntry(result, "encounter");
    showMessage(result);

    gameState.awaitingChoice = false;
    checkGameState();
    updateDisplay();

    if (!gameState.gameOver) {
        travelEngine.resume();
        showTravelingButtons();
    }
}

// ============= MEDICINE USE =============

function useMedicine() {
    if (gameState.gameOver) return;
    if (gameState.medicine <= 0) {
        logEntry("You have no medicine left!", "warning");
        return;
    }

    gameState.medicine--;
    gameState.day++;

    if (gameState.sickOxen > 0) {
        gameState.sickOxen--;
        const healthyNow = gameState.oxen - gameState.sickOxen;
        logEntry(`Used medicine to treat a sick ox. It's back on its feet! (${healthyNow} healthy, ${gameState.sickOxen} sick) — ${gameState.medicine} doses remaining.`, "event");
    } else {
        const rankMsg = applyHealthChange(20);
        logEntry(`Used medicine. Feeling much better. (${gameState.medicine} doses remaining)${rankMsg}`, "event");
    }

    gameState.food -= 5;
    checkGameState();
    updateDisplay();
    // Re-render stopped buttons to refresh medicine count
    if (!gameState.awaitingChoice && !gameState.atFort && !gameState.atRiver) {
        showStoppedButtons();
    }
}

// ============= REST ACTION =============

function doRest() {
    if (gameState.gameOver) return;

    gameState.food -= 8;
    gameState.day++;

    const rankMsg = applyHealthChange(gameState.atFort ? 30 : 20);
    const location = gameState.atFort ? "at the fort" : "on the trail";
    logEntry(`Rested ${location}. Consumed 8 lbs of food.${rankMsg}`, "event");

    checkGameState();
    updateDisplay();
    // Re-render stopped buttons to refresh medicine count
    if (!gameState.awaitingChoice && !gameState.atFort && !gameState.atRiver) {
        showStoppedButtons();
    }
}

// ============= DISPLAY =============

function initializeLandmarkMarkers() {
    const markersContainer = document.getElementById('landmarkMarkers');

    landmarks.forEach(landmark => {
        if (landmark.type === 'fort' || landmark.type === 'river') {
            const position = (landmark.distance / GOAL_DISTANCE) * 100;
            const marker = document.createElement('div');
            marker.className = `landmark-marker marker-${landmark.type}`;
            marker.style.left = `${position}%`;

            const icon = document.createElement('div');
            icon.className = 'marker-icon';
            icon.textContent = landmark.type === 'fort' ? '🏰' : '🌊';
            marker.appendChild(icon);

            markersContainer.appendChild(marker);
        }
    });
}

function updateDisplay() {
    document.getElementById('distance').textContent = `${gameState.distance} / ${GOAL_DISTANCE} miles`;
    document.getElementById('food').textContent = `${gameState.food} lbs`;

    const rank = getHealthRank(gameState.health);
    const healthEl = document.getElementById('health');
    healthEl.textContent = rank.name;
    healthEl.style.color = rank.color;

    document.getElementById('money').textContent = `$${gameState.money}`;
    const sickText = gameState.sickOxen > 0 ? ` (${gameState.sickOxen} sick)` : '';
    document.getElementById('oxen').textContent = `${gameState.oxen}${sickText}`;
    document.getElementById('spareParts').textContent = `${gameState.spareParts}`;
    document.getElementById('medicineDoses').textContent = `${gameState.medicine} doses`;
    document.getElementById('clothingSets').textContent = `${gameState.clothing} sets`;
    const bulletsEl = document.getElementById('bulletCount');
    if (bulletsEl) bulletsEl.textContent = `${gameState.bullets} bullets`;

    const progress = (gameState.distance / GOAL_DISTANCE) * 100;
    document.getElementById('progressBar').style.width = `${Math.min(progress, 100)}%`;
    document.getElementById('progressLabel').textContent = `${gameState.distance} miles`;

    const nextLandmark = getNextLandmark();
    if (nextLandmark && !gameState.atFort && !gameState.atRiver) {
        const distanceToNext = nextLandmark.distance - gameState.distance;
        const landmarkDiv = document.getElementById('landmarkIndicator');
        landmarkDiv.className = "landmark-indicator";
        landmarkDiv.textContent = `Next: ${nextLandmark.name} (${distanceToNext} miles)`;
    }

    // Update medicine button
    const medBtn = document.getElementById('medicineButton');
    if (medBtn) {
        medBtn.disabled = gameState.medicine <= 0;
        medBtn.textContent = `💊 Medicine (${gameState.medicine})`;
    }

    // Update day display
    const dayEl = document.getElementById('dayDisplay');
    if (dayEl) dayEl.textContent = `Day ${gameState.day}`;
}

function showBeginTravelingPrompt() {
    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = `
        <button onclick="beginTraveling()" class="action-btn action-btn-travel">🐂 Begin Traveling</button>
        <div class="begin-travel-hint">Your wagon is ready. Press 'Begin Traveling' to head west on the Oregon Trail!</div>
    `;
}

function beginTraveling() {
    hideMessage();
    travelEngine.start();
    showTravelingButtons();
}

function stopTraveling() {
    travelEngine.pause('manual');
    hideMessage();
    showStoppedButtons();
}

function showTravelingButtons() {
    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = `<button onclick="stopTraveling()" class="action-btn action-btn-stop">🎒 Check Supplies</button>`;
}

function getSuppliesHTML() {
    const rank = getHealthRank(gameState.health);
    const sickText = gameState.sickOxen > 0 ? ` (${gameState.sickOxen} sick)` : '';
    return `
        <div class="supplies-panel">
            <div class="supplies-grid">
                <div class="supply-item"><span class="supply-label">Health</span><span class="supply-value" style="color:${rank.color}">${rank.name}</span></div>
                <div class="supply-item"><span class="supply-label">Food</span><span class="supply-value">${gameState.food} lbs</span></div>
                <div class="supply-item"><span class="supply-label">Money</span><span class="supply-value">$${gameState.money}</span></div>
                <div class="supply-item"><span class="supply-label">Oxen</span><span class="supply-value">${gameState.oxen}${sickText}</span></div>
                <div class="supply-item"><span class="supply-label">Parts</span><span class="supply-value">${gameState.spareParts}</span></div>
                <div class="supply-item"><span class="supply-label">Medicine</span><span class="supply-value">${gameState.medicine} doses</span></div>
                <div class="supply-item"><span class="supply-label">Clothing</span><span class="supply-value">${gameState.clothing} sets</span></div>
                <div class="supply-item"><span class="supply-label">Bullets</span><span class="supply-value">${gameState.bullets}</span></div>
            </div>
        </div>
    `;
}

function showStoppedButtons() {
    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = `
        ${getSuppliesHTML()}
        <div class="stopped-actions">
            <button onclick="resumeTraveling()" class="action-btn action-btn-travel">🐂 Continue Traveling</button>
            <button onclick="doRest()" class="action-btn">🛏️ Rest</button>
            <button onclick="hunt()" class="action-btn">🎯 Hunt</button>
            <button onclick="useMedicine()" id="medicineButton" class="action-btn" ${gameState.medicine <= 0 ? 'disabled' : ''}>💊 Medicine (${gameState.medicine})</button>
        </div>
    `;
}

function resumeTraveling() {
    hideMessage();
    travelEngine.resume();
    showTravelingButtons();
}

function restoreAutoTravelButtons() {
    // After an encounter/landmark resolves, return to traveling state
    showTravelingButtons();
}

// Alias for backward compat with hunting/river
function restoreNormalButtons() {
    restoreAutoTravelButtons();
    if (!gameState.awaitingChoice && !gameState.gameOver) {
        travelEngine.resume();
    }
}

// ============= LANDMARK HANDLING =============

function checkForLandmark() {
    for (let landmark of landmarks) {
        if (gameState.distance >= landmark.distance &&
            !gameState.visitedLandmarks.includes(landmark.name)) {

            gameState.visitedLandmarks.push(landmark.name);
            gameState.currentLandmark = landmark;
            handleLandmarkArrival(landmark);
            return;
        }
    }
}

function handleLandmarkArrival(landmark) {
    const landmarkDiv = document.getElementById('landmarkIndicator');
    gameState.awaitingChoice = true;

    if (landmark.type === "fort") {
        gameState.atFort = true;
        landmarkDiv.className = "landmark-indicator fort-stop";
        landmarkDiv.textContent = `🏰 ${landmark.name}`;
        logEntry(`Arrived at ${landmark.name}!`, "landmark");
        showFortChoices(landmark.name);
    } else if (landmark.type === "river") {
        gameState.atRiver = true;
        gameState.currentRiverName = landmark.name;
        landmarkDiv.className = "landmark-indicator river-crossing";
        landmarkDiv.textContent = `🌊 ${landmark.name}`;
        logEntry(`Arrived at ${landmark.name}.`, "landmark");
        showRiverChoices(landmark.name);
    } else if (landmark.type === "landmark") {
        landmarkDiv.className = "landmark-indicator landmark-choice";
        landmarkDiv.textContent = `📍 ${landmark.name}`;
        logEntry(`Arrived at ${landmark.name}.`, "landmark");
        showLandmarkChoices(landmark.name);
    } else if (landmark.type === "destination") {
        landmarkDiv.className = "landmark-indicator victory";
        landmarkDiv.textContent = `🎉 ${landmark.name} - Journey's End!`;
        gameState.awaitingChoice = false;
    }
}

// ============= FORT CHOICES =============

function showFortChoices(fortName) {
    showMessage(`You have arrived at ${fortName}! What would you like to do?`);

    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = `
        <button class="choice-button" onclick="fortChoice('trade')">Trade for Supplies ($20 for 40 lbs food)</button>
        <button class="choice-button" onclick="fortChoice('bullets')">Buy Bullets ($5 for 10 bullets)</button>
        <button class="choice-button" onclick="fortChoice('medicine')">Buy Medicine ($15, +1 dose)</button>
        <button class="choice-button" onclick="fortChoice('ox')">Buy an Ox ($25)</button>
        <button class="choice-button" onclick="fortChoice('parts')">Buy Spare Parts ($10)</button>
        <button class="choice-button" onclick="fortChoice('rest')">Rest at the Fort (Free, recover health)</button>
        <button onclick="fortChoice('leave')">Leave and Continue Journey</button>
    `;
}

function fortChoice(choice) {
    gameState.day++;
    let message = "";

    switch(choice) {
        case 'bullets':
            if (gameState.money >= 5) {
                gameState.money -= 5;
                gameState.bullets += 10;
                message = `Bought 10 bullets. 💰-$5 (${gameState.bullets} total)`;
            } else {
                message = "You don't have enough money! You need $5.";
                gameState.day--;
            }
            break;
        case 'trade':
            if (gameState.money >= 20) {
                gameState.money -= 20;
                gameState.food += 40;
                message = `Traded for 40 lbs of food. 💰-$20`;
            } else {
                message = "You don't have enough money! You need $20.";
                gameState.day--;
            }
            break;
        case 'medicine':
            if (gameState.money >= 15) {
                gameState.money -= 15;
                gameState.medicine++;
                message = `Bought a dose of medicine. 💰-$15 (${gameState.medicine} total)`;
            } else {
                message = "You don't have enough money! You need $15.";
                gameState.day--;
            }
            break;
        case 'ox':
            if (gameState.money >= 25) {
                gameState.money -= 25;
                gameState.oxen += 1;
                message = `Purchased a strong ox! 💰-$25`;
            } else {
                message = "You don't have enough money! You need $25.";
                gameState.day--;
            }
            break;
        case 'parts':
            if (gameState.money >= 10) {
                gameState.money -= 10;
                gameState.spareParts++;
                message = `Bought a set of spare parts. 💰-$10 (${gameState.spareParts} total)`;
            } else {
                message = "You don't have enough money! You need $10.";
                gameState.day--;
            }
            break;
        case 'rest': {
            gameState.food -= 8;
            const rankMsg = applyHealthChange(30);
            message = `Rested at the fort. Consumed 8 lbs of food.${rankMsg}`;
            break;
        }
        case 'leave':
            gameState.atFort = false;
            gameState.awaitingChoice = false;
            logEntry("Departed the fort and continued on the trail.", "travel");
            hideMessage();
            updateDisplay();
            travelEngine.resume();
            showTravelingButtons();
            return;
    }

    logEntry(message, "event");
    showMessage(message);
    checkGameState();
    updateDisplay();
}

// ============= RIVER CHOICES =============

function showRiverChoices(riverName) {
    const waterLevel = getRiverWaterLevel(riverName);
    const currentStrength = rollCurrentStrength();
    gameState.riverLockedWidth = Math.random() < 0.25;
    gameState.riverLockedCurrent = Math.random() < 0.25;
    gameState.riverScoutAttempts = 0;
    gameState.riverWaitAttempts = 0;

    showMessage(
        `You have reached the ${riverName}. The river width is ${coloredWidth(waterLevel)}. The current today is ${coloredCurrent(currentStrength)}. \n` +
        `How would you like to cross?`
    );

    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = `
        <button class="choice-button" onclick="riverChoice('ford')">Ford the River</button>
        <button onclick="riverChoice('scout')">Look for a Better Spot to Cross</button>
        <button onclick="riverChoice('wait')">Wait for a Slower Current</button>
        <button onclick="riverChoice('ferry')">Take the Ferry ($10)</button>
    `;
}

function riverChoice(choice) {
    const riverName = gameState.currentRiverName;
    const waterLevel = getRiverWaterLevel(riverName);
    const currentStrength = gameState.currentStrength;

    switch(choice) {
        case 'ford':
            startRiverCrossingGame(waterLevel, currentStrength);
            return;

        case 'scout':
            gameState.food -= 5;
            gameState.day++;
            gameState.riverScoutAttempts++;
            if (gameState.riverLockedWidth && gameState.riverScoutAttempts >= 2) {
                gameState.riverWaterLevels[riverName] = "Very Wide";
            } else {
                const wr = Math.random();
                gameState.riverWaterLevels[riverName] = wr < 0.60 ? "Narrow" : wr < 0.85 ? "Wide" : "Very Wide";
            }
            const newWidth = getRiverWaterLevel(riverName);
            const isLockedWide = gameState.riverLockedWidth && gameState.riverScoutAttempts >= 2 && newWidth === "Very Wide";
            const widthText = isLockedWide
                ? "The river is very wide no matter where you look."
                : (newWidth === "Narrow") ? "You found a narrower crossing point."
                : (newWidth === "Wide") ? "The best you could find is still fairly wide."
                : "This stretch isn't any better — the river is still very wide.";
            const scoutMsg = `Scouted for a better crossing. -5 lbs food, +1 day. ${widthText}`;
            logEntry(scoutMsg, "event");
            showMessage(
                `${widthText} -5 lbs food, +1 day.\n` +
                `The river width is now ${coloredWidth(newWidth)}. The current today is ${coloredCurrent(currentStrength)}.`
            );
            checkGameState();
            updateDisplay();
            return;

        case 'wait':
            gameState.food -= 10;
            gameState.day += 2;
            gameState.riverWaitAttempts++;

            if (gameState.riverLockedCurrent && gameState.riverWaitAttempts >= 2) {
                gameState.currentStrength = "Strong";
            } else {
                const cr = Math.random();
                gameState.currentStrength = cr < 0.60 ? "Weak" : cr < 0.85 ? "Moderate" : "Strong";
            }
            const newCurrent = gameState.currentStrength;
            const isLockedStrong = gameState.riverLockedCurrent && gameState.riverWaitAttempts >= 2 && newCurrent === "Strong";
            const improvedText = isLockedStrong
                ? "The current is relentless — it won't let up no matter how long you wait."
                : (newCurrent === "Weak") ? "Conditions look calmer now."
                : (newCurrent === "Moderate") ? "Conditions are a bit better."
                : "Still looks rough out there.";

            const waitMsg = `Waited for a slower current. -10 lbs food, +2 days. ${improvedText} The current is now ${newCurrent}.`;

            logEntry(waitMsg, "event");
            showMessage(
                `Waited for a slower current. -10 lbs food, +2 days. ${improvedText} The current is now ${coloredCurrent(newCurrent)}.\n` +
                `The river width is ${coloredWidth(waterLevel)}. The current today is ${coloredCurrent(newCurrent)}.`
            );

            checkGameState();
            updateDisplay();
            return;

        case 'ferry':
            gameState.day++;
            if (gameState.money >= 10) {
                gameState.money -= 10;
                const ferryMsg = `Took the ferry across. (${waterLevel}, ${currentStrength} current) Safe but costly. 💰-$10`;
                gameState.atRiver = false;
                gameState.awaitingChoice = false;
                gameState.currentRiverName = null;
                gameState.currentStrength = null;
                gameState.riverLockedWidth = false;
                gameState.riverLockedCurrent = false;
                gameState.riverScoutAttempts = 0;
                gameState.riverWaitAttempts = 0;
                logEntry(ferryMsg, "event");
                showMessage(ferryMsg);
                checkGameState();
                updateDisplay();
                travelEngine.resume();
                showTravelingButtons();
            } else {
                gameState.day--;
                showMessage("You don't have enough money for the ferry ($10). You'll have to ford, scout, or wait.");
            }
            return;
    }
}

// ============= LANDMARK CHOICES =============

function showLandmarkChoices(landmarkName) {
    let landmarkMessage = "";
    let choices = [];

    switch(landmarkName) {
        case "Chimney Rock":
            landmarkMessage = "You've reached Chimney Rock, a towering natural monument!";
            choices = [
                { text: "Climb to get a better view", action: 'climb' },
                { text: "Rest and admire from below", action: 'rest' },
                { text: "Keep moving", action: 'continue' }
            ];
            break;
        case "Independence Rock":
            landmarkMessage = "Independence Rock - travelers carve their names here!";
            choices = [
                { text: "Carve your name (takes time)", action: 'carve' },
                { text: "Search for supplies left by others", action: 'search' },
                { text: "Keep moving", action: 'continue' }
            ];
            break;
        case "South Pass":
            landmarkMessage = "South Pass - the gateway through the Rocky Mountains!";
            choices = [
                { text: "Take the steep shortcut", action: 'shortcut' },
                { text: "Take the longer safer route", action: 'safe' },
                { text: "Rest before the climb", action: 'rest' }
            ];
            break;
        case "Soda Springs":
            landmarkMessage = "Soda Springs - natural carbonated water springs!";
            choices = [
                { text: "Drink from the springs (health benefit)", action: 'drink' },
                { text: "Fill containers with water", action: 'fill' },
                { text: "Keep moving", action: 'continue' }
            ];
            break;
        case "Blue Mountains":
            landmarkMessage = "The Blue Mountains - a challenging climb ahead!";
            choices = [
                { text: "Push through quickly", action: 'push' },
                { text: "Take it slow and steady", action: 'slow' },
                { text: "Rest before attempting", action: 'rest' }
            ];
            break;
        case "The Dalles":
            landmarkMessage = "The Dalles - decision point for the final stretch!";
            choices = [
                { text: "Take the dangerous river route (faster)", action: 'river' },
                { text: "Take the mountain route (slower but safer)", action: 'mountain' },
                { text: "Rest and decide later", action: 'rest' }
            ];
            break;
        default:
            landmarkMessage = `You've reached ${landmarkName}!`;
            choices = [
                { text: "Explore the area", action: 'explore' },
                { text: "Rest here", action: 'rest' },
                { text: "Keep moving", action: 'continue' }
            ];
    }

    showMessage(landmarkMessage);

    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = choices.map(choice =>
        `<button class="choice-button" onclick="landmarkChoice('${landmarkName}', '${choice.action}')">${choice.text}</button>`
    ).join('');
}

function landmarkChoice(landmarkName, action) {
    gameState.day++;
    let message = "";
    let rankMsg = "";

    switch(action) {
        case 'climb':
            if (Math.random() > 0.6) {
                rankMsg = applyHealthChange(-5);
                message = `The climb was tiring but the view was spectacular!${rankMsg}`;
            } else {
                rankMsg = applyHealthChange(-10);
                message = `You slipped while climbing! Minor injuries.${rankMsg}`;
            }
            break;
        case 'carve':
            gameState.food -= 5;
            gameState.day++;
            message = `You carved your name for posterity! Other travelers will see your mark. -5 lbs food, +1 day`;
            break;
        case 'search':
            if (Math.random() > 0.5) {
                gameState.food += 10;
                gameState.money += 5;
                message = `You found supplies left by previous travelers! +10 lbs food, 💰+$5`;
            } else {
                message = `You searched but found nothing of value.`;
            }
            break;
        case 'shortcut':
            if (Math.random() > 0.5) {
                gameState.distance += 40;
                rankMsg = applyHealthChange(-15);
                message = `The shortcut worked! You saved distance but it was exhausting. +40 miles${rankMsg}`;
            } else {
                rankMsg = applyHealthChange(-25);
                gameState.food -= 10;
                message = `The shortcut was a disaster! Very difficult terrain. -10 lbs food${rankMsg}`;
            }
            break;
        case 'safe':
            gameState.food -= 8;
            gameState.day++;
            message = `You took the safer route. It took longer but everyone is okay. -8 lbs food, +1 day`;
            break;
        case 'drink':
            rankMsg = applyHealthChange(15);
            message = `The mineral water was refreshing!${rankMsg}`;
            break;
        case 'fill':
            gameState.food += 5;
            message = `You filled containers with water. This will help on the trail. +5 lbs food equivalent`;
            break;
        case 'push':
            if (Math.random() > 0.5) {
                gameState.distance += 30;
                rankMsg = applyHealthChange(-15);
                gameState.food -= 10;
                message = `You pushed through! Made good time but it was grueling. +30 miles, -10 lbs food${rankMsg}`;
            } else {
                rankMsg = applyHealthChange(-25);
                gameState.oxen -= 1;
                if (gameState.sickOxen > gameState.oxen) gameState.sickOxen = gameState.oxen;
                message = `Pushing too hard was a mistake! An ox died from exhaustion. -1 ox${rankMsg}`;
            }
            break;
        case 'slow':
            gameState.food -= 12;
            gameState.day += 2;
            rankMsg = applyHealthChange(-5);
            message = `Slow and steady. Everyone made it through safely. -12 lbs food, +2 days${rankMsg}`;
            break;
        case 'river':
            if (Math.random() > 0.6) {
                gameState.distance += 50;
                message = `The river route was fast! Great choice. +50 miles`;
            } else {
                rankMsg = applyHealthChange(-20);
                gameState.food -= 15;
                message = `The river was treacherous! You made it but at great cost. -15 lbs food${rankMsg}`;
            }
            break;
        case 'mountain':
            gameState.food -= 15;
            gameState.day += 3;
            rankMsg = applyHealthChange(-10);
            message = `The mountain route was long but safe. -15 lbs food, +3 days${rankMsg}`;
            break;
        case 'explore':
            if (Math.random() > 0.6) {
                gameState.food += 8;
                message = `You found some useful plants and berries! +8 lbs food`;
            } else {
                gameState.food -= 5;
                message = `You explored but didn't find much. -5 lbs food`;
            }
            break;
        case 'rest': {
            rankMsg = applyHealthChange(15);
            gameState.food -= 8;
            message = `Rested here. -8 lbs food${rankMsg}`;
            break;
        }
        case 'continue':
            message = `You continue on the trail without delay.`;
            break;
    }

    gameState.awaitingChoice = false;
    logEntry(message, "event");
    showMessage(message);
    checkGameState();
    updateDisplay();

    if (!gameState.gameOver) {
        travelEngine.resume();
        showTravelingButtons();
    }
}

// ============= OXEN HEALTH CHECK =============

function checkOxenHealth() {
    let oxenMessages = [];

    if (gameState.sickOxen > 0) {
        let deaths = 0;
        for (let i = 0; i < gameState.sickOxen; i++) {
            if (Math.random() < 0.10) deaths++;
        }
        if (deaths > 0) {
            gameState.sickOxen -= deaths;
            gameState.oxen -= deaths;
            oxenMessages.push(`💀 ${deaths} sick ${deaths === 1 ? 'ox' : 'oxen'} died.`);
        }
    }

    const healthyOxen = gameState.oxen - gameState.sickOxen;
    if (healthyOxen > 0) {
        let newSick = 0;
        for (let i = 0; i < healthyOxen; i++) {
            if (Math.random() < 0.03) newSick++;
        }
        if (newSick > 0) {
            gameState.sickOxen += newSick;
            oxenMessages.push(`🤒 ${newSick} ${newSick === 1 ? 'ox is' : 'oxen are'} sick!`);
        }
    }

    if (oxenMessages.length > 0) {
        oxenMessages.forEach(msg => logEntry(msg, "danger"));
    }
}

// ============= GAME STATE CHECKS =============

function checkGameState() {
    if (gameState.food <= 0) {
        logEntry("Your party has starved to death. Game Over.", "danger");
        endGame(false);
        return;
    }

    if (gameState.health <= 0) {
        logEntry("Your party has died from poor health. Game Over.", "danger");
        endGame(false);
        return;
    }

    if (gameState.distance >= GOAL_DISTANCE) {
        const finalRank = getHealthRank(gameState.health);
        logEntry(`🎉 Congratulations! You made it to Oregon City in ${gameState.day} days! Your party arrived in ${finalRank.name} health with ${gameState.food} lbs of food remaining!`, "victory");
        endGame(true);
        return;
    }
}

function endGame(victory) {
    gameState.gameOver = true;
    travelEngine.stop();

    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = '<button onclick="location.reload()">Play Again</button>';

    showMessage(victory
        ? `🎉 You made it to Oregon City in ${gameState.day} days!`
        : "Your journey has come to an end."
    );

    const messageBox = document.getElementById('messageBox');
    messageBox.className = victory ? 'message-box victory' : 'message-box game-over';
}

// Hunt is defined in hunting.js and calls travelEngine.pause('hunt') directly
