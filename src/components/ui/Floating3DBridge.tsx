import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Pause, Play, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

function detectSoftwareGl(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return /swiftshader|llvmpipe|softpipe|mesa|software/i.test(renderer);
  } catch {
    return true;
  }
}

interface Floating3DBridgeProps {
  variant?: 'showcase' | 'compact';
  className?: string;
}

export const Floating3DBridge: React.FC<Floating3DBridgeProps> = ({
  variant = 'showcase',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme } = useApp();
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const spinBoostRef = useRef(0);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const resetSignalRef = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = Math.max(container.clientWidth || 320, 48);
    const height = Math.max(container.clientHeight || 240, 48);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = theme === 'dark' ? 1.15 : 1.08;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    canvas.dataset.testid = variant === 'showcase' ? 'kbn-3d-floating' : 'kbn-3d-launcher-canvas';
    container.innerHTML = '';
    container.appendChild(canvas);

    const scene = new THREE.Scene();

    const disposables: Array<{ dispose: () => void }> = [];
    if (!isSoftwareGl) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      disposables.push(envTarget, pmrem);
    }

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 50);
    camera.position.set(0, 1.35, 6.2);
    camera.lookAt(0, 0.25, 0);

    // Lighting: warm key + cool hemisphere + emerald rim
    const hemi = new THREE.HemisphereLight(0xcbe5ff, 0x0b1220, isSoftwareGl ? 1.55 : 1.1);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    keyLight.position.set(4.2, 6.5, 5.2);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(512, 512);
    }
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x16c784, 3.4, 14);
    rimLight.position.set(-2.5, 2.2, 2.4);
    scene.add(rimLight);

    const blueAccentLight = new THREE.PointLight(0x3b82f6, 2.4, 14);
    blueAccentLight.position.set(2.8, -0.4, 2.6);
    scene.add(blueAccentLight);

    // Composite hero group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Materials
    const steelMat = new THREE.MeshStandardMaterial({
      color: theme === 'dark' ? 0x1e293b : 0x334155,
      metalness: 0.78,
      roughness: 0.26,
    });
    const deckMat = new THREE.MeshStandardMaterial({
      color: theme === 'dark' ? 0x0f172a : 0x1e293b,
      metalness: 0.62,
      roughness: 0.34,
    });
    const cableMat = new THREE.MeshStandardMaterial({
      color: 0x16c784,
      emissive: 0x0b7a4f,
      emissiveIntensity: 0.7,
      metalness: 0.45,
      roughness: 0.28,
    });
    const prismMat = new THREE.MeshPhysicalMaterial({
      color: 0x16c784,
      emissive: 0x074d33,
      emissiveIntensity: 0.38,
      metalness: 0.15,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      reflectivity: 0.95,
    });
    const innerCoreMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    });
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.45,
      metalness: 0.82,
      roughness: 0.2,
    });
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0x16c784,
      emissiveIntensity: 0.55,
      metalness: 0.6,
      roughness: 0.2,
    });
    disposables.push(steelMat, deckMat, cableMat, prismMat, innerCoreMat, ringMat, nodeMat);

    // 1. Bridge Pylons (twin tapered towers)
    const pylonGeo = new THREE.BoxGeometry(0.24, 1.95, 0.26);
    const pylonCapGeo = new THREE.ConeGeometry(0.18, 0.32, 4);
    disposables.push(pylonGeo, pylonCapGeo);

    [-1.45, 1.45].forEach((px) => {
      const pylon = new THREE.Mesh(pylonGeo, steelMat);
      pylon.position.set(px, 0.05, 0);
      pylon.castShadow = !isSoftwareGl;
      rootGroup.add(pylon);

      const cap = new THREE.Mesh(pylonCapGeo, cableMat);
      cap.position.set(px, 1.18, 0);
      cap.rotation.y = Math.PI / 4;
      rootGroup.add(cap);
    });

    // 2. Curved Bridge Deck Span
    const deckGeo = new THREE.BoxGeometry(4.2, 0.14, 0.58);
    disposables.push(deckGeo);
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, -0.58, 0);
    deck.receiveShadow = !isSoftwareGl;
    rootGroup.add(deck);

    // 3. Parabolic Suspension Arch & Cables (TubeGeometry)
    const mainArchCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.05, -0.52, 0),
      new THREE.Vector3(-1.45, 0.92, 0),
      new THREE.Vector3(0, 0.18, 0),
      new THREE.Vector3(1.45, 0.92, 0),
      new THREE.Vector3(2.05, -0.52, 0),
    ]);
    const archTubeGeo = new THREE.TubeGeometry(mainArchCurve, 44, 0.042, 8, false);
    disposables.push(archTubeGeo);

    [-0.22, 0.22].forEach((zOffset) => {
      const cable = new THREE.Mesh(archTubeGeo, cableMat);
      cable.position.z = zOffset;
      rootGroup.add(cable);
    });

    // Vertical suspender rods (InstancedMesh)
    const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.65, 6);
    disposables.push(rodGeo);
    const rodCount = 7;
    const rods = new THREE.InstancedMesh(rodGeo, steelMat, rodCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < rodCount; i++) {
      const t = 0.2 + (i / (rodCount - 1)) * 0.6;
      const pt = mainArchCurve.getPoint(t);
      const rodH = Math.max(0.2, pt.y - -0.55);
      dummy.position.set(pt.x, -0.55 + rodH / 2, 0);
      dummy.scale.set(1, rodH / 0.65, 1);
      dummy.updateMatrix();
      rods.setMatrixAt(i, dummy.matrix);
    }
    rods.instanceMatrix.needsUpdate = true;
    rootGroup.add(rods);

    // 4. Floating Verification Crystal Prism (centerpiece above bridge)
    const crystalGroup = new THREE.Group();
    crystalGroup.position.set(0, 1.02, 0);
    rootGroup.add(crystalGroup);

    const crystalGeo = new THREE.OctahedronGeometry(0.56, 0);
    const coreGeo = new THREE.OctahedronGeometry(0.32, 0);
    const ringGeo = new THREE.TorusGeometry(0.88, 0.026, 12, 48);
    disposables.push(crystalGeo, coreGeo, ringGeo);

    const crystal = new THREE.Mesh(crystalGeo, prismMat);
    crystal.scale.set(0.88, 1.24, 0.88);
    crystalGroup.add(crystal);

    const innerCore = new THREE.Mesh(coreGeo, innerCoreMat);
    innerCore.scale.set(0.88, 1.24, 0.88);
    crystalGroup.add(innerCore);

    const orbitalRing = new THREE.Mesh(ringGeo, ringMat);
    orbitalRing.rotation.x = Math.PI * 0.36;
    orbitalRing.rotation.y = Math.PI * 0.14;
    crystalGroup.add(orbitalRing);

    // 5. Orbiting Verification Diamond Nodes (InstancedMesh)
    const nodeGeo = new THREE.OctahedronGeometry(0.065, 0);
    disposables.push(nodeGeo);
    const nodeCount = 6;
    const nodes = new THREE.InstancedMesh(nodeGeo, nodeMat, nodeCount);
    crystalGroup.add(nodes);

    // 6. Soft Radial Contact Shadow Disc (Canvas texture)
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
      grad.addColorStop(0, theme === 'dark' ? 'rgba(22, 199, 132, 0.34)' : 'rgba(15, 23, 42, 0.24)');
      grad.addColorStop(0.55, theme === 'dark' ? 'rgba(59, 130, 246, 0.14)' : 'rgba(15, 23, 42, 0.09)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowGeo = new THREE.PlaneGeometry(4.6, 1.8);
    disposables.push(shadowTex, shadowMat, shadowGeo);
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, -1.05, 0);
    scene.add(shadowPlane);

    // ResizeObserver for crisp layout transitions
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 48);
        const h = Math.max(entry.contentRect.height, 48);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    // Pointer interactivity
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      const ny = ((e.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1;
      pointerTargetRef.current = { x: nx * 0.28, y: ny * 0.16 };
    };
    const handlePointerLeave = () => {
      pointerTargetRef.current = { x: 0, y: 0 };
    };
    const handleClick = () => {
      spinBoostRef.current = 0.14;
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('click', handleClick);

    // Animation loop with software-GL afterDraw pacing
    let disposed = false;
    let rafId = 0;
    let timerId = 0;
    let simTime = 0;
    let lastTimestamp = performance.now();
    let lastResetSeen = resetSignalRef.current;

    const rawGl = isSoftwareGl ? (renderer.getContext() as WebGL2RenderingContext) : null;
    const afterDraw = (cb: () => void) => {
      if (rawGl && typeof rawGl.fenceSync === 'function') {
        const sync = rawGl.fenceSync(rawGl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        rawGl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) rawGl.deleteSync(sync);
            return;
          }
          if (!sync) {
            timerId = window.setTimeout(cb, 80);
            return;
          }
          const status = rawGl.clientWaitSync(sync, 0, 0);
          if (status === rawGl.ALREADY_SIGNALED || status === rawGl.CONDITION_SATISFIED) {
            rawGl.deleteSync(sync);
            timerId = window.setTimeout(cb, 80);
          } else {
            timerId = window.setTimeout(poll, 16);
          }
        };
        timerId = window.setTimeout(poll, 16);
      } else {
        timerId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTimestamp) / 1000, 0.1);
      lastTimestamp = now;

      if (resetSignalRef.current !== lastResetSeen) {
        lastResetSeen = resetSignalRef.current;
        rootGroup.rotation.set(0, 0, 0);
        pointerTargetRef.current = { x: 0, y: 0 };
        simTime = 0;
      }

      if (!pausedRef.current) {
        simTime += dt;
        crystal.rotation.y += dt * 0.95 + spinBoostRef.current;
        innerCore.rotation.y -= dt * 1.25;
        orbitalRing.rotation.z += dt * 0.55;
        crystalGroup.position.y = 1.02 + Math.sin(simTime * 1.9) * 0.11;
        spinBoostRef.current *= 0.92;

        for (let i = 0; i < nodeCount; i++) {
          const angle = simTime * 0.95 + (i / nodeCount) * Math.PI * 2;
          const r = 1.18;
          dummy.position.set(
            Math.cos(angle) * r,
            Math.sin(angle * 2) * 0.18,
            Math.sin(angle) * r,
          );
          dummy.rotation.set(angle, angle * 1.3, 0);
          dummy.scale.setScalar(1);
          dummy.updateMatrix();
          nodes.setMatrixAt(i, dummy.matrix);
        }
        nodes.instanceMatrix.needsUpdate = true;
      }

      const idleYaw = pausedRef.current ? 0 : Math.sin(simTime * 0.55) * 0.16;
      rootGroup.rotation.y += (idleYaw + pointerTargetRef.current.x - rootGroup.rotation.y) * 0.08;
      rootGroup.rotation.x += (pointerTargetRef.current.y - rootGroup.rotation.x) * 0.08;

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    // Initial synchronous draw so first frame is immediately visible
    tick();

    return () => {
      disposed = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (timerId) clearTimeout(timerId);
      resizeObserver.disconnect();
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('click', handleClick);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
    };
  }, [theme, variant]);

  if (variant === 'compact') {
    return (
      <div
        ref={containerRef}
        className={`w-full h-full cursor-pointer select-none ${className}`}
        title="Click to spin the KBN 3D Verification Prism"
      />
    );
  }

  return (
    <div className={`relative w-full h-full select-none ${className}`}>
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        title="Move cursor to tilt or click to spin the 3D KBN Verification Bridge"
      />
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? 'Play 3D animation' : 'Pause 3D animation'}
          className="p-1.5 rounded-lg bg-slate-900/75 text-white border border-white/15 hover:border-[#16C784] transition-colors"
        >
          {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            resetSignalRef.current += 1;
            spinBoostRef.current = 0.08;
          }}
          aria-label="Reset 3D view"
          className="p-1.5 rounded-lg bg-slate-900/75 text-white border border-white/15 hover:border-[#16C784] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

