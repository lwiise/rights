import { Quat, Vec3 } from "playcanvas";

const RAD_TO_DEG = 180 / Math.PI;
const DEG_TO_RAD = Math.PI / 180;

export class OrbitControls {
  constructor(app, cameraEntity, options = {}) {
    this.app = app;
    this.cameraEntity = cameraEntity;
    this.canvas = null;
    this.enabled = true;

    this.target = new Vec3(...(options.target || [0, 0, 0]));
    this.distance = options.distance || 4;
    this.yaw = options.yaw || 30;
    this.pitch = options.pitch || -15;

    this.minDistance = options.minDistance || 1.2;
    this.maxDistance = options.maxDistance || 18;
    this.minPitch = options.minPitch || -80;
    this.maxPitch = options.maxPitch || 80;
    this.rotateSpeed = options.rotateSpeed || 0.25;
    this.zoomSpeed = options.zoomSpeed || 0.12;
    this.panSpeed = options.panSpeed || 0.8;

    this._dragging = false;
    this._dragMode = "orbit";
    this._lastX = 0;
    this._lastY = 0;
    this._tween = null;
    this._needsUpdate = true;

    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContextMenu = this._onContextMenu.bind(this);

    this._syncFromCamera();
  }

  attach(canvas) {
    this.canvas = canvas;
    if (!this.canvas) return;
    this.canvas.style.touchAction = "none";
    this.canvas.addEventListener("pointerdown", this._onPointerDown);
    this.canvas.addEventListener("pointermove", this._onPointerMove);
    this.canvas.addEventListener("pointerup", this._onPointerUp);
    this.canvas.addEventListener("pointerleave", this._onPointerUp);
    this.canvas.addEventListener("wheel", this._onWheel, { passive: false });
    this.canvas.addEventListener("contextmenu", this._onContextMenu);
  }

  detach() {
    if (!this.canvas) return;
    this.canvas.removeEventListener("pointerdown", this._onPointerDown);
    this.canvas.removeEventListener("pointermove", this._onPointerMove);
    this.canvas.removeEventListener("pointerup", this._onPointerUp);
    this.canvas.removeEventListener("pointerleave", this._onPointerUp);
    this.canvas.removeEventListener("wheel", this._onWheel);
    this.canvas.removeEventListener("contextmenu", this._onContextMenu);
    this.canvas = null;
  }

  destroy() {
    this.detach();
    this.enabled = false;
  }

  moveTo(targetPosition, targetLookAt, duration = 900) {
    if (!targetPosition || !targetLookAt) return;
    this._tween = {
      startTime: performance.now(),
      duration,
      startPos: this.cameraEntity.getPosition().clone(),
      startTarget: this.target.clone(),
      endPos: new Vec3(...targetPosition),
      endTarget: new Vec3(...targetLookAt)
    };
    this._needsUpdate = true;
  }

  update() {
    if (!this.enabled) return;
    if (this._tween) {
      const now = performance.now();
      const t = Math.min(1, (now - this._tween.startTime) / this._tween.duration);
      const eased = t * t * (3 - 2 * t);
      const nextPos = new Vec3()
        .copy(this._tween.startPos)
        .mulScalar(1 - eased)
        .add(new Vec3().copy(this._tween.endPos).mulScalar(eased));
      const nextTarget = new Vec3()
        .copy(this._tween.startTarget)
        .mulScalar(1 - eased)
        .add(new Vec3().copy(this._tween.endTarget).mulScalar(eased));
      this.target.copy(nextTarget);
      this._setFromPosition(nextPos);
      if (t >= 1) {
        this._tween = null;
      }
      this._needsUpdate = true;
    }

    if (this._needsUpdate) {
      this._applyCameraTransform();
      this._needsUpdate = false;
    }
  }

  _applyCameraTransform() {
    const pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
    this.pitch = pitch;

    const rot = new Quat().setFromEulerAngles(this.pitch, this.yaw, 0);
    const offset = new Vec3(0, 0, this.distance);
    rot.transformVector(offset, offset);
    const pos = new Vec3().add2(this.target, offset);
    this.cameraEntity.setPosition(pos);
    this.cameraEntity.lookAt(this.target);
  }

  _syncFromCamera() {
    const pos = this.cameraEntity.getPosition();
    this._setFromPosition(pos);
  }

  _setFromPosition(pos) {
    const offset = new Vec3().sub2(pos, this.target);
    const dist = offset.length();
    if (dist > 0.0001) {
      this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, dist));
      this.pitch = Math.asin(offset.y / this.distance) * RAD_TO_DEG;
      this.yaw = Math.atan2(offset.x, offset.z) * RAD_TO_DEG;
    }
  }

  _onPointerDown(event) {
    if (!this.enabled) return;
    this._dragging = true;
    this._dragMode = event.button === 2 || event.button === 1 || event.shiftKey ? "pan" : "orbit";
    this._lastX = event.clientX;
    this._lastY = event.clientY;
    event.preventDefault();
  }

  _onPointerMove(event) {
    if (!this.enabled || !this._dragging) return;
    const dx = event.clientX - this._lastX;
    const dy = event.clientY - this._lastY;
    this._lastX = event.clientX;
    this._lastY = event.clientY;

    if (this._dragMode === "orbit") {
      this.yaw -= dx * this.rotateSpeed;
      this.pitch -= dy * this.rotateSpeed;
      this._needsUpdate = true;
      return;
    }

    const panScale = this.distance * 0.002 * this.panSpeed;
    const right = this.cameraEntity.right.clone().mulScalar(-dx * panScale);
    const up = this.cameraEntity.up.clone().mulScalar(dy * panScale);
    this.target.add(right).add(up);
    this._needsUpdate = true;
  }

  _onPointerUp() {
    this._dragging = false;
  }

  _onWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    const delta = Math.sign(event.deltaY);
    this.distance *= 1 + delta * this.zoomSpeed;
    this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
    this._needsUpdate = true;
  }

  _onContextMenu(event) {
    event.preventDefault();
  }
}
