import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { initRenderer, initCamera, initSceneEnvironment } from './renderer.js';
import { createDitherPass, updateDitherUniforms } from './dither.js';
import { createAtmosphereState, sampleAtmosphere, updateLightRig } from './atmosphere.js';
import { createRipplePlane, triggerRipple, updateRipple } from './ripple.js';
import {
  createSkyDome,
  updateSkyDome,
  createCelestialSystem,
  updateCelestialSystem,
  createStarfield,
  updateStarfield,
  setStarfieldPixelRatio,
} from './sky.js';
import {
  createWorkstationGroup,
  updateWorkstation,
  createContactShadow,
  updateContactShadow,
} from './workstation.js';
import { createPromptParticles, createSteamParticles } from './particles.js';

/**
 * Owns the WebGL renderer, scene graph, post-processing chain, and render loop.
 *   new HeroScene(container, { initialTime })
 *   scene.setTimeOfDay(t)  // 0 daylight · 0.46 dusk · 0.66 twilight · 1 midnight
 *   scene.start() / stop() / dispose()
 */
export class HeroScene {
  constructor(container, { initialTime = 0 } = {}) {
    if (!container) throw new Error('HeroScene needs a container element.');

    this.container = container;
    this.targetTimeOfDay = THREE.MathUtils.clamp(initialTime, 0, 1);
    this.currentTimeOfDay = this.targetTimeOfDay;

    this.onTimeChange = null;

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.parallaxStrength = 0.26;
    this.pointerTarget = new THREE.Vector2(0, 0);
    this.pointerCurrent = new THREE.Vector2(0, 0);
    this.entrance = this.reducedMotion ? 1 : 0;

    this.atmosphere = createAtmosphereState();
    this.cameraBase = new THREE.Vector3(1.95, 1.95, 5.6);
    this.cameraLook = new THREE.Vector3(-0.75, 1.35, 0);
    this.compact = false;
    this.screenWorld = new THREE.Vector3();
    this.coreWorld = new THREE.Vector3();

    this._raycaster = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hitPoint = new THREE.Vector3();

    this.elapsed = 0;
    this.running = false;
    this._resizeRaf = 0;
    this.isVisible = true;
    this.disposed = false;
    this.width = 0;
    this.height = 0;
    this._lastUiCall = 0;
    this._lastPhase = '';

    this.clock = new THREE.Clock();
    this._listeners = null;

    this._init();
  }

  _init() {
    const { width, height } = this._measure();
    this.width = width;
    this.height = height;

    this.renderer = initRenderer(this.container);
    this.scene = new THREE.Scene();
    this.camera = initCamera(width / height);
    initSceneEnvironment(this.scene);

    const sun = new THREE.DirectionalLight('#ffffff', 2.4);
    sun.position.set(-6, 9, 4);
    const ambient = new THREE.AmbientLight('#ffffff', 1);
    const hemi = new THREE.HemisphereLight('#ffffff', '#445544', 0.6);
    const screen = new THREE.PointLight('#ffffff', 0, 8, 2);
    const core = new THREE.PointLight('#ffffff', 0, 8, 2);
    this.scene.add(sun, sun.target, ambient, hemi, screen, core);
    this.lights = { sun, ambient, hemi, screen, core };

    const dpr = this.renderer.getPixelRatio();

    this.skyDome = createSkyDome();
    this.scene.add(this.skyDome.mesh);

    this.starfield = createStarfield({ pixelRatio: dpr });
    this.scene.add(this.starfield.group);

    this.celestial = createCelestialSystem();
    this.scene.add(this.celestial.group);

    const isNarrow = width < 760;
    this.ripple = createRipplePlane({ segments: isNarrow ? 130 : 200 });
    this.scene.add(this.ripple.mesh);

    this.workstation = createWorkstationGroup({ pixelRatio: dpr });
    this.scene.add(this.workstation.group);

    this.workstation.terminal.texture.anisotropy = Math.min(
      4,
      this.renderer.capabilities.getMaxAnisotropy(),
    );

    this.contactShadow = createContactShadow();
    this.scene.add(this.contactShadow.mesh);

    this.promptParticles = createPromptParticles({
      start: this.workstation.localPoints.keyboard,
      end: this.workstation.localPoints.core,
      count: 54,
      pixelRatio: dpr,
    });
    this.workstation.group.add(this.promptParticles.points);

    this.steamParticles = createSteamParticles({
      origin: this.workstation.localPoints.steam,
      count: 12,
      pixelRatio: dpr,
    });
    this.workstation.group.add(this.steamParticles.points);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.outputPass = new OutputPass();
    this.ditherPass = createDitherPass();

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.outputPass);
    this.composer.addPass(this.ditherPass);

