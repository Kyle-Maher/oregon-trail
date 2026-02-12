// ============= RIVER CROSSING MINI-GAME (IMPROVED) =============

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
    currentStrength: '',
    crossingAttempts: 0,
    perfectCrossings: 0,
    lastUpdateTime: 0
};

// Constants for better maintainability
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
    // Calculate difficulty based on conditions (0-4 scale)
    const waterScore = (waterLevel === "Deep") ? 2 : (waterLevel === "Medium") ? 1 : 0;
    const currentScore = (currentStrength === "Strong") ? 2 : (currentStrength === "Moderate") ? 1 : 0;
    riverState.difficulty = waterScore + currentScore;

    // Set wagon speed based on difficulty (faster = harder)
    // Speed range: 1.5 (easiest) to 3.5 (hardest)
    riverState.wagonSpeed = RIVER_CONFIG.BASE_SPEED + (riverState.difficulty * RIVER_CONFIG.SPEED_INCREMENT);

    // Set safe zone size (smaller = harder)
    // Zone width range: 100px (easiest) to 40px (hardest)
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

    // Hide hunting game, show river game
    document.getElementById('huntingGame').style.display = 'none';
    document.getElementById('riverGame').style.display = 'block';

    // Update river info with difficulty indicator
    const difficultyStars = '★'.repeat(Math.max(1, riverState.difficulty));
    document.getElementById('riverInfo').innerHTML = `
        <span class="river-info-label">Water Level:</span> ${waterLevel} | 
        <span class="river-info-label">Current:</span> ${currentStrength} | 
        <span class="river-info-label">Difficulty:</span> ${difficultyStars}
    `;

    // Set up the safe zone visually
    const crossingZone = document.getElementById('crossingZone');
    const isDangerous = riverState.difficulty >= 3;
    crossingZone.className = isDangerous ? 'safe-zone danger-zone' : 'safe-zone';
    crossingZone.textContent = isDangerous ? '⚠️' : '✓';
    crossingZone.style.width = `${zoneWidth}px`;
    
    // Force layout update and get actual position
    crossingZone.style.left = '50%';
    crossingZone.style.transform = 'translateX(-50%)';
    
    // Update safe zone bounds to match the visual element exactly
    setTimeout(() => {
        const zoneRect = crossingZone.getBoundingClientRect();
        const sceneRect = document.getElementById('riverScene').getBoundingClientRect();
        
        // Calculate zone position relative to scene
        riverState.safeZoneStart = zoneRect.left - sceneRect.left;
        riverState.safeZoneEnd = riverState.safeZoneStart + zoneRect.width;
        
        console.log('Safe Zone Setup:', {
            difficulty: riverState.difficulty,
            speed: riverState.wagonSpeed,
            zoneStart: riverState.safeZoneStart,
            zoneEnd: riverState.safeZoneEnd,
            zoneWidth: riverState.safeZoneEnd - riverState.safeZoneStart,
            visualWidth: zoneRect.width
        });
    }, 100);

    // Create current waves
    createCurrentWaves(currentStrength);

    // Flip to river game
    const flipInner = document.getElementById('flipInner');
    flipInner.classList.add('flipped');

    setTimeout(() => {
        startRiverAnimation();
    }, RIVER_CONFIG.ANIMATION_DELAY);
}

