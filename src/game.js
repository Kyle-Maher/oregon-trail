// ============= TITLE SCREEN =============

function startGame() {
    const titleScreen = document.getElementById('titleScreen');
    const gameContainer = document.getElementById('gameContainer');
    
    // Fade out title screen
    titleScreen.style.animation = 'fadeOut 0.5s ease-out';
    
    setTimeout(() => {
        titleScreen.style.display = 'none';
        gameContainer.style.display = 'block';
        gameContainer.style.animation = 'fadeIn 0.5s ease-in';
        
        // Initialize the game
        initializeLandmarkMarkers();
        updateDisplay();
    }, 500);
}

// Allow starting with Enter key
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.getElementById('titleScreen').style.display !== 'none') {
            startGame();
        }
    });
});

// ============= CORE GAME STATE & LOGIC =============

// Game state
let gameState = {
    distance: 0,
    food: 100,
    health: 100,
    money: 50,
    oxen: 2,
    day: 1,
    gameOver: false,
    currentLandmark: null,
    atFort: false,
    atRiver: false,
    awaitingChoice: false,
    visitedLandmarks: [],
    riverWaterLevels: {},
    currentRiverName: null,
    currentStrength: null
};

const GOAL_DISTANCE = 2000;

// Landmarks along the trail
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

// Random events
const events = [
    { text: "The weather is clear. Good traveling conditions!", effect: null },
    { text: "You found some berries along the trail!", effect: () => { gameState.food += 5; } },
    { text: "One of your oxen is sick.", effect: () => { gameState.health -= 10; } },
    { text: "You met friendly travelers who shared supplies!", effect: () => { gameState.food += 10; } },
    { text: "A storm slowed your progress.", effect: () => { gameState.health -= 5; } },
    { text: "Wagon wheel broke. Repairs needed.", effect: () => { gameState.money -= 10; } },
    { text: "Beautiful day for traveling!", effect: null },
    { text: "You found a good camping spot.", effect: () => { gameState.health += 5; } },
    { text: "Trail is muddy and difficult.", effect: () => { gameState.health -= 3; } },
    { text: "Found abandoned supplies!", effect: () => { gameState.food += 15; gameState.money += 5; } }
];

const WATER_LEVELS = ["Shallow", "Medium", "Deep"];
const CURRENT_STRENGTHS = ["Weak", "Moderate", "Strong"];

// ============= UTILITY FUNCTIONS =============

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
    document.getElementById('messageBox').textContent = message;
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
    document.getElementById('health').textContent = `${gameState.health}%`;
    document.getElementById('money').textContent = `$${gameState.money}`;
    document.getElementById('oxen').textContent = gameState.oxen;

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
}

