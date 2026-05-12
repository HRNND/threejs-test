import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
//-------------------------
let mixer; // We create this variable out here so the whole script can see it
const clock = new THREE.Clock();

// --- 1. THE SCENE SETUP ---
// The scene is the space, the camera is your eyes, and the renderer draws it.
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5); // Position the camera slightly up and back

const renderer = new THREE.WebGLRenderer({ 
    antialias: true,    // Makes edges smooth
    alpha: true         // Makes background transparent for Framer
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// --- 2. LIGHTING ---
// Without lights, your model will be pitch black.
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Soft overall light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Like the sun
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// --- 3. INTERACTION (CONTROLS) ---
// This allows you to rotate (left click) and pan (right click) with the mouse.
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Adds a smooth "weight" to the movement
controls.dampingFactor = 0.05;
controls.screenSpacePanning = true; // Allows vertical/horizontal panning

// --- 4. IMPORTING THE 3D MODEL ---
// Replace 'public/model.glb' with your actual file path.
const loader = new GLTFLoader();
loader.load('/bot_running_a_1_NLA_export_Fix.glb', function (gltf) {
    const model = gltf.scene;
    scene.add(model);

// Separating the model
    let robot, tube, mixer;
let actions = {}; // A dictionary to hold our animations

loader.load('bot_running_a_1_NLA_export_Fix.glb', (gltf) => {
    const model = gltf.scene;
    scene.add(model);

    // Find objects by the names you gave them in Blender
    robot = model.getObjectByName('Robot');
    track = model.getObjectByName('Track');
    obstacle = model.getObjectByName('Obstacle');
    lighting = model.getObjectByName('Lighting');

    // Setup Animations
    mixer = new THREE.AnimationMixer(robot);
    gltf.animations.forEach((clip) => {
        const action = mixer.clipAction(clip);
        actions[clip.name] = action; // Store them: actions['Run'], actions['Jump']
    });

    // Start the game state
    actions['Run'].play();
});

    
// (ADDITIONAL) Create the Mixer for this specific model
    mixer = new THREE.AnimationMixer(model);

    // 2. Look at all the animations (NLA tracks) in the file
    // gltf.animations is an array of all your tracks from Blender
    gltf.animations.forEach((clip) => {
        mixer.clipAction(clip).play(); // This tells every animation to start playing
    });

    //If you have multiple NLA tracks
    //(e.g., one for "Idle" and one for "Walking") and you play them all at once using the code above, they might look messy.
    //If you only want one specific animation to play, replace the ".forEach" (above this) part with:
    //mixer.clipAction(gltf.animations[0]).play();
    //(This plays only the first animation track found in the file.)

    
    // Optional: Center the model automatically
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center); 
}, undefined, function (error) {
    console.error('An error happened loading the model:', error);
});

// --- 5. POST-PROCESSING (VISUAL EFFECTS) ---
// This acts like a filter layer over your scene.
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// UnrealBloomPass makes bright areas "glow"
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    0.5,  // Strength of glow
    0.4,  // Radius
    0.85  // Threshold (what brightness level starts glowing)
);
composer.addPass(bloomPass);

// --- 6. THE ANIMATION LOOP ---
// This runs 60 times per second to keep the image updated.
function animate() {
    requestAnimationFrame(animate);

    // Calculate how much time has passed since the last frame
    const delta = clock.getDelta(); 

    // If the mixer exists, tell it to move the animation forward by that time
    if (mixer) {
        mixer.update(delta);
    }

    controls.update();
    composer.render();
}
// Handle window resizing (so it doesn't look stretched)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
