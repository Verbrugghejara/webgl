export function createUIManager() {
    let isDragging = false;
    
    let startScreen, gameArea, endScreen;
    let startButton, flyFreeButton, playAgainButton, backToMenuButton;
    let score, scoreLabel, speedDisplay, altitudeDisplay, timerDisplay, timerLabel, finalScore, finalSpeed;
    let speedThrottle, throttleFill, throttleHandle, throttleValue;
    let finishCountdown, countdownNumber;
    
    const setupElements = () => {
        // Screen elements
        startScreen = document.getElementById('startScreen');
        gameArea = document.getElementById('gameArea');
        endScreen = document.getElementById('endScreen');
        
        // Button elements
        startButton = document.getElementById('startButton');
        flyFreeButton = document.getElementById('flyFreeButton');
        playAgainButton = document.getElementById('playAgainButton');
        backToMenuButton = document.getElementById('backToMenuButton');
        
        // Display elements
        score = document.getElementById('score');
        scoreLabel = document.getElementById('scoreLabel');
        speedDisplay = document.getElementById('speed');
        altitudeDisplay = document.getElementById('altitude');
        timerDisplay = document.getElementById('timer');
        timerLabel = document.getElementById('timerLabel');
        finalScore = document.getElementById('finalScore');
        finalSpeed = document.getElementById('finalSpeed');
        
        // Throttle elements
        speedThrottle = document.getElementById('speedThrottle');
        throttleFill = document.getElementById('throttleFill');
        throttleHandle = document.getElementById('throttleHandle');
        throttleValue = document.getElementById('throttleValue');
        
        // Countdown elements
        finishCountdown = document.getElementById('finishCountdown');
        countdownNumber = document.getElementById('countdownNumber');
    };
    
    const connectEventHandlers = (callbacks) => {
        if (startButton) {
            startButton.addEventListener('click', callbacks.startGame);
        }
        
        if (flyFreeButton) {
            flyFreeButton.addEventListener('click', callbacks.startFreeFlightMode);
        }
        
        if (playAgainButton) {
            playAgainButton.addEventListener('click', callbacks.startGame);
        }
        
        if (backToMenuButton) {
            backToMenuButton.addEventListener('click', callbacks.backToStartScreen);
        }
    };
    
    const showStartScreen = () => {
        if (startScreen) startScreen.classList.remove('hidden');
        if (endScreen) endScreen.classList.add('hidden');
        if (gameArea) gameArea.classList.add('hidden');
        if (speedThrottle) speedThrottle.style.display = 'none';
    };
    
    const showGameArea = (isFreeFlightMode = false) => {
        if (startScreen) startScreen.classList.add('hidden');
        if (endScreen) endScreen.classList.add('hidden');
        if (gameArea) gameArea.classList.remove('hidden');
        
        if (isFreeFlightMode) {
            if (speedThrottle) speedThrottle.style.display = 'block';
            updateUIForFreeFlightMode();
        } else {
            if (speedThrottle) speedThrottle.style.display = 'none';
            updateUIForGameMode();
        }
    };
    
    const showEndScreen = (isSuccess = false, gameState, getRingsPassedCountFunc) => {
        if (gameArea) gameArea.classList.add('hidden');
        if (endScreen) endScreen.classList.remove('hidden');
        
        const endScreenTitle = endScreen?.querySelector('h1');
        const endScreenSubtitle = endScreen?.querySelector('.subtitle');
        
        const ringsPassedCount = getRingsPassedCountFunc();
        const timeString = gameState.getFormattedTime();
        
        if (endScreenTitle) {
            if (isSuccess) {
                endScreenTitle.textContent = "Gefeliciteerd!";
            } else {
                endScreenTitle.textContent = "Net Niet Gelukt!";
            }
        }
        
        if (endScreenSubtitle) {
            if (isSuccess) {
                endScreenSubtitle.textContent = `Alle 10 ringen gepasseerd in ${timeString}!`;
                endScreenSubtitle.style.color = "#ffff00";
            } else {
                endScreenSubtitle.textContent = `${ringsPassedCount} van de 10 ringen gehaald in ${timeString}!`;
                endScreenSubtitle.style.color = "#ffaa00";
            }
        }
        
        if (finalScore) {
            finalScore.textContent = `${ringsPassedCount}/10`;
        }
        
        if (finalSpeed) {
            finalSpeed.textContent = `${gameState.speedMultiplier.toFixed(1)}x`;
        }
    };
    
    const updateUIForGameMode = () => {
        if (scoreLabel) {
            scoreLabel.innerHTML = 'Ringen: <span id="score">0</span>/10';
            scoreLabel.style.color = 'white';
        }
        if (timerLabel) {
            timerLabel.innerHTML = 'Tijd: <span id="timer">00:00</span>';
        }
        
        score = document.getElementById('score');
        timerDisplay = document.getElementById('timer');
    };
    
    const updateUIForFreeFlightMode = () => {
        if (scoreLabel) {
            scoreLabel.textContent = "Free Flight Mode";
            scoreLabel.style.color = '#ff9900';
        }
        if (timerLabel) {
            timerLabel.textContent = "Controles: ";
        }
    };
    
    const updateScore = (ringsPassedCount) => {
        if (score) {
            score.textContent = ringsPassedCount;
        }
    };
    
    const updateTimerDisplay = (gameState) => {
        if (timerDisplay && !gameState.gameEnded) {
            if (gameState.isFreeFlightMode) {
                timerDisplay.textContent = "1=Dag | 2=Nacht | 3=Storm | +=Sneller | -=Langzamer";
                timerDisplay.style.color = '#ffaa00';
                timerDisplay.style.fontSize = '0.8em';
            } else {
                timerDisplay.textContent = gameState.getFormattedTime();
                timerDisplay.style.color = 'white';
                timerDisplay.style.fontSize = '1em';
            }
        }
    };
    
    const updateSpeedDisplay = (speedMultiplier) => {
        if (speedDisplay) {
            speedDisplay.textContent = speedMultiplier.toFixed(1);
            
            if (speedMultiplier > 5.0) {
                speedDisplay.style.color = '#ff6600';
            } else if (speedMultiplier > 2.0) {
                speedDisplay.style.color = '#ffff00';
            } else {
                speedDisplay.style.color = 'white';
            }
        }
    };
    
    const updateAltitudeDisplay = (altitude, maxAltitude) => {
        if (altitudeDisplay) {
            const currentAltitude = Math.max(0, Math.floor(altitude));
            altitudeDisplay.textContent = currentAltitude;
            
            const altitudePercentage = currentAltitude / maxAltitude;
            if (altitudePercentage > 0.9) {
                altitudeDisplay.style.color = '#ff3300';
            } else if (altitudePercentage > 0.7) {
                altitudeDisplay.style.color = '#ff6600';
            } else if (altitudePercentage > 0.4) {
                altitudeDisplay.style.color = '#ffff00';
            } else {
                altitudeDisplay.style.color = 'white';
            }
        }
    };
    
    const updateSpeedThrottle = (speedMultiplier) => {
        if (!throttleFill || !throttleHandle || !throttleValue) return;
        
        const minSpeed = 1.0;
        const maxSpeed = 10.0;
        const percentage = Math.min(Math.max((speedMultiplier - minSpeed) / (maxSpeed - minSpeed) * 100, 0), 100);
        
        throttleFill.style.height = `${percentage}%`;
        throttleHandle.style.bottom = `${percentage}%`;
        throttleValue.textContent = `${speedMultiplier.toFixed(1)}x`;
        
        if (speedMultiplier > 5.0) {
            throttleValue.style.color = '#ff6600';
            throttleValue.style.textShadow = '0 0 10px rgba(255, 102, 0, 0.8)';
        } else if (speedMultiplier > 2.0) {
            throttleValue.style.color = '#ffff00';
            throttleValue.style.textShadow = '0 0 10px rgba(255, 255, 0, 0.8)';
        } else {
            throttleValue.style.color = '#ffffff';
            throttleValue.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
        }
    };
    
    const initializeThrottle = (gameState) => {
        if (!speedThrottle) return;
        
        const handleThrottleInteraction = (event) => {
            const throttleTrack = speedThrottle.querySelector('.throttle-track');
            if (!throttleTrack) return;
            
            const rect = throttleTrack.getBoundingClientRect();
            const y = event.clientY - rect.top;
            const height = rect.height;
            
            let percentage = Math.max(0, Math.min(100, (height - y) / height * 100));
            
            const minSpeed = 1.0;
            const maxSpeed = 10.0;
            gameState.speedMultiplier = minSpeed + (percentage / 100) * (maxSpeed - minSpeed);
            gameState.speedMultiplier = Math.round(gameState.speedMultiplier * 10) / 10;
            
            updateSpeedThrottle(gameState.speedMultiplier);
        };
        
        speedThrottle.addEventListener('mousedown', (event) => {
            isDragging = true;
            handleThrottleInteraction(event);
            event.preventDefault();
        });
        
        document.addEventListener('mousemove', (event) => {
            if (isDragging) {
                handleThrottleInteraction(event);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        speedThrottle.addEventListener('touchstart', (event) => {
            isDragging = true;
            const touch = event.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            handleThrottleInteraction(mouseEvent);
            event.preventDefault();
        });
        
        document.addEventListener('touchmove', (event) => {
            if (isDragging && event.touches.length > 0) {
                const touch = event.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                handleThrottleInteraction(mouseEvent);
            }
        });
        
        document.addEventListener('touchend', () => {
            isDragging = false;
        });
    };
    
    const startFinishCountdown = () => {
        if (!finishCountdown || !countdownNumber) return;
        
        let count = 3;
        finishCountdown.classList.remove('hidden');
        
        const updateCountdown = () => {
            countdownNumber.textContent = count;
            countdownNumber.style.animation = 'none';
            countdownNumber.offsetHeight;
            countdownNumber.style.animation = 'numberPulse 1s ease-in-out';
            
            if (count > 1) {
                count--;
                setTimeout(updateCountdown, 1000);
            } else {
                setTimeout(() => {
                    if (finishCountdown) {
                        finishCountdown.classList.add('hidden');
                    }
                }, 1000);
            }
        };
        
        updateCountdown();
    };
    
    const hideFinishCountdown = () => {
        if (finishCountdown) {
            finishCountdown.classList.add('hidden');
        }
    };
    
    const updateLastRingTimer = (gameState) => {
        if (timerDisplay && gameState.lastRingReached) {
            const remainingTime = Math.max(0, 3 - gameState.lastRingTimer);
            if (gameState.lastRingPassed) {
                timerDisplay.textContent = `Eindigt in: ${remainingTime.toFixed(1)}s`;
                timerDisplay.style.color = '#00ff00';
            } else {
                timerDisplay.textContent = `Laatste kans: ${remainingTime.toFixed(1)}s`;
                timerDisplay.style.color = '#ff6600';
            }
            timerDisplay.style.fontSize = '1.2em';
        }
    };
    
    const resetUIStyles = () => {
        if (score) {
            score.style.color = 'white';
            score.style.fontSize = '1em';
            score.style.textShadow = 'none';
        }
        
        if (timerDisplay) {
            timerDisplay.style.fontSize = '1em';
            timerDisplay.style.color = 'white';
        }
        
        if (speedDisplay) speedDisplay.textContent = '1.0';
        if (altitudeDisplay) altitudeDisplay.textContent = '0';
    };
    
    setupElements();
    
    return {
        connectEventHandlers,
        showStartScreen,
        showGameArea,
        showEndScreen,
        updateScore,
        updateTimerDisplay,
        updateSpeedDisplay,
        updateAltitudeDisplay,
        updateSpeedThrottle,
        initializeThrottle,
        startFinishCountdown,
        hideFinishCountdown,
        updateLastRingTimer,
        resetUIStyles
    };
}