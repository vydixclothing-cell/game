import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

export class Car {
  constructor(assets) {
    this.group = new THREE.Group();
    this.group.speed = 28;
    this.group.lateralVelocity = 0;

    const model = assets.models.car?.clone();
    if (model) {
      model.scale.setScalar(1.7);
      this.group.add(model);
    } else {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.7, 4.2),
        new THREE.MeshStandardMaterial({ color: 0xc81f34, metalness: 0.6, roughness: 0.35 })
      );
      body.position.y = 0.95;
      body.castShadow = true;
      this.group.add(body);

      const cabin = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.55, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x1d1d24, metalness: 0.8, roughness: 0.1 })
      );
      cabin.position.set(0, 1.35, -0.2);
      cabin.castShadow = true;
      this.group.add(cabin);

      const wheelGeometry = new THREE.CylinderGeometry(0.42, 0.42, 0.34, 20);
      const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.9 });
      [[-0.85, 0.45, 1.35], [0.85, 0.45, 1.35], [-0.85, 0.45, -1.35], [0.85, 0.45, -1.35]].forEach(([x, y, z]) => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(x, y, z);
        wheel.rotation.z = Math.PI / 2;
        wheel.castShadow = true;
        this.group.add(wheel);
      });
    }

    const human = assets.models.human?.clone() || this.createHumanPlaceholder();
    human.position.set(0, 1.2, 0.4);
    human.scale.setScalar(0.5);
    this.group.add(human);

    this.group.position.set(0, 0, 0);
    this.group.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  createHumanPlaceholder() {
    const g = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 6, 10), new THREE.MeshStandardMaterial({ color: 0x2255aa }));
    torso.position.y = 0.4;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshStandardMaterial({ color: 0xf2c29a }));
    head.position.y = 0.95;
    g.add(torso, head);
    return g;
  }
}
