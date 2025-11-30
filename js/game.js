// ============================================
// LEAF & LEARN - Premium Plant Identification Game
// ============================================

// Colour palette
const COLORS = {
    darkGreen: 0x0d1f0d,
    forestGreen: 0x1a2e1a,
    sageGreen: 0x2d4a2d,
    leafGreen: 0x4a7c4a,
    mint: 0x7eb07e,
    cream: 0xf5f2eb,
    warmWhite: 0xfaf9f6,
    parchment: 0xebe5d9,
    terracotta: 0xc75d38,
    terracottaLight: 0xd97b5a,
    gold: 0xd4a84b,
    goldLight: 0xe6c575,
    success: 0x4caf50,
    error: 0xe53935
};

// ============================================
// GAME STATE MANAGER
// ============================================
class GameState {
    constructor() {
        this.load();
    }

    getDefaultState() {
        return {
            highScore: 0,
            currentStreak: 0,
            bestStreak: 0,
            plantStats: {},
            totalCorrect: 0,
            totalAnswered: 0,
            gamesPlayed: 0
        };
    }

    load() {
        try {
            const saved = localStorage.getItem('leafAndLearn');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.data = { ...this.getDefaultState(), ...parsed };
            } else {
                this.data = this.getDefaultState();
            }
        } catch (e) {
            console.warn('Failed to load game state:', e);
            this.data = this.getDefaultState();
        }

        PLANTS.forEach(plant => {
            if (!this.data.plantStats[plant.id]) {
                this.data.plantStats[plant.id] = {
                    timesShown: 0,
                    timesCorrect: 0,
                    masteryLevel: 0
                };
            }
        });
    }

    save() {
        try {
            localStorage.setItem('leafAndLearn', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }

    recordAnswer(plantId, correct) {
        const stats = this.data.plantStats[plantId];
        stats.timesShown++;
        this.data.totalAnswered++;

        if (correct) {
            stats.timesCorrect++;
            stats.masteryLevel = Math.min(3, stats.masteryLevel + 1);
            this.data.currentStreak++;
            this.data.totalCorrect++;
            if (this.data.currentStreak > this.data.bestStreak) {
                this.data.bestStreak = this.data.currentStreak;
            }
        } else {
            stats.masteryLevel = 0;
            this.data.currentStreak = 0;
        }

        this.save();
    }

    updateHighScore(score) {
        if (score > this.data.highScore) {
            this.data.highScore = score;
            this.save();
            return true;
        }
        return false;
    }

    incrementGamesPlayed() {
        this.data.gamesPlayed++;
        this.save();
    }

    getPlantsByMastery() {
        const weighted = [];
        PLANTS.forEach(plant => {
            const stats = this.data.plantStats[plant.id];
            const weight = 4 - stats.masteryLevel;
            for (let i = 0; i < weight; i++) {
                weighted.push(plant);
            }
        });
        return weighted;
    }

    getMasteredCount() {
        return PLANTS.filter(p => this.data.plantStats[p.id].masteryLevel >= 3).length;
    }
}

let gameState;

// ============================================
// UTILITY FUNCTIONS
// ============================================
function hexToString(hex) {
    return '#' + hex.toString(16).padStart(6, '0');
}

function createGradientTexture(scene, key, width, height, colors) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    colors.forEach((color, i) => {
        gradient.addColorStop(i / (colors.length - 1), hexToString(color));
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    scene.textures.addCanvas(key, canvas);
}

// ============================================
// BOOT SCENE
// ============================================
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Loading bar
        const barWidth = 280;
        const barHeight = 6;
        const barX = (width - barWidth) / 2;
        const barY = height / 2 + 60;

        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x2d4a2d, 1);
        progressBg.fillRoundedRect(barX, barY, barWidth, barHeight, 3);

        const progressBar = this.add.graphics();

        this.add.text(width / 2, height / 2 - 20, 'Leaf & Learn', {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '36px',
            color: '#f5f2eb',
            fontStyle: '600'
        }).setOrigin(0.5);

        const loadingText = this.add.text(width / 2, barY + 30, 'Loading plants...', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: '#4a7c4a'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xd4a84b, 1);
            progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 3);
            loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
        });

        // Load plant images
        PLANTS.forEach(plant => {
            console.log('Queuing load:', plant.id, plant.imageUrl);
            this.load.image(plant.id, plant.imageUrl);
        });

        this.load.on('loaderror', (file) => {
            console.error('Failed to load:', file.key, file.src);
        });

        this.load.on('complete', () => {
            console.log('All assets loaded');
            PLANTS.forEach(plant => {
                console.log('Texture exists:', plant.id, this.textures.exists(plant.id));
            });
        });
    }

    create() {
        gameState = new GameState();

        // Generate placeholder texture
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0x2d4a2d, 1);
        graphics.fillRect(0, 0, 300, 300);

        graphics.fillStyle(0x4a7c4a, 0.3);
        for (let i = 0; i < 5; i++) {
            graphics.fillCircle(50 + i * 50, 150, 30 + Math.random() * 20);
        }

        graphics.fillStyle(0x1a2e1a, 1);
        graphics.fillCircle(150, 150, 40);

        const leafShape = new Phaser.Geom.Polygon([
            150, 100,
            120, 140,
            130, 180,
            150, 200,
            170, 180,
            180, 140
        ]);
        graphics.fillStyle(0x4a7c4a, 1);
        graphics.fillPoints(leafShape.points, true);

        graphics.generateTexture('placeholder', 300, 300);
        graphics.destroy();

        // Create gradient textures
        createGradientTexture(this, 'cardGradient', 300, 250, [0xfaf9f6, 0xf5f2eb, 0xebe5d9]);
        createGradientTexture(this, 'buttonGradient', 320, 60, [0xd97b5a, 0xc75d38]);
        createGradientTexture(this, 'buttonSecondary', 320, 60, [0x4a7c4a, 0x2d4a2d]);

        // Transition to menu
        this.cameras.main.fadeOut(500, 13, 31, 13);
        this.time.delayedCall(500, () => {
            this.scene.start('MenuScene');
        });
    }
}

