import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.161.0/examples/jsm/postprocessing/UnrealBloomPass.js';
import { AssetManager } from './AssetManager.js';
import { World } from './World.js';
import { Car } from './Car.js';
import { Physics } from './Physics.js';
import { InputManager } from './InputManager.js';
import { UIManager } from './UIManager.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.input = new InputManager();
    this.ui = new UIManager();
    this.assetManager = new AssetManager();
    this.settings = JSON.parse(localStorage.getItem('settings') || '{"sfx":true,"engine":true}');
    this.coins = Number(localStorage.getItem('coins') || 0);
    this.score = 0;
    this.gameState = 'boot';

    this.carOptions = [
      { id: 'street', name: 'Street GT', price: 0, unlocked: true, stats: { maxSpeed: 62, acceleration: 30, brake: 42 } },
      { id: 'turbo', name: 'Turbo X', price: 120, unlocked: false, stats: { maxSpeed: 72, acceleration: 32, brake: 46 } },
      { id: 'vintage', name: 'Vintage RS', price: 200, unlocked: false, stats: { maxSpeed: 66, acceleration: 27, brake: 43 } },
      { id: 'hyper', name: 'Hyper Flux', price: 350, unlocked: false, stats: { maxSpeed: 82, acceleration: 35, brake: 48 } },
      { id: 'drift', name: 'Drift One', price: 450, unlocked: false, stats: { maxSpeed: 76, acceleration: 34, brake: 41 } }
    ];

    this.seasons = [
      { id: 'summer', name: 'Summer', price: 0, unlocked: true },
      { id: 'rainy', name: 'Rainy', price: 180, unlocked: false },
      { id: 'winter', name: 'Winter', price: 280, unlocked: false }
    ];

    this.activeCar = this.carOptions[0];
    this.activeSeason = this.seasons[0];
    this.timeMode = 'day';
    this.powerup = { type: 'None', timer: 0 };

    this.cameras = [
      { name: 'Chase', offset: new THREE.Vector3(0, 6, 14), lookAt: new THREE.Vector3(0, 1.2, -12) },
      { name: 'Top', offset: new THREE.Vector3(0, 25, 0.1), lookAt: new THREE.Vector3(0, 0, -25) },
      { name: 'Driver', offset: new THREE.Vector3(0, 2.2, -0.6), lookAt: new THREE.Vector3(0, 2.0, -30) }
    ];
    this.cameraIndex = 0;
    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 2000);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.28, 0.4, 0.7));

    this.bindUI();
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  bindUI() {
    const e = this.ui.elements;
    e.toggleSfx.checked = this.settings.sfx;
    e.toggleEngine.checked = this.settings.engine;

    e.playBtn.addEventListener('click', () => this.beginPlayFlow());
    e.settingsBtn.addEventListener('click', () => this.ui.show('settingsModal', true));
    e.shopBtn.addEventListener('click', () => {
      this.refreshShop();
      this.ui.show('shopModal', true);
    });

    [...document.querySelectorAll('.close-modal')].forEach((btn) => {
      btn.addEventListener('click', () => {
        this.ui.show('settingsModal', false);
        this.ui.show('shopModal', false);
      });
    });

    e.toggleSfx.addEventListener('change', () => this.saveSettings());
    e.toggleEngine.addEventListener('change', () => this.saveSettings());
    e.toggleTimeMode.addEventListener('click', () => {
      this.timeMode = this.timeMode === 'day' ? 'night' : 'day';
      if (this.world) this.world.applyTimeMode(this.timeMode);
    });
  }

  saveSettings() {
    this.settings = { sfx: this.ui.elements.toggleSfx.checked, engine: this.ui.elements.toggleEngine.checked };
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  async init() {
    await this.assetManager.loadAll((progress) => this.ui.setLoadingProgress(progress));
    this.ui.show('loadingScreen', false);
    this.ui.show('mainMenu', true);
    this.gameState = 'menu';
    this.loop();
  }

  async beginPlayFlow() {
    this.ui.show('mainMenu', false);
    this.ui.show('subLoading', true);

    await new Promise((resolve) => setTimeout(resolve, 500));
    this.startGame();

    this.ui.show('subLoading', false);
    this.ui.show('hud', true);
    this.gameState = 'playing';
  }

  startGame() {
    this.scene.clear();
    this.world = new World(this.scene, this.assetManager.assets);
    this.world.applyWeather(this.activeSeason.id);
    this.world.applyTimeMode(this.timeMode);

    this.car = new Car(this.assetManager.assets);
    this.scene.add(this.car.group);

    this.stats = {
      roadWidth: this.world.roadWidth,
      minSpeed: 16,
      maxSpeed: this.activeCar.stats.maxSpeed,
      acceleration: this.activeCar.stats.acceleration,
      friction: 0.55,
      brake: this.activeCar.stats.brake,
      steering: 19
    };

    this.score = 0;
    this.powerup = { type: 'None', timer: 0 };
  }

  refreshShop() {
    this.ui.buildShop(
      this.carOptions,
      this.seasons,
      (car) => this.handleCarShop(car),
      (season) => this.handleSeasonShop(season)
    );
  }

  handleCarShop(car) {
    if (!car.unlocked && this.coins >= car.price) {
      car.unlocked = true;
      this.coins -= car.price;
    }
    if (car.unlocked) this.activeCar = car;
    this.persistCoins();
    this.refreshShop();
  }

  handleSeasonShop(season) {
    if (!season.unlocked && this.coins >= season.price) {
      season.unlocked = true;
      this.coins -= season.price;
    }
    if (season.unlocked) {
      this.activeSeason = season;
      if (this.world) this.world.applyWeather(season.id);
    }
    this.persistCoins();
    this.refreshShop();
  }

  persistCoins() {
    localStorage.setItem('coins', this.coins);
  }

  applyPowerup(type) {
    this.powerup.type = type;
    this.powerup.timer = 10;
  }

  updatePlaying(dt) {
    if (this.input.consume('KeyC')) this.cameraIndex = (this.cameraIndex + 1) % this.cameras.length;

    Physics.updateCar(this.car.group, dt, this.input, this.stats);
    this.world.update(this.car.group.position.z, dt);

    this.score += this.car.group.speed * dt;

    for (const coin of this.world.coins) {
      if (!coin.userData.active) continue;
      const magnetPull = this.powerup.type === 'Magnet';
      if (magnetPull) {
        coin.position.x = THREE.MathUtils.lerp(coin.position.x, this.car.group.position.x, dt * 2.8);
      }
      if (Physics.intersects({ position: this.car.group.position, halfWidth: 0.9, halfDepth: 1.9 }, { position: coin.position, halfWidth: coin.userData.halfWidth, halfDepth: coin.userData.halfDepth })) {
        this.coins += 1;
        this.world.deactivate(coin);
        if (Math.random() < 0.04) this.applyPowerup(Math.random() > 0.5 ? 'Super Boost' : 'Magnet');
      }
    }

    for (const obstacle of this.world.obstacles) {
      if (!obstacle.userData.active) continue;
      if (Physics.intersects({ position: this.car.group.position, halfWidth: 1.0, halfDepth: 2.0 }, { position: obstacle.position, halfWidth: obstacle.userData.halfWidth, halfDepth: obstacle.userData.halfDepth })) {
        this.car.group.speed *= 0.55;
        this.world.deactivate(obstacle);
      }
    }

    if (this.powerup.timer > 0) {
      this.powerup.timer -= dt;
      if (this.powerup.type === 'Super Boost') {
        this.car.group.speed = Math.min(this.car.group.speed + dt * 16, this.stats.maxSpeed + 20);
      }
      if (this.powerup.timer <= 0) this.powerup.type = 'None';
    }

    this.updateCamera(dt);
    this.ui.updateHUD({
      score: this.score,
      speed: this.car.group.speed,
      coins: this.coins,
      powerup: this.powerup.timer > 0 ? `${this.powerup.type} ${this.powerup.timer.toFixed(1)}s` : 'None',
      camera: this.cameras[this.cameraIndex].name
    });

    this.persistCoins();
  }

  updateCamera(dt) {
    const mode = this.cameras[this.cameraIndex];
    const targetPos = this.car.group.position.clone().add(mode.offset);
    this.camera.position.lerp(targetPos, Math.min(1, dt * 4.5));
    const look = this.car.group.position.clone().sub(mode.lookAt);
    this.camera.lookAt(look);
  }

  loop = () => {
    const dt = Math.min(this.clock.getDelta(), 0.033);
    requestAnimationFrame(this.loop);

    if (this.gameState === 'playing' && this.car && this.world) this.updatePlaying(dt);

    this.composer.render();
  };

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.composer.setSize(innerWidth, innerHeight);
  }
}
