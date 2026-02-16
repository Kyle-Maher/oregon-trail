// ============= RIVER CROSSING MINI-GAME (IMPROVED) =============

let riverState = {
    wagonPosition: 0,
    wagonSpeed: 2,
    direction: 1,
    gameActive: false,
    animationFrame: null,
    safeZoneStart: 0,
    safeZoneEnd: 0,
    difficulty: 1,
    waterLevel: '',
    currentStrength: '',
    crossingAttempts: 0,
    perfectCrossings: 0,
    lastUpdateTime: 0
};

const RIVER_CONFIG = {
    WAGON_WIDTH: 60,
    WAGON_START_POS: 80,
    BASE_SPEED: 1.5,
    SPEED_INCREMENT: 0.5,
    MAX_ZONE_WIDTH: 100,
    MIN_ZONE_WIDTH: 40,
    ZONE_REDUCTION: 15,
    ANIMATION_DELAY: 800,
    END_GAME_DELAY: 2000
};

function startRiverCrossingGame(waterLevel, currentStrength) {
    const waterScore = (waterLevel === "Deep") ? 2 : (waterLevel === "Medium") ? 1 : 0;
    const currentScore = (currentStrength === "Strong") ? 2 : (currentStrength === "Moderate") ? 1 : 0;
    riverState.difficulty = waterScore + currentScore;

    riverState.wagonSpeed = RIVER_CONFIG.BASE_SPEED + (riverState.difficulty * RIVER_CONFIG.SPEED_INCREMENT);

    const zoneWidth = Math.max(
        RIVER_CONFIG.MIN_ZONE_WIDTH,
        RIVER_CONFIG.MAX_ZONE_WIDTH - (riverState.difficulty * RIVER_CONFIG.ZONE_REDUCTION)
    );

    const sceneWidth = document.getElementById('riverScene').offsetWidth;
    const centerPos = sceneWidth / 2;
    riverState.safeZoneStart = centerPos - (zoneWidth / 2);
    riverState.safeZoneEnd = centerPos + (zoneWidth / 2);

    riverState.waterLevel = waterLevel;
    riverState.currentStrength = currentStrength;
    riverState.crossingAttempts++;

    document.getElementById('huntingGame').style.display = 'none';
    document.getElementById('riverGame').style.display = 'block';

    const difficultyStars = '\u2605'.repeat(Math.max(1, riverState.difficulty));
    document.getElementById('riverInfo').innerHTML =
        '<span class="river-info-label">Water Level:</span> ' + waterLevel + ' | ' +
        '<span class="river-info-label">Current:</span> ' + currentStrength + ' | ' +
        '<span class="river-info-label">Difficulty:</span> ' + difficultyStars;

    const crossingZone = document.getElementById('crossingZone');
    const isDangerous = riverState.difficulty >= 3;
    crossingZone.className = isDangerous ? 'safe-zone danger-zone' : 'safe-zone';
    crossingZone.textContent = isDangerous ? '\u26A0\uFE0F' : '\u2713';
    crossingZone.style.width = zoneWidth + 'px';

    crossingZone.style.left = '50%';
    crossingZone.style.transform = 'translateX(-50%)';

    setTimeout(function() {
        var zoneRect = crossingZone.getBoundingClientRect();
        var sceneRect = document.getElementById('riverScene').getBoundingClientRect();
        riverState.safeZoneStart = zoneRect.left - sceneRect.left;
        riverState.safeZoneEnd = riverState.safeZoneStart + zoneRect.width;
    }, 100);

    createCurrentWaves(currentStrength);

    var flipInner = document.getElementById('flipInner');
    flipInner.classList.add('flipped');

    setTimeout(function() {
        startRiverAnimation();
    }, RIVER_CONFIG.ANIMATION_DELAY);
}

function createCurrentWaves(strength) {
    var currentIndicator = document.getElementById('currentIndicator');
    currentIndicator.innerHTML = '';

    var waveConfig = {
        "Strong": { count: 6, duration: '1.5s', opacity: 0.8 },
        "Moderate": { count: 4, duration: '2s', opacity: 0.6 },
        "Weak": { count: 2, duration: '2.5s', opacity: 0.4 }
    };

    var config = waveConfig[strength] || waveConfig["Weak"];

    for (var i = 0; i < config.count; i++) {
        var wave = document.createElement('div');
        wave.className = 'current-wave';
        wave.style.top = (Math.random() * 70 + 15) + '%';
        wave.style.animationDelay = (Math.random() * 2) + 's';
        wave.style.animationDuration = config.duration;
        wave.style.opacity = config.opacity;
        currentIndicator.appendChild(wave);
    }
}

