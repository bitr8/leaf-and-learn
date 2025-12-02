// ============================================
// LEAF & LEARN - Premium Plant Identification Game
// ============================================

// ============================================
// GAME CONFIGURATION CONSTANTS
// ============================================
const CONFIG = {
    // Gameplay
    QUESTIONS_PER_ROUND: 10,
    POINTS_PER_CORRECT: 10,
    MAX_MASTERY_LEVEL: 3,
    AUTO_ADVANCE_DELAY: 3500,

    // Speed bonus thresholds (milliseconds)
    SPEED_BONUS: {
        FAST: { threshold: 2000, bonus: 3, label: 'Lightning!' },
        MEDIUM: { threshold: 4000, bonus: 1, label: 'Quick!' }
    },

    // Hint system
    HINT_PENALTY: 5,

    // Animations
    FADE_DURATION: 400,
    BUTTON_STAGGER_DELAY: 60,
    CARD_FLIP_DURATION: 400,

    // UI dimensions
    CARD_WIDTH: 300,
    CARD_HEIGHT: 230,
    BUTTON_WIDTH: 260,
    BUTTON_HEIGHT: 56,
    ANSWER_BUTTON_HEIGHT: 54,

    // Streak thresholds
    STREAK_FIRE: 5,
    STREAK_EXPLOSION: 10,

    // Daily streak
    DAILY_STREAK_HOURS: 36, // Hours before streak resets
};

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

// Light theme variant
const COLORS_LIGHT = {
    darkGreen: 0xf5f2eb,
    forestGreen: 0xebe5d9,
    sageGreen: 0xdcd5c5,
    leafGreen: 0x4a7c4a,
    mint: 0x2d4a2d,
    cream: 0x1a2e1a,
    warmWhite: 0x0d1f0d,
    parchment: 0x2d4a2d,
    terracotta: 0xc75d38,
    terracottaLight: 0xd97b5a,
    gold: 0xd4a84b,
    goldLight: 0xe6c575,
    success: 0x4caf50,
    error: 0xe53935
};

// ============================================
// SOUND SYSTEM (Web Audio API)
// ============================================
class SoundManager {
    constructor() {
        this.enabled = true;
        this.context = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.context = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    // Ensure audio context is resumed (needed after user interaction)
    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.context) return;

