import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. GLOBALS ---
let mixer, targetObject, realNeckBone;
const actions = {};
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const movementRange = 5.0; // Increased to make movement obvious

// --- 2. SCENE & RENDERER ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- 3. MOUSE TRACKING ---
window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

// --- 4. LIGHTING & CONTROLS ---
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 5. THE LOADER ---
const loader = new GLTFLoader();
loader.load('bot_follow_cursor_a-9.glb', (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Find the detached IK Target
    targetObject = model.getObjectByName('Bone'); 
    
    // Find the physical bone (the one named like a leg but acting as a neck)
    model.traverse((child) => {
        if (child.isBone && child.name === 'thigh.L.010') {
            realNeckBone = child;
        }
    });

    if (targetObject) {
        targetObject.userData.homePos = targetObject.position.clone();
        console.log("Target 'Bone' Found");
    }

    if (realNeckBone) {
        console.log("Physical Bone 'thigh.L.010' Found");
    }

    // Animation Mixer
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer.clipAction(clip);
    });
    if (actions['Running']) actions['Running'].play();

    // Center the robot
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
});

// --- 6. POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85));

// --- 7. ANIMATION LOOP (The "Fuckery" Fix) ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // STEP 1: The Mixer runs first. It moves the body and the neck.
    if (mixer) mixer.update(delta);

    // STEP 2: The Manual Override
    // Only run if both the Target and the Neck exist
    if (targetObject && targetObject.userData.homePos && realNeckBone) {
        
        // A. Move the detached target based on mouse
        const home = targetObject.userData.homePos;
        targetObject.position.x = home.x + (mouse.x * movementRange);
        targetObject.position.y = home.y + (mouse.y * movementRange);

        // B. THE HIERARCHY FIX:
        // We must manually tell the parent body and the target to update 
        // their world coordinates because the Mixer just moved them.
        targetObject.updateMatrixWorld(); 
        if (realNeckBone.parent) realNeckBone.parent.updateMatrixWorld();

        // C. Get the target's position in Global Space
        const targetWorldPos = new THREE.Vector3();
        targetObject.getWorldPosition(targetWorldPos);
        
        // D. Point the neck at that global spot
        realNeckBone.lookAt(targetWorldPos);
    }

    controls.update();
    composer.render();
}

animate();