    this.handleResize();
  }

  _measure() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    return { width: Math.max(width, 1), height: Math.max(height, 1) };
  }

  setTimeOfDay(normalizedValue, { immediate = false } = {}) {
    this.targetTimeOfDay = THREE.MathUtils.clamp(Number(normalizedValue) || 0, 0, 1);
    if (immediate || !this.running) {
      this.currentTimeOfDay = this.targetTimeOfDay;
      this._lastPhase = '';
      if (this.onTimeChange) this.onTimeChange(this.currentTimeOfDay);
    }
  }

  updateSmoothTime(deltaTime) {
    const diff = Math.abs(this.targetTimeOfDay - this.currentTimeOfDay);
    const speed = this.reducedMotion ? 24 : diff > 0.18 ? 3.6 : 7.5;
    const k = 1 - Math.exp(-speed * deltaTime);
    this.currentTimeOfDay += (this.targetTimeOfDay - this.currentTimeOfDay) * k;

    if (Math.abs(this.targetTimeOfDay - this.currentTimeOfDay) < 0.00025) {
      this.currentTimeOfDay = this.targetTimeOfDay;
    }
  }

  _applyAtmosphere(atm) {
    this.scene.background.copy(atm.background);
    this.scene.fog.color.copy(atm.fog);
    this.scene.fog.density = atm.fogDensity;
    this.renderer.toneMappingExposure = atm.exposure;
  }

  _updateSmoothPointer(deltaTime) {
    if (this.reducedMotion) {
      this.pointerCurrent.set(0, 0);
      return;
    }
    const k = 1 - Math.exp(-3.4 * deltaTime);
    this.pointerCurrent.lerp(this.pointerTarget, k);
  }

  _updateCamera(deltaTime) {
    if (this.entrance < 1) {
      this.entrance = Math.min(1, this.entrance + deltaTime / 0.9);
    }
    const ease = 1 - Math.pow(1 - this.entrance, 3);
    const introOffset = 1 - ease;

    this.camera.position.set(
      this.cameraBase.x + this.pointerCurrent.x * this.parallaxStrength,
      this.cameraBase.y - this.pointerCurrent.y * this.parallaxStrength * 0.5 + introOffset * 0.12,
      this.cameraBase.z + introOffset * 0.45,
    );
    this.camera.lookAt(this.cameraLook);
  }

  _tick = () => {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._tick);

    const rawDelta = this.clock.getDelta();
    const deltaTime = Math.min(rawDelta, 0.05);
    const timeDelta = Math.min(rawDelta, 0.25);
    this.elapsed += deltaTime;

    this.updateSmoothTime(timeDelta);
    const timeOfDay = this.currentTimeOfDay;
    const atm = sampleAtmosphere(timeOfDay, this.atmosphere);
    this._applyAtmosphere(atm);

    this._updateSmoothPointer(deltaTime);
    this._updateCamera(deltaTime);

    const motionTime = this.reducedMotion ? 0 : this.elapsed;
    const motionDt = this.reducedMotion ? 0 : deltaTime;

    updateCelestialSystem(
      this.celestial,
      this.camera,
      this.cameraBase,
      this.cameraLook,
      timeOfDay,
      motionTime,
      this.compact,
    );
    updateSkyDome(this.skyDome, atm, this.celestial, motionTime);
    updateStarfield(this.starfield, atm, motionTime, atm.night, this.reducedMotion);

    updateWorkstation(
      this.workstation,
      motionTime,
      motionDt,
      atm.night,
      atm,
      this.reducedMotion ? null : this.pointerCurrent,
    );
    this.workstation.group.updateMatrixWorld(true);
    this.workstation.screenAnchor.getWorldPosition(this.screenWorld);
    this.workstation.core.coreAnchor.getWorldPosition(this.coreWorld);

    this.lights.screen.position.copy(this.screenWorld);
    this.lights.core.position.copy(this.coreWorld);
    updateLightRig(this.lights, atm, this.celestial);

    updateRipple(this.ripple, atm, this.screenWorld, this.coreWorld, this.celestial);
    this.ripple.uniforms.uTime.value = motionTime;

    this.promptParticles.update(motionTime, atm, motionDt);
    this.steamParticles.update(motionTime, atm, motionDt);

    updateContactShadow(this.contactShadow, atm, this.celestial);

    this.ditherPass.uniforms.uTime.value = motionTime;
    this.composer.render(deltaTime);

    this._publishTime(atm);
  };

  _publishTime(atm) {
    if (!this.onTimeChange) return;
    const now = performance.now();
    if (atm.status === this._lastPhase && now - this._lastUiCall < 1000 / 24) return;
    this._lastPhase = atm.status;
    this._lastUiCall = now;
    this.onTimeChange(this.currentTimeOfDay);
  }

  _onPointerMove = (event) => {
    if (this.reducedMotion || event.pointerType === 'touch') return;
    const nx = (event.clientX / Math.max(window.innerWidth, 1)) * 2 - 1;
    const ny = (event.clientY / Math.max(window.innerHeight, 1)) * 2 - 1;
    this.pointerTarget.set(
      THREE.MathUtils.clamp(nx, -1, 1),
      THREE.MathUtils.clamp(ny, -1, 1),
    );
  };

  _onPointerDown = (event) => {
    if (this.reducedMotion || event.button !== 0) return;
    if (event.target !== this.renderer.domElement) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    this._ndc.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this._raycaster.setFromCamera(this._ndc, this.camera);
    if (this._raycaster.ray.intersectPlane(this._waterPlane, this._hitPoint)) {
      const len = Math.hypot(this._hitPoint.x, this._hitPoint.z);
      if (len <= 22) {
        triggerRipple(this.ripple, this._hitPoint.x, this._hitPoint.z, this.elapsed, 1.0);
      }
    }
  };

  _resetPointer = () => {
    this.pointerTarget.set(0, 0);
  };

  handleResize = () => {
    if (this.disposed || this._resizeRaf) return;
    // A mobile URL bar or an orientation flip fires resize in bursts; measure
    // once per frame instead of reallocating render targets for every event.
    this._resizeRaf = requestAnimationFrame(() => {
      this._resizeRaf = 0;
      this._applyResize();
    });
  };

  _applyResize() {
    if (this.disposed) return;

    const { width, height } = this._measure();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    // A pixel or two of viewport churn while scrolling is not a layout change;
    // resizing for it re-quantises the dither grid and shows up as flicker.
    if (width === this.width && Math.abs(height - this.height) <= 2 && dpr === this._lastDpr) {
      return;
    }

    this.width = width;
    this.height = height;
    this._lastDpr = dpr;

    const narrow = width < 760;
    const compact = narrow || height > width * 1.05;
    this.compact = compact;

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(width, height);

    this.camera.aspect = width / height;
    this.camera.fov = compact ? 42 : 38;
    this.camera.updateProjectionMatrix();

    if (compact) {
      this.cameraBase.set(1.8, 2.7, 10.4);
      this.cameraLook.set(0.1, 0.25, 0);
      this.parallaxStrength = 0.1;
    } else {
      this.cameraBase.set(1.95, 1.95, 5.6);
      this.cameraLook.set(-0.75, 1.35, 0);
      this.parallaxStrength = 0.26;
    }

    updateDitherUniforms(this.ditherPass, width, height, dpr);
    this.ditherPass.uniforms.uPixelSize.value = (narrow ? 2.2 : 2.0) * dpr;

    this.promptParticles.setPixelRatio(dpr);
    this.steamParticles.setPixelRatio(dpr);
    setStarfieldPixelRatio(this.starfield, dpr);

    this._updateCamera(0);
  };

  _bind() {
    if (this._listeners) return;
    this._listeners = new AbortController();
    const { signal } = this._listeners;

    window.addEventListener('pointermove', this._onPointerMove, { passive: true, signal });
    window.addEventListener('blur', this._resetPointer, { signal });
    window.addEventListener('resize', this.handleResize, { signal });
    document.addEventListener('visibilitychange', this._onVisibilityChange, { signal });

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this._onPointerDown, { passive: true, signal });
    canvas.addEventListener('webglcontextlost', this._onContextLost, { signal });
    canvas.addEventListener('webglcontextrestored', this._onContextRestored, { signal });
  }

  _onVisibilityChange = () => {
    if (document.hidden) {
      this._pause();
    } else if (this.isVisible) {
      this._resume();
    }
  };

  _onContextLost = (event) => {
    event.preventDefault();
    this._pause();
  };

  _onContextRestored = () => {
    this.handleResize();
    this._resume();
  };

  _resume() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.clock.getDelta();
    this._raf = requestAnimationFrame(this._tick);
  }

  _pause() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  start() {
    if (this.disposed) return;
    this._bind();
    this._observe();
    this.isVisible = true;
    this._resume();
  }

  stop() {
    this._pause();
  }

  _observe() {
    if (!this._observer && 'IntersectionObserver' in window) {
      this._observer = new IntersectionObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        this.isVisible = entry.isIntersecting;
        if (this.isVisible && !document.hidden) this._resume();
        else this._pause();
      }, { threshold: 0, rootMargin: '80px' });
      this._observer.observe(this.container);
    }

    if (!this._resizeObserver && 'ResizeObserver' in window) {
      this._resizeObserver = new ResizeObserver(() => this.handleResize());
      this._resizeObserver.observe(this.container);
    }
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this._pause();

    if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
    this._resizeRaf = 0;
    if (this._observer) this._observer.disconnect();
    if (this._resizeObserver) this._resizeObserver.disconnect();
    if (this._listeners) this._listeners.abort();
    this._listeners = null;

    this.promptParticles.dispose();
    this.steamParticles.dispose();

    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();

    this.scene.traverse((object) => {
      if (object.geometry) geometries.add(object.geometry);
      if (!object.material) return;
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) {
        materials.add(material);
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap']) {
          if (material[key]) textures.add(material[key]);
        }
      }
    });

    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();

    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();

    this.scene.clear();
    this.onTimeChange = null;
  }
}