function restoreNormalButtons() {
    const buttons = document.getElementById('actionButtons');
    buttons.innerHTML = `
        <button onclick="travel()">Continue on Trail</button>
        <button onclick="rest()">Rest (Recover Health)</button>
        <button onclick="hunt()">Hunt for Food</button>
        <button onclick="trade()" id="tradeButton" disabled>Trade at Fort</button>
    `;
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
        showFortChoices(landmark.name);
    } else if (landmark.type === "river") {
        gameState.atRiver = true;
        gameState.currentRiverName = landmark.name;
        landmarkDiv.className = "landmark-indicator river-crossing";
        landmarkDiv.textContent = `🌊 ${landmark.name}`;
        showRiverChoices(landmark.name);
    } else if (landmark.type === "landmark") {
        landmarkDiv.className = "landmark-indicator landmark-choice";
        landmarkDiv.textContent = `ðŸ“ ${landmark.name}`;
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
    buttons.innerHTML = `
        <button class="choice-button" onclick="fortChoice('trade')">Trade for Supplies ($20 for 40 lbs food)</button>
        <button class="choice-button" onclick="fortChoice('medicine')">Buy Medicine ($15, restore health)</button>
        <button class="choice-button" onclick="fortChoice('ox')">Buy an Ox ($25)</button>
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
                message = `Day ${gameState.day}: You traded $20 for 40 lbs of food.`;
            } else {
                message = "You don't have enough money! You need $20.";
                gameState.day--;
            }
            break;
        case 'medicine':
            if (gameState.money >= 15) {
                gameState.money -= 15;
                gameState.health += 20;
                if (gameState.health > 100) gameState.health = 100;
                message = `Day ${gameState.day}: You bought medicine and recovered 20% health.`;
            } else {
                message = "You don't have enough money! You need $15.";
                gameState.day--;
            }
            break;
        case 'ox':
            if (gameState.money >= 25) {
                gameState.money -= 25;
                gameState.oxen += 1;
                message = `Day ${gameState.day}: You purchased a strong ox!`;
            } else {
                message = "You don't have enough money! You need $25.";
                gameState.day--;
            }
            break;
        case 'rest':
            gameState.health += 30;
            if (gameState.health > 100) gameState.health = 100;
            gameState.food -= 8;
            message = `Day ${gameState.day}: You rested at the fort and recovered 30% health. Your party consumed 8 lbs of food.`;
            break;
        case 'leave':
            gameState.atFort = false;
            gameState.awaitingChoice = false;
            message = `Day ${gameState.day}: You leave the fort and continue on the trail.`;
            restoreNormalButtons();
            updateDisplay();
            return;
    }

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
                    `Day ${gameState.day}: You took the ferry across. ` +
                    `(${waterLevel} water, ${currentStrength} current)\n` +
                    `Safe but costly. -$10`;

                gameState.atRiver = false;
                gameState.awaitingChoice = false;
                gameState.currentRiverName = null;
                gameState.currentStrength = null;

                showMessage(message);
                restoreNormalButtons();
                checkGameState();
                updateDisplay();
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

            showMessage(
                `Day ${gameState.day}: You waited for better conditions. -10 lbs food, +2 days.\n` +
                `${improvedText}\n` +
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
    buttons.innerHTML = choices.map(choice =>
        `<button class="choice-button" onclick="landmarkChoice('${landmarkName}', '${choice.action}')">${choice.text}</button>`
    ).join('');
}

function landmarkChoice(landmarkName, action) {
    gameState.day++;
    let message = "";

    switch(action) {
        case 'climb':
            if (Math.random() > 0.6) {
                gameState.health -= 5;
                message = `Day ${gameState.day}: The climb was tiring but the view was spectacular! -5% health`;
            } else {
                gameState.health -= 10;
                message = `Day ${gameState.day}: You slipped while climbing! Minor injuries. -10% health`;
            }
            break;
        case 'carve':
            gameState.food -= 5;
            gameState.day++;
            message = `Day ${gameState.day}: You carved your name for posterity! Other travelers will see your mark. -5 lbs food, +1 day`;
            break;
        case 'search':
            if (Math.random() > 0.5) {
                gameState.food += 10;
                gameState.money += 5;
                message = `Day ${gameState.day}: You found supplies left by previous travelers! +10 lbs food, +$5`;
            } else {
                message = `Day ${gameState.day}: You searched but found nothing of value.`;
            }
            break;
        case 'shortcut':
            if (Math.random() > 0.5) {
                gameState.distance += 40;
                gameState.health -= 15;
                message = `Day ${gameState.day}: The shortcut worked! You saved distance but it was exhausting. +40 miles, -15% health`;
            } else {
                gameState.health -= 25;
                gameState.food -= 10;
                message = `Day ${gameState.day}: The shortcut was a disaster! Very difficult terrain. -25% health, -10 lbs food`;
            }
            break;
        case 'safe':
            gameState.food -= 8;
            gameState.day++;
            message = `Day ${gameState.day}: You took the safer route. It took longer but everyone is okay. -8 lbs food, +1 day`;
            break;
        case 'drink':
            gameState.health += 15;
            if (gameState.health > 100) gameState.health = 100;
            message = `Day ${gameState.day}: The mineral water was refreshing! +15% health`;
            break;
        case 'fill':
            gameState.food += 5;
            message = `Day ${gameState.day}: You filled containers with water. This will help on the trail. +5 lbs food equivalent`;
            break;
        case 'push':
            if (Math.random() > 0.5) {
                gameState.distance += 30;
                gameState.health -= 15;
                gameState.food -= 10;
                message = `Day ${gameState.day}: You pushed through! Made good time but it was grueling. +30 miles, -15% health, -10 lbs food`;
            } else {
                gameState.health -= 25;
                gameState.oxen -= 1;
                message = `Day ${gameState.day}: Pushing too hard was a mistake! An ox died from exhaustion. -25% health, -1 ox`;
            }
            break;
        case 'slow':
            gameState.food -= 12;
            gameState.day += 2;
            gameState.health -= 5;
            message = `Day ${gameState.day}: Slow and steady. Everyone made it through safely. -12 lbs food, -5% health, +2 days`;
            break;
        case 'river':
            if (Math.random() > 0.6) {
                gameState.distance += 50;
                message = `Day ${gameState.day}: The river route was fast! Great choice. +50 miles`;
            } else {
                gameState.health -= 20;
                gameState.food -= 15;
                message = `Day ${gameState.day}: The river was treacherous! You made it but at great cost. -20% health, -15 lbs food`;
            }
            break;
        case 'mountain':
            gameState.food -= 15;
            gameState.day += 3;
            gameState.health -= 10;
            message = `Day ${gameState.day}: The mountain route was long but safe. -15 lbs food, -10% health, +3 days`;
            break;
        case 'explore':
            if (Math.random() > 0.6) {
                gameState.food += 8;
                message = `Day ${gameState.day}: You found some useful plants and berries! +8 lbs food`;
            } else {
                gameState.food -= 5;
                message = `Day ${gameState.day}: You explored but didn't find much. -5 lbs food`;
            }
            break;
        case 'rest':
            gameState.health += 15;
            if (gameState.health > 100) gameState.health = 100;
            gameState.food -= 8;
            message = `Day ${gameState.day}: You rested. +15% health, -8 lbs food`;
            break;
        case 'continue':
            message = `Day ${gameState.day}: You continue on the trail without delay.`;
            break;
    }

    gameState.awaitingChoice = false;
    showMessage(message);
    restoreNormalButtons();
    checkGameState();
    updateDisplay();
}