// ============================================
// MENU SCENE
// ============================================
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.cameras.main.setBackgroundColor(COLORS.forestGreen);

        // Decorative background elements
        this.createBackgroundArt();

        // Logo area
        const logoY = height * 0.18;

        // Decorative line above title
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(2, COLORS.gold, 0.6);
        lineGfx.lineBetween(width * 0.25, logoY - 35, width * 0.75, logoY - 35);

        // Title with shadow
        this.add.text(width / 2 + 2, logoY + 2, 'Leaf & Learn', {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '44px',
            color: '#0d1f0d',
            fontStyle: '700'
        }).setOrigin(0.5).setAlpha(0.3);

        this.add.text(width / 2, logoY, 'Leaf & Learn', {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '44px',
            color: '#f5f2eb',
            fontStyle: '700'
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, logoY + 45, 'Plant Identification', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '16px',
            color: '#7eb07e',
            letterSpacing: 3
        }).setOrigin(0.5);

        // Decorative line below subtitle
        lineGfx.lineBetween(width * 0.3, logoY + 75, width * 0.7, logoY + 75);

        // Stats panel
        this.createStatsPanel(width / 2, height * 0.42);

        // Buttons
        this.createPremiumButton(width / 2, height * 0.62, 'Start Quiz', COLORS.terracotta, () => {
            this.transitionTo('QuizScene');
        });

        this.createPremiumButton(width / 2, height * 0.74, 'Plant Collection', COLORS.sageGreen, () => {
            this.transitionTo('CollectionScene');
        });

        // Version/credits
        this.add.text(width / 2, height - 25, 'v1.0', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: '#2d4a2d'
        }).setOrigin(0.5);

        // Fade in
        this.cameras.main.fadeIn(500, 13, 31, 13);
    }

    createBackgroundArt() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const graphics = this.add.graphics();

        // Subtle radial gradient effect
        graphics.fillStyle(0x2d4a2d, 0.15);
        graphics.fillCircle(width * 0.8, height * 0.2, 200);
        graphics.fillCircle(width * 0.1, height * 0.7, 150);

        // Decorative leaf shapes
        graphics.fillStyle(0x4a7c4a, 0.08);
        this.drawLeafShape(graphics, 50, 100, 0.8, -0.3);
        this.drawLeafShape(graphics, width - 40, height - 150, 1.2, 0.5);
        this.drawLeafShape(graphics, width - 80, 200, 0.6, 0.2);
    }

    drawLeafShape(graphics, x, y, scale, rotation) {
        const points = [];
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const px = Math.sin(t * Math.PI) * 40 * scale;
            const py = (t - 0.5) * 120 * scale;
            const rx = px * Math.cos(rotation) - py * Math.sin(rotation);
            const ry = px * Math.sin(rotation) + py * Math.cos(rotation);
            points.push({ x: x + rx, y: y + ry });
        }
        graphics.fillPoints(points, true);
    }

    createStatsPanel(x, y) {
        const panelWidth = 280;
        const panelHeight = 140;

        // Panel background
        const panel = this.add.graphics();
        panel.fillStyle(0x0d1f0d, 0.5);
        panel.fillRoundedRect(x - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 16);
        panel.lineStyle(1, COLORS.gold, 0.3);
        panel.strokeRoundedRect(x - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 16);

        const stats = [
            { icon: '🏆', label: 'High Score', value: gameState.data.highScore },
            { icon: this.getStreakIcon(), label: 'Best Streak', value: gameState.data.bestStreak },
            { icon: '🌿', label: 'Mastered', value: `${gameState.getMasteredCount()}/${PLANTS.length}` }
        ];

        stats.forEach((stat, i) => {
            const rowY = y - 40 + i * 42;

            this.add.text(x - 100, rowY, stat.icon, {
                fontSize: '22px'
            }).setOrigin(0.5);

            this.add.text(x - 70, rowY, stat.label, {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                color: '#7eb07e'
            }).setOrigin(0, 0.5);

            this.add.text(x + 110, rowY, String(stat.value), {
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: '20px',
                color: '#f5f2eb',
                fontStyle: '600'
            }).setOrigin(1, 0.5);
        });
    }

    getStreakIcon() {
        const streak = gameState.data.bestStreak;
        if (streak >= 10) return '💥';
        if (streak >= 5) return '🔥';
        return '⚡';
    }

    createPremiumButton(x, y, text, color, callback) {
        const buttonWidth = 260;
        const buttonHeight = 56;

        const container = this.add.container(x, y);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(-buttonWidth/2 + 4, -buttonHeight/2 + 4, buttonWidth, buttonHeight, 14);
        container.add(shadow);

        // Button background
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 14);

        // Highlight
        bg.fillStyle(0xffffff, 0.15);
        bg.fillRoundedRect(-buttonWidth/2 + 4, -buttonHeight/2 + 4, buttonWidth - 8, buttonHeight/2 - 4, { tl: 10, tr: 10, bl: 0, br: 0 });

        container.add(bg);

        // Text
        const label = this.add.text(0, 0, text, {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: '600'
        }).setOrigin(0.5);
        container.add(label);

        // Interactivity
        container.setSize(buttonWidth, buttonHeight);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1.03,
                scaleY: 1.03,
                duration: 100,
                ease: 'Back.easeOut'
            });
        });

        container.on('pointerout', () => {
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        container.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scaleX: 0.97,
                scaleY: 0.97,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return container;
    }

    transitionTo(scene) {
        this.cameras.main.fade(400, 13, 31, 13);
        this.time.delayedCall(400, () => {
            this.scene.start(scene);
        });
    }
}

