// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#solar-system'),
  antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Camera position
camera.position.z = 60;

// Lighting
const ambientLight = new THREE.AmbientLight(0x888888, 1.5);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 3, 500);
scene.add(sunLight);

// Stars background
function createStars() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 0.1
  });

  const starsVertices = [];
  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

// Planet creation function
function createPlanet(size, texture, position, orbitRadius) {
  const geometry = new THREE.SphereGeometry(size, 32, 32);
  const loader = new THREE.TextureLoader();

  // Add logging for texture loading
  const material = new THREE.MeshPhongMaterial();
  loader.load(
    texture,
    function (tex) {
      material.map = tex;
      material.needsUpdate = true;
      console.log('Loaded texture:', texture);
    },
    undefined,
    function (err) {
      console.error('Error loading texture:', texture, err);
    }
  );

  const planet = new THREE.Mesh(geometry, material);

  // Create orbit
  const orbitGeometry = new THREE.RingGeometry(orbitRadius - 0.2, orbitRadius + 0.2, 128);
  const orbitMaterial = new THREE.MeshBasicMaterial({
    color: 0x444444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  });
  const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
  orbit.rotation.x = Math.PI / 2;
  scene.add(orbit);

  return planet;
}

// Create Sun
const sunGeometry = new THREE.SphereGeometry(15, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({
  map: new THREE.TextureLoader().load('textures/sun.jpg')
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Planet data
const planets = [
  { name: 'Mercury', size: 1.2, texture: 'textures/mercury.jpg', position: 30, speed: 1 },
  { name: 'Venus', size: 1.8, texture: 'textures/venus.jpg', position: 38, speed: 1 },
  { name: 'Earth', size: 1.8, texture: 'textures/earth.jpg', position: 46, speed: 1 },
  { name: 'Mars', size: 1.5, texture: 'textures/mars.jpg', position: 54, speed: 1 },
  { name: 'Jupiter', size: 3.6, texture: 'textures/jupiter.jpg', position: 66, speed: 1 },
  { name: 'Saturn', size: 3.0, texture: 'textures/saturn.jpg', position: 78, speed: 1 },
  { name: 'Uranus', size: 2.4, texture: 'textures/uranus.jpg', position: 90, speed: 1 },
  { name: 'Neptune', size: 2.4, texture: 'textures/neptune.jpg', position: 102, speed: 1 }
];

// Create planets
const planetObjects = planets.map(planet => {
  const planetMesh = createPlanet(planet.size, planet.texture, planet.position, planet.position);
  scene.add(planetMesh);
  return {
    mesh: planetMesh,
    speed: planet.speed,
    angle: Math.random() * Math.PI * 2
  };
});

// Create stars
createStars();

// Animation
let isPaused = false;
const clock = new THREE.Clock();

// Add OrbitControls for free camera movement
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = true;
controls.minDistance = 10;
controls.maxDistance = 300;

// Helper for planet labels
const labelRenderer = document.createElement('div');
labelRenderer.style.position = 'absolute';
labelRenderer.style.top = '0';
labelRenderer.style.left = '0';
labelRenderer.style.pointerEvents = 'none';
labelRenderer.style.width = '100%';
labelRenderer.style.height = '100%';
labelRenderer.style.zIndex = '10';
document.body.appendChild(labelRenderer);

const planetLabels = [];
planets.forEach((planet, i) => {
  const label = document.createElement('div');
  label.textContent = planet.name;
  label.style.position = 'absolute';
  label.style.color = '#fff';
  label.style.fontWeight = 'bold';
  label.style.textShadow = '1px 1px 4px #000';
  label.style.pointerEvents = 'auto';
  label.style.padding = '2px 6px';
  label.style.background = 'rgba(0,0,0,0.3)';
  label.style.borderRadius = '6px';
  label.style.fontSize = '14px';
  label.style.display = 'none';
  labelRenderer.appendChild(label);
  planetLabels.push(label);
});

// Raycaster for hover/click
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredPlanetIndex = null;
let focusPlanetIndex = null;
let cameraTarget = null;
let cameraLerpAlpha = 1;

function updateLabels() {
  planetObjects.forEach((planetObj, i) => {
    const vector = planetObj.mesh.position.clone().project(camera);
    const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
    planetLabels[i].style.transform = `translate(-50%, -100%) translate(${x}px,${y}px)`;
    planetLabels[i].style.display = (hoveredPlanetIndex === i || focusPlanetIndex === i) ? 'block' : 'none';
  });
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planetObjects.map(p => p.mesh));
  if (intersects.length > 0) {
    const idx = planetObjects.findIndex(p => p.mesh === intersects[0].object);
    hoveredPlanetIndex = idx;
    labelRenderer.style.cursor = 'pointer';
  } else {
    hoveredPlanetIndex = null;
    labelRenderer.style.cursor = 'default';
  }
  updateLabels();
}

// 1. Add a background galaxy image
scene.background = new THREE.TextureLoader().load('textures/galaxy.jpg');

// 2. Add a reset camera button
const resetBtn = document.createElement('button');
resetBtn.textContent = 'Reset Camera';
resetBtn.style.position = 'fixed';
resetBtn.style.top = '20px';
resetBtn.style.right = '20px';
resetBtn.style.zIndex = '20';
resetBtn.style.background = '#333';
resetBtn.style.color = '#fff';
resetBtn.style.border = 'none';
resetBtn.style.padding = '0.5rem 1rem';
resetBtn.style.borderRadius = '4px';
resetBtn.style.cursor = 'pointer';
document.body.appendChild(resetBtn);
resetBtn.addEventListener('click', () => {
  focusPlanetIndex = null;
  cameraTarget = new THREE.Vector3(0, 0, 60);
  cameraLerpAlpha = 0;
});

// 3. Add planet info for tooltips and panel
const planetInfo = {
  Mercury: { size: '4,879 km', distance: '57.9M km', desc: 'Smallest planet, closest to the Sun.' },
  Venus: { size: '12,104 km', distance: '108.2M km', desc: 'Hottest planet, thick toxic atmosphere.' },
  Earth: { size: '12,742 km', distance: '149.6M km', desc: 'Our home planet, only known life.' },
  Mars: { size: '6,779 km', distance: '227.9M km', desc: 'The Red Planet, possible past water.' },
  Jupiter: { size: '139,820 km', distance: '778.5M km', desc: 'Largest planet, gas giant.' },
  Saturn: { size: '116,460 km', distance: '1.43B km', desc: 'Famous for its rings.' },
  Uranus: { size: '50,724 km', distance: '2.87B km', desc: 'Ice giant, rotates on its side.' },
  Neptune: { size: '49,244 km', distance: '4.5B km', desc: 'Farthest planet, strong winds.' }
};

// 4. Add colored orbit lines for each planet
const orbitColors = [
  '#b0b0b0', '#e6c200', '#00aaff', '#ff4d4d', '#ffb347', '#e5e4e2', '#7fffd4', '#4169e1'
];
function createOrbitLine(radius, color) {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0);
  const points = curve.getPoints(128);
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(p.x, 0, p.y)));
  const material = new THREE.LineBasicMaterial({ color });
  const ellipse = new THREE.Line(geometry, material);
  scene.add(ellipse);
}
planets.forEach((planet, i) => createOrbitLine(planet.position, orbitColors[i % orbitColors.length]));