function createCurrentWaves(strength) {
    const currentIndicator = document.getElementById('currentIndicator');
    currentIndicator.innerHTML = '';

    const waveConfig = {
        "Strong": { count: 6, duration: '1.5s', opacity: 0.8 },
        "Moderate": { count: 4, duration: '2s', opacity: 0.6 },
        "Weak": { count: 2, duration: '2.5s', opacity: 0.4 }
    };

    const config = waveConfig[strength] || waveConfig["Weak"];

    for (let i = 0; i < config.count; i++) {
        const wave = document.createElement('div');
        wave.className = 'current-wave';
        wave.style.top = `${Math.random() * 70 + 15}%`;
        wave.style.animationDelay = `${Math.random() * 2}s`;
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

    const wagon = document.getElementById('wagon');
    const crossButton = document.getElementById('crossButton');
    const riverStatus = document.getElementById('riverStatus');

    crossButton.disabled = false;
    
    // Dynamic instruction based on difficulty
    const instruction = riverState.difficulty >= 3 
        ? "⚠️ DANGEROUS CONDITIONS! Click CROSS or hit the SPACEBAR when the wagon is in the WARNING ZONE!"
        : "Click CROSS or hit the SPACEBAR when the wagon is in the GREEN ZONE!";
    
    riverStatus.textContent = instruction;

    // Add keyboard support
    const handleKeyPress = (e) => {
        if (e.code === 'Space' && riverState.gameActive) {
            e.preventDefault();
            attemptCrossing();
        }
    };
    document.addEventListener('keydown', handleKeyPress);
    
    // Store handler for cleanup
    riverState.keyPressHandler = handleKeyPress;

    function animate(currentTime) {
        if (!riverState.gameActive) return;

        // Calculate delta time for smooth animation
        const deltaTime = currentTime - riverState.lastUpdateTime;
        riverState.lastUpdateTime = currentTime;
        
        // Normalize speed to be frame-rate independent
        const normalizedSpeed = (riverState.wagonSpeed * deltaTime) / 16.67; // 60fps baseline

        riverState.wagonPosition += normalizedSpeed * riverState.direction;

        const sceneWidth = document.getElementById('riverScene').offsetWidth;
        const maxPosition = sceneWidth - 140; // Account for right bank

        // Bounce at boundaries
        if (riverState.wagonPosition >= maxPosition) {
            riverState.wagonPosition = maxPosition;
            riverState.direction = -1;
        } else if (riverState.wagonPosition <= RIVER_CONFIG.WAGON_START_POS) {
            riverState.wagonPosition = RIVER_CONFIG.WAGON_START_POS;
            riverState.direction = 1;
        }

        wagon.style.left = `${riverState.wagonPosition}px`;
        
        // Visual feedback: check if wagon is currently in safe zone
        const wagonCenter = riverState.wagonPosition + (RIVER_CONFIG.WAGON_WIDTH / 2);
        const inZone = wagonCenter >= riverState.safeZoneStart &&
                      wagonCenter <= riverState.safeZoneEnd;
        
        // Calculate distance from center for gradient effect
        const zoneCenterPos = (riverState.safeZoneStart + riverState.safeZoneEnd) / 2;
        const distanceFromCenter = Math.abs(wagonCenter - zoneCenterPos);
        const zoneRadius = (riverState.safeZoneEnd - riverState.safeZoneStart) / 2;
        const proximityRatio = Math.max(0, 1 - (distanceFromCenter / zoneRadius));
        
        // Update safe zone appearance based on wagon position
        const crossingZone = document.getElementById('crossingZone');
        if (inZone) {
            crossingZone.style.opacity = '0.9';
            crossingZone.style.borderWidth = '4px';
            crossingZone.style.transform = 'translateX(-50%) scale(1.05)';
        } else {
            // Pulse effect when close but not in zone
            const pulseOpacity = 0.3 + (proximityRatio * 0.2);
            crossingZone.style.opacity = pulseOpacity.toString();
            crossingZone.style.borderWidth = '3px';
            crossingZone.style.transform = 'translateX(-50%) scale(1)';
        }
        
        // Update button state based on position
        crossButton.style.opacity = inZone ? '1' : '0.7';

        riverState.animationFrame = requestAnimationFrame(animate);
    }

    riverState.animationFrame = requestAnimationFrame(animate);
}

function attemptCrossing() {
    if (!riverState.gameActive) return;

    riverState.gameActive = false;
    cancelAnimationFrame(riverState.animationFrame);
    
    // Remove keyboard listener
    if (riverState.keyPressHandler) {
        document.removeEventListener('keydown', riverState.keyPressHandler);
        riverState.keyPressHandler = null;
    }

    const crossButton = document.getElementById('crossButton');
    crossButton.disabled = true;

    // Check if wagon is in safe zone
    const wagonCenter = riverState.wagonPosition + (RIVER_CONFIG.WAGON_WIDTH / 2);

    const inSafeZone = wagonCenter >= riverState.safeZoneStart &&
                      wagonCenter <= riverState.safeZoneEnd;

    // Calculate how well-centered the crossing was
    const zoneCenterPos = (riverState.safeZoneStart + riverState.safeZoneEnd) / 2;
    const distanceFromCenter = Math.abs(wagonCenter - zoneCenterPos);
    const zoneRadius = (riverState.safeZoneEnd - riverState.safeZoneStart) / 2;
    const centeringAccuracy = inSafeZone ? (1 - (distanceFromCenter / zoneRadius)) : 0;

    // Debug logging
    console.log('Crossing Attempt:', {
        attempt: riverState.crossingAttempts,
        wagonPosition: riverState.wagonPosition,
        wagonCenter: wagonCenter,
        safeZoneStart: riverState.safeZoneStart,
        safeZoneEnd: riverState.safeZoneEnd,
        inSafeZone: inSafeZone,
        centeringAccuracy: (centeringAccuracy * 100).toFixed(1) + '%',
        margin: inSafeZone ? 
            Math.min(wagonCenter - riverState.safeZoneStart, riverState.safeZoneEnd - wagonCenter).toFixed(1) :
            'OUTSIDE'
    });

    gameState.day++;

    let outcome;
    if (inSafeZone) {
        // Success! Quality depends on centering
        if (centeringAccuracy > 0.7) {
            outcome = 'perfect';
            riverState.perfectCrossings++;
        } else {
            outcome = 'good';
        }
    } else {
        // Outside safe zone - varies based on how badly you missed
        const sceneWidth = document.getElementById('riverScene').offsetWidth;
        const missDistance = Math.max(0, distanceFromCenter - zoneRadius);
        
        // Calculate how bad the miss was (0-1 scale)
        const missRatio = missDistance / (sceneWidth / 2);
        
        // Bad outcome more likely with bigger miss + higher difficulty
        const badChance = Math.min(0.8, (missRatio * 0.5) + (riverState.difficulty * 0.12));
        
        if (Math.random() < badChance) {
            outcome = 'bad';
        } else {
            outcome = 'ok';
        }
    }

    endRiverCrossingGame(outcome, centeringAccuracy);
}

function endRiverCrossingGame(outcome, accuracy = 0) {
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
                     `Everyone is safe and dry! No losses.\n` +
                     `Perfect crossings: ${riverState.perfectCrossings}/${riverState.crossingAttempts}`;
            
            // Bonus for perfect crossing on hard difficulty
            if (riverState.difficulty >= 3) {
                const morale = Math.floor(Math.random() * 5) + 5;
                const rankMsg = applyHealthChange(morale);
                message += `\n🌟 Bonus: Your skill in dangerous conditions boosted morale! +${morale} health${rankMsg}`;
            }
            break;

        case 'good':
            statusText = "✅ Safe Crossing";
            message = `Day ${gameState.day}: Good job! You made it across safely.\n` +
                     `(${waterLevel} water, ${currentStrength} current)\n` +
                     `The crossing was successful but a bit nerve-wracking. No losses.`;
            break;

        case 'ok': {
            const baseFatigue = 8;
            const fatigue = Math.floor(Math.random() * 8) + baseFatigue + (riverState.difficulty * 2);
            const rankMsg = applyHealthChange(-fatigue);
            statusText = "⚠️ Challenging Crossing";
            message = `Day ${gameState.day}: That was difficult! The timing wasn't great.\n` +
                     `(${waterLevel} water, ${currentStrength} current)\n` +
                     `The crossing was exhausting and some got wet. -${fatigue} health${rankMsg}`;
            break;
        }

        case 'bad': {
            const baseDamage = 15;
            const baseFoodLoss = 10;
            const damage = Math.floor(Math.random() * 12) + baseDamage + (riverState.difficulty * 5);
            const foodLoss = Math.floor(Math.random() * 12) + baseFoodLoss + (riverState.difficulty * 5);
            const rankMsg = applyHealthChange(-damage);
            gameState.food = Math.max(0, gameState.food - foodLoss);
            statusText = "💥 DANGEROUS CROSSING! 💥";
            message = `Day ${gameState.day}: That was a disaster! You missed the safe zone badly!\n` +
                     `(${waterLevel} water, ${currentStrength} current)\n` +
                     `The current swept you downstream! Supplies were lost and everyone is shaken.\n` +
                     `-${damage} health, -${foodLoss} lbs food${rankMsg}`;
            break;
        }
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
        }, RIVER_CONFIG.ANIMATION_DELAY);
    }, RIVER_CONFIG.END_GAME_DELAY);
}

// Helper function to get crossing statistics
function getCrossingStats() {
    return {
        attempts: riverState.crossingAttempts,
        perfect: riverState.perfectCrossings,
        successRate: riverState.crossingAttempts > 0 
            ? ((riverState.perfectCrossings / riverState.crossingAttempts) * 100).toFixed(1) + '%'
            : 'N/A'
    };
}

// Reset stats when starting new game
function resetRiverStats() {
    riverState.crossingAttempts = 0;
    riverState.perfectCrossings = 0;
}