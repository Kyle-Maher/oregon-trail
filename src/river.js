// ============= RIVER CROSSING MINI-GAME =============

// River crossing mini-game state
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
    currentStrength: ''
};

function startRiverCrossingGame(waterLevel, currentStrength) {
    // Calculate difficulty based on conditions
    const waterScore = (waterLevel === "Deep") ? 2 : (waterLevel === "Medium") ? 1 : 0;
    const currentScore = (currentStrength === "Strong") ? 2 : (currentStrength === "Moderate") ? 1 : 0;
    riverState.difficulty = waterScore + currentScore;

    // Set wagon speed based on difficulty (faster = harder)
    riverState.wagonSpeed = 1.5 + (riverState.difficulty * 0.5);

    // Set safe zone size (smaller = harder)
    const zoneWidth = 100 - (riverState.difficulty * 15);
    const sceneWidth = document.getElementById('riverScene').offsetWidth;
    const centerPos = sceneWidth / 2;
    riverState.safeZoneStart = centerPos - (zoneWidth / 2);
    riverState.safeZoneEnd = centerPos + (zoneWidth / 2);

    riverState.waterLevel = waterLevel;
    riverState.currentStrength = currentStrength;

    // Hide hunting game, show river game
    document.getElementById('huntingGame').style.display = 'none';
    document.getElementById('riverGame').style.display = 'block';

    // Update river info
    document.getElementById('riverInfo').innerHTML = `
        <span class="river-info-label">Water Level:</span> ${waterLevel} | 
        <span class="river-info-label">Current:</span> ${currentStrength}
    `;

    // Set up the safe zone visually
    const crossingZone = document.getElementById('crossingZone');
    const isDangerous = riverState.difficulty >= 3;
    crossingZone.className = isDangerous ? 'safe-zone danger-zone' : 'safe-zone';
    crossingZone.textContent = isDangerous ? '!' : '✓';
    crossingZone.style.width = `${zoneWidth}px`;

    // Create current waves
    createCurrentWaves(currentStrength);

    // Flip to river game
    const flipInner = document.getElementById('flipInner');
    flipInner.classList.add('flipped');

    setTimeout(() => {
        startRiverAnimation();
    }, 800);
}

function createCurrentWaves(strength) {
    const currentIndicator = document.getElementById('currentIndicator');
    currentIndicator.innerHTML = '';

    const waveCount = strength === "Strong" ? 6 : strength === "Moderate" ? 4 : 2;

    for (let i = 0; i < waveCount; i++) {
        const wave = document.createElement('div');
        wave.className = 'current-wave';
        wave.style.top = `${Math.random() * 70 + 15}%`;
        wave.style.animationDelay = `${Math.random() * 2}s`;
        wave.style.animationDuration = strength === "Strong" ? '1.5s' :
                                       strength === "Moderate" ? '2s' : '2.5s';
        currentIndicator.appendChild(wave);
    }
}

function startRiverAnimation() {
    riverState.gameActive = true;
    riverState.wagonPosition = 80; // Start from left bank
    riverState.direction = 1;

    const wagon = document.getElementById('wagon');
    const crossButton = document.getElementById('crossButton');
    const riverStatus = document.getElementById('riverStatus');

    crossButton.disabled = false;
    riverStatus.textContent = "Watch the wagon move... Click CROSS when it's in the green zone!";

    function animate() {
        if (!riverState.gameActive) return;

        riverState.wagonPosition += riverState.wagonSpeed * riverState.direction;

        const sceneWidth = document.getElementById('riverScene').offsetWidth;
        const maxPosition = sceneWidth - 140; // Account for right bank

        if (riverState.wagonPosition >= maxPosition) {
            riverState.direction = -1;
        } else if (riverState.wagonPosition <= 80) {
            riverState.direction = 1;
        }

        wagon.style.left = `${riverState.wagonPosition}px`;

        riverState.animationFrame = requestAnimationFrame(animate);
    }

    animate();
}

function attemptCrossing() {
    if (!riverState.gameActive) return;

    riverState.gameActive = false;
    cancelAnimationFrame(riverState.animationFrame);

    const crossButton = document.getElementById('crossButton');
    crossButton.disabled = true;

    // Check if wagon is in safe zone
    const wagonCenter = riverState.wagonPosition + 30; // wagon is 60px wide

    const inSafeZone = wagonCenter >= riverState.safeZoneStart &&
                      wagonCenter <= riverState.safeZoneEnd;

    gameState.day++;

    let outcome;
    if (inSafeZone) {
        // Success - but still depends on difficulty
        const successChance = 0.9 - (riverState.difficulty * 0.1);
        if (Math.random() < successChance) {
            outcome = 'perfect';
        } else {
            outcome = 'good';
        }
    } else {
        // Outside safe zone - more likely to have problems
        const badChance = 0.3 + (riverState.difficulty * 0.15);
        if (Math.random() < badChance) {
            outcome = 'bad';
        } else {
            outcome = 'ok';
        }
    }

    endRiverCrossingGame(outcome);
}

function endRiverCrossingGame(outcome) {
    const riverStatus = document.getElementById('riverStatus');
    let message = "";
    let statusText = "";

    const waterLevel = riverState.waterLevel;
    const currentStrength = riverState.currentStrength;

    switch(outcome) {
        case 'perfect':
            statusText = "🎉 PERFECT CROSSING! 🎉";
            message = `Day ${gameState.day}: Excellent work! You timed it perfectly and crossed safely!\n` +
                     `(${waterLevel} water, ${currentStrength} current)\n` +
                     `Everyone is safe and dry!`;
            break;

        case 'good':
            const minorDamage = Math.floor(Math.random() * 5) + 3;
            gameState.health -= minorDamage;
            statusText = "✓ Safe Crossing";
            message = `Day ${gameState.day}: You crossed successfully but it was a bit rough.\n` +
                     `(${waterLevel} water, ${currentStrength} current)\n` +
                     `Minor fatigue from the effort. -${minorDamage}% health`;
            break;

        case 'ok':
            const fatigue = Math.floor(Math.random() * 8) + 8 + (riverState.difficulty * 2);
            gameState.health -= fatigue;
            statusText = "Challenging Crossing";
            message = `Day ${gameState.day}: That was difficult! The timing wasn't great.\n` +
                     `(${waterLevel} water, ${currentStrength} current)\n` +
                     `The crossing was exhausting. -${fatigue}% health`;
            break;

        case 'bad':
            const damage = Math.floor(Math.random() * 12) + 15 + (riverState.difficulty * 5);
            const foodLoss = Math.floor(Math.random() * 12) + 10 + (riverState.difficulty * 5);
            gameState.health -= damage;
            gameState.food -= foodLoss;
            statusText = "⚠️ DANGEROUS CROSSING! ⚠️";
            message = `Day ${gameState.day}: That was a disaster! You missed the safe zone badly!\n` +
                     `(${waterLevel} water, ${currentStrength} current)\n` +
                     `The current swept you downstream! Supplies were lost and everyone is shaken.\n` +
                     `-${damage}% health, -${foodLoss} lbs food`;
            break;
    }

    riverStatus.textContent = statusText;

    setTimeout(() => {
        gameState.atRiver = false;
        gameState.awaitingChoice = false;
        gameState.currentRiverName = null;
        gameState.currentStrength = null;

        const flipInner = document.getElementById('flipInner');
        flipInner.classList.remove('flipped');

        setTimeout(() => {
            showMessage(message);
            restoreNormalButtons();
            checkGameState();
            updateDisplay();
        }, 800);
    }, 2000);
}
