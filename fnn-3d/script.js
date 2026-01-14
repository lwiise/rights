import * as THREE from 'three'

var camera, scene, renderer, stats;
var geometry, group;
var mouseX = 0,
  mouseY = 0;
var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2

init()
animate()

function init() {
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    1,
    10000
  )
  camera.position.z = 500

  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x2b2b2b)

  var light = new THREE.DirectionalLight(0xffffff, 1)
  light.position.set(1, 1, 1).normalize()
  scene.add(light)

  geometry = new THREE.SphereGeometry(100, 20, 20)

  group = new THREE.Group()

  for (var i = 0; i < 1000; i++) {
    var material = new THREE.MeshLambertMaterial({
      color: Math.random() * 0xffffff,
    })
    var mesh = new THREE.Mesh(geometry, material)
    mesh.position.x = Math.random() * 2000 - 1000
    mesh.position.y = Math.random() * 2000 - 1000
    mesh.position.z = Math.random() * 2000 - 1000
    mesh.rotation.x = Math.random() * 2 * Math.PI
    mesh.rotation.y = Math.random() * 2 * Math.PI
    mesh.scale.x = mesh.scale.y = mesh.scale.z = Math.random() * 3 + 1
    group.add(mesh)
  }

  scene.add(group)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  document.addEventListener('mousemove', onDocumentMouseMove, false)
  window.addEventListener('resize', onWindowResize, false)
}

function onWindowResize() {
  windowHalfX = window.innerWidth / 2
  windowHalfY = window.innerHeight / 2

  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()

  renderer.setSize(window.innerWidth, window.innerHeight)
}

function onDocumentMouseMove(event) {
  mouseX = (event.clientX - windowHalfX) * 0.05
  mouseY = (event.clientY - windowHalfY) * 0.05
}

function animate() {
  requestAnimationFrame(animate)
  render()
}

function render() {
  camera.position.x += (mouseX - camera.position.x) * 0.05
  camera.position.y += (-mouseY - camera.position.y) * 0.05
  camera.lookAt(scene.position)

  group.rotation.x += 0.001
  group.rotation.y += 0.002

  renderer.render(scene, camera)
}
