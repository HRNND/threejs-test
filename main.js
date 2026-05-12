import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. GLOBAL VARIABLES ---
let mixer, robot, neckBone;
let actions = {};
let currentAction;
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const rotationLimit = 0.6; // Max rotation in radians (approx 34 degrees)

// --- 2. SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- 3. EVENT LISTENERS ---

// Mouse Movement Tracker
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Window Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// --- 4. LIGHTING ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// --- 5. CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 6. THE LOADER ---
const loader = new GLTFLoader();

loader.load('bot_follow_cursor_a-8.glb', function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    robot = model.getObjectByName('Robot');
    neckBone = model.getObjectByName('Bone'); 

    // --- THE CRITICAL FIX ---
    if (neckBone) {
        // Save a snapshot of the starting position so 'animate' has a reference
        neckBone.userData.homePos = neckBone.position.clone();
    }

    // ... (rest of your existing loader code for animations and centering)
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer.clipAction(clip);
    });
    if (actions['Running']) actions['Running'].play();

    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
});

    // Animation Mixer Setup
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer.clipAction(clip);
    });

    // Start Running Animation
    if (actions['Running']) {
        currentAction = actions['Running'];
        currentAction.play();
    }

    // Center the model in the scene
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

    console.log("Robot and Bone ('" + (neckBone ? neckBone.name : "Not Found") + "') loaded!");

}, undefined, function (error) {
    console.error('Error loading model:', error);
});

// --- 7. POST-PROCESSING (Bloom/Glow) ---
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    0.2, // Strength
    0.4, // Radius
    0.85 // Threshold
);
composer.addPass(bloomPass);

// --- 8. MAIN ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    // Only run this if the bone is found AND the home position is saved
    if (neckBone && neckBone.userData.homePos) {
        const home = neckBone.userData.homePos;
        const movementRange = 1.2; // Adjust this if the head moves too much/little

        // Move the IK target position
        neckBone.position.x = home.x + (mouse.x * movementRange);
        neckBone.position.y = home.y + (mouse.y * movementRange);
    }

    controls.update();
    composer.render();
}

// Start the loop
animate();
