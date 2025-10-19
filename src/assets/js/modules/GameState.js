export const gameState = {
    gameStarted: false,
    gameTime: 0,
    gameEnded: false,
    allRingsCompleted: false,
    lastRingReached: false,
    lastRingTimer: 0,
    isFreeFlightMode: false,
    isFinishingFlight: false,
    finishTimeout: null,
    lastRingPassed: false,
    speedMultiplier: 1.0,
    baseSpeed: 0.15,
    
    startGame() {
        gameState.gameStarted = true;
        gameState.isFreeFlightMode = false;
        gameState.resetGame();
    },
    
    startFreeFlightMode() {
        gameState.gameStarted = true;
        gameState.isFreeFlightMode = true;
        gameState.speedMultiplier = 2.0;
        gameState.resetGame();
    },
    
    resetGame() {
        gameState.gameTime = 0;
        gameState.gameEnded = false;
        gameState.allRingsCompleted = false;
        gameState.lastRingReached = false;
        gameState.lastRingTimer = 0;
        gameState.isFinishingFlight = false;
        gameState.lastRingPassed = false;
        
        if (gameState.finishTimeout) {
            clearTimeout(gameState.finishTimeout);
            gameState.finishTimeout = null;
        }
        
        gameState.speedMultiplier = gameState.isFreeFlightMode ? 2.0 : 1.0;
    },
    
    updateGameTime(deltaTime = 0.016) {
        if ((gameState.gameStarted && !gameState.gameEnded) || gameState.isFinishingFlight) {
            gameState.gameTime += deltaTime;
        }
    },
    
    getFormattedTime() {
        const minutes = Math.floor(gameState.gameTime / 60);
        const seconds = Math.floor(gameState.gameTime % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    },
    
    backToMenu() {
        gameState.gameStarted = false;
        gameState.gameEnded = false;
        gameState.isFreeFlightMode = false;
    },
    
    endGame() {
        gameState.gameEnded = true;
        gameState.gameStarted = false;
    },
    
    increaseSpeed(amount) {
        gameState.speedMultiplier = Math.min(10.0, gameState.speedMultiplier + amount);
    },
    
    decreaseSpeed(amount) {
        gameState.speedMultiplier = Math.max(1.0, gameState.speedMultiplier - amount);
    },
    
    setSpeedFromRings(ringsPassedCount) {
        gameState.speedMultiplier = Math.min(10.0, 1.0 + ringsPassedCount * 0.3);
    },
    
    setAllRingsCompleted() {
        gameState.allRingsCompleted = true;
        gameState.isFinishingFlight = true;
    },
    
    setLastRingReached(reached) {
        gameState.lastRingReached = reached;
        gameState.lastRingTimer = 0;
    },
    
    updateLastRingTimer() {
        if (gameState.lastRingReached) {
            gameState.lastRingTimer += 0.016;
            return gameState.lastRingTimer >= 3.0;
        }
        return false;
    }
};