function startRiverAnimation() {
    riverState.gameActive = true;
    riverState.wagonPosition = RIVER_CONFIG.WAGON_START_POS;
    riverState.direction = 1;
    riverState.lastUpdateTime = performance.now();

    var wagon = document.getElementById('wagon');
    var crossButton = document.getElementById('crossButton');
    var riverStatus = document.getElementById('riverStatus');

    crossButton.disabled = false;

    var instruction = riverState.difficulty >= 3
        ? "\u26A0\uFE0F DANGEROUS CONDITIONS! Click CROSS or hit SPACEBAR when the wagon is in the WARNING ZONE!"
        : "Click CROSS or hit SPACEBAR when the wagon is in the GREEN ZONE!";

    riverStatus.textContent = instruction;

    var handleKeyPress = function(e) {
        if (e.code === 'Space' && riverState.gameActive) {
            e.preventDefault();
            attemptCrossing();
        }
    };
    document.addEventListener('keydown', handleKeyPress);
    riverState.keyPressHandler = handleKeyPress;

    function animate(currentTime) {
        if (!riverState.gameActive) return;

        var deltaTime = currentTime - riverState.lastUpdateTime;
        riverState.lastUpdateTime = currentTime;

        var normalizedSpeed = (riverState.wagonSpeed * deltaTime) / 16.67;

        riverState.wagonPosition += normalizedSpeed * riverState.direction;

        var sceneWidth = document.getElementById('riverScene').offsetWidth;
        var maxPosition = sceneWidth - 140;

        if (riverState.wagonPosition >= maxPosition) {
            riverState.wagonPosition = maxPosition;
            riverState.direction = -1;
        } else if (riverState.wagonPosition <= RIVER_CONFIG.WAGON_START_POS) {
            riverState.wagonPosition = RIVER_CONFIG.WAGON_START_POS;
            riverState.direction = 1;
        }

        wagon.style.left = riverState.wagonPosition + 'px';

        var wagonCenter = riverState.wagonPosition + (RIVER_CONFIG.WAGON_WIDTH / 2);
        var inZone = wagonCenter >= riverState.safeZoneStart &&
                     wagonCenter <= riverState.safeZoneEnd;

        var zoneCenterPos = (riverState.safeZoneStart + riverState.safeZoneEnd) / 2;
        var distanceFromCenter = Math.abs(wagonCenter - zoneCenterPos);
        var zoneRadius = (riverState.safeZoneEnd - riverState.safeZoneStart) / 2;
        var proximityRatio = Math.max(0, 1 - (distanceFromCenter / zoneRadius));

        var crossingZone = document.getElementById('crossingZone');
        if (inZone) {
            crossingZone.style.opacity = '0.9';
            crossingZone.style.borderWidth = '4px';
            crossingZone.style.transform = 'translateX(-50%) scale(1.05)';
        } else {
            var pulseOpacity = 0.3 + (proximityRatio * 0.2);
            crossingZone.style.opacity = pulseOpacity.toString();
            crossingZone.style.borderWidth = '3px';
            crossingZone.style.transform = 'translateX(-50%) scale(1)';
        }

        crossButton.style.opacity = inZone ? '1' : '0.7';

        riverState.animationFrame = requestAnimationFrame(animate);
    }

    riverState.animationFrame = requestAnimationFrame(animate);
}