// 5. Enhance planet labels for tooltips
planetLabels.forEach((label, i) => {
  label.onmouseenter = () => {
    label.style.background = 'rgba(0,0,0,0.8)';
    label.innerHTML = `<b>${planets[i].name}</b><br>Size: ${planetInfo[planets[i].name].size}<br>Distance: ${planetInfo[planets[i].name].distance}`;
  };
  label.onmouseleave = () => {
    label.style.background = 'rgba(0,0,0,0.3)';
    label.textContent = planets[i].name;
  };
});

// 6. Show info panel on click
const infoPanel = document.getElementById('info-panel');
const planetInfoDiv = document.getElementById('planet-info');
function showPlanetInfo(idx) {
  const p = planets[idx];
  const info = planetInfo[p.name];
  planetInfoDiv.innerHTML = `<h3>${p.name}</h3><p><b>Size:</b> ${info.size}<br><b>Distance from Sun:</b> ${info.distance}<br><b>Description:</b> ${info.desc}</p>`;
  infoPanel.classList.add('visible');
}
function hidePlanetInfo() {
  infoPanel.classList.remove('visible');
}
infoPanel.addEventListener('click', hidePlanetInfo);

// Update onClick to show info panel
function onClick(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(planetObjects.map(p => p.mesh));
  if (intersects.length > 0) {
    const idx = planetObjects.findIndex(p => p.mesh === intersects[0].object);
    focusPlanetIndex = idx;
    cameraTarget = planetObjects[idx].mesh.position.clone().add(new THREE.Vector3(0, 0, planets[idx].size * 6 + 10));
    cameraLerpAlpha = 0;
    showPlanetInfo(idx);
  } else {
    focusPlanetIndex = null;
    cameraTarget = null;
    hidePlanetInfo();
  }
  updateLabels();
}

window.addEventListener('mousemove', onMouseMove);
window.addEventListener('click', onClick);

function animate() {
  if (!isPaused) {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    // Rotate sun
    sun.rotation.y += 0.001;
    // Update planet positions
    planetObjects.forEach((planet, index) => {
      planet.angle += 0.001 * planet.speed;
      planet.mesh.position.x = Math.cos(planet.angle) * planets[index].position;
      planet.mesh.position.z = Math.sin(planet.angle) * planets[index].position;
      planet.mesh.rotation.y += 0.01;
    });
    // Camera focus/lerp
    if (cameraTarget && cameraLerpAlpha < 1) {
      camera.position.lerp(cameraTarget, 0.08);
      cameraLerpAlpha += 0.08;
      controls.target.lerp(planetObjects[focusPlanetIndex].mesh.position, 0.08);
      controls.update();
    }
    controls.update();
    updateLabels();
  }
  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Speed control event listeners
planets.forEach((planet, index) => {
  const slider = document.getElementById(`${planet.name.toLowerCase()}-speed`);
  const speedValue = slider.nextElementSibling;

  slider.addEventListener('input', (e) => {
    const speed = parseFloat(e.target.value);
    planetObjects[index].speed = speed;
    speedValue.textContent = `${speed}x`;
  });
});

// Pause/Resume button
document.getElementById('toggle-pause').addEventListener('click', () => {
  isPaused = !isPaused;
  if (!isPaused) {
    animate();
  }
});

// Theme toggle
document.getElementById('toggle-theme').addEventListener('click', () => {
  document.body.classList.toggle('light-theme');
});

// Controls panel toggle
document.getElementById('toggle-controls').addEventListener('click', () => {
  document.getElementById('controls').classList.toggle('visible');
});

// Start animation
animate();