        const oscillator = this.context.createOscillator();
        const gainNode = this.context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.context.destination);

        oscillator.frequency.value = frequency;
        oscillator.type = type;

        gainNode.gain.setValueAtTime(volume, this.context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + duration);

        oscillator.start(this.context.currentTime);
        oscillator.stop(this.context.currentTime + duration);
    }

    buttonClick() {
        this.playTone(800, 0.05, 'sine', 0.15);
    }

    correct() {
        // Happy ascending arpeggio
        this.playTone(523, 0.1, 'sine', 0.2); // C5
        setTimeout(() => this.playTone(659, 0.1, 'sine', 0.2), 80); // E5
        setTimeout(() => this.playTone(784, 0.15, 'sine', 0.25), 160); // G5
    }

    wrong() {
        // Sad descending tone
        this.playTone(300, 0.15, 'sawtooth', 0.15);
        setTimeout(() => this.playTone(250, 0.2, 'sawtooth', 0.1), 100);
    }

    levelUp() {
        // Triumphant fanfare
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.25), i * 100);
        });
    }

    celebration() {
        // Epic celebration sound
        const melody = [784, 880, 988, 1047, 1175, 1319]; // G5 to E6
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.2), i * 80);
        });
        setTimeout(() => {
            this.playTone(1568, 0.4, 'sine', 0.3); // Final high note
        }, 500);
    }

    streak() {
        this.playTone(880, 0.08, 'sine', 0.15);
        setTimeout(() => this.playTone(1100, 0.1, 'sine', 0.2), 60);
    }

    hint() {
        this.playTone(400, 0.1, 'triangle', 0.1);
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// ============================================
// HAPTIC FEEDBACK
// ============================================
class HapticManager {
    constructor() {
        this.enabled = 'vibrate' in navigator;
    }

    light() {
        if (this.enabled) navigator.vibrate(10);
    }

    medium() {
        if (this.enabled) navigator.vibrate(25);
    }

    heavy() {
        if (this.enabled) navigator.vibrate(50);
    }

    success() {
        if (this.enabled) navigator.vibrate([20, 50, 30]);
    }

    error() {
        if (this.enabled) navigator.vibrate([50, 30, 50]);
    }

    celebration() {
        if (this.enabled) navigator.vibrate([30, 50, 30, 50, 30, 50, 100]);
    }
}

// ============================================
// ANALYTICS TRACKER
// ============================================
class Analytics {
    constructor() {
        this.load();
    }

    load() {
        try {
            const saved = localStorage.getItem('leafAndLearnAnalytics');
            this.data = saved ? JSON.parse(saved) : this.getDefault();
        } catch (e) {
            this.data = this.getDefault();
        }
    }

    getDefault() {
        return {
            plantDifficulty: {}, // plantId -> { attempts, errors, avgTime }
            sessionHistory: [],
            totalPlayTime: 0
        };
    }

    save() {
        try {
            localStorage.setItem('leafAndLearnAnalytics', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save analytics');
        }
    }

    recordAnswer(plantId, correct, responseTime) {
        if (!this.data.plantDifficulty[plantId]) {
            this.data.plantDifficulty[plantId] = { attempts: 0, errors: 0, totalTime: 0 };
        }

        const stats = this.data.plantDifficulty[plantId];
        stats.attempts++;
        stats.totalTime += responseTime;
        if (!correct) stats.errors++;

        this.save();
    }

    getDifficultyRanking() {
        // Returns plants sorted by difficulty (error rate)
        return Object.entries(this.data.plantDifficulty)
            .map(([id, stats]) => ({
                id,
                errorRate: stats.attempts > 0 ? stats.errors / stats.attempts : 0,
                avgTime: stats.attempts > 0 ? stats.totalTime / stats.attempts : 0
            }))
            .sort((a, b) => b.errorRate - a.errorRate);
    }

    getMostDifficultPlants(count = 3) {
        return this.getDifficultyRanking().slice(0, count);
    }
}

// Global instances
const soundManager = new SoundManager();
const hapticManager = new HapticManager();
const analytics = new Analytics();

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
            gamesPlayed: 0,
            // Daily streak
            dailyStreak: 0,
            lastPlayDate: null,
            // Settings
            darkMode: true,
            soundEnabled: true
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

        // Check daily streak
        this.updateDailyStreak();

        // Sync sound setting
        soundManager.enabled = this.data.soundEnabled;
    }

    save() {
        try {
            localStorage.setItem('leafAndLearn', JSON.stringify(this.data));
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }

    updateDailyStreak() {
        const now = new Date();
        const today = now.toDateString();

        if (this.data.lastPlayDate) {
            const lastPlay = new Date(this.data.lastPlayDate);
            const hoursSinceLastPlay = (now - lastPlay) / (1000 * 60 * 60);

            if (hoursSinceLastPlay > CONFIG.DAILY_STREAK_HOURS) {
                // Streak broken
                this.data.dailyStreak = 0;
            } else if (lastPlay.toDateString() !== today) {
                // New day, increment streak
                this.data.dailyStreak++;
            }
            // Same day = no change
        }

        this.data.lastPlayDate = now.toISOString();
        this.save();
    }

    recordAnswer(plantId, correct, responseTime = 0) {
        const stats = this.data.plantStats[plantId];
        const previousLevel = stats.masteryLevel;

        stats.timesShown++;
        this.data.totalAnswered++;

        let leveledUp = false;

        if (correct) {
            stats.timesCorrect++;
            const newLevel = Math.min(CONFIG.MAX_MASTERY_LEVEL, stats.masteryLevel + 1);
            if (newLevel > previousLevel && newLevel === CONFIG.MAX_MASTERY_LEVEL) {
                leveledUp = true;
            }
            stats.masteryLevel = newLevel;
            this.data.currentStreak++;
            this.data.totalCorrect++;
            if (this.data.currentStreak > this.data.bestStreak) {
                this.data.bestStreak = this.data.currentStreak;
            }
        } else {
            stats.masteryLevel = 0;
            this.data.currentStreak = 0;
        }

        // Track analytics
        analytics.recordAnswer(plantId, correct, responseTime);

        this.save();
        return { leveledUp, previousLevel, newLevel: stats.masteryLevel };
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
        return PLANTS.filter(p => this.data.plantStats[p.id].masteryLevel >= CONFIG.MAX_MASTERY_LEVEL).length;
    }

    toggleDarkMode() {
        this.data.darkMode = !this.data.darkMode;
        this.save();
        return this.data.darkMode;
    }

    toggleSound() {
        this.data.soundEnabled = !this.data.soundEnabled;
        soundManager.enabled = this.data.soundEnabled;
        this.save();
        return this.data.soundEnabled;
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

function getActiveColors() {
    return gameState && !gameState.data.darkMode ? COLORS_LIGHT : COLORS;
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

        // Progress bar
        const barWidth = 280;
        const barHeight = 8;
        const barX = (width - barWidth) / 2;
        const barY = height / 2 + 60;

        const progressBg = this.add.graphics();
        progressBg.fillStyle(0x2d4a2d, 1);
        progressBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);

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

        // File count display
        const fileText = this.add.text(width / 2, barY + 50, '', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: '#2d4a2d'
        }).setOrigin(0.5);

        let filesLoaded = 0;
        const totalFiles = PLANTS.length + 1; // plants + cheerleader

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xd4a84b, 1);
            progressBar.fillRoundedRect(barX, barY, barWidth * value, barHeight, 4);
            loadingText.setText(`Loading... ${Math.round(value * 100)}%`);
        });

        this.load.on('filecomplete', () => {
            filesLoaded++;
            fileText.setText(`${filesLoaded}/${totalFiles} assets`);
        });

        // Load plant images
        PLANTS.forEach(plant => {
            this.load.image(plant.id, plant.imageUrl);
        });

        // Load cheerleader spritesheet for perfect score celebration
        this.load.spritesheet('cheerleader', './images/cheerleader-jump.png', {
            frameWidth: 48,
            frameHeight: 48
        });
    }

    create() {
        gameState = new GameState();

        // Initialize sound on first user interaction
        this.input.once('pointerdown', () => {
            soundManager.init();
            soundManager.resume();
        });

        // Generate placeholder texture
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0x2d4a2d, 1);
        graphics.fillRect(0, 0, 300, 300);

        // Leaf silhouette pattern for placeholder
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

        // Create cheerleader jump animation
        if (this.textures.exists('cheerleader')) {
            this.anims.create({
                key: 'cheerleader-jump',
                frames: this.anims.generateFrameNumbers('cheerleader', { start: 0, end: 7 }),
                frameRate: 12,
                repeat: -1
            });
        }

        // Transition to menu (or ResultsScene if ?celebrate param)
        this.cameras.main.fadeOut(500, 13, 31, 13);
        this.time.delayedCall(500, () => {
            const params = new URLSearchParams(window.location.search);
            if (params.has('celebrate')) {
                this.scene.start('ResultsScene');
            } else {
                this.scene.start('MenuScene');
            }
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
        const colors = getActiveColors();

        // Background
        this.cameras.main.setBackgroundColor(colors.forestGreen);

        // Decorative background elements
        this.createBackgroundArt();

        // Settings buttons (top right)
        this.createSettingsButtons();

        // Logo area
        const logoY = height * 0.18;

        // Decorative line above title
        const lineGfx = this.add.graphics();
        lineGfx.lineStyle(2, colors.gold, 0.6);
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
        this.createPremiumButton(width / 2, height * 0.62, 'Start Quiz', colors.terracotta, () => {
            soundManager.buttonClick();
            hapticManager.medium();
            this.transitionTo('QuizScene');
        });

        this.createPremiumButton(width / 2, height * 0.74, 'Plant Collection', colors.sageGreen, () => {
            soundManager.buttonClick();
            hapticManager.light();
            this.transitionTo('CollectionScene');
        });

        // Daily streak display
        if (gameState.data.dailyStreak > 0) {
            this.add.text(width / 2, height * 0.85, `${gameState.data.dailyStreak} day streak`, {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '14px',
                color: '#d4a84b'
            }).setOrigin(0.5);
        }

        // Version/credits
        this.add.text(width / 2, height - 25, 'v1.1', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: '#2d4a2d'
        }).setOrigin(0.5);

        // Fade in
        this.cameras.main.fadeIn(CONFIG.FADE_DURATION, 13, 31, 13);

        // Keyboard navigation
        this.input.keyboard.on('keydown-ONE', () => {
            soundManager.buttonClick();
            this.transitionTo('QuizScene');
        });
        this.input.keyboard.on('keydown-TWO', () => {
            soundManager.buttonClick();
            this.transitionTo('CollectionScene');
        });
    }

    createSettingsButtons() {
        const width = this.cameras.main.width;
        const y = 30;

        // Sound toggle
        const soundIcon = gameState.data.soundEnabled ? '🔊' : '🔇';
        this.soundBtn = this.add.text(width - 70, y, soundIcon, { fontSize: '24px' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                const enabled = gameState.toggleSound();
                this.soundBtn.setText(enabled ? '🔊' : '🔇');
                if (enabled) soundManager.buttonClick();
                hapticManager.light();
            });

        // Theme toggle
        const themeIcon = gameState.data.darkMode ? '🌙' : '☀️';
        this.themeBtn = this.add.text(width - 30, y, themeIcon, { fontSize: '24px' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                const isDark = gameState.toggleDarkMode();
                this.themeBtn.setText(isDark ? '🌙' : '☀️');
                soundManager.buttonClick();
                hapticManager.light();
                // Restart scene to apply theme
                this.scene.restart();
            });
    }

    createBackgroundArt() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const graphics = this.add.graphics();
        const colors = getActiveColors();

        // Subtle radial gradient effect
        graphics.fillStyle(colors.sageGreen, 0.15);
        graphics.fillCircle(width * 0.8, height * 0.2, 200);
        graphics.fillCircle(width * 0.1, height * 0.7, 150);

        // Decorative leaf shapes
        graphics.fillStyle(colors.leafGreen, 0.08);
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
        const colors = getActiveColors();

        // Panel background
        const panel = this.add.graphics();
        panel.fillStyle(colors.darkGreen, 0.5);
        panel.fillRoundedRect(x - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 16);
        panel.lineStyle(1, colors.gold, 0.3);
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
        if (streak >= CONFIG.STREAK_EXPLOSION) return '💥';
        if (streak >= CONFIG.STREAK_FIRE) return '🔥';
        return '⚡';
    }

    createPremiumButton(x, y, text, color, callback) {
        const buttonWidth = CONFIG.BUTTON_WIDTH;
        const buttonHeight = CONFIG.BUTTON_HEIGHT;

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
        this.cameras.main.fade(CONFIG.FADE_DURATION, 13, 31, 13);
        this.time.delayedCall(CONFIG.FADE_DURATION, () => {
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
        this.totalQuestions = CONFIG.QUESTIONS_PER_ROUND;
        this.score = 0;
        this.roundStats = {
            correct: 0,
            wrong: 0,
            plants: [],
            wrongAnswers: [] // Track which plants were answered wrong
        };
        this.currentPlant = null;
        this.answered = false;
        this.buttons = [];
        this.questionStartTime = 0;
        this.hintUsed = false;
        this.keyboardEnabled = true;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const colors = getActiveColors();

        this.cameras.main.setBackgroundColor(colors.forestGreen);

        // Initialize sound on interaction
        this.input.once('pointerdown', () => {
            soundManager.init();
            soundManager.resume();
        });

        // Background art
        this.createBackgroundArt();

        // Header
        this.createHeader();

        // Card area
        this.cardContainer = this.add.container(width / 2, height * 0.36);

        // Buttons area
        this.buttonsContainer = this.add.container(0, height * 0.64);

        // Hint button
        this.createHintButton();

        // Feedback area
        this.feedbackContainer = this.add.container(width / 2, height * 0.88);
        this.feedbackContainer.setAlpha(0);

        // Continue prompt
        this.continueText = this.add.text(width / 2, height * 0.96, 'Tap or press Enter to continue', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#4a7c4a',
            fontStyle: 'italic'
        }).setOrigin(0.5).setAlpha(0);

        // Particle emitter for celebrations
        this.createParticleEffects();

        // Keyboard support
        this.setupKeyboard();

        // Fade in and start
        this.cameras.main.fadeIn(CONFIG.FADE_DURATION, 13, 31, 13);
        this.time.delayedCall(CONFIG.FADE_DURATION, () => this.showQuestion());
    }

    setupKeyboard() {
        // Number keys 1-4 for answers
        ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((key, index) => {
            this.input.keyboard.on(`keydown-${key}`, () => {
                if (!this.answered && this.keyboardEnabled && this.buttons[index]) {
                    this.handleAnswer(this.buttons[index]);
                }
            });
        });

        // Enter/Space to continue
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.answered) {
                if (this.advanceTimer) this.advanceTimer.remove();
                this.showQuestion();
            }
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.answered) {
                if (this.advanceTimer) this.advanceTimer.remove();
                this.showQuestion();
            }
        });

        // H for hint
        this.input.keyboard.on('keydown-H', () => {
            if (!this.answered && !this.hintUsed) {
                this.useHint();
            }
        });

        // Escape to go back to menu
        this.input.keyboard.on('keydown-ESC', () => {
            this.cameras.main.fade(CONFIG.FADE_DURATION, 13, 31, 13);
            this.time.delayedCall(CONFIG.FADE_DURATION, () => {
                this.scene.start('MenuScene');
            });
        });
    }

    createBackgroundArt() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const graphics = this.add.graphics();
        const colors = getActiveColors();

        graphics.fillStyle(colors.sageGreen, 0.1);
        graphics.fillCircle(width * 0.9, height * 0.3, 150);
        graphics.fillCircle(width * 0.1, height * 0.8, 120);
    }

    createHeader() {
        const width = this.cameras.main.width;
        const colors = getActiveColors();

        // Header background
        const headerBg = this.add.graphics();
        headerBg.fillStyle(colors.darkGreen, 0.4);
        headerBg.fillRect(0, 0, width, 75);

        // Progress bar
        const barWidth = width - 40;
        const barX = 20;
        const barY = 18;

        const progressBg = this.add.graphics();
        progressBg.fillStyle(colors.sageGreen, 1);
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

    createHintButton() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.hintButton = this.add.container(width - 50, height * 0.58);

        const hintBg = this.add.graphics();
        hintBg.fillStyle(COLORS.gold, 0.8);
        hintBg.fillCircle(0, 0, 22);
        this.hintButton.add(hintBg);

        const hintText = this.add.text(0, 0, '💡', { fontSize: '20px' }).setOrigin(0.5);
        this.hintButton.add(hintText);

        const hintLabel = this.add.text(0, 30, 'Hint (H)', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '10px',
            color: '#7eb07e'
        }).setOrigin(0.5);
        this.hintButton.add(hintLabel);

        this.hintButton.setSize(44, 44);
        this.hintButton.setInteractive({ useHandCursor: true });

        this.hintButton.on('pointerdown', () => {
            if (!this.answered && !this.hintUsed) {
                this.useHint();
            }
        });
    }

    useHint() {
        if (this.hintUsed || this.answered) return;

        this.hintUsed = true;
        soundManager.hint();
        hapticManager.light();

        // Eliminate two wrong answers
        const wrongButtons = this.buttons.filter(b => !b.answer.isCorrect);
        Phaser.Utils.Array.Shuffle(wrongButtons);

        wrongButtons.slice(0, 2).forEach(button => {
            this.tweens.add({
                targets: button,
                alpha: 0.3,
                duration: 300
            });
            button.disableInteractive();
            button.eliminated = true;
        });

        // Dim the hint button
        this.tweens.add({
            targets: this.hintButton,
            alpha: 0.3,
            duration: 200
        });

        // Show penalty notice
        const width = this.cameras.main.width;
        const penaltyText = this.add.text(width / 2, this.cameras.main.height * 0.58, `-${CONFIG.HINT_PENALTY} pts`, {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: '#c75d38',
            fontStyle: '600'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: penaltyText,
            y: penaltyText.y - 30,
            alpha: 0,
            duration: 1000,
            onComplete: () => penaltyText.destroy()
        });
    }

    getStreakDisplay() {
        const streak = gameState.data.currentStreak;
        if (streak >= CONFIG.STREAK_EXPLOSION) return `💥 ${streak}`;
        if (streak >= CONFIG.STREAK_FIRE) return `🔥 ${streak}`;
        if (streak > 0) return `⚡ ${streak}`;
        return `⚡ 0`;
    }

    updateProgress() {
        const width = this.cameras.main.width;
        const progress = this.currentQuestion / this.totalQuestions;
        const barWidth = width - 40;
        const colors = getActiveColors();

        this.progressFill.clear();
        this.progressFill.fillStyle(colors.gold, 1);
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
        this.hintUsed = false;
        this.keyboardEnabled = true;
        this.currentQuestion++;

        if (this.currentQuestion > this.totalQuestions) {
            this.endRound();
            return;
        }

        // Reset hint button
        if (this.hintButton) {
            this.hintButton.setAlpha(1);
        }

        // Select plant with spaced repetition
        const weightedPlants = gameState.getPlantsByMastery();
        this.currentPlant = Phaser.Utils.Array.GetRandom(weightedPlants);
        this.roundStats.plants.push(this.currentPlant.id);

        // Start timer for speed bonus
        this.questionStartTime = Date.now();

        // Update UI
        this.updateProgress();

        // Clear previous
        this.cardContainer.removeAll(true);
        this.buttonsContainer.removeAll(true);
        this.buttons = [];
        this.feedbackContainer.setAlpha(0);
        this.feedbackContainer.removeAll(true);
        this.continueText.setAlpha(0);

        // Create card with flip animation
        this.createCardWithFlip();

        // Create buttons
        this.createAnswerButtons();
    }

    createCardWithFlip() {
        const cardWidth = CONFIG.CARD_WIDTH;
        const cardHeight = CONFIG.CARD_HEIGHT;
        const colors = getActiveColors();

        // Card shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.2);
        shadow.fillRoundedRect(-cardWidth/2 + 6, -cardHeight/2 + 6, cardWidth, cardHeight, 16);
        this.cardContainer.add(shadow);

        // Card background
        const cardBg = this.add.graphics();
        cardBg.fillStyle(colors.cream, 1);
        cardBg.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 16);

        // Inner frame
        cardBg.lineStyle(3, colors.sageGreen, 0.3);
        cardBg.strokeRoundedRect(-cardWidth/2 + 8, -cardHeight/2 + 8, cardWidth - 16, cardHeight - 16, 12);

        this.cardContainer.add(cardBg);

        // Plant image
        let imageKey = this.currentPlant.id;
        if (!this.textures.exists(imageKey)) {
            imageKey = 'placeholder';
        }

        // Image frame background
        const imageFrame = this.add.graphics();
        imageFrame.fillStyle(0xffffff);
        imageFrame.fillRoundedRect(-130, -95, 260, 180, 10);
        this.cardContainer.add(imageFrame);

        // Add the plant image directly to container
        const image = this.add.image(0, -5, imageKey);
        const scale = Math.min(250 / image.width, 170 / image.height);
        image.setScale(scale);
        image.setOrigin(0.5, 0.5);
        this.cardContainer.add(image);

        // Decorative corner accents
        const accent = this.add.graphics();
        accent.lineStyle(2, colors.gold, 0.5);
        accent.lineBetween(-cardWidth/2 + 12, -cardHeight/2 + 30, -cardWidth/2 + 12, -cardHeight/2 + 12);
        accent.lineBetween(-cardWidth/2 + 12, -cardHeight/2 + 12, -cardWidth/2 + 30, -cardHeight/2 + 12);
        accent.lineBetween(cardWidth/2 - 12, cardHeight/2 - 30, cardWidth/2 - 12, cardHeight/2 - 12);
        accent.lineBetween(cardWidth/2 - 12, cardHeight/2 - 12, cardWidth/2 - 30, cardHeight/2 - 12);
        this.cardContainer.add(accent);

        // Flip animation
        this.cardContainer.setScale(0, 1);
        this.cardContainer.setAlpha(1);

        this.tweens.add({
            targets: this.cardContainer,
            scaleX: 1,
            duration: CONFIG.CARD_FLIP_DURATION,
            ease: 'Back.easeOut'
        });
    }

    createCard() {
        // Legacy method - now uses createCardWithFlip
        this.createCardWithFlip();
    }

    createAnswerButtons() {
        const width = this.cameras.main.width;
        const answers = this.getAnswerOptions();
        Phaser.Utils.Array.Shuffle(answers);

        const buttonWidth = width - 32;
        const buttonHeight = CONFIG.ANSWER_BUTTON_HEIGHT;
        const spacing = 10;

        answers.forEach((answer, index) => {
            const y = index * (buttonHeight + spacing);
            const button = this.createAnswerButton(width / 2, y, buttonWidth, buttonHeight, answer, index + 1);
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
                delay: 200 + index * CONFIG.BUTTON_STAGGER_DELAY,
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

    createAnswerButton(x, y, width, height, answer, number) {
        const button = this.add.container(x, y);
        const colors = getActiveColors();

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-width/2 + 3, -height/2 + 3, width, height, 12);
        button.add(shadow);

        // Background
        const bg = this.add.graphics();
        bg.fillStyle(colors.warmWhite, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
        bg.lineStyle(2, colors.sageGreen, 0.4);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);
        button.add(bg);

        // Number badge
        const numberBadge = this.add.text(-width/2 + 20, 0, String(number), {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '12px',
            color: '#7eb07e',
            fontStyle: '600'
        }).setOrigin(0.5);
        button.add(numberBadge);

        // Text
        const label = this.add.text(10, 0, answer.text, {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '15px',
            color: '#1a2e1a',
            fontStyle: '500',
            align: 'center',
            wordWrap: { width: width - 60 }
        }).setOrigin(0.5);
        button.add(label);

        button.setSize(width, height);
        button.setInteractive({ useHandCursor: true });

        button.answer = answer;
        button.bg = bg;
        button.shadow = shadow;
        button.label = label;
        button.numberBadge = numberBadge;
        button.width = width;
        button.height = height;

        button.on('pointerover', () => {
            if (!this.answered && !button.eliminated) {
                this.tweens.add({
                    targets: button,
                    scaleX: 1.02,
                    scaleY: 1.02,
                    duration: 100
                });
                // Glow effect
                bg.clear();
                bg.fillStyle(colors.warmWhite, 1);
                bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
                bg.lineStyle(3, colors.gold, 0.6);
                bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);
            }
        });

        button.on('pointerout', () => {
            if (!this.answered && !button.eliminated) {
                this.tweens.add({
                    targets: button,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
                // Remove glow
                bg.clear();
                bg.fillStyle(colors.warmWhite, 1);
                bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
                bg.lineStyle(2, colors.sageGreen, 0.4);
                bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);
            }
        });

        button.on('pointerdown', () => this.handleAnswer(button));

        return button;
    }

    handleAnswer(selectedButton) {
        if (this.answered || selectedButton.eliminated) return;
        this.answered = true;
        this.keyboardEnabled = false;

        const responseTime = Date.now() - this.questionStartTime;
        const isCorrect = selectedButton.answer.isCorrect;

        // Record answer with response time
        const result = gameState.recordAnswer(this.currentPlant.id, isCorrect, responseTime);

        // Calculate speed bonus
        let speedBonus = 0;
        let speedLabel = '';
        if (isCorrect && !this.hintUsed) {
            if (responseTime < CONFIG.SPEED_BONUS.FAST.threshold) {
                speedBonus = CONFIG.SPEED_BONUS.FAST.bonus;
                speedLabel = CONFIG.SPEED_BONUS.FAST.label;
            } else if (responseTime < CONFIG.SPEED_BONUS.MEDIUM.threshold) {
                speedBonus = CONFIG.SPEED_BONUS.MEDIUM.bonus;
                speedLabel = CONFIG.SPEED_BONUS.MEDIUM.label;
            }
        }

        // Apply hint penalty
        const hintPenalty = this.hintUsed ? CONFIG.HINT_PENALTY : 0;

        if (isCorrect) {
            this.score += CONFIG.POINTS_PER_CORRECT + speedBonus - hintPenalty;
            this.roundStats.correct++;

            soundManager.correct();
            hapticManager.success();

            // Streak sound
            if (gameState.data.currentStreak >= CONFIG.STREAK_FIRE) {
                soundManager.streak();
            }

            // Celebration particles
            this.successEmitter.setPosition(selectedButton.x, this.buttonsContainer.y + selectedButton.y);
            this.successEmitter.explode(15);

            // Level up celebration
            if (result.leveledUp) {
                this.showLevelUpCelebration();
            }

            // Show speed bonus
            if (speedBonus > 0) {
                this.showSpeedBonus(speedBonus, speedLabel, selectedButton);
            }
        } else {
            this.roundStats.wrong++;
            this.roundStats.wrongAnswers.push({
                plant: this.currentPlant,
                chosenAnswer: selectedButton.answer.text
            });

            soundManager.wrong();
            hapticManager.error();
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
                button.numberBadge.setColor('#ffffff');

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
                button.numberBadge.setColor('#ffffff');

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
        this.advanceTimer = this.time.delayedCall(CONFIG.AUTO_ADVANCE_DELAY, () => {
            this.showQuestion();
        });
    }

    showSpeedBonus(bonus, label, button) {
        const bonusText = this.add.text(
            button.x,
            this.buttonsContainer.y + button.y - 40,
            `${label} +${bonus}`,
            {
                fontFamily: 'Fraunces, Georgia, serif',
                fontSize: '18px',
                color: '#d4a84b',
                fontStyle: '700'
            }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: bonusText,
            y: bonusText.y - 40,
            alpha: 0,
            duration: 1200,
            ease: 'Power2',
            onComplete: () => bonusText.destroy()
        });
    }

    showLevelUpCelebration() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        soundManager.levelUp();
        hapticManager.celebration();

        // Level up text
        const levelText = this.add.text(width / 2, height * 0.5, '🌿 MASTERED! 🌿', {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '28px',
            color: '#d4a84b',
            fontStyle: '700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setAlpha(0).setScale(0.5).setDepth(100);

        this.tweens.add({
            targets: levelText,
            alpha: 1,
            scale: 1.2,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.tweens.add({
                    targets: levelText,
                    alpha: 0,
                    y: levelText.y - 50,
                    duration: 800,
                    delay: 600,
                    onComplete: () => levelText.destroy()
                });
            }
        });

        // Mini particle burst
        if (!this.textures.exists('confetti')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(6, 6, 6);
            graphics.generateTexture('confetti', 12, 12);
            graphics.destroy();
        }

        const emitter = this.add.particles(width / 2, height * 0.5, 'confetti', {
            speed: { min: 150, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            lifespan: 1000,
            gravityY: 200,
            tint: [0xd4a84b, 0x4caf50, 0x7eb07e],
            quantity: 20
        });

        emitter.explode(20);
    }

    showFeedback(isCorrect) {
        const width = this.cameras.main.width;
        const colors = getActiveColors();

        // Feedback panel
        const panelWidth = width - 24;
        const panelHeight = 70;

        const panel = this.add.graphics();
        panel.fillStyle(isCorrect ? COLORS.success : colors.terracotta, 0.95);
        panel.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 12);
        this.feedbackContainer.add(panel);

        // Icon and text
        const icon = isCorrect ? '✓' : '✗';

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

        this.cameras.main.fade(CONFIG.FADE_DURATION, 13, 31, 13);
        this.time.delayedCall(CONFIG.FADE_DURATION, () => {
            this.scene.start('ResultsScene', {
                score: this.score,
                correct: this.roundStats.correct,
                wrong: this.roundStats.wrong,
                wrongAnswers: this.roundStats.wrongAnswers,
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
        this.roundData = data || {};
    }

    create() {
        // Check for ?celebrate param to test celebration
        const params = new URLSearchParams(window.location.search);
        if (params.has('celebrate')) {
            this.roundData = {
                score: 100,
                correct: 10,
                wrong: 0,
                wrongAnswers: [],
                isNewHighScore: true
            };
        }

        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const colors = getActiveColors();

        this.cameras.main.setBackgroundColor(colors.forestGreen);

        // Background
        this.createBackgroundArt();

        // Title
        const titleY = height * 0.08;
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
        const scoreY = height * 0.22;

        this.add.text(width / 2, scoreY, String(this.roundData.score || 0), {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '72px',
            color: '#d4a84b',
            fontStyle: '700'
        }).setOrigin(0.5);

        this.add.text(width / 2, scoreY + 45, 'points', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '18px',
            color: '#7eb07e'
        }).setOrigin(0.5);

        // Stats panel
        this.createStatsPanel(width / 2, height * 0.40);

        // Wrong answers review (if any)
        if (this.roundData.wrongAnswers && this.roundData.wrongAnswers.length > 0) {
            this.createWrongAnswersReview(width / 2, height * 0.58);
        }

        // Buttons
        const buttonY = this.roundData.wrongAnswers?.length > 0 ? height * 0.78 : height * 0.68;

        this.createPremiumButton(width / 2, buttonY, 'Play Again', colors.terracotta, () => {
            soundManager.buttonClick();
            hapticManager.medium();
            this.transitionTo('QuizScene');
        });

        this.createPremiumButton(width / 2, buttonY + 55, 'Main Menu', colors.sageGreen, () => {
            soundManager.buttonClick();
            hapticManager.light();
            this.transitionTo('MenuScene');
        });

        // Share button
        this.createShareButton(width / 2, buttonY + 110);

        this.cameras.main.fadeIn(CONFIG.FADE_DURATION, 13, 31, 13);

        // Keyboard shortcuts
        this.input.keyboard.on('keydown-ENTER', () => {
            soundManager.buttonClick();
            this.transitionTo('QuizScene');
        });
        this.input.keyboard.on('keydown-ESC', () => {
            soundManager.buttonClick();
            this.transitionTo('MenuScene');
        });

        // PERFECT SCORE - go over the top!
        if (this.roundData.score >= 100) {
            this.createPerfectScoreCelebration();
        } else if (this.roundData.isNewHighScore) {
            this.createCelebration();
        }
    }

    createBackgroundArt() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        const graphics = this.add.graphics();
        const colors = getActiveColors();

        graphics.fillStyle(colors.sageGreen, 0.1);
        graphics.fillCircle(width * 0.85, height * 0.15, 180);
        graphics.fillCircle(width * 0.15, height * 0.85, 140);
    }

    createStatsPanel(x, y) {
        const panelWidth = 300;
        const panelHeight = 130;
        const colors = getActiveColors();

        const panel = this.add.graphics();
        panel.fillStyle(colors.darkGreen, 0.5);
        panel.fillRoundedRect(x - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 16);
        panel.lineStyle(1, colors.gold, 0.2);
        panel.strokeRoundedRect(x - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 16);

        const totalQuestions = (this.roundData.correct || 0) + (this.roundData.wrong || 0);
        const accuracy = totalQuestions > 0 ? Math.round((this.roundData.correct / totalQuestions) * 100) : 0;
        const streakIcon = gameState.data.currentStreak >= CONFIG.STREAK_EXPLOSION ? '💥' :
                          gameState.data.currentStreak >= CONFIG.STREAK_FIRE ? '🔥' : '⚡';

        const stats = [
            { label: 'Correct', value: `${this.roundData.correct || 0}/${totalQuestions}`, color: '#4caf50' },
            { label: 'Accuracy', value: `${accuracy}%`, color: '#f5f2eb' },
            { label: 'Current Streak', value: `${streakIcon} ${gameState.data.currentStreak}`, color: '#d4a84b' }
        ];

        stats.forEach((stat, i) => {
            const rowY = y - 40 + i * 35;

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

    createWrongAnswersReview(x, y) {
        const panelWidth = 300;
        const wrongAnswers = this.roundData.wrongAnswers;
        const panelHeight = Math.min(wrongAnswers.length * 30 + 40, 120);
        const colors = getActiveColors();

        // Panel
        const panel = this.add.graphics();
        panel.fillStyle(colors.terracotta, 0.2);
        panel.fillRoundedRect(x - panelWidth/2, y - panelHeight/2, panelWidth, panelHeight, 12);

        // Title
        this.add.text(x, y - panelHeight/2 + 15, '📚 Review These Plants', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
            color: '#c75d38',
            fontStyle: '600'
        }).setOrigin(0.5);

        // List wrong plants (max 3)
        const displayPlants = wrongAnswers.slice(0, 3);
        displayPlants.forEach((item, i) => {
            const rowY = y - panelHeight/2 + 40 + i * 25;
            this.add.text(x, rowY, item.plant.scientificName, {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                color: '#f5f2eb',
                fontStyle: 'italic'
            }).setOrigin(0.5);
        });

        if (wrongAnswers.length > 3) {
            this.add.text(x, y + panelHeight/2 - 15, `+${wrongAnswers.length - 3} more`, {
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '11px',
                color: '#7eb07e'
            }).setOrigin(0.5);
        }
    }

    createShareButton(x, y) {
        // Only show if Web Share API is supported
        if (!navigator.share) return;

        const btn = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x4a7c4a, 0.5);
        bg.fillRoundedRect(-60, -18, 120, 36, 8);
        btn.add(bg);

        const text = this.add.text(0, 0, '📤 Share Score', {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            color: '#f5f2eb'
        }).setOrigin(0.5);
        btn.add(text);

        btn.setSize(120, 36);
        btn.setInteractive({ useHandCursor: true });

        btn.on('pointerdown', async () => {
            soundManager.buttonClick();
            hapticManager.light();

            try {
                await navigator.share({
                    title: 'Leaf & Learn',
                    text: `I scored ${this.roundData.score} points on Leaf & Learn! 🌿 Can you beat my score?`,
                    url: window.location.origin
                });
            } catch (e) {
                // User cancelled or error
            }
        });
    }

    createPremiumButton(x, y, text, color, callback) {
        const buttonWidth = 220;
        const buttonHeight = 46;

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
            fontSize: '17px',
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

        soundManager.celebration();
        hapticManager.celebration();

        // Create particle texture
        if (!this.textures.exists('confetti')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(6, 6, 6);
            graphics.generateTexture('confetti', 12, 12);
            graphics.destroy();
        }

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

    createPerfectScoreCelebration() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        soundManager.celebration();
        hapticManager.celebration();

        // Screen flash
        const flash = this.add.rectangle(width/2, height/2, width, height, 0xffd700, 0.8);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 500,
            ease: 'Power2'
        });

        // Camera shake
        this.cameras.main.shake(500, 0.02);

        // Create confetti texture
        if (!this.textures.exists('confetti')) {
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff, 1);
            graphics.fillCircle(6, 6, 6);
            graphics.generateTexture('confetti', 12, 12);
            graphics.destroy();
        }

        // Create star texture for extra flair
        if (!this.textures.exists('star')) {
            const starGfx = this.make.graphics({ x: 0, y: 0, add: false });
            starGfx.fillStyle(0xffffff, 1);
            const cx = 10, cy = 10, outerR = 10, innerR = 4, points = 5;
            const starPoints = [];
            for (let i = 0; i < points * 2; i++) {
                const r = i % 2 === 0 ? outerR : innerR;
                const angle = (i * Math.PI / points) - Math.PI / 2;
                starPoints.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
            }
            starGfx.fillPoints(starPoints, true);
            starGfx.generateTexture('star', 20, 20);
            starGfx.destroy();
        }

        // Massive confetti explosion from multiple points
        const confettiColors = [0xffd700, 0xff6b6b, 0x4ecdc4, 0x45b7d1, 0x96ceb4, 0xffeaa7, 0xdfe6e9, 0xe17055];

        // Left side burst
        const leftEmitter = this.add.particles(0, height, 'confetti', {
            speed: { min: 300, max: 500 },
            angle: { min: -60, max: -30 },
            scale: { start: 0.8, end: 0.2 },
            lifespan: 3000,
            gravityY: 200,
            tint: confettiColors,
            frequency: 20,
            quantity: 5,
            rotate: { min: 0, max: 360 }
        });

        // Right side burst
        const rightEmitter = this.add.particles(width, height, 'confetti', {
            speed: { min: 300, max: 500 },
            angle: { min: -150, max: -120 },
            scale: { start: 0.8, end: 0.2 },
            lifespan: 3000,
            gravityY: 200,
            tint: confettiColors,
            frequency: 20,
            quantity: 5,
            rotate: { min: 0, max: 360 }
        });

        // Center explosion
        const centerEmitter = this.add.particles(width/2, height * 0.3, 'star', {
            speed: { min: 200, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 1, end: 0 },
            lifespan: 2500,
            gravityY: 100,
            tint: [0xffd700, 0xffa500, 0xffff00],
            frequency: 30,
            quantity: 3,
            rotate: { min: 0, max: 360 }
        });

        // Raining confetti from top
        const rainEmitter = this.add.particles(width/2, -20, 'confetti', {
            speed: { min: 50, max: 150 },
            angle: { min: 85, max: 95 },
            scale: { start: 0.6, end: 0.1 },
            lifespan: 4000,
            gravityY: 100,
            tint: confettiColors,
            frequency: 15,
            quantity: 4,
            emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-width/2, 0, width, 10) }
        });

        // PERFECT! text with epic animation
        const perfectText = this.add.text(width/2, height * 0.5, 'PERFECT!', {
            fontFamily: 'Fraunces, Georgia, serif',
            fontSize: '64px',
            color: '#ffd700',
            fontStyle: '700',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0).setScale(0.1);

        // Bring to front
        perfectText.setDepth(100);

        // Epic entrance animation
        this.tweens.add({
            targets: perfectText,
            alpha: 1,
            scale: 1.2,
            duration: 400,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Pulsing glow effect
                this.tweens.add({
                    targets: perfectText,
                    scale: 1.3,
                    duration: 300,
                    yoyo: true,
                    repeat: 5,
                    ease: 'Sine.easeInOut'
                });

                // Color cycling
                let colorIndex = 0;
                const textColors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#ffa500', '#45b7d1'];
                this.time.addEvent({
                    delay: 150,
                    repeat: 15,
                    callback: () => {
                        perfectText.setColor(textColors[colorIndex % textColors.length]);
                        colorIndex++;
                    }
                });
            }
        });

        // Floating emoji celebration
        const emojis = ['🌟', '✨', '🎉', '🏆', '💫', '🌿', '🍀', '💯'];
        for (let i = 0; i < 12; i++) {
            this.time.delayedCall(i * 150, () => {
                const emoji = this.add.text(
                    Phaser.Math.Between(50, width - 50),
                    height + 50,
                    emojis[Phaser.Math.Between(0, emojis.length - 1)],
                    { fontSize: '48px' }
                ).setOrigin(0.5);

                this.tweens.add({
                    targets: emoji,
                    y: -50,
                    x: emoji.x + Phaser.Math.Between(-100, 100),
                    rotation: Phaser.Math.Between(-2, 2),
                    duration: 2500,
                    ease: 'Sine.easeOut',
                    onComplete: () => emoji.destroy()
                });
            });
        }

        // Dancing cheerleaders!
        if (this.anims.exists('cheerleader-jump')) {
            const leftCheerleader = this.add.sprite(80, height - 60, 'cheerleader')
                .setScale(2.5)
                .setFlipX(false)
                .play('cheerleader-jump');

            const rightCheerleader = this.add.sprite(width - 80, height - 60, 'cheerleader')
                .setScale(2.5)
                .setFlipX(true)
                .play('cheerleader-jump');

            // Bounce them up and down
            this.tweens.add({
                targets: [leftCheerleader, rightCheerleader],
                y: height - 80,
                duration: 300,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Clean up after celebration
            this.time.delayedCall(6000, () => {
                this.tweens.add({
                    targets: [leftCheerleader, rightCheerleader],
                    alpha: 0,
                    y: height + 50,
                    duration: 500,
                    onComplete: () => {
                        leftCheerleader.destroy();
                        rightCheerleader.destroy();
                    }
                });
            });
        }

        // Stop emitters after celebration
        this.time.delayedCall(3000, () => {
            leftEmitter.stop();
            rightEmitter.stop();
            centerEmitter.stop();
        });

        this.time.delayedCall(5000, () => {
            rainEmitter.stop();
            // Fade out PERFECT text
            this.tweens.add({
                targets: perfectText,
                alpha: 0,
                y: perfectText.y - 50,
                duration: 500,
                onComplete: () => perfectText.destroy()
            });
        });
    }

    transitionTo(scene) {
        this.cameras.main.fade(CONFIG.FADE_DURATION, 13, 31, 13);
        this.time.delayedCall(CONFIG.FADE_DURATION, () => {
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
        const colors = getActiveColors();

        this.cameras.main.setBackgroundColor(colors.forestGreen);

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

        this.cameras.main.fadeIn(CONFIG.FADE_DURATION, 13, 31, 13);

        // Keyboard navigation
        this.input.keyboard.on('keydown-ESC', () => {
            soundManager.buttonClick();
            this.cameras.main.fade(CONFIG.FADE_DURATION, 13, 31, 13);
            this.time.delayedCall(CONFIG.FADE_DURATION, () => {
                this.scene.start('MenuScene');
            });
        });
    }

    createHeader() {
        const width = this.cameras.main.width;
        const colors = getActiveColors();

        const headerBg = this.add.graphics();
        headerBg.fillStyle(colors.darkGreen, 0.5);
        headerBg.fillRect(0, 0, width, 80);

        // Back button
        const backBtn = this.add.container(50, 40);

        const backBg = this.add.graphics();
        backBg.fillStyle(colors.sageGreen, 0.8);
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
            soundManager.buttonClick();
            hapticManager.light();
            this.cameras.main.fade(CONFIG.FADE_DURATION, 13, 31, 13);
            this.time.delayedCall(CONFIG.FADE_DURATION, () => {
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
        const isMastered = stats.masteryLevel >= CONFIG.MAX_MASTERY_LEVEL;
        const colors = getActiveColors();

        const container = this.add.container(x, y);

        // Card shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.15);
        shadow.fillRoundedRect(-width/2 + 4, -height/2 + 4, width, height, 14);
        container.add(shadow);

        // Card background
        const bg = this.add.graphics();
        bg.fillStyle(colors.cream, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 14);

        // Border
        if (isMastered) {
            bg.lineStyle(3, colors.gold, 1);
        } else {
            bg.lineStyle(2, colors.sageGreen, 0.3);
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

        const masteryLabel = isMastered ? 'MASTERED' : `Level ${stats.masteryLevel}/${CONFIG.MAX_MASTERY_LEVEL}`;
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

        // Difficulty indicator from analytics
        const difficultyStats = analytics.data.plantDifficulty[plant.id];
        if (difficultyStats && difficultyStats.attempts > 3) {
            const errorRate = difficultyStats.errors / difficultyStats.attempts;
            let difficultyIcon = '';
            if (errorRate > 0.5) difficultyIcon = '🔴';
            else if (errorRate > 0.25) difficultyIcon = '🟡';
            else difficultyIcon = '🟢';

            this.add.text(width/2 - 20, height/2 - 20, difficultyIcon, {
                fontSize: '14px'
            }).setOrigin(0.5);
            container.add(container.list[container.list.length - 1]);
        }
    }

    getMasteryIcons(level) {
        const filled = '🌿'.repeat(level);
        const empty = '🌱'.repeat(CONFIG.MAX_MASTERY_LEVEL - level);
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