// ============= CORE ACTIONS =============

function travel() {
    if (gameState.gameOver || gameState.awaitingChoice) return;

    if (gameState.oxen <= 0) {
        showMessage("You have no oxen! You cannot continue. Game Over.");
        endGame(false);
        return;
    }

    if (gameState.atFort) gameState.atFort = false;

    const distance = Math.floor(Math.random() * 30) + 40;
    gameState.distance += distance;
    gameState.food -= 5;
    gameState.health -= 2;
    gameState.day++;

    const event = events[Math.floor(Math.random() * events.length)];
    let message = `Day ${gameState.day}: You traveled ${distance} miles. ${event.text}`;
    if (event.effect) event.effect();

    showMessage(message);
    checkForLandmark();
    checkGameState();
    updateDisplay();
}

function rest() {
    if (gameState.gameOver || gameState.awaitingChoice) return;

    const healthGain = gameState.atFort ? 30 : 20;
    gameState.health += healthGain;
    if (gameState.health > 100) gameState.health = 100;
    gameState.food -= 8;
    gameState.day++;

    const location = gameState.atFort ? "at the fort" : "on the trail";
    showMessage(`Day ${gameState.day}: You rested ${location} and recovered ${healthGain}% health. Your party consumed 8 lbs of food.`);
    checkGameState();
    updateDisplay();
}

function trade() {
    if (gameState.gameOver || !gameState.atFort || gameState.awaitingChoice) return;

    if (gameState.money < 20) {
        showMessage("You don't have enough money to trade!");
        return;
    }

    const choice = Math.random();
    gameState.day++;

    if (choice > 0.6) {
        gameState.money -= 20;
        gameState.food += 40;
        showMessage(`Day ${gameState.day}: You traded $20 for 40 lbs of food at the fort.`);
    } else if (choice > 0.3) {
        gameState.money -= 15;
        gameState.health += 15;
        if (gameState.health > 100) gameState.health = 100;
        showMessage(`Day ${gameState.day}: You bought medicine for $15 and restored some health.`);
    } else {
        gameState.money -= 25;
        gameState.oxen += 1;
        showMessage(`Day ${gameState.day}: You purchased a replacement ox for $25.`);
    }

    checkGameState();
    updateDisplay();
}

// ============= GAME STATE CHECKS =============

function checkGameState() {
    if (gameState.food <= 0) {
        showMessage("Your party has starved to death. Game Over.");
        endGame(false);
        return;
    }

    if (gameState.health <= 0) {
        showMessage("Your party has died from poor health. Game Over.");
        endGame(false);
        return;
    }

    if (gameState.distance >= GOAL_DISTANCE) {
        showMessage(`Congratulations! You made it to Oregon City in ${gameState.day} days! Your party survived the journey with ${gameState.food} lbs of food and ${gameState.health}% health remaining!`);
        endGame(true);
        return;
    }

    if (Math.random() < 0.05 && gameState.oxen > 0) {
        gameState.oxen--;
        showMessage(document.getElementById('messageBox').textContent + "\n\n🐂 One of your oxen died!");
    }
}

function endGame(victory) {
    gameState.gameOver = true;
    const buttons = document.getElementById('actionButtons');
    buttons.style.display = 'flex';
    buttons.innerHTML = '<button onclick="location.reload()">Play Again</button>';

    const messageBox = document.getElementById('messageBox');
    messageBox.className = victory ? 'message-box victory' : 'message-box game-over';
}

// ============= INITIALIZE =============

// Initialization now happens in startGame() function

