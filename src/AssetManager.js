import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.161.0/examples/jsm/loaders/GLTFLoader.js';

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA=';

export class AssetManager {
  constructor() {
    this.assets = { textures: {}, models: {}, sounds: {} };
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
  }

  async loadAll(onProgress = () => {}) {
    const tasks = [
      () => this.loadProceduralTexture('road'),
      () => this.loadProceduralTexture('grass'),
      () => this.loadProceduralTexture('bark'),
      () => this.loadProceduralTexture('roof'),
      () => this.loadOptionalModel('car', './assets/models/car.glb'),
      () => this.loadOptionalModel('tree', './assets/models/tree.glb'),
      () => this.loadOptionalModel('house', './assets/models/house.glb'),
      () => this.loadOptionalModel('human', './assets/models/human.glb'),
      () => this.loadSound('coin', SILENT_WAV),
      () => this.loadSound('engine', SILENT_WAV),
      () => this.loadSound('boost', SILENT_WAV)
    ];

    let done = 0;
    for (const task of tasks) {
      await task();
      done += 1;
      onProgress(done / tasks.length);
    }

    return this.assets;
  }

  async loadProceduralTexture(name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    if (name === 'road') {
      ctx.fillStyle = '#2f2f2f';
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = '#ffd86a';
      ctx.setLineDash([20, 18]);
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(128, 0);
      ctx.lineTo(128, 256);
      ctx.stroke();
    } else {
      const palette = {
        grass: ['#2f7332', '#3f8a3c'],
        bark: ['#5f3d1e', '#764d23'],
        roof: ['#6f2424', '#7f3e3e']
      }[name] || ['#888', '#999'];
      ctx.fillStyle = palette[0];
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1200; i += 1) {
        ctx.fillStyle = i % 2 ? palette[1] : palette[0];
        ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    this.assets.textures[name] = texture;
    return texture;
  }

  async loadOptionalModel(key, path) {
    try {
      const gltf = await this.gltfLoader.loadAsync(path);
      this.assets.models[key] = gltf.scene;
    } catch {
      this.assets.models[key] = null;
    }
  }

  async loadSound(key, path) {
    const audio = new Audio(path);
    audio.preload = 'auto';
    this.assets.sounds[key] = audio;
  }
}
