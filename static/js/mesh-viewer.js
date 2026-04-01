import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

document.querySelectorAll('.mesh-viewer').forEach(function (container) {
    var meshUrl = container.getAttribute('data-mesh');
    if (!meshUrl) return;

    var width = container.clientWidth;
    var height = Math.round(width * 0.75);
    container.style.height = height + 'px';

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf6f8fa);

    var camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 100);
    camera.position.set(0, 0.3, -1.2);
    camera.up.set(0, -1, 0);

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    var controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.enablePan = false;
    controls.minDistance = 0.3;
    controls.maxDistance = 3.0;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    var d1 = new THREE.DirectionalLight(0xffffff, 0.7);
    d1.position.set(1, 2, 3);
    scene.add(d1);
    var d2 = new THREE.DirectionalLight(0xffffff, 0.5);
    d2.position.set(-2, -1, -1);
    scene.add(d2);
    var d3 = new THREE.DirectionalLight(0xffffff, 0.3);
    d3.position.set(0, -2, 1);
    scene.add(d3);

    var loader = new PLYLoader();
    loader.load(meshUrl, function (geometry) {
        geometry.computeVertexNormals();

        var material;
        if (geometry.hasAttribute('color')) {
            material = new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.7,
                metalness: 0.05
            });
        } else {
            material = new THREE.MeshStandardMaterial({
                color: 0x8899aa,
                roughness: 0.6,
                metalness: 0.1
            });
        }

        var mesh = new THREE.Mesh(geometry, material);
        // No mesh rotation — camera is placed on the opposite side
        scene.add(mesh);

        var box = new THREE.Box3().setFromObject(mesh);
        var center = box.getCenter(new THREE.Vector3());
        mesh.position.sub(center);
        controls.target.set(0, 0, 0);
    });

    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    new ResizeObserver(function () {
        var w = container.clientWidth;
        var h = Math.round(w * 0.75);
        container.style.height = h + 'px';
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }).observe(container);
});