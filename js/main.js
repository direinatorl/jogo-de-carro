/**
 * Nitro Assault: Racing & Combat
 * Game Engine
 */

// --- CLASSES ---

class Projectile {
    constructor(x, y, angle, owner) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 12;
        this.owner = owner;
        this.life = 60; // Frames
        this.damage = 10;
    }

    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.life--;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.fillStyle = '#fbff00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fbff00';
        ctx.fillRect(-5, -2, 10, 4);
        ctx.restore();
    }
}

class Car {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.angle = 0;
        this.speed = 0;
        this.accel = 0.2;
        this.friction = 0.98;
        this.maxSpeed = 8;
        this.turnSpeed = 0.05;
        this.color = color;
        this.isPlayer = isPlayer;
        this.width = 40;
        this.height = 20;

        // Stats
        this.health = 100;
        this.maxHealth = 100;
        this.cooldown = 0;
        this.shootRate = 20;

        // Race Progress
        this.laps = 0;
        this.checkpointIndex = 0;
        this.progress = 0; // Total points visited
        this.finished = false;
    }

    update(controls, track, projectiles) {
        if (this.finished) {
            this.speed *= 0.95;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            return;
        }

        if (this.isPlayer) {
            // ... (rest of update)
            if (controls.forward) this.speed += this.accel;
            if (controls.reverse) this.speed -= this.accel;

            if (Math.abs(this.speed) > 0.1) {
                const reverse = this.speed < 0 ? -1 : 1;
                if (controls.left) this.angle -= this.turnSpeed * reverse;
                if (controls.right) this.angle += this.turnSpeed * reverse;
            }

            if (controls.shoot && this.cooldown <= 0) {
                this.shoot(projectiles);
            }
        } else if (track) {
            // Simple AI: Follow track points
            this.updateAI(track);

            // AI shooting
            if (Math.random() < 0.01 && this.cooldown <= 0) {
                this.shoot(projectiles);
            }
        }

        if (this.cooldown > 0) this.cooldown--;

        // Apply physics
        this.speed *= this.friction;
        if (Math.abs(this.speed) > this.maxSpeed) {
            this.speed = this.maxSpeed * (this.speed > 0 ? 1 : -1);
        }

        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Track Progress
        if (track) {
            this.trackProgress(track);
        }
    }

    trackProgress(track) {
        const nextIdx = (this.checkpointIndex + 1) % track.points.length;
        const target = track.points[nextIdx];
        const dist = Math.hypot(this.x - target.x, this.y - target.y);

        if (dist < 150) {
            this.checkpointIndex = nextIdx;
            this.progress++;
            if (nextIdx === 0) {
                this.laps++;
                if (this.isPlayer) {
                    document.getElementById('current-lap').innerText = Math.min(this.laps + 1, 3);
                }
                if (this.laps >= 3) {
                    this.finished = true;
                    onRaceFinish(this);
                }
            }
        }
    }

    shoot(projectiles) {
        const pX = this.x + Math.cos(this.angle) * (this.width / 2 + 10);
        const pY = this.y + Math.sin(this.angle) * (this.width / 2 + 10);
        projectiles.push(new Projectile(pX, pY, this.angle, this));
        this.cooldown = this.shootRate;
    }

    updateAI(track) {
        // Target next point in track
        if (!this.targetIndex) this.targetIndex = 0;
        const target = track.points[this.targetIndex];

        const dist = Math.hypot(target.x - this.x, target.y - this.y);
        if (dist < 50) {
            this.targetIndex = (this.targetIndex + 1) % track.points.length;
        }

        const angleToTarget = Math.atan2(target.y - this.y, target.x - this.x);

        // Soft steering towards target
        let angleDiff = angleToTarget - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        if (angleDiff > 0.1) this.angle += this.turnSpeed * 0.8;
        if (angleDiff < -0.1) this.angle -= this.turnSpeed * 0.8;

        this.speed += this.accel * 0.6;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Body Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-this.width / 2 + 2, -this.height / 2 + 2, this.width, this.height);

        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Cockpit (Neon look)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(-2, -6, 12, 12);

        // Headlights
        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#fff';
        ctx.fillRect(this.width / 2 - 5, -this.height / 2 + 2, 5, 4);
        ctx.fillRect(this.width / 2 - 5, this.height / 2 - 6, 5, 4);

        ctx.restore();
    }
}

