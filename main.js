import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// --- 1. GLOBAL VARIABLES ---
let mixer, neckBone;
const actions = {};
const clock = new THREE.Clock();
const mouse = new THREE.Vector2();
const movementRange = 20; 

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

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// --- 4. LIGHTING ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

// --- 5. CONTROLS ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 6. THE LOADER ---
const loader = new GLTFLoader();

loader.load('bot_follow_cursor_a-8.glb', function (gltf) {
    const model = gltf.scene;
    scene.add(model);

    // Find the IK Target Bone
    neckBone = model.getObjectByName('Bone'); 

    if (neckBone) {
        // SAFETY: Capture the position at the exact moment of loading
        neckBone.userData.homePos = neckBone.position.clone();
        console.log("IK Bone Ready");
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

// --- 7. POST-PROCESSING ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.85);
composer.addPass(bloomPass);

// --- 8. MAIN ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    // 1. Update the NLA (Running) animation
    if (mixer) mixer.update(delta);

    // 2. THE SAFETY GUARD:
    // Only run the math if neckBone exists AND has a homePos.
    // This prevents the "White Screen" crash during loading.
    if (neckBone && neckBone.userData && neckBone.userData.homePos) {
        const home = neckBone.userData.homePos;

        // Use absolute positioning relative to the 'home' snapshot
        // This stops the numbers from "adding up like crazy"
        const targetX = home.x + (mouse.x * movementRange);
        const targetY = home.y + (mouse.y * movementRange);

        // Apply the new position to the IK target
        neckBone.position.set(targetX, targetY, home.z);
    }

    controls.update();
    composer.render();
}

// Start the loop
animate();
