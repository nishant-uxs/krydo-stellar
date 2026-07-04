import { useEffect, useRef } from "react";
import * as THREE from "three";

export function Stellar3DScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 25;

    // 3. Renderer setup with transparency and antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 4. Create the Central Trust Core (Holographic Wireframe Sphere)
    const globeGeometry = new THREE.IcosahedronGeometry(7, 2);
    const globeMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8, // primary blue / sky-400
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);

    // Inner glowing solid/wireframe sphere
    const innerGeometry = new THREE.IcosahedronGeometry(4, 1);
    const innerMaterial = new THREE.MeshBasicMaterial({
      color: 0xec4899, // pink-500
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const innerGlobe = new THREE.Mesh(innerGeometry, innerMaterial);
    scene.add(innerGlobe);

    // 5. Create orbital ring of trust nodes
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    const ringGeometry = new THREE.RingGeometry(10, 10.2, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x818cf8, // indigo-400
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.12,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ringGroup.add(ring);

    // Nodes on the ring (representing Whitelisted Issuers)
    const nodeGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const nodes: THREE.Mesh[] = [];
    const nodeCount = 5;

    for (let i = 0; i < nodeCount; i++) {
      const angle = (i / nodeCount) * Math.PI * 2;
      const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
      // Position along the ring
      node.position.x = Math.cos(angle) * 10;
      node.position.z = Math.sin(angle) * 10;
      node.position.y = 0;
      ringGroup.add(node);
      nodes.push(node);
    }

    // 6. Create Space Constellation / Particle Field
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 120;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const color1 = new THREE.Color(0x38bdf8); // sky blue
    const color2 = new THREE.Color(0xec4899); // pink
    const color3 = new THREE.Color(0x818cf8); // indigo

    for (let i = 0; i < particleCount; i++) {
      // Position particles in a sphere shell around the scene
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 15 + Math.random() * 12; // Radius between 15 and 27

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Random color blend
      const randomColor = Math.random() < 0.33 ? color1 : Math.random() < 0.5 ? color2 : color3;
      colors[i * 3] = randomColor.r;
      colors[i * 3 + 1] = randomColor.g;
      colors[i * 3 + 2] = randomColor.b;
    }

    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Particle texture / style
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 7. Mouse Tracking Setup
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    const onMouseMove = (event: MouseEvent) => {
      // Normalize mouse positions to -1 to 1
      mouse.targetX = (event.clientX - windowHalfX) / windowHalfX;
      mouse.targetY = (event.clientY - windowHalfY) / windowHalfY;
    };

    window.addEventListener("mousemove", onMouseMove);

    // 8. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Slow idle rotations
      globe.rotation.y = elapsedTime * 0.05;
      globe.rotation.x = elapsedTime * 0.02;

      innerGlobe.rotation.y = -elapsedTime * 0.08;
      innerGlobe.rotation.z = elapsedTime * 0.04;

      ringGroup.rotation.y = elapsedTime * 0.03;
      // Slanted orbital plane
      ringGroup.rotation.x = 0.25 + Math.sin(elapsedTime * 0.1) * 0.05;

      // Pulsing nodes scale
      nodes.forEach((node, idx) => {
        const pulse = 1 + Math.sin(elapsedTime * 3 + idx) * 0.15;
        node.scale.set(pulse, pulse, pulse);
      });

      // Rotate particles slowly
      particles.rotation.y = elapsedTime * 0.01;

      // Mouse tracking inertia/easing (Lag interpolation)
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      // Apply mouse offset to central camera / objects for parallax effect
      scene.rotation.y = mouse.x * 0.35;
      scene.rotation.x = mouse.y * 0.25;

      renderer.render(scene, camera);
    };

    animate();

    // 9. Resize handler
    const onResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      innerGeometry.dispose();
      innerMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[300px] sm:min-h-[400px] md:min-h-[480px] relative pointer-events-none select-none"
    />
  );
}