function attemptCrossing() {
    if (!riverState.gameActive) return;

    riverState.gameActive = false;
    cancelAnimationFrame(riverState.animationFrame);

    if (riverState.keyPressHandler) {
        document.removeEventListener('keydown', riverState.keyPressHandler);
        riverState.keyPressHandler = null;
    }

    var crossButton = document.getElementById('crossButton');
    crossButton.disabled = true;

    var wagonCenter = riverState.wagonPosition + (RIVER_CONFIG.WAGON_WIDTH / 2);

    var inSafeZone = wagonCenter >= riverState.safeZoneStart &&
                     wagonCenter <= riverState.safeZoneEnd;

    var zoneCenterPos = (riverState.safeZoneStart + riverState.safeZoneEnd) / 2;
    var distanceFromCenter = Math.abs(wagonCenter - zoneCenterPos);
    var zoneRadius = (riverState.safeZoneEnd - riverState.safeZoneStart) / 2;
    var centeringAccuracy = inSafeZone ? (1 - (distanceFromCenter / zoneRadius)) : 0;

    gameState.day++;

    var outcome;
    if (inSafeZone) {
        if (centeringAccuracy > 0.7) {
            outcome = 'perfect';
            riverState.perfectCrossings++;
        } else {
            outcome = 'good';
        }
    } else {
        var sceneWidth = document.getElementById('riverScene').offsetWidth;
        var missDistance = Math.max(0, distanceFromCenter - zoneRadius);
        var missRatio = missDistance / (sceneWidth / 2);
        var badChance = Math.min(0.8, (missRatio * 0.5) + (riverState.difficulty * 0.12));

        if (Math.random() < badChance) {
            outcome = 'bad';
        } else {
            outcome = 'ok';
        }
    }

    endRiverCrossingGame(outcome, centeringAccuracy);
}

function endRiverCrossingGame(outcome, accuracy) {
    accuracy = accuracy || 0;
    var riverStatus = document.getElementById('riverStatus');
    var message = "";
    var statusText = "";

    var waterLevel = riverState.waterLevel;
    var currentStrength = riverState.currentStrength;

    switch(outcome) {
        case 'perfect':
            statusText = "\uD83C\uDF89 PERFECT CROSSING! \uD83C\uDF89";
            message = "Excellent work! Timed it perfectly and crossed safely! " +
                     "(" + waterLevel + " water, " + currentStrength + " current) " +
                     "Everyone is safe and dry!";

            if (riverState.difficulty >= 3) {
                var morale = Math.floor(Math.random() * 5) + 5;
                var rankMsg = applyHealthChange(morale);
                message += " Bonus: Skill in dangerous conditions boosted morale! +" + morale + " health" + rankMsg;
            }
            break;

        case 'good':
            statusText = "\u2705 Safe Crossing";
            message = "Good job! Made it across safely. " +
                     "(" + waterLevel + " water, " + currentStrength + " current) " +
                     "No losses.";
            break;

        case 'ok':
            var baseFatigue1 = 8;
            var fatigue = Math.floor(Math.random() * 8) + baseFatigue1 + (riverState.difficulty * 2);
            var rankMsg1 = applyHealthChange(-fatigue);
            statusText = "\u26A0\uFE0F Challenging Crossing";
            message = "That was difficult! The timing wasn't great. " +
                     "(" + waterLevel + " water, " + currentStrength + " current) " +
                     "The crossing was exhausting. -" + fatigue + " health" + rankMsg1;
            break;

        case 'bad':
            var baseDamage = 15;
            var baseFoodLoss = 10;
            var damage = Math.floor(Math.random() * 12) + baseDamage + (riverState.difficulty * 5);
            var foodLoss = Math.floor(Math.random() * 12) + baseFoodLoss + (riverState.difficulty * 5);
            var rankMsg2 = applyHealthChange(-damage);
            gameState.food = Math.max(0, gameState.food - foodLoss);
            statusText = "\uD83D\uDCA5 DANGEROUS CROSSING! \uD83D\uDCA5";
            message = "That was a disaster! Missed the safe zone! " +
                     "(" + waterLevel + " water, " + currentStrength + " current) " +
                     "The current swept you downstream! -" + damage + " health, -" + foodLoss + " lbs food" + rankMsg2;
            break;
    }

    riverStatus.textContent = statusText;

    // Log the result
    logEntry(message, "event");

    setTimeout(function() {
        gameState.atRiver = false;
        gameState.awaitingChoice = false;
        gameState.currentRiverName = null;
        gameState.currentStrength = null;

        var flipInner = document.getElementById('flipInner');
        flipInner.classList.remove('flipped');

        setTimeout(function() {
            showMessage(message);
            restoreNormalButtons();
            checkGameState();
            updateDisplay();
        }, RIVER_CONFIG.ANIMATION_DELAY);
    }, RIVER_CONFIG.END_GAME_DELAY);
}

function getCrossingStats() {
    return {
        attempts: riverState.crossingAttempts,
        perfect: riverState.perfectCrossings,
        successRate: riverState.crossingAttempts > 0
            ? ((riverState.perfectCrossings / riverState.crossingAttempts) * 100).toFixed(1) + '%'
            : 'N/A'
    };
}

function resetRiverStats() {
    riverState.crossingAttempts = 0;
    riverState.perfectCrossings = 0;
}