class Track {
    constructor(canvasWidth, canvasHeight) {
        this.width = canvasWidth;
        this.height = canvasHeight;
        this.points = [];
        this.roadWidth = 120;
        this.generate();
    }

    generate() {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radiusX = this.width * 0.35;
        const radiusY = this.height * 0.35;
        const numPoints = 20;
        this.points = [];

        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const drift = Math.random() * 80 - 40;
            const x = centerX + Math.cos(angle) * (radiusX + drift);
            const y = centerY + Math.sin(angle) * (radiusY + drift);
            this.points.push({ x, y });
        }
    }

    draw(ctx) {
        if (this.points.length < 2) return;

        // Draw Grass/Exterior
        ctx.fillStyle = '#1a1a20';
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw Road Outline
        ctx.strokeStyle = '#333';
        ctx.lineWidth = this.roadWidth + 10;
        this.drawPath(ctx);

        // Draw Main Road
        ctx.strokeStyle = '#222';
        ctx.lineWidth = this.roadWidth;
        this.drawPath(ctx);

        // Draw Center Lines
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);
        this.drawPath(ctx);
        ctx.setLineDash([]);

        // Draw Start/Finish Line
        this.drawStartLine(ctx);
    }

    drawPath(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i <= this.points.length; i++) {
            const p = this.points[i % this.points.length];
            // Use quadratic curves for smoothness
            const prev = this.points[(i - 1) % this.points.length];
            const xc = (prev.x + p.x) / 2;
            const yc = (prev.y + p.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, xc, yc);
        }
        ctx.stroke();
    }

    drawStartLine(ctx) {
        const p1 = this.points[0];
        const p2 = this.points[1];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

        ctx.save();
        ctx.translate(p1.x, p1.y);
        ctx.rotate(angle + Math.PI / 2);

        ctx.fillStyle = '#fff';
        // Checkered pattern
        for (let i = -this.roadWidth / 2; i < this.roadWidth / 2; i += 10) {
            ctx.fillStyle = (i / 10) % 2 === 0 ? '#fff' : '#000';
            ctx.fillRect(i, -5, 10, 10);
        }
        ctx.restore();
    }
}

// --- CORE ENGINE ---

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const mainMenu = document.getElementById('main-menu');
const garageScreen = document.getElementById('garage-screen');
const hud = document.getElementById('hud');
const startBtn = document.getElementById('start-race-btn');
const garageBtn = document.getElementById('garage-btn');
const backBtn = document.getElementById('back-to-menu-btn');

// Game State
let player;
let track;
let opponents = [];
let projectiles = [];
let money = 0;
const controls = { forward: false, reverse: false, left: false, right: false, shoot: false };
let gameState = 'MENU'; // MENU, RACING, GARAGE, RESULTS

function init() {
    setupEventListeners();
    resize();

    // Create Instances
    track = new Track(canvas.width, canvas.height);
    player = new Car(track.points[0].x, track.points[0].y, '#ff0055', true);

    createOpponents();
    render();
}

function createOpponents() {
    opponents = [];
    const colors = ['#00f2ff', '#fbff00', '#00ff40', '#7a00ff'];
    for (let i = 0; i < 4; i++) {
        opponents.push(new Car(track.points[0].x, track.points[0].y, colors[i]));
    }
}

function setupEventListeners() {
    window.addEventListener('resize', resize);

    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') controls.forward = true;
        if (e.key === 'ArrowDown' || e.key === 's') controls.reverse = true;
        if (e.key === 'ArrowLeft' || e.key === 'a') controls.left = true;
        if (e.key === 'ArrowRight' || e.key === 'd') controls.right = true;
        if (e.key === ' ' || e.key === 'f') controls.shoot = true;
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'w') controls.forward = false;
        if (e.key === 'ArrowDown' || e.key === 's') controls.reverse = false;
        if (e.key === 'ArrowLeft' || e.key === 'a') controls.left = false;
        if (e.key === 'ArrowRight' || e.key === 'd') controls.right = false;
        if (e.key === ' ' || e.key === 'f') controls.shoot = false;
    });

    startBtn.addEventListener('click', () => setGameState('RACING'));
    garageBtn.addEventListener('click', () => setGameState('GARAGE'));
    backBtn.addEventListener('click', () => setGameState('MENU'));
}

function setGameState(state) {
    gameState = state;

    mainMenu.classList.add('hidden');
    garageScreen.classList.add('hidden');
    hud.classList.add('hidden');

    switch (state) {
        case 'MENU':
            mainMenu.classList.remove('hidden');
            break;
        case 'GARAGE':
            garageScreen.classList.remove('hidden');
            updateGarageUI();
            break;
        case 'RACING':
            hud.classList.remove('hidden');
            startRace();
            break;
    }
}

