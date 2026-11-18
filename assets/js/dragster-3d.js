/* Interactive 3D viewer for the CO2 dragster STL.
   Drawn in the site's paper-and-ink style: dark solid body, black edge lines,
   graph-paper floor. Falls back to the poster render if WebGL or loading fails. */
import * as THREE from "three";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";

const root = document.querySelector(".viewer[data-model]");
if (root) init(root);

function init(root) {
  const stage = root.querySelector(".viewer-stage");
  const tapBtn = root.querySelector(".viewer-tap");
  const modeBtns = root.querySelectorAll(".mode-btn");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    root.classList.add("failed");
    const st = root.querySelector(".viewer-status");
    if (st) st.textContent = "3D view unavailable. See the drawings below.";
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // size the canvas here too, so a stale cached stylesheet can never let it grow the layout
  Object.assign(renderer.domElement.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 2, 1, 5000);

  // light: soft sky + one key light that casts the shadow on the "paper"
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8f897c, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(160, 260, 140);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 10, far: 800 });
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffe2d6, 0.9);
  rim.position.set(-200, 90, -180);
  scene.add(rim);

  // graph-paper floor: fine grid every 10 mm, heavy line every 50 mm
  const fine = new THREE.GridHelper(600, 60, 0x141312, 0x141312);
  fine.material.transparent = true; fine.material.opacity = 0.07;
  const coarseGrid = new THREE.GridHelper(600, 12, 0x141312, 0x141312);
  coarseGrid.material.transparent = true; coarseGrid.material.opacity = 0.16;
  coarseGrid.position.y = 0.05;
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.ShadowMaterial({ opacity: 0.16 }));
  shadowFloor.rotation.x = -Math.PI / 2;
  shadowFloor.receiveShadow = true;
  scene.add(fine, coarseGrid, shadowFloor);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false;              // never steal the page's scroll wheel
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 1.1;

  // phones: don't trap the page scroll until the visitor asks to rotate
  function setInteractive(on) {
    controls.enabled = on;
    renderer.domElement.style.touchAction = on ? "none" : "pan-y";
    root.classList.toggle("interactive", on);
  }
  setInteractive(!coarse);
  if (tapBtn) tapBtn.addEventListener("click", () => setInteractive(true));

  // materials for the three display modes
  const solidMat = new THREE.MeshStandardMaterial({ color: 0x3b3936, metalness: 0.35, roughness: 0.36 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x141312 });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x141312, transparent: true, opacity: 0.16 });
  let mesh, edges, wire;
  let introStart = null;

  new STLLoader().load(
    root.dataset.model,
    (geo) => {
      geo.rotateX(-Math.PI / 2);            // CAD is Z-up; three.js is Y-up
      geo.computeBoundingBox();
      const b = geo.boundingBox;
      geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
      const smooth = toCreasedNormals(geo, THREE.MathUtils.degToRad(30));

      mesh = new THREE.Mesh(smooth, solidMat);
      mesh.castShadow = true;
      edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 28), edgeMat);
      wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), wireMat);
      wire.visible = false;
      scene.add(mesh, edges, wire);

      const size = new THREE.Vector3(); geo.boundingBox.getSize(size);
      const h = size.y;
      controls.target.set(0, h * 0.45, 0);
      fitCamera(size.length() / 2);
      controls.saveState();

      if (!reduceMotion) {                  // intro: the ink drawing fills in to a solid
        solidMat.transparent = true;
        solidMat.opacity = 0;
        introStart = performance.now();
      }
      resize();
      renderer.render(scene, camera);
      root.classList.add("ready");
      start();
    },
    undefined,
    () => { root.classList.add("failed"); const st = root.querySelector(".viewer-status"); if (st) st.textContent = "3D view unavailable. See the drawings below."; }
  );

  function setMode(mode) {
    modeBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    if (!mesh) return;
    introStart = null;
    wire.visible = mode === "lines";
    if (mode === "solid") {
      mesh.visible = true;
      solidMat.transparent = false; solidMat.opacity = 1; solidMat.depthWrite = true;
      edgeMat.color.set(0x141312);
    } else if (mode === "lines") {
      mesh.visible = false;
      edgeMat.color.set(0x141312);
    } else {
      mesh.visible = true;
      solidMat.transparent = true; solidMat.opacity = 0.16; solidMat.depthWrite = false;
      edgeMat.color.set(0xe23d14);
    }
    solidMat.needsUpdate = true;
    renderOnce();
  }
  modeBtns.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
  renderer.domElement.addEventListener("dblclick", () => { controls.reset(); renderOnce(); });

  // place the camera so the whole car fits however it is turned
  function fitCamera(radius) {
    resize();
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const snug = camera.aspect < 1.6 ? 1.0 : 0.74;     // narrow screens need more room as it spins
    const dist = (radius / Math.sin(Math.min(vfov, hfov) / 2)) * snug;
    const dir = new THREE.Vector3(0.62, 0.42, 0.66).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, dist);
    controls.update();
  }

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h || w > 4096 || h > 4096) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(() => { resize(); renderOnce(); }).observe(stage);

  // only animate while the viewer is on screen
  let visible = false, raf = 0;
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) start(); else stop();
  }, { threshold: 0.05 }).observe(stage);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  function frame(now) {
    raf = 0;
    if (introStart !== null) {
      const t = Math.min(1, (now - introStart) / 1600);
      solidMat.opacity = t < 0.25 ? 0 : (t - 0.25) / 0.75;
      if (t >= 1) { introStart = null; solidMat.transparent = false; solidMat.opacity = 1; solidMat.needsUpdate = true; }
    }
    controls.update();
    renderer.render(scene, camera);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function start() { if (mesh && visible && !document.hidden && !raf) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function renderOnce() { if (mesh && !raf) { controls.update(); renderer.render(scene, camera); } }
}
