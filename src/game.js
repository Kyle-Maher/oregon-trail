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

        // Start auto-travel after a brief pause
        setTimeout(() => {
            travelEngine.start();
        }, 1500);
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
    oxen:     { price: 25, qty: 0, unit: 'ox',   plural: 'oxen' },
    food:     { price: 5,  qty: 0, unit: '25 lbs', plural: '25 lbs', perUnit: 25 },
    parts:    { price: 10, qty: 0, unit: 'set',  plural: 'sets' },
    medicine: { price: 15, qty: 0, unit: 'dose', plural: 'doses' },
    clothing: { price: 10, qty: 0, unit: 'set',  plural: 'sets' }
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

const WATER_LEVELS = ["Shallow", "Medium", "Deep"];
const CURRENT_STRENGTHS = ["Weak", "Moderate", "Strong"];

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
    box.textContent = message;
    box.style.display = message ? 'block' : 'none';
}

function hideMessage() {
    const box = document.getElementById('messageBox');
    box.textContent = '';
    box.style.display = 'none';
}

// ============= AUTO-TRAVEL ENGINE =============

const TICK_SPEEDS = {
    slow: 3000,
    normal: 1800,
    fast: 800
};

const travelEngine = {
    running: false,
    paused: false,
    speed: 'normal',
    tickTimer: null,
    pauseReason: null,

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.pauseReason = null;
        this.updateControls();
        this.scheduleTick();
    },

    stop() {
        this.running = false;
        this.paused = false;
        if (this.tickTimer) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }
        this.updateControls();
    },

    pause(reason) {
        this.paused = true;
        this.pauseReason = reason || 'manual';
        if (this.tickTimer) {
            clearTimeout(this.tickTimer);
            this.tickTimer = null;
        }
        this.updateControls();
    },

    resume() {
        if (!this.running) return;
        this.paused = false;
        this.pauseReason = null;
        hideMessage();
        this.updateControls();
        this.scheduleTick();
    },

    setSpeed(speed) {
        this.speed = speed;
        // Update active button
        document.querySelectorAll('.speed-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.speed === speed);
        });
        // Restart tick timer with new speed
        if (this.running && !this.paused) {
            if (this.tickTimer) clearTimeout(this.tickTimer);
            this.scheduleTick();
        }
    },

    scheduleTick() {
        if (!this.running || this.paused) return;
        this.tickTimer = setTimeout(() => this.tick(), TICK_SPEEDS[this.speed]);
    },

    tick() {
        if (!this.running || this.paused || gameState.gameOver) return;

        // === Check if we can travel ===
        if (gameState.oxen <= 0) {
            logEntry("You have no oxen! You cannot continue. Game Over.", "danger");
            endGame(false);
            return;
        }

        // === Advance one day ===
        gameState.day++;

        // Calculate distance based on oxen (more oxen = slightly farther)
        const healthyOxen = gameState.oxen - gameState.sickOxen;
        const baseDistance = Math.floor(Math.random() * 25) + 35;
        const oxenBonus = Math.min(healthyOxen - 1, 3) * 5; // up to +15 for extra oxen
        const distance = Math.max(20, baseDistance + oxenBonus);

        gameState.distance += distance;
        gameState.food -= 5;

        // Small daily health decay
        const travelHealthMsg = applyHealthChange(-2);

        // === Check for landmark arrival ===
        let hitLandmark = false;
        for (let landmark of landmarks) {
            if (gameState.distance >= landmark.distance &&
                !gameState.visitedLandmarks.includes(landmark.name)) {
                gameState.visitedLandmarks.push(landmark.name);
                gameState.currentLandmark = landmark;
                hitLandmark = true;

                // Log the travel for this day
                logEntry(`Traveled ${distance} miles.`, "travel");

                // Pause and handle the landmark
                this.pause('landmark');
                handleLandmarkArrival(landmark);
                checkOxenHealth();
                checkGameState();
                updateDisplay();
                return;
            }
        }

        // === Roll for interactive encounter ===
        const encounter = rollInteractiveEncounter(gameState);
        if (encounter) {
            logEntry(`Traveled ${distance} miles.`, "travel");
            this.pause('encounter');
            showInteractiveEncounter(encounter);
            checkOxenHealth();
            checkGameState();
            updateDisplay();
            return;
        }

        // === Roll for passive event ===
        const event = rollPassiveEvent(gameState);
        let eventText = "";
        if (event) {
            const effectMsg = event.effect ? event.effect(gameState) : "";
            eventText = getPassiveEventText(event, gameState);
            if (effectMsg) eventText += effectMsg;
        }

        // === Log the day ===
        if (eventText) {
            logEntry(`Traveled ${distance} miles. ${eventText}`, "event");
        } else {
            logEntry(`Traveled ${distance} miles.`, "travel");
        }

        if (travelHealthMsg) {
            logEntry(travelHealthMsg.trim(), "health");
        }

        // === Check oxen health ===
        checkOxenHealth();

        // === Check game over / victory ===
        checkGameState();
        updateDisplay();

        // Schedule next tick
        this.scheduleTick();
    },

    togglePause() {
        if (this.paused && this.pauseReason === 'manual') {
            this.resume();
        } else if (!this.paused) {
            this.pause('manual');
        }
        // Don't allow resuming from event/landmark pauses via the pause button
    },

    updateControls() {
        const pauseBtn = document.getElementById('pauseBtn');
        if (!pauseBtn) return;

        if (!this.running) {
            pauseBtn.textContent = '▶ Start';
            pauseBtn.className = 'control-btn pause-btn paused';
        } else if (this.paused) {
            if (this.pauseReason === 'manual') {
                pauseBtn.textContent = '▶ Resume';
                pauseBtn.className = 'control-btn pause-btn paused';
            } else {
                pauseBtn.textContent = '⏸ Waiting...';
                pauseBtn.className = 'control-btn pause-btn waiting';
            }
        } else {
            pauseBtn.textContent = '⏸ Pause';
            pauseBtn.className = 'control-btn pause-btn running';
        }
    }
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

    choices.forEach((choice, i) => {
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
    restoreAutoTravelButtons();
    checkGameState();
    updateDisplay();

    // Resume auto-travel after a moment
    setTimeout(() => {
        if (!gameState.gameOver) {
            travelEngine.resume();
        }
    }, 1000);
}

// ============= MEDICINE USE =============

function useMedicine() {
    if (gameState.gameOver) return;
    if (gameState.medicine <= 0) {
        logEntry("You have no medicine left!", "warning");
        return;
    }

    const wasPaused = travelEngine.paused;
    if (!wasPaused) travelEngine.pause('action');

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

    // Resume if we paused it
    if (!wasPaused && !gameState.gameOver && !gameState.awaitingChoice) {
        setTimeout(() => travelEngine.resume(), 800);
    }
}

// ============= REST ACTION =============

function doRest() {
    if (gameState.gameOver) return;

    const wasPaused = travelEngine.paused;
    if (!wasPaused) travelEngine.pause('action');

    gameState.food -= 8;
    gameState.day++;

    const rankMsg = applyHealthChange(gameState.atFort ? 30 : 20);
    const location = gameState.atFort ? "at the fort" : "on the trail";
    logEntry(`Rested ${location}. Consumed 8 lbs of food.${rankMsg}`, "event");

    checkGameState();
    updateDisplay();

    if (!wasPaused && !gameState.gameOver && !gameState.awaitingChoice) {
        setTimeout(() => travelEngine.resume(), 800);
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

function restoreAutoTravelButtons() {
    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = `
        <button onclick="doRest()" class="action-btn">🛏️ Rest</button>
        <button onclick="hunt()" class="action-btn">🎯 Hunt</button>
        <button onclick="useMedicine()" id="medicineButton" class="action-btn" ${gameState.medicine <= 0 ? 'disabled' : ''}>💊 Medicine (${gameState.medicine})</button>
    `;
}

// Alias for backward compat with hunting/river
function restoreNormalButtons() {
    restoreAutoTravelButtons();
    // Resume auto-travel if not awaiting a choice
    if (!gameState.awaitingChoice && !gameState.gameOver) {
        setTimeout(() => travelEngine.resume(), 800);
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
            showMessage("Back on the trail...");
            restoreAutoTravelButtons();
            updateDisplay();
            // Resume auto-travel
            setTimeout(() => travelEngine.resume(), 800);
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

    showMessage(
        `You have reached the ${riverName}. The river is at a ${waterLevel} water level. The current today is ${currentStrength}. \n` +
        `How would you like to cross?`
    );

    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = `
        <button class="choice-button" onclick="riverChoice('ford')">Ford the River (Play mini-game)</button>
        <button class="choice-button" onclick="riverChoice('ferry')">Take the Ferry ($10, safer)</button>
        <button class="choice-button" onclick="riverChoice('wait')">Wait for Better Conditions (Uses time and food; current may change)</button>
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

        case 'ferry':
            gameState.day++;
            if (gameState.money >= 10) {
                gameState.money -= 10;
                const message =
                    `Took the ferry across. (${waterLevel} water, ${currentStrength} current) Safe but costly. 💰-$10`;

                gameState.atRiver = false;
                gameState.awaitingChoice = false;
                gameState.currentRiverName = null;
                gameState.currentStrength = null;

                logEntry(message, "event");
                showMessage(message);
                restoreAutoTravelButtons();
                checkGameState();
                updateDisplay();
                setTimeout(() => travelEngine.resume(), 800);
            } else {
                gameState.day--;
                showMessage("You don't have enough money for the ferry! You'll have to ford or wait.");
            }
            return;

        case 'wait':
            gameState.food -= 10;
            gameState.day += 2;

            const newCurrent = rollCurrentStrength();
            const improvedText =
                (newCurrent === "Weak") ? "Conditions look calmer now." :
                (newCurrent === "Moderate") ? "Conditions are a bit better." :
                "Still looks rough out there.";

            const waitMsg = `Waited for better conditions. -10 lbs food, +2 days. ${improvedText} The current is now ${newCurrent}.`;

            logEntry(waitMsg, "event");
            showMessage(
                `${waitMsg}\n` +
                `The river is at a ${waterLevel} water level. The current today is ${newCurrent}.`
            );

            checkGameState();
            updateDisplay();
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
    restoreAutoTravelButtons();
    checkGameState();
    updateDisplay();

    // Resume auto-travel
    setTimeout(() => {
        if (!gameState.gameOver) {
            travelEngine.resume();
        }
    }, 1000);
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
