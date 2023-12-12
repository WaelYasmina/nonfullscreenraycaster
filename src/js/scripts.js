import * as THREE from 'three';
import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass'
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';

const renderer = new THREE.WebGLRenderer({antialias: true});
//renderer.setSize(window.innerWidth, window.innerHeight);
//document.body.appendChild(renderer.domElement);

const app = document.getElementById('app');
renderer.setSize(app.offsetWidth, app.offsetHeight);
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	45,
	app.offsetWidth / app.offsetHeight,
	0.1,
	1000
);

camera.position.set(0, 10, 18);
camera.lookAt(0, 0, 0);

const controls1 = new OrbitControls(camera, renderer.domElement);
controls1.enableDamping = true;
controls1.dampingFactor = 0.12;
controls1.enableZoom = false;

const controls2 = new TrackballControls(camera, renderer.domElement);

controls2.noRotate = true;
controls2.noPan = true;
controls2.noZoom = false;
controls2.zoomSpeed = 1.5;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const renderScene = new RenderPass(scene, camera);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 1;
bloomPass.radius = 0.5;

const bloomComposer = new EffectComposer(renderer);
bloomComposer.addPass(renderScene);
bloomComposer.addPass(bloomPass);

bloomComposer.renderToScreen = false;

const mixPass = new ShaderPass(
	new THREE.ShaderMaterial({
		uniforms: {
			baseTexture: {value: null},
			bloomTexture: {value: bloomComposer.renderTarget2.texture}
		},
		vertexShader: document.getElementById('vertexshader').textContent,
		fragmentShader: document.getElementById('fragmentshader').textContent
	}), 'baseTexture'
);

const finalComposer = new EffectComposer(renderer);
finalComposer.addPass(renderScene);
finalComposer.addPass(mixPass);

const outputPass = new OutputPass();
finalComposer.addPass(outputPass);

const BLOOM_SCENE = 1;
const bloomLayer = new THREE.Layers();
bloomLayer.set(BLOOM_SCENE);
const darkMaterial = new THREE.MeshBasicMaterial({color: 0x000000});
const materials = {};

function nonBloomed(obj) {
	if(obj.isMesh && bloomLayer.test(obj.layers) === false) {
		materials[obj.uuid] = obj.material;
		obj.material = darkMaterial;
	}
}

function restoreMaterial(obj) {
	if(materials[obj.uuid]) {
		obj.material = materials[obj.uuid];
		delete materials[obj.uuid];
	}
}

const rayCaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
function bloom(e) {
	//mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
	//mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

	const rect = renderer.domElement.getBoundingClientRect();
	const x = e.clientX - rect.left;
	const y = e.clientY - rect.top;

	mouse.x = (x / app.clientWidth) * 2 - 1;
	mouse.y = (y / app.clientHeight) * -2 + 1;

	rayCaster.setFromCamera(mouse, camera);
	const intersects = rayCaster.intersectObjects(scene.children);
	if(intersects.length > 0) {
		const object = intersects[0].object;
		object.layers.toggle(BLOOM_SCENE);
	}
}
//window.addEventListener('click', bloom);
app.addEventListener('click', bloom);

const light = new THREE.DirectionalLight(0xFFFFFF, 1);
scene.add(light);
light.position.y = 20;

const geo = new THREE.IcosahedronGeometry(4, 30);
const material = new THREE.MeshPhongMaterial({color: Math.random() * 0xffffff});
const mesh = new THREE.Mesh(geo, material);
scene.add(mesh);
for (let i = 0; i < 500; i++) {
	const material = new THREE.MeshPhongMaterial({color: Math.random() * 0xffffff});
	const mesh = new THREE.Mesh(geo, material);
	mesh.position.x = Math.random() * 1000 - 500;
	mesh.position.y = Math.random() * 1000 - 500;
	mesh.position.z = Math.random() * 1000 - 500;
	mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1;
	scene.add(mesh);
}


function animate() {
	const target = controls1.target;
	controls1.update();
	controls2.target.set(target.x, target.y, target.z);
	controls2.update();

	scene.traverse(nonBloomed);
	bloomComposer.render();
	scene.traverse(restoreMaterial);
	finalComposer.render();
	requestAnimationFrame(animate);
}
animate();

window.addEventListener('resize', function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
	bloomComposer.setSize(window.innerWidth, window.innerHeight);
	finalComposer.setSize(window.innerWidth, window.innerHeight);
});