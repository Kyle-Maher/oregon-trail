// ============= HUNTING MINI-GAME =============

const PATTERN_LENGTH = 5;

// Hunting mini-game state
let huntingState = {
    pattern: [],
    userPattern: [],
    currentIndex: 0,
    isShowingPattern: false,
    isPlayerTurn: false,
    gameActive: false
};

function hunt() {
    if (gameState.gameOver || gameState.awaitingChoice) return;

    // Hide river game, show hunting game
    document.getElementById('riverGame').style.display = 'none';
    document.getElementById('huntingGame').style.display = 'block';

    // Flip to hunting game
    const flipInner = document.getElementById('flipInner');
    flipInner.classList.add('flipped');

    // Start the hunting mini-game after flip animation completes
    setTimeout(() => {
        startHuntingGame();
    }, 800);
}

function startHuntingGame() {
    huntingState = {
        pattern: [],
        userPattern: [],
        currentIndex: 0,
        isShowingPattern: false,
        isPlayerTurn: false,
        gameActive: true
    };

    createGrid();
    generatePattern();

    document.getElementById('huntingInstructions').textContent = "Watch the pattern carefully!";
    document.getElementById('huntingStatus').textContent = "Get ready...";

    setTimeout(() => {
        showPattern();
    }, 1100);
}

function createGrid() {
    const gridContainer = document.getElementById('gridContainer');
    gridContainer.innerHTML = '';

    for (let i = 0; i < 25; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell disabled';
        cell.dataset.index = i;
        cell.addEventListener('click', () => handleCellClick(i));
        gridContainer.appendChild(cell);
    }
}

function generatePattern() {
    const usedIndices = new Set();

    while (huntingState.pattern.length < PATTERN_LENGTH) {
        const randomIndex = Math.floor(Math.random() * 25);
        if (!usedIndices.has(randomIndex)) {
            huntingState.pattern.push(randomIndex);
            usedIndices.add(randomIndex);
        }
    }
}

async function showPattern() {
    huntingState.isShowingPattern = true;
    document.getElementById('huntingStatus').textContent = "Watch carefully!";

    const cells = document.querySelectorAll('.grid-cell');

    for (let i = 0; i < huntingState.pattern.length; i++) {
        const cellIndex = huntingState.pattern[i];
        const cell = cells[cellIndex];

        cell.classList.add('lit');
        await new Promise(resolve => setTimeout(resolve, 200));
        cell.classList.remove('lit');
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    startPlayerTurn();
}

function startPlayerTurn() {
    huntingState.isShowingPattern = false;
    huntingState.isPlayerTurn = true;

    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => cell.classList.remove('disabled'));

    document.getElementById('huntingInstructions').textContent = "Now tap the boxes in the same order!";
    document.getElementById('huntingStatus').textContent = `Progress: 0 / ${PATTERN_LENGTH}`;
}

function handleCellClick(index) {
    if (!huntingState.isPlayerTurn || !huntingState.gameActive) return;

    const cells = document.querySelectorAll('.grid-cell');
    const cell = cells[index];

    const expectedIndex = huntingState.pattern[huntingState.userPattern.length];

    if (index === expectedIndex) {
        huntingState.userPattern.push(index);
        cell.classList.add('correct');

        document.getElementById('huntingStatus').textContent =
            `Progress: ${huntingState.userPattern.length} / ${PATTERN_LENGTH}`;

        if (huntingState.userPattern.length === PATTERN_LENGTH) {
            endHuntingGame(5);
        } else {
            setTimeout(() => {
                cell.classList.remove('correct');
            }, 300);
        }
    } else {
        cell.classList.add('wrong');
        huntingState.gameActive = false;

        const score = huntingState.userPattern.length;

        setTimeout(() => {
            endHuntingGame(score);
        }, 500);
    }
}

function endHuntingGame(score) {
    huntingState.isPlayerTurn = false;
    huntingState.gameActive = false;

    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => cell.classList.add('disabled'));

    let foodFound = 0;
    let message = "";

    gameState.day++;

    if (score < 3) {
        foodFound = Math.floor(Math.random() * 15) + 10;
        message = `Day ${gameState.day}: Poor hunt! You only got ${score} out of 5 correct. You brought back ${foodFound} lbs of food.`;
    } else if (score === 3) {
        foodFound = Math.floor(Math.random() * 20) + 30;
        message = `Day ${gameState.day}: Decent hunt! You got ${score} out of 5 correct. You brought back ${foodFound} lbs of food.`;
    } else if (score === 4) {
        foodFound = Math.floor(Math.random() * 20) + 40;
        message = `Day ${gameState.day}: Good hunt! You got ${score} out of 5 correct. You brought back ${foodFound} lbs of food.`;
    } else {
        foodFound = Math.floor(Math.random() * 20) + 60;
        message = `Day ${gameState.day}: Perfect hunt! You got all 5 correct! You brought back ${foodFound} lbs of food!`;
    }

    gameState.food += foodFound;

    document.getElementById('huntingStatus').textContent =
        `Score: ${score} / ${PATTERN_LENGTH}`;

    setTimeout(() => {
        const flipInner = document.getElementById('flipInner');
        flipInner.classList.remove('flipped');

        setTimeout(() => {
            showMessage(message);
            checkGameState();
            updateDisplay();
        }, 800);
    }, 1000);
}
