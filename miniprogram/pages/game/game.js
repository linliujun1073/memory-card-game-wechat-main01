// game.js - 游戏主页面
const cloudUtil = require('../../utils/cloud');
const difficultyUtil = require('../../utils/difficulty');
const storageUtil = require('../../utils/storage');

Page({
  data: {
    levelId: 1,
    difficulty: 'normal',
    levelConfig: null,
    cards: [],
    flippedCards: [],
    matchedPairs: 0,
    totalPairs: 0,
    score: 0,
    mistakes: 0,
    timeLeft: 0,
    timer: null,
    isGameOver: false,
    isPaused: false,
    isLocked: false,
    gameStarted: false,
    gameStats: {
      flips: 0,
      matches: 0,
      startTime: 0,
      endTime: 0
    }
  },

  onLoad(options) {
    const levelId = parseInt(options.level) || 1;
    const difficulty = options.difficulty || difficultyUtil.getCurrentDifficulty();
    const levelConfig = difficultyUtil.getLevelConfig(difficulty, levelId);

    this.setData({
      levelId,
      difficulty,
      levelConfig,
      totalPairs: levelConfig.pairs,
      timeLeft: levelConfig.timeLimit,
      score: levelConfig.baseScore
    });
  },

  onReady() {
    this.initGame();
  },

  onUnload() {
    this.clearTimer();
  },

  initGame() {
    const { levelConfig } = this.data;
    const pairs = levelConfig.pairs;
    const cardValues = this.generateCardValues(pairs);
    const cards = this.shuffleCards(cardValues);

    this.setData({
      cards: cards.map((value, index) => ({
        id: index,
        value,
        isFlipped: false,
        isMatched: false
      })),
      flippedCards: [],
      matchedPairs: 0,
      mistakes: 0,
      isGameOver: false,
      isPaused: false,
      isLocked: false,
      gameStarted: false,
      gameStats: {
        flips: 0,
        matches: 0,
        startTime: 0,
        endTime: 0
      }
    });

    this.startTimer();
  },

  generateCardValues(pairs) {
    const values = [];
    for (let i = 0; i < pairs; i++) {
      const value = Math.floor(Math.random() * 100);
      values.push(value, value);
    }
    return values;
  },

  shuffleCards(cards) {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  startTimer() {
    this.clearTimer();
    const timer = setInterval(() => {
      if (this.data.isPaused || this.data.isGameOver) return;

      if (!this.data.gameStarted) {
        this.setData({ gameStarted: true });
        this.data.gameStats.startTime = Date.now();
      }

      this.setData({ timeLeft: this.data.timeLeft - 1 });

      if (this.data.timeLeft <= 0) {
        this.clearTimer();
        this.gameOver(false);
      }
    }, 1000);

    this.setData({ timer });
  },

  clearTimer() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
  },

  onCardTap(e) {
    if (this.data.isLocked || this.data.isGameOver || this.data.isPaused) return;

    const cardId = e.currentTarget.dataset.cardId;
    const card = this.data.cards.find(c => c.id === cardId);

    if (!card || card.isFlipped || card.isMatched) return;

    const { flippedCards, cards } = this.data;
    const newCards = cards.map(c =>
      c.id === cardId ? { ...c, isFlipped: true } : c
    );

    flippedCards.push(cardId);
    this.setData({
      cards: newCards,
      flippedCards,
      'gameStats.flips': this.data.gameStats.flips + 1
    });

    if (flippedCards.length === 2) {
      this.isLocked = true;
      this.checkMatch();
    }
  },

  checkMatch() {
    const { cards, flippedCards, levelConfig } = this.data;
    const [firstId, secondId] = flippedCards;
    const firstCard = cards.find(c => c.id === firstId);
    const secondCard = cards.find(c => c.id === secondId);

    if (firstCard.value === secondCard.value) {
      const newCards = cards.map(c =>
        c.id === firstId || c.id === secondId
          ? { ...c, isMatched: true }
          : c
      );

      const matchedPairs = this.data.matchedPairs + 1;
      const score = this.data.score + levelConfig.baseScore;

      this.setData({
        cards: newCards,
        matchedPairs,
        score,
        flippedCards: [],
        isLocked: false,
        'gameStats.matches': this.data.gameStats.matches + 1
      });

      if (matchedPairs === this.data.totalPairs) {
        this.gameOver(true);
      }
    } else {
      this.setData({ mistakes: this.data.mistakes + 1 });

      setTimeout(() => {
        const newCards = cards.map(c =>
          c.id === firstId || c.id === secondId
            ? { ...c, isFlipped: false }
            : c
        );
        this.setData({
          cards: newCards,
          flippedCards: [],
          isLocked: false
        });
      }, 800);
    }
  },

  gameOver(isWin) {
    this.clearTimer();
    this.setData({
      isGameOver: true,
      'gameStats.endTime': Date.now()
    });

    const { levelId, difficulty, score, mistakes, timeLeft, levelConfig, gameStats } = this.data;
    const finalScore = isWin ? score + (timeLeft * levelConfig.timeBonus) : score;

    storageUtil.updatePlayerProgress(isWin, levelId, finalScore, mistakes);
    storageUtil.checkAndUnlockAchievements({
      isWin,
      level: levelId,
      score: finalScore,
      mistakes,
      totalWins: storageUtil.getPlayerProgress().totalWins
    });

    if (cloudUtil && cloudUtil.addScore) {
      cloudUtil.addScore({
        level: levelId,
        difficulty,
        score: finalScore,
        isWin,
        remainingTime: timeLeft
      });
    }

    const gameData = {
      isWin,
      level: levelId,
      difficulty,
      score: finalScore,
      mistakes,
      timeLeft,
      duration: gameStats.endTime - gameStats.startTime,
      flips: gameStats.flips,
      matches: gameStats.matches
    };

    wx.redirectTo({
      url: `/pages/result/result?data=${encodeURIComponent(JSON.stringify(gameData))}`
    });
  },

  onPause() {
    this.setData({ isPaused: true });
  },

  onResume() {
    this.setData({ isPaused: false });
  },

  onGiveUp() {
    wx.showModal({
      title: '确定放弃',
      content: '确定要放弃当前游戏吗？',
      success: (res) => {
        if (res.confirm) {
          this.gameOver(false);
        }
      }
    });
  }
});