/* ================================
   1. IMPORT LIBRARIES
   ================================

   We’re pulling Three.js and helper tools from CDN.
   - THREE → core engine
   - GLTFLoader → loads your .glb file
   - OrbitControls → mouse interaction
*/
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.158/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.158/examples/jsm/controls/OrbitControls.js';


/* ================================
   2. CREATE SCENE
   ================================

   Scene = your 3D world/container
*/
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff); // white background


/* ================================
   3. CAMERA SETUP
   ================================

   PerspectiveCamera mimics real-world camera.
   Arguments:
   - FOV (45 = natural look)
   - aspect ratio
   - near / far clipping
*/
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

// Move camera back so we can see the model
camera.position.set(0, 1, 5);


/* ================================
   4. RENDERER
   ================================

   Renderer = what draws everything to screen
*/
const renderer = new THREE.WebGLRenderer({
  antialias: true // smoother edges
});

renderer.setSize(window.innerWidth, window.innerHeight);

// Makes colors look correct (important for design work)
renderer.outputColorSpace = THREE.SRGBColorSpace;

// Better contrast (more cinematic)
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

document.body.appendChild(renderer.domElement);


/* ================================
   5. CONTROLS (INTERACTION)
   ================================

   OrbitControls lets user rotate around object
*/
const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true; // smoother movement
controls.enablePan = false;    // lock panning
controls.enableZoom = false;   // optional: disable zoom

// Subtle motion (feels premium)
controls.autoRotate = true;
controls.autoRotateSpeed = 1;


/* ================================
   6. LIGHTING
   ================================

   Basic setup:
   - Ambient = overall soft light
   - Directional = main light (like sun)
*/
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);


/* ================================
   7. LOAD YOUR GLB MODEL
   ================================

   This loads your exported Blender file
*/
const loader = new GLTFLoader();

let model; // we store it globally for later use

loader.load(
  './model.glb', // IMPORTANT: use ./ not /

  (gltf) => {
    model = gltf.scene;

    // Optional: center model
    model.position.set(0, 0, 0);

    scene.add(model);
  },

  undefined,

  (error) => {
    console.error('Error loading model:', error);
  }
);


/* ================================
   8. ANIMATION LOOP
   ================================

   This runs every frame (~60fps)
   - updates controls
   - renders scene
*/
function animate() {
  requestAnimationFrame(animate);

  controls.update();

  renderer.render(scene, camera);
}

animate();


/* ================================
   9. RESPONSIVE RESIZE
   ================================

   Keeps canvas correct when window resizes
*/
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});