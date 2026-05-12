import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. GLOBAL VARIABLES ---
let mixer, robot, track, obstacle, lighting;
let actions = {};
let currentAction;
const clock = new THREE.Clock();

// --- 2. SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- 3. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// --- 4. CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 5. THE LOADER (Importing the Robot) ---
const loader = new GLTFLoader();

// Use the filename exactly as it appears in GitHub
loader.load('bot_running_a_1_nla_export_fix.glb', function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    // Identify parts by Blender names
    robot = model.getObjectByName('Robot');
    track = model.getObjectByName('Track');
    obstacle = model.getObjectByName('Obstacle');

    // --- THE EMISSIVE DIMMER SWITCH ---
robot.traverse((child) => {
    if (child.isMesh && child.material) {
        // 0.0 is off, 1.0 is standard, 0.2 is very dim/subtle
        child.material.emissiveIntensity = 0.2; 
    }
});
    // Animation Setup
    mixer = new THREE.AnimationMixer(model);

    gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer.clipAction(clip);
    });

    // START ANIMATION: Change 'Run' to your exact NLA track name
    if (actions['running']) {
        currentAction = actions['running'];
        currentAction.play();
    } else {
        console.warn("Animation 'running' not found. Check your NLA names!");
    }

    // Centering the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    console.log("Model loaded successfully!");

}, undefined, function (error) {
    console.error('Error loading model:', error);
});

// --- 6. POST-PROCESSING ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    0.2, 0.4, 0.85
    // ATTENTION! 3 values above are accordingly (strength, radius, threshold)
);
composer.addPass(bloomPass);

// --- 7. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);
    
    controls.update();
    composer.render();
}

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
