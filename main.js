import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. SETTINGS & GLOBALS ---
let mixer, targetObject, realNeckBone, debugMarker;
const actions = {};
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const movementRange = 8.0; // Cranked up for visibility

// --- 2. SCENE SETUP ---
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

// --- 4. LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(10, 10, 10);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 5. THE LOADER ---
const loader = new GLTFLoader();
loader.load('bot_follow_cursor_a-9.glb', (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Find the detached Target Object ("Bone")
    targetObject = model.getObjectByName('Bone'); 
    
    // Find the physical neck bone ("thigh.L.010")
    model.traverse((child) => {
        if (child.isBone && child.name === 'thigh.L.010') {
            realNeckBone = child;
        }
    });

    // SETUP DEBUG MARKER
    if (targetObject) {
        targetObject.userData.homePos = targetObject.position.clone();
        
        const debugGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const debugMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false });
        debugMarker = new THREE.Mesh(debugGeo, debugMat);
        debugMarker.renderOrder = 999; // Make it visible through the robot
        targetObject.add(debugMarker);
        
        console.log("Target 'Bone' found & Marker attached.");
    }

    if (realNeckBone) {
        console.log("Physical bone 'thigh.L.010' found.");
    }

    // ANIMATION
    mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {
        actions[clip.name] = mixer.clipAction(clip);
    });
    if (actions['Running']) actions['Running'].play();

    // Center the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
});

// --- 6. POST PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.85));

// --- 7. THE ANIMATION LOOP (The Fuckery Fixer) ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // A. Run the mixer first. The body moves.
    if (mixer) mixer.update(delta);

    if (targetObject && realNeckBone) {
        const home = targetObject.userData.homePos;

        // B. Update Target Position (The Green Cube)
        targetObject.position.x = home.x + (mouse.x * movementRange);
        targetObject.position.y = home.y + (mouse.y * movementRange);

        // C. REFRESH HIERARCHY
        // Force the parent of the neck and the target to update 
        // otherwise 'lookAt' will use old positions from the last frame.
        targetObject.updateMatrixWorld(true);
        if (realNeckBone.parent) realNeckBone.parent.updateMatrixWorld(true);

        // D. LOOK AT MATH
        const targetWorldPos = new THREE.Vector3();
        targetObject.getWorldPosition(targetWorldPos);
        
        // Final command: Neck points to the green cube
        realNeckBone.lookAt(targetWorldPos);
    }

    controls.update();
    composer.render();
}

animate();
