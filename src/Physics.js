import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';

export class Physics {
  static updateCar(car, dt, input, stats) {
    const accel = input.isDown('ArrowUp') || input.isDown('KeyW') ? stats.acceleration : 0;
    const brake = input.isDown('ArrowDown') || input.isDown('KeyS') ? stats.brake : 0;
    const turn = (input.isDown('ArrowLeft') || input.isDown('KeyA') ? 1 : 0) - (input.isDown('ArrowRight') || input.isDown('KeyD') ? 1 : 0);

    car.speed += (accel - brake - stats.friction * car.speed) * dt;
    car.speed = THREE.MathUtils.clamp(car.speed, stats.minSpeed, stats.maxSpeed);

    const steerStrength = THREE.MathUtils.clamp(car.speed / stats.maxSpeed, 0.2, 1);
    car.lateralVelocity += -turn * stats.steering * steerStrength * dt;
    car.lateralVelocity *= 0.9;

    car.position.z -= car.speed * dt;
    car.position.x += car.lateralVelocity * dt;
    car.position.x = THREE.MathUtils.clamp(car.position.x, -stats.roadWidth * 0.45, stats.roadWidth * 0.45);

    car.rotation.y = THREE.MathUtils.lerp(car.rotation.y, -car.lateralVelocity * 0.2, 0.1);
  }

  static intersects(a, b) {
    return (
      Math.abs(a.position.x - b.position.x) < a.halfWidth + b.halfWidth &&
      Math.abs(a.position.z - b.position.z) < a.halfDepth + b.halfDepth
    );
  }
}
