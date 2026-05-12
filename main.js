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
let neckBone; // Variable to store our specific bone
const rotationLimit = 0.6; // How far the bone can turn (approx 35 degrees)

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
loader.load('bot_follow_cursor_a-3.glb', function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    // Identify parts by Blender names
    robot = model.getObjectByName('Robot');
    track = model.getObjectByName('Track');
    obstacle = model.getObjectByName('Obstacle');

// --- BONE SELECTION ---
// This is where you target the specific part of the skeleton
neckBone = model.getObjectByName('Bone'); // <--- CHANGE BONE NAME HERE
    
    // --- THE EMISSIVE DIMMER SWITCH ---
robot.traverse((child) => {
    if (child.isMesh && child.material) {
        // 0.0 is off, 1.0 is standard, 0.2 is very dim/subtle
        child.material.emissiveIntensity = 3; 
    }
});
    // Animation Setup
    mixer = new THREE.AnimationMixer(model);

    gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer.clipAction(clip);
    });

    // START ANIMATION: Change 'Run' to your exact NLA track name
    if (actions['Running']) {
        currentAction = actions['Running'];
        currentAction.play();
    } else {
        console.warn("Animation 'Running' not found. Check your NLA names!");
    }

// animation bone
    function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // 1. The Mixer runs first. It sets the bone to the 'Run' position.
    if (mixer) mixer.update(delta);

    // 2. THE OVERRIDE: We manually adjust the bone AFTER the mixer.
    if (neckBone) {
        // We map mouse position to rotation using a simple formula:
        // rotation = mouseCoord * limit
        
        // Horizontal look (Left/Right)
        neckBone.rotation.y = mouse.x * rotationLimit; 

        // Vertical look (Up/Down)
        // We use negative mouse.y because moving mouse UP usually means looking UP
        neckBone.rotation.x = -mouse.y * (rotationLimit * 0.5); 
    }

    controls.update();
    composer.render(); // 3. The final result is drawn to the screen
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