function startRace() {
    console.log("Corrida iniciada!");
    track.generate();
    projectiles = [];

    const startAngle = Math.atan2(track.points[1].y - track.points[0].y, track.points[1].x - track.points[0].x);

    player.x = track.points[0].x;
    player.y = track.points[0].y;
    player.angle = startAngle;
    player.speed = 0;
    player.health = player.maxHealth;
    player.laps = 0;
    player.checkpointIndex = 0;
    player.progress = 0;
    player.finished = false;

    document.getElementById('current-lap').innerText = '1';

    opponents.forEach((opp, i) => {
        const p = track.points[0];
        opp.x = p.x + (Math.random() * 40 - 20);
        opp.y = p.y + (Math.random() * 40 - 20);
        opp.angle = startAngle;
        opp.speed = 0;
        opp.targetIndex = 1;
        opp.health = opp.maxHealth;
        opp.laps = 0;
        opp.checkpointIndex = 0;
        opp.progress = 0;
        opp.finished = false;
    });
}

function onRaceFinish(car) {
    if (car.isPlayer) {
        const leaderboard = [player, ...opponents].sort((a, b) => b.progress - a.progress);
        const pos = leaderboard.indexOf(player) + 1;
        const reward = [1000, 500, 250, 100, 50][pos - 1] || 20;
        money += reward;

        setTimeout(() => {
            alert(`FIM DE CORRIDA! POSIÇÃO: ${pos}º - RECOMPENSA: $${reward}`);
            setGameState('MENU');
        }, 1000);
    }
}

function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
}

function render() {
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'RACING') {
        track.draw(ctx);

        player.update(controls, track, projectiles);
        player.draw(ctx);

        opponents.forEach(opp => {
            opp.update(null, track, projectiles);
            opp.draw(ctx);
        });

        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.update();
            p.draw(ctx);
            checkProjectileCollision(p, i);
            if (p.life <= 0) projectiles.splice(i, 1);
        }

        // Leaderboard & HUD
        const leaderboard = [player, ...opponents].sort((a, b) => b.progress - a.progress);
        const playerPos = leaderboard.indexOf(player) + 1;
        document.getElementById('current-pos').innerText = playerPos;
        document.getElementById('health-fill').style.width = (player.health / player.maxHealth * 100) + '%';

        if (player.health <= 0) {
            alert("VOCÊ FOI DESTRUÍDO!");
            setGameState('MENU');
        }
    }

    requestAnimationFrame(render);
}

function checkProjectileCollision(p, index) {
    const allCars = [player, ...opponents];
    for (let car of allCars) {
        if (car === p.owner || car.finished) continue;

        const dist = Math.hypot(p.x - car.x, p.y - car.y);
        if (dist < 20) {
            car.health -= p.damage;
            car.speed *= 0.8;
            projectiles.splice(index, 1);
            break;
        }
    }
}

function updateGarageUI() {
    const list = document.querySelector('.upgrades-list');
    list.innerHTML = `
        <div class="money-display">SALDO: $${money}</div>
        <div class="upgrade-item">
            <span>MOTOR (Velocidade)</span>
            <button onclick="buyUpgrade('speed')">$500</button>
        </div>
        <div class="upgrade-item">
            <span>BLINDAGEM (Vida)</span>
            <button onclick="buyUpgrade('armor')">$400</button>
        </div>
        <div class="upgrade-item">
            <span>ARMAMENTO (Dano)</span>
            <button onclick="buyUpgrade('weapon')">$600</button>
        </div>
    `;
}

// Global scope for HTML onclick
window.buyUpgrade = function (type) {
    let cost = 0;
    switch (type) {
        case 'speed': cost = 500; break;
        case 'armor': cost = 400; break;
        case 'weapon': cost = 600; break;
    }

    if (money >= cost) {
        money -= cost;
        switch (type) {
            case 'speed': player.maxSpeed += 1; player.accel += 0.05; break;
            case 'armor': player.maxHealth += 50; player.health = player.maxHealth; break;
            case 'weapon': /* Implement weapon damage increase in projectile */ break;
        }
        updateGarageUI();
        alert("Upgrade comprado!");
    } else {
        alert("Dinheiro insuficiente!");
    }
};

init();
