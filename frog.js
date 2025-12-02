// === BOARD AYARLARI ===
var blockSize = 25;
var rows = 20;
var cols = 20;
var board, context;

// === KURBAĞA ===
var frogX, frogY;
var velocityX = 0;
var velocityY = 0;
var frogBody = [];

// === DÖNÜŞ BUFFER ===
var nextDirection = null;

// === SİNEK & BOMBA ===
var flyX, flyY;
var bombX, bombY;

// === SKOR, HIZ, DURUM ===
var score = 0;
var highScore = 0;
var speed = 7;           // başlangıç hızı
var moveDelay = 1000 / speed;  // hareket aralığı (ms)
var lastMoveTime = 0;
var gameOver = false;

// === SES ===
var eatSound = new Audio('https://cdn.pixabay.com/download/audio/2023/07/03/audio_1329b046a0.mp3?filename=pop-94319.mp3');
var loseSound = new Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_3a68a29574.mp3?filename=error-126627.mp3');

window.onload = function () {
    board = document.getElementById("board");
    board.height = rows * blockSize;
    board.width = cols * blockSize;
    context = board.getContext("2d");

    // Kaydedilmiş rekoru getir
    highScore = parseInt(localStorage.getItem("frogHighScore")) || 0;

    resetGame();
    document.addEventListener("keydown", changeDirection); // keydown anında tepki
    requestAnimationFrame(gameLoop);
};

// === YENİ OYUN BAŞLAT ===
function resetGame() {
    score = 0;
    speed = 7;
    moveDelay = 1000 / speed;
    frogBody = [];

    // Rastgele başlangıç pozisyonu
    frogX = Math.floor(Math.random() * cols) * blockSize;
    frogY = Math.floor(Math.random() * rows) * blockSize;
    frogBody.push([frogX, frogY]);

    placeFly();
    placeBomb();

    updateScoreUI();
}

// === ANA OYUN DÖNGÜSÜ ===
function gameLoop(timestamp) {
    if (gameOver) return;

    if (timestamp - lastMoveTime > moveDelay) {
        update();
        lastMoveTime = timestamp;
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// === OYUN GÜNCELLE ===
function update() {
    // Input buffer
    if (nextDirection) {
        velocityX = nextDirection.x;
        velocityY = nextDirection.y;
        nextDirection = null;
    }

    frogX += velocityX * blockSize;
    frogY += velocityY * blockSize;

    // Duvar kontrolü
    if (frogX < 0 || frogX >= cols * blockSize || frogY < 0 || frogY >= rows * blockSize) {
        loseGame("Kurbağa bataklıktan çıktı 😵");
        return;
    }

    // Gövde hareketi
    frogBody.unshift([frogX, frogY]);
    while (frogBody.length > score + 1) frogBody.pop();

    // Kendine çarpma
    for (let i = 1; i < frogBody.length; i++) {
        if (frogX === frogBody[i][0] && frogY === frogBody[i][1]) {
            loseGame("Kendi kuyruğunu yedin 😅");
            return;
        }
    }

    // Sinek yendi mi?
    if (frogX === flyX && frogY === flyY) {
        eatSound.play();
        score++;
        updateScoreUI();
        frogBody.push([flyX, flyY]);
        placeFly();
        placeBomb();

        // Hız arttır
        speed += 0.25;
        moveDelay = 1000 / speed;

        flashEffect();
    }

    // Bomba yenildiyse
    if (frogX === bombX && frogY === bombY) {
        loseGame("💣 Tuzak! Kurbağa zehirlendi 😵");
        return;
    }
}

// === ÇİZİM ===
function draw() {
    // Arka plan
    context.fillStyle = "#a9f7aa";
    context.fillRect(0, 0, board.width, board.height);

    // Sinek çiz
    context.fillStyle = "black";
    context.beginPath();
    context.arc(flyX + blockSize / 2, flyY + blockSize / 2, blockSize / 2.3, 0, 2 * Math.PI);
    context.fill();

    // Bomba çiz
    context.fillStyle = "red";
    context.beginPath();
    context.arc(bombX + blockSize / 2, bombY + blockSize / 2, blockSize / 2.3, 0, 2 * Math.PI);
    context.fill();

    // Kurbağa çiz
    context.shadowBlur = 6;
    context.shadowColor = "rgba(0,0,0,0.3)";
    let gradient = context.createLinearGradient(frogX, frogY, frogX + blockSize, frogY + blockSize);
    gradient.addColorStop(0, "#34d45a");
    gradient.addColorStop(1, "#179e36");
    context.fillStyle = gradient;
    for (let i = 0; i < frogBody.length; i++) {
        context.fillRect(frogBody[i][0], frogBody[i][1], blockSize, blockSize);
    }
}

// === SKOR GÜNCELLE ===
function updateScoreUI() {
    document.getElementById("score").innerText = `Skor: ${score} | Rekor: ${highScore}`;
}

// === YÖN DEĞİŞTİRME (BUFFER SİSTEMİ) ===
function changeDirection(e) {
    let newDir = null;
    if (e.code === "ArrowUp" && velocityY !== 1) newDir = { x: 0, y: -1 };
    else if (e.code === "ArrowDown" && velocityY !== -1) newDir = { x: 0, y: 1 };
    else if (e.code === "ArrowLeft" && velocityX !== 1) newDir = { x: -1, y: 0 };
    else if (e.code === "ArrowRight" && velocityX !== -1) newDir = { x: 1, y: 0 };
    if (newDir) nextDirection = newDir;
}

// === SİNEK VE BOMBA YERLEŞTİR ===
function placeFly() {
    do {
        flyX = Math.floor(Math.random() * cols) * blockSize;
        flyY = Math.floor(Math.random() * rows) * blockSize;
    } while (isOccupied(flyX, flyY) || (flyX === bombX && flyY === bombY));
}

function placeBomb() {
    do {
        bombX = Math.floor(Math.random() * cols) * blockSize;
        bombY = Math.floor(Math.random() * rows) * blockSize;
    } while (isOccupied(bombX, bombY) || (bombX === flyX && bombY === flyY));
}

// === KONTROL: BİR YER KURBAĞA TARAFINDAN DOLU MU ===
function isOccupied(x, y) {
    for (let i = 0; i < frogBody.length; i++) {
        if (frogBody[i][0] === x && frogBody[i][1] === y) return true;
    }
    return false;
}

// === FLAŞ EFEKTİ ===
function flashEffect() {
    let flash = 0.5;
    let flashInterval = setInterval(() => {
        context.fillStyle = `rgba(255,255,255,${flash})`;
        context.fillRect(0, 0, board.width, board.height);
        flash -= 0.1;
        if (flash <= 0) clearInterval(flashInterval);
    }, 50);
}

// === OYUN KAYBEDİLDİ ===
function loseGame(text) {
    gameOver = true;
    loseSound.play();

    // Rekor kontrol
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("frogHighScore", highScore);
        text += " 🎉 Yeni rekor!";
    }

    context.fillStyle = "rgba(0,0,0,0.6)";
    context.fillRect(0, 0, board.width, board.height);
    context.fillStyle = "#fff";
    context.font = "26px Poppins";
    context.textAlign = "center";
    context.fillText(text, board.width / 2, board.height / 2);

    document.getElementById("restartBtn").classList.add("show");
    updateScoreUI();
}

// === YENİDEN BAŞLAT ===
function restartGame() {
    location.reload();
}
function closeHowTo() {
    document.getElementById("howToPlay").style.display = "none";
}
