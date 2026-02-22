export class UIManager {
  constructor() {
    this.elements = {
      loadingScreen: document.getElementById('loading-screen'),
      loadingProgress: document.getElementById('loading-progress'),
      loadingText: document.getElementById('loading-text'),
      mainMenu: document.getElementById('main-menu'),
      subLoading: document.getElementById('sub-loading'),
      hud: document.getElementById('hud'),
      menuCoinCount: document.getElementById('menu-coin-count'),
      hudScore: document.getElementById('hud-score'),
      hudSpeed: document.getElementById('hud-speed'),
      hudCoins: document.getElementById('hud-coins'),
      hudPowerup: document.getElementById('hud-powerup'),
      hudCamera: document.getElementById('hud-camera'),
      settingsModal: document.getElementById('settings-modal'),
      shopModal: document.getElementById('shop-modal'),
      carShopList: document.getElementById('car-shop-list'),
      seasonShopList: document.getElementById('season-shop-list'),
      playBtn: document.getElementById('play-btn'),
      settingsBtn: document.getElementById('settings-btn'),
      shopBtn: document.getElementById('shop-btn'),
      toggleSfx: document.getElementById('toggle-sfx'),
      toggleEngine: document.getElementById('toggle-engine'),
      toggleTimeMode: document.getElementById('toggle-time-mode')
    };
  }

  show(id, enabled) {
    this.elements[id].classList.toggle('hidden', !enabled);
  }

  setLoadingProgress(value) {
    const v = Math.round(value * 100);
    this.elements.loadingProgress.style.width = `${v}%`;
    this.elements.loadingText.textContent = `Loading assets ${v}%`;
  }

  updateHUD({ score, speed, coins, powerup, camera }) {
    this.elements.hudScore.textContent = Math.floor(score);
    this.elements.hudSpeed.textContent = Math.floor(speed * 3.6);
    this.elements.hudCoins.textContent = coins;
    this.elements.hudPowerup.textContent = powerup;
    this.elements.hudCamera.textContent = camera;
    this.elements.menuCoinCount.textContent = coins;
  }

  buildShop(cars, seasons, onBuyCar, onBuySeason) {
    this.elements.carShopList.innerHTML = '';
    cars.forEach((car) => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `<span>${car.name} (${car.price} coins)</span><button>${car.unlocked ? 'Select' : 'Buy'}</button>`;
      row.querySelector('button').addEventListener('click', () => onBuyCar(car));
      this.elements.carShopList.appendChild(row);
    });

    this.elements.seasonShopList.innerHTML = '';
    seasons.forEach((season) => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `<span>${season.name} (${season.price} coins)</span><button>${season.unlocked ? 'Select' : 'Buy'}</button>`;
      row.querySelector('button').addEventListener('click', () => onBuySeason(season));
      this.elements.seasonShopList.appendChild(row);
    });
  }
}