// ============================================
// QUIZ SCENE
// ============================================
class QuizScene extends Phaser.Scene {
    constructor() {
        super({ key: 'QuizScene' });
    }

    init() {
        this.currentQuestion = 0;
        this.totalQuestions = 10;
        this.score = 0;
        this.roundStats = { correct: 0, wrong: 0, plants: [] };
        this.currentPlant = null;
        this.answered = false;
        this.buttons = [];
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor(COLORS.forestGreen);

        // Background art
        this.createBackgroundArt();

        // Header
        this.createHeader();

        // Card area
        this.cardContainer = this.add.container(width / 2, height * 0.36);

        // Buttons area
        this.buttonsContainer = this.add.container(0, height * 0.66);

        // Feedback area
        this.feedbackContainer = this.add.container(width / 2, height * 0.88);
        this.feedbackContainer.setAlpha(0);

        // Continue prompt
        this.continueText = this.add.text(width / 2, height * 0.96, 'Tap anywhere to continue', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#4a7c4a',
            fontStyle: 'italic'
        }).setOrigin(0.5).setAlpha(0);

        // Particle emitter for celebrations
        this.createParticleEffects();

        // Fade in and start
        this.cameras.main.fadeIn(400, 13, 31, 13);
        this.time.delayedCall(400, () => this.showQuestion());
    }

    createBackgroundArt() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const graphics = this.add.graphics();

        graphics.fillStyle(0x2d4a2d, 0.1);
        graphics.fillCircle(width * 0.9, height * 0.3, 150);
        graphics.fillCircle(width * 0.1, height * 0.8, 120);
    }

    createHeader() {
        const width = this.cameras.main.width;

        // Header background
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x0d1f0d, 0.4);
        headerBg.fillRect(0, 0, width, 75);

        // Progress bar
        const barWidth = width - 40;
        const barX = 20;
        const barY = 18;

        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x2d4a2d, 1);
        progressBg.fillRoundedRect(barX, barY, barWidth, 8, 4);

        this.progressFill = this.add.graphics();

        // Question counter
        this.questionText = this.add.text(width / 2, barY + 4, '', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            color: '#0d1f0d',
            fontStyle: '700'
        }).setOrigin(0.5).setDepth(1);

        // Score
        this.scoreText = this.add.text(20, 45, `Score: ${this.score}`, {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '16px',
            color: '#f5f2eb',
            fontStyle: '500'
        });

        // Streak
        this.streakText = this.add.text(width - 20, 45, this.getStreakDisplay(), {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '16px',
            color: '#d4a84b',
            fontStyle: '500'
        }).setOrigin(1, 0);

        this.updateProgress();
    }

    getStreakDisplay() {
        const streak = gameState.data.currentStreak;
        if (streak >= 10) return `💥 ${streak}`;
        if (streak >= 5) return `🔥 ${streak}`;
        if (streak > 0) return `⚡ ${streak}`;
        return `⚡ 0`;
    }

    updateProgress() {
        const width = this.cameras.main.width;
        const progress = this.currentQuestion / this.totalQuestions;
        const barWidth = width - 40;

        this.progressFill.clear();
        this.progressFill.fillStyle(COLORS.gold, 1);
        this.progressFill.fillRoundedRect(20, 18, barWidth * progress, 8, 4);

        this.questionText.setText(`${this.currentQuestion}/${this.totalQuestions}`);
        this.questionText.setX(20 + barWidth * progress);

        if (progress > 0.05 && progress < 0.95) {
            this.questionText.setVisible(true);
        }
    }

    createParticleEffects() {
        // Create a simple particle texture
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(8, 8, 8);
        graphics.generateTexture('particle', 16, 16);
        graphics.destroy();

        this.successEmitter = this.add.particles(0, 0, 'particle', {
            speed: { min: 100, max: 200 },
            angle: { min: 250, max: 290 },
            scale: { start: 0.4, end: 0 },
            lifespan: 800,
            gravityY: 300,
            tint: [0x4caf50, 0x7eb07e, 0xd4a84b],
            emitting: false
        });
    }

    showQuestion() {
        this.answered = false;
        this.currentQuestion++;

        if (this.currentQuestion > this.totalQuestions) {
            this.endRound();
            return;
        }

        // Select plant with spaced repetition
        const weightedPlants = gameState.getPlantsByMastery();
        this.currentPlant = Phaser.Utils.Array.GetRandom(weightedPlants);
        this.roundStats.plants.push(this.currentPlant.id);

        // Update UI
        this.updateProgress();

        // Clear previous
        this.cardContainer.removeAll(true);
        this.buttonsContainer.removeAll(true);
        this.buttons = [];
        this.feedbackContainer.setAlpha(0);
        this.feedbackContainer.removeAll(true);
        this.continueText.setAlpha(0);

        // Create card
        this.createCard();

        // Create buttons
        this.createAnswerButtons();
    }

    createCard() {
        const cardWidth = 300;
        const cardHeight = 230;

        // Card shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(-cardWidth/2 + 6, -cardHeight/2 + 6, cardWidth, cardHeight, 16);
        this.cardContainer.add(shadow);

        // Card background
        const cardBg = this.add.graphics();
        cardBg.fillStyle(COLORS.cream, 1);
        cardBg.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 16);

        // Inner frame
        cardBg.lineStyle(3, COLORS.sageGreen, 0.3);
        cardBg.strokeRoundedRect(-cardWidth/2 + 8, -cardHeight/2 + 8, cardWidth - 16, cardHeight - 16, 12);

        this.cardContainer.add(cardBg);

        // Plant image
        let imageKey = this.currentPlant.id;
        if (!this.textures.exists(imageKey)) {
            imageKey = 'placeholder';
        }

        // Image mask/frame
        const maskShape = this.add.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRoundedRect(-130, -95, 260, 180, 10);
        this.cardContainer.add(maskShape);

        const image = this.add.image(0, -5, imageKey);
        const scale = Math.min(260 / image.width, 180 / image.height);
        image.setScale(scale);

        const mask = maskShape.createGeometryMask();
        image.setMask(mask);

        this.cardContainer.add(image);

        // Decorative corner accents
        const accent = this.add.graphics();
        accent.lineStyle(2, COLORS.gold, 0.5);
        accent.lineBetween(-cardWidth/2 + 12, -cardHeight/2 + 30, -cardWidth/2 + 12, -cardHeight/2 + 12);
        accent.lineBetween(-cardWidth/2 + 12, -cardHeight/2 + 12, -cardWidth/2 + 30, -cardHeight/2 + 12);
        accent.lineBetween(cardWidth/2 - 12, cardHeight/2 - 30, cardWidth/2 - 12, cardHeight/2 - 12);
        accent.lineBetween(cardWidth/2 - 12, cardHeight/2 - 12, cardWidth/2 - 30, cardHeight/2 - 12);
        this.cardContainer.add(accent);

        // Animate in
        this.cardContainer.setScale(0.8);
        this.cardContainer.setAlpha(0);
        this.tweens.add({
            targets: this.cardContainer,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 350,
            ease: 'Back.easeOut'
        });
    }

    createAnswerButtons() {
        const width = this.cameras.main.width;
        const answers = this.getAnswerOptions();
        Phaser.Utils.Array.Shuffle(answers);

        const buttonWidth = width - 32;
        const buttonHeight = 54;
        const spacing = 10;

        answers.forEach((answer, index) => {
            const y = index * (buttonHeight + spacing);
            const button = this.createAnswerButton(width / 2, y, buttonWidth, buttonHeight, answer);
            this.buttonsContainer.add(button);
            this.buttons.push(button);

            // Staggered entrance animation
            button.setAlpha(0);
            button.y = y + 40;
            this.tweens.add({
                targets: button,
                alpha: 1,
                y: y,
                duration: 250,
                delay: 200 + index * 60,
                ease: 'Back.easeOut'
            });
        });
    }

    getAnswerOptions() {
        const correct = {
            text: this.currentPlant.scientificName,
            isCorrect: true,
            plant: this.currentPlant
        };

        const otherPlants = PLANTS.filter(p => p.id !== this.currentPlant.id);
        Phaser.Utils.Array.Shuffle(otherPlants);

        const wrong = otherPlants.slice(0, 3).map(plant => ({
            text: plant.scientificName,
            isCorrect: false,
            plant: plant
        }));

        return [correct, ...wrong];
    }

    createAnswerButton(x, y, width, height, answer) {
        const button = this.add.container(x, y);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-width/2 + 3, -height/2 + 3, width, height, 12);
        button.add(shadow);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(COLORS.warmWhite, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
        bg.lineStyle(2, COLORS.sageGreen, 0.4);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);
        button.add(bg);

        // Text
        const label = this.add.text(0, 0, answer.text, {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: '#1a2e1a',
            fontStyle: '500',
            align: 'center',
            wordWrap: { width: width - 30 }
        }).setOrigin(0.5);
        button.add(label);

        button.setSize(width, height);
        button.setInteractive({ useHandCursor: true });

        button.answer = answer;
        button.bg = bg;
        button.shadow = shadow;
        button.label = label;
        button.width = width;
        button.height = height;

        button.on('pointerover', () => {
            if (!this.answered) {
                this.tweens.add({
                    targets: button,
                    scaleX: 1.02,
                    scaleY: 1.02,
                    duration: 100
                });
            }
        });

        button.on('pointerout', () => {
            if (!this.answered) {
                this.tweens.add({
                    targets: button,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            }
        });

        button.on('pointerdown', () => this.handleAnswer(button));

        return button;
    }

    handleAnswer(selectedButton) {
        if (this.answered) return;
        this.answered = true;

        const isCorrect = selectedButton.answer.isCorrect;
        gameState.recordAnswer(this.currentPlant.id, isCorrect);

        if (isCorrect) {
            this.score += 10;
            this.roundStats.correct++;

            // Celebration particles
            this.successEmitter.setPosition(selectedButton.x, this.buttonsContainer.y + selectedButton.y);
            this.successEmitter.explode(15);
        } else {
            this.roundStats.wrong++;
        }

        // Update displays
        this.scoreText.setText(`Score: ${this.score}`);
        this.streakText.setText(this.getStreakDisplay());

        // Animate buttons
        this.buttons.forEach(button => {
            button.disableInteractive();

            const w = button.width;
            const h = button.height;

            button.bg.clear();
            button.shadow.clear();

            if (button.answer.isCorrect) {
                button.bg.fillStyle(COLORS.success, 1);
                button.bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
                button.label.setColor('#ffffff');

                // Pulse animation for correct
                this.tweens.add({
                    targets: button,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 150,
                    yoyo: true,
                    repeat: 1
                });
            } else if (button === selectedButton) {
                button.bg.fillStyle(COLORS.error, 1);
                button.bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
                button.label.setColor('#ffffff');

                // Shake animation for wrong
                this.tweens.add({
                    targets: button,
                    x: button.x + 8,
                    duration: 50,
                    yoyo: true,
                    repeat: 3
                });
            } else {
                button.bg.fillStyle(0xcccccc, 0.5);
                button.bg.fillRoundedRect(-w/2, -h/2, w, h, 12);
                button.label.setColor('#888888');
                button.setAlpha(0.6);
            }
        });

        // Show feedback
        this.showFeedback(isCorrect);

        // Continue prompt
        this.tweens.add({
            targets: this.continueText,
            alpha: 1,
            duration: 300,
            delay: 500
        });

        // Input to continue
        this.input.once('pointerdown', () => {
            if (this.advanceTimer) this.advanceTimer.remove();
            this.showQuestion();
        });

        // Auto-advance
        this.advanceTimer = this.time.delayedCall(3500, () => {
            this.showQuestion();
        });
    }

    showFeedback(isCorrect) {
        const width = this.cameras.main.width;

        // Feedback panel
        const panelWidth = width - 24;
        const panelHeight = 70;

        const panel = this.add.graphics();
        panel.fillStyle(isCorrect ? COLORS.success : COLORS.terracotta, 0.95);
        panel.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 12);
        this.feedbackContainer.add(panel);

        // Icon and text
        const icon = isCorrect ? '✓' : '✗';
        const prefix = isCorrect ? '' : `${this.currentPlant.scientificName}\n`;

        this.add.text(-panelWidth/2 + 20, 0, icon, {
            fontSize: '28px',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        this.feedbackContainer.add(this.feedbackContainer.list[this.feedbackContainer.list.length - 1]);

        const mnemonicText = this.add.text(-panelWidth/2 + 55, 0, `💡 ${this.currentPlant.mnemonic}`, {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#ffffff',
            wordWrap: { width: panelWidth - 80 }
        }).setOrigin(0, 0.5);
        this.feedbackContainer.add(mnemonicText);

        // Animate in
        this.feedbackContainer.setAlpha(0);
        this.feedbackContainer.y += 20;
        this.tweens.add({
            targets: this.feedbackContainer,
            alpha: 1,
            y: this.feedbackContainer.y - 20,
            duration: 300,
            ease: 'Back.easeOut'
        });
    }

    endRound() {
        const isNewHighScore = gameState.updateHighScore(this.score);
        gameState.incrementGamesPlayed();

        this.cameras.main.fade(400, 13, 31, 13);
        this.time.delayedCall(400, () => {
            this.scene.start('ResultsScene', {
                score: this.score,
                correct: this.roundStats.correct,
                wrong: this.roundStats.wrong,
                isNewHighScore: isNewHighScore
            });
        });
    }
}

// ============================================
// RESULTS SCENE
// ============================================
class ResultsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ResultsScene' });
    }

    init(data) {
        this.roundData = data;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor(COLORS.forestGreen);

        // Background
        this.createBackgroundArt();

        // Title
        const titleY = height * 0.1;
        const titleText = this.roundData.isNewHighScore ? 'New High Score!' : 'Round Complete';

        if (this.roundData.isNewHighScore) {
            // Trophy icon
            this.add.text(width / 2, titleY - 5, '🏆', {
                fontSize: '48px'
            }).setOrigin(0.5);
        }

        this.add.text(width / 2, titleY + (this.roundData.isNewHighScore ? 40 : 0), titleText, {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '32px',
            color: '#f5f2eb',
            fontStyle: '700'
        }).setOrigin(0.5);

        // Score display
        const scoreY = height * 0.28;

        this.add.text(width / 2, scoreY, String(this.roundData.score), {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '80px',
            color: '#d4a84b',
            fontStyle: '700'
        }).setOrigin(0.5);

        this.add.text(width / 2, scoreY + 50, 'points', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '18px',
            color: '#7eb07e'
        }).setOrigin(0.5);

        // Stats panel
        this.createStatsPanel(width / 2, height * 0.52);

        // Buttons
        this.createPremiumButton(width / 2, height * 0.76, 'Play Again', COLORS.terracotta, () => {
            this.transitionTo('QuizScene');
        });

        this.createPremiumButton(width / 2, height * 0.86, 'Main Menu', COLORS.sageGreen, () => {
            this.transitionTo('MenuScene');
        });

        this.cameras.main.fadeIn(400, 13, 31, 13);

        // Celebration particles for high score
        if (this.roundData.isNewHighScore) {
            this.createCelebration();
        }
    }

    createBackgroundArt() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const graphics = this.add.graphics();

        graphics.fillStyle(0x2d4a2d, 0.1);
        graphics.fillCircle(width * 0.85, height * 0.15, 180);
        graphics.fillCircle(width * 0.15, height * 0.85, 140);
    }

    createStatsPanel(x, y) {
        const panelWidth = 300;
        const panelHeight = 160;

        const panel = this.add.graphics();
        panel.fillStyle(0x0d1f0d, 0.5);
        panel.fillRoundedRect(x - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 16);
        panel.lineStyle(1, COLORS.gold, 0.2);
        panel.strokeRoundedRect(x - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 16);

        const accuracy = Math.round((this.roundData.correct / 10) * 100);
        const streakIcon = gameState.data.currentStreak >= 10 ? '💥' :
                          gameState.data.currentStreak >= 5 ? '🔥' : '⚡';

        const stats = [
            { label: 'Correct', value: `${this.roundData.correct}/10`, color: '#4caf50' },
            { label: 'Accuracy', value: `${accuracy}%`, color: '#f5f2eb' },
            { label: 'Current Streak', value: `${streakIcon} ${gameState.data.currentStreak}`, color: '#d4a84b' },
            { label: 'Plants Mastered', value: `${gameState.getMasteredCount()}/${PLANTS.length}`, color: '#7eb07e' }
        ];

        stats.forEach((stat, i) => {
            const rowY = y - 55 + i * 35;

            this.add.text(x - 120, rowY, stat.label, {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                color: '#7eb07e'
            }).setOrigin(0, 0.5);

            this.add.text(x + 120, rowY, stat.value, {
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: '18px',
                color: stat.color,
                fontStyle: '600'
            }).setOrigin(1, 0.5);
        });
    }

    createPremiumButton(x, y, text, color, callback) {
        const buttonWidth = 240;
        const buttonHeight = 50;

        const container = this.add.container(x, y);

        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(-buttonWidth/2 + 3, -buttonHeight/2 + 3, buttonWidth, buttonHeight, 12);
        container.add(shadow);

        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 12);
        bg.fillStyle(0xffffff, 0.12);
        bg.fillRoundedRect(-buttonWidth/2 + 3, -buttonHeight/2 + 3, buttonWidth - 6, buttonHeight/2 - 3, { tl: 9, tr: 9, bl: 0, br: 0 });
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '18px',
            color: '#ffffff',
            fontStyle: '600'
        }).setOrigin(0.5);
        container.add(label);

        container.setSize(buttonWidth, buttonHeight);
        container.setInteractive({ useHandCursor: true });

        container.on('pointerover', () => {
            this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 100 });
        });

        container.on('pointerout', () => {
            this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 100 });
        });

        container.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scaleX: 0.97,
                scaleY: 0.97,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return container;
    }

    createCelebration() {
        const width = this.cameras.main.width;

        // Create particle texture
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0xffffff, 1);
        graphics.fillCircle(6, 6, 6);
        graphics.generateTexture('confetti', 12, 12);
        graphics.destroy();

        const emitter = this.add.particles(width / 2, -20, 'confetti', {
            speed: { min: 100, max: 200 },
            angle: { min: 80, max: 100 },
            scale: { start: 0.5, end: 0 },
            lifespan: 2000,
            gravityY: 150,
            tint: [0xd4a84b, 0x4caf50, 0xc75d38, 0x7eb07e],
            frequency: 50,
            quantity: 2
        });

        this.time.delayedCall(2000, () => {
            emitter.stop();
        });
    }

    transitionTo(scene) {
        this.cameras.main.fade(400, 13, 31, 13);
        this.time.delayedCall(400, () => {
            this.scene.start(scene);
        });
    }
}

