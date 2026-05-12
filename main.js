import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. GLOBAL VARIABLES ---
let mixer, targetObject, realNeckBone;
const actions = {};
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const movementRange = 3.0; // How far the target object moves

// --- 2. SCENE SETUP ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- 3. EVENT LISTENERS ---
window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// --- 4. LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 5. THE LOADER ---
const loader = new GLTFLoader();

loader.load('bot_follow_cursor_a-9.glb', function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    // A. Find the detached Target Object
    targetObject = model.getObjectByName('Bone'); 
    
    // B. Find the actual bone that needs to rotate (Adjust name if needed, e.g., 'Neck')
    // We traverse to find the bone inside the Armature
    model.traverse((child) => {
        if (child.isBone && (child.name === 'thigh.L.010')) {
            realNeckBone = child;
        }
    });

    if (targetObject) {
        targetObject.userData.homePos = targetObject.position.clone();
        console.log("Target Object Found");
    }
    
    if (realNeckBone) {
        console.log("Physical Neck Bone Found: " + realNeckBone.name);
    }

    // Animation Mixer
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer.clipAction(clip);
    });
    if (actions['Running']) actions['Running'].play();

    // Center Model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);

}, undefined, (error) => console.error(error));

// --- 6. POST-PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.85));

// --- 7. MAIN ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    // THE MAGIC BRIDGE:
    if (targetObject && targetObject.userData.homePos && realNeckBone) {
        const home = targetObject.userData.homePos;

        // 1. Move the detached target object with the mouse
        targetObject.position.x = home.x + (mouse.x * movementRange);
        targetObject.position.y = home.y + (mouse.y * movementRange);

        // 2. Force the actual Neck Bone to look at the target object
        // We use world position to ensure they line up perfectly
        const targetWorldPos = new THREE.Vector3();
        targetObject.getWorldPosition(targetWorldPos);
        
        realNeckBone.lookAt(targetWorldPos);
    }

    controls.update();
    composer.render();
}

animate();
