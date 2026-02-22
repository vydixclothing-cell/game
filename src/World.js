import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

export class World {
  constructor(scene, assets) {
    this.scene = scene;
    this.assets = assets;
    this.roadWidth = 14;
    this.segmentLength = 60;
    this.segmentCount = 18;
    this.spawnCursor = 0;

    this.roadSegments = [];
    this.sideObjects = [];
    this.coins = [];
    this.obstacles = [];
    this.weatherParticles = null;
    this.currentWeather = 'summer';
    this.currentTime = 'day';

    this.setupEnvironment();
    this.createRoadPool();
    this.createObjectPools();
    this.applyTimeMode('day');
  }

  setupEnvironment() {
    this.scene.fog = new THREE.Fog(0x8eb0cf, 40, 420);

    const hemi = new THREE.HemisphereLight(0xbad8ff, 0x223311, 0.8);
    this.scene.add(hemi);

    this.sun = new THREE.DirectionalLight(0xffffff, 1.4);
    this.sun.position.set(30, 50, 20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -80;
    this.sun.shadow.camera.right = 80;
    this.sun.shadow.camera.top = 80;
    this.sun.shadow.camera.bottom = -80;
    this.scene.add(this.sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(900, 5000),
      new THREE.MeshStandardMaterial({ map: this.assets.textures.grass, color: 0x4f8b43, roughness: 0.95 })
    );
    ground.material.map.repeat.set(80, 420);
    ground.material.map.needsUpdate = true;
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1500, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x87ceeb, side: THREE.BackSide })
    );
    this.scene.add(this.sky);
  }

  createRoadPool() {
    for (let i = 0; i < this.segmentCount; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(this.roadWidth, this.segmentLength),
        new THREE.MeshStandardMaterial({
          map: this.assets.textures.road,
          roughness: 0.8,
          metalness: 0.2
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.z = -i * this.segmentLength;
      mesh.receiveShadow = true;
      mesh.userData.kind = 'road';
      mesh.material.map.repeat.set(1, 3);
      this.scene.add(mesh);
      this.roadSegments.push(mesh);
      this.spawnDecorForSegment(mesh.position.z);
    }
    this.spawnCursor = -this.segmentCount * this.segmentLength;
  }

  createObjectPools() {
    this.coinPool = this.createPool(80, () => {
      const coin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.12, 20),
        new THREE.MeshStandardMaterial({ color: 0xffd445, emissive: 0xa06400, metalness: 0.85, roughness: 0.2 })
      );
      coin.rotation.x = Math.PI / 2;
      return coin;
    }, this.coins, { halfWidth: 0.35, halfDepth: 0.35, type: 'coin' });

    this.obstaclePool = this.createPool(50, () => {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.4, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x55606e, metalness: 0.3, roughness: 0.75 })
      );
      box.castShadow = true;
      return box;
    }, this.obstacles, { halfWidth: 0.8, halfDepth: 0.8, type: 'obstacle' });

    for (let i = 0; i < 80; i += 1) this.activateCoin(-50 - i * 18);
    for (let i = 0; i < 40; i += 1) this.activateObstacle(-80 - i * 35);
  }

  createPool(size, factory, target, baseData) {
    const pool = [];
    for (let i = 0; i < size; i += 1) {
      const obj = factory();
      obj.visible = false;
      obj.userData = { ...baseData, active: false };
      this.scene.add(obj);
      pool.push(obj);
      target.push(obj);
    }
    return pool;
  }

  activateFromPool(pool, z) {
    const item = pool.find((o) => !o.userData.active);
    if (!item) return null;
    item.visible = true;
    item.userData.active = true;
    item.position.set((Math.random() * 2 - 1) * this.roadWidth * 0.38, 0.8, z);
    return item;
  }

  activateCoin(z) {
    const coin = this.activateFromPool(this.coinPool, z);
    if (coin) coin.position.y = 1.1;
  }

  activateObstacle(z) {
    const obstacle = this.activateFromPool(this.obstaclePool, z);
    if (obstacle) obstacle.position.y = 0.7;
  }

  spawnDecorForSegment(z) {
    for (let i = 0; i < 7; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const offset = this.roadWidth * 0.65 + Math.random() * 15;
      const position = new THREE.Vector3(side * offset, 0, z - Math.random() * this.segmentLength);
      const item = Math.random() < 0.7 ? this.createTree(position) : this.createHouse(position);
      this.sideObjects.push(item);
      this.scene.add(item);
    }
  }

  createTree(position) {
    const group = this.assets.models.tree?.clone() || new THREE.Group();
    if (!this.assets.models.tree) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.45, 2.4, 8),
        new THREE.MeshStandardMaterial({ map: this.assets.textures.bark, roughness: 0.95 })
      );
      trunk.position.y = 1.2;
      const crown = new THREE.Mesh(
        new THREE.ConeGeometry(1.7, 3.6, 10),
        new THREE.MeshStandardMaterial({ color: 0x2d7032, roughness: 0.9 })
      );
      crown.position.y = 3.4;
      group.add(trunk, crown);
    }
    group.position.copy(position);
    group.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return group;
  }

  createHouse(position) {
    const group = this.assets.models.house?.clone() || new THREE.Group();
    if (!this.assets.models.house) {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 2.8, 4.4),
        new THREE.MeshStandardMaterial({ color: 0xd5c5aa, roughness: 0.8 })
      );
      base.position.y = 1.4;
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(3.5, 1.8, 4),
        new THREE.MeshStandardMaterial({ map: this.assets.textures.roof, roughness: 0.7 })
      );
      roof.position.y = 3.8;
      roof.rotation.y = Math.PI / 4;
      group.add(base, roof);
    }
    group.scale.setScalar(0.95 + Math.random() * 0.5);
    group.position.copy(position);
    group.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return group;
  }

  update(carZ, dt) {
    for (const segment of this.roadSegments) {
      if (segment.position.z - carZ > this.segmentLength) {
        segment.position.z = this.spawnCursor;
        this.spawnDecorForSegment(this.spawnCursor);
        this.spawnCursor -= this.segmentLength;
        this.activateCoin(segment.position.z - Math.random() * 40);
        if (Math.random() > 0.35) this.activateObstacle(segment.position.z - 20 - Math.random() * 30);
      }
    }

    this.cleanupFarObjects(carZ);

    for (const coin of this.coins) {
      if (!coin.userData.active) continue;
      coin.rotation.y += dt * 5;
      if (coin.position.z - carZ > 20) this.deactivate(coin);
    }

    for (const obstacle of this.obstacles) {
      if (!obstacle.userData.active) continue;
      if (obstacle.position.z - carZ > 25) this.deactivate(obstacle);
    }

    if (this.weatherParticles) {
      const pos = this.weatherParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        pos.array[i * 3 + 1] -= this.currentWeather === 'winter' ? dt * 6 : dt * 17;
        if (pos.array[i * 3 + 1] < 0) pos.array[i * 3 + 1] = 40;
      }
      pos.needsUpdate = true;
    }
  }

  cleanupFarObjects(carZ) {
    this.sideObjects = this.sideObjects.filter((obj) => {
      if (obj.position.z - carZ > 30) {
        this.scene.remove(obj);
        return false;
      }
      return true;
    });
  }

  deactivate(obj) {
    obj.visible = false;
    obj.userData.active = false;
  }

  applyWeather(mode) {
    this.currentWeather = mode;
    if (this.weatherParticles) this.scene.remove(this.weatherParticles);
    this.weatherParticles = null;

    if (mode === 'summer') {
      this.sun.intensity = this.currentTime === 'day' ? 1.6 : 0.4;
      return;
    }

    const count = 1200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      pos[i * 3] = (Math.random() * 2 - 1) * 30;
      pos[i * 3 + 1] = Math.random() * 40;
      pos[i * 3 + 2] = -Math.random() * 220;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: mode === 'winter' ? 0xffffff : 0x7db4d8, size: mode === 'winter' ? 0.25 : 0.12 });
    this.weatherParticles = new THREE.Points(g, m);
    this.scene.add(this.weatherParticles);

    if (mode === 'rainy') {
      this.sun.intensity = this.currentTime === 'day' ? 0.9 : 0.25;
      this.roadSegments.forEach((seg) => {
        seg.material.roughness = 0.25;
        seg.material.metalness = 0.45;
      });
    } else if (mode === 'winter') {
      this.sun.intensity = this.currentTime === 'day' ? 1.05 : 0.3;
      this.scene.fog.color.setHex(0xc8d3de);
    }
  }

  applyTimeMode(mode) {
    this.currentTime = mode;
    const isDay = mode === 'day';
    this.sky.material.color.setHex(isDay ? 0x87ceeb : 0x070b1b);
    this.scene.fog.color.setHex(isDay ? 0x8eb0cf : 0x0b1324);
    this.sun.color.setHex(isDay ? 0xffffff : 0x9ab8ff);
    this.sun.intensity = isDay ? 1.3 : 0.38;
  }
}