export const Floating3DLauncher: React.FC<{ hidden?: boolean }> = ({ hidden = false }) => {
  const { navigate } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (hidden || dismissed) return null;

  return (
    <aside
      aria-label="Floating 3D Certificate Verifier"
      className="hidden xl:flex fixed bottom-5 right-2.5 z-30 flex-col items-end gap-2"
    >
      {expanded && (
        <div className="w-52 rounded-2xl bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] shadow-2xl p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-[#F8FAFC]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#16C784]" />
              <span>KBN 3D Verify</span>
            </span>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label="Hide floating 3D widget"
              className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-[#94A3B8] leading-snug">
            Upload a certificate photo or verify a KBN code with SHA-256 sealing.
          </p>
          <button
            type="button"
            onClick={() => {
              setExpanded(false);
              navigate('/verify');
            }}
            className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-[#16C784] text-[#0B1220] hover:bg-[#13b074] transition-colors"
          >
            Open Certificate Hub
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-label="Toggle 3D Certificate Verifier"
        title="KBN 3D Certificate Verifier"
        className="w-16 h-16 rounded-2xl bg-white dark:bg-[#111B2E] border border-slate-200 dark:border-[#263449] hover:border-[#16C784] shadow-2xl overflow-hidden transition-transform hover:scale-105"
      >
        <Floating3DBridge variant="compact" />
      </button>
    </aside>
  );
};