// ============================================
// COLLECTION SCENE
// ============================================
class CollectionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'CollectionScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.cameras.main.setBackgroundColor(COLORS.forestGreen);

        // Header
        this.createHeader();

        // Scrollable plant cards
        const startY = 100;
        const cardHeight = 120;
        const spacing = 12;

        PLANTS.forEach((plant, index) => {
            const y = startY + index * (cardHeight + spacing);
            this.createPlantCard(width / 2, y, plant);
        });

        this.cameras.main.fadeIn(400, 13, 31, 13);
    }

    createHeader() {
        const width = this.cameras.main.width;

        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x0d1f0d, 0.5);
        headerBg.fillRect(0, 0, width, 80);

        // Back button
        const backBtn = this.add.container(50, 40);

        const backBg = this.add.graphics();
        backBg.fillStyle(COLORS.sageGreen, 0.8);
        backBg.fillRoundedRect(-35, -18, 70, 36, 8);
        backBtn.add(backBg);

        const backText = this.add.text(0, 0, '← Back', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: '#f5f2eb',
            fontStyle: '500'
        }).setOrigin(0.5);
        backBtn.add(backText);

        backBtn.setSize(70, 36);
        backBtn.setInteractive({ useHandCursor: true });

        backBtn.on('pointerdown', () => {
            this.cameras.main.fade(400, 13, 31, 13);
            this.time.delayedCall(400, () => {
                this.scene.start('MenuScene');
            });
        });

        // Title
        this.add.text(width / 2, 30, 'Plant Collection', {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '24px',
            color: '#f5f2eb',
            fontStyle: '600'
        }).setOrigin(0.5);

        const masteredCount = gameState.getMasteredCount();
        this.add.text(width / 2, 55, `${masteredCount}/${PLANTS.length} Mastered`, {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#7eb07e'
        }).setOrigin(0.5);
    }

    createPlantCard(x, y, plant) {
        const width = this.cameras.main.width - 24;
        const height = 115;
        const stats = gameState.data.plantStats[plant.id];
        const isMastered = stats.masteryLevel >= 3;

        const container = this.add.container(x, y);

        // Card shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-width/2 + 4, -height/2 + 4, width, height, 14);
        container.add(shadow);

        // Card background
        const bg = this.add.graphics();
        bg.fillStyle(COLORS.cream, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 14);

        // Border
        if (isMastered) {
            bg.lineStyle(3, COLORS.gold, 1);
        } else {
            bg.lineStyle(2, COLORS.sageGreen, 0.3);
        }
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 14);
        container.add(bg);

        // Plant image
        let imageKey = plant.id;
        if (!this.textures.exists(imageKey)) {
            imageKey = 'placeholder';
        }

        // Image container with mask
        const imgContainer = this.add.container(-width/2 + 55, 0);

        const imgMask = this.add.graphics();
        imgMask.fillStyle(0xffffff);
        imgMask.fillRoundedRect(-45, -45, 90, 90, 10);
        imgContainer.add(imgMask);

        const image = this.add.image(0, 0, imageKey);
        const scale = Math.min(90 / image.width, 90 / image.height);
        image.setScale(scale);

        const mask = imgMask.createGeometryMask();
        image.setMask(mask);
        imgContainer.add(image);

        container.add(imgContainer);

        // Text area
        const textX = -width/2 + 115;

        // Scientific name
        this.add.text(textX, -height/2 + 20, plant.scientificName, {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '15px',
            color: '#1a2e1a',
            fontStyle: 'italic 600'
        }).setOrigin(0, 0.5);
        container.add(container.list[container.list.length - 1]);

        // Common name
        this.add.text(textX, -height/2 + 40, plant.commonNames[0], {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#4a7c4a'
        }).setOrigin(0, 0.5);
        container.add(container.list[container.list.length - 1]);

        // Mastery display
        const masteryY = -height/2 + 62;
        const masteryDisplay = this.getMasteryIcons(stats.masteryLevel);

        this.add.text(textX, masteryY, masteryDisplay, {
            fontSize: '16px'
        }).setOrigin(0, 0.5);
        container.add(container.list[container.list.length - 1]);

        const masteryLabel = isMastered ? 'MASTERED' : `Level ${stats.masteryLevel}/3`;
        this.add.text(textX + 60, masteryY, masteryLabel, {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: isMastered ? '#c75d38' : '#666666',
            fontStyle: isMastered ? '700' : '400'
        }).setOrigin(0, 0.5);
        container.add(container.list[container.list.length - 1]);

        // Stats
        const accuracy = stats.timesShown > 0
            ? Math.round((stats.timesCorrect / stats.timesShown) * 100)
            : 0;

        this.add.text(textX, -height/2 + 82, `${stats.timesCorrect}/${stats.timesShown} correct (${accuracy}%)`, {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '11px',
            color: '#888888'
        }).setOrigin(0, 0.5);
        container.add(container.list[container.list.length - 1]);

        // Trophy badge for mastered
        if (isMastered) {
            const badge = this.add.text(width/2 - 20, -height/2 + 20, '🏆', {
                fontSize: '24px'
            }).setOrigin(0.5);
            container.add(badge);
        }
    }

    getMasteryIcons(level) {
        const filled = '🌿'.repeat(level);
        const empty = '🌱'.repeat(3 - level);
        return filled + empty;
    }
}

// ============================================
// GAME CONFIG & INIT
// ============================================
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 400,
        height: 780
    },
    backgroundColor: '#0d1f0d',
    scene: [BootScene, MenuScene, QuizScene, ResultsScene, CollectionScene],
    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false
    }
};

// Hide loading overlay once Phaser loads
window.addEventListener('load', () => {
    const game = new Phaser.Game(config);

    game.events.once('ready', () => {
        const overlay = document.querySelector('.loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    });
});
