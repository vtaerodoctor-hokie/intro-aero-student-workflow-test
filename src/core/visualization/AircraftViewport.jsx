import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { normalizeScene } from "./visualizationContract.js";
import { aircraftCameraPresets, bodyAttitudeToScene, bodyVectorToScene, cameraPresetToScene } from "./aircraftFrame.js";

function disposeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else child.material?.dispose();
  });
}

function airplaneGroup(aircraft) {
  const group = new THREE.Group();
  const span = Math.max(aircraft.wingSpanM || 1.6, 0.2);
  const chord = Math.max(aircraft.meanChordM || 0.32, 0.08);
  const length = Math.max(span * 0.78, chord * 3.5);
  const fuselageMaterial = new THREE.MeshStandardMaterial({ color: 0xe9ece5, roughness: 0.55, metalness: 0.08 });
  const surfaceMaterial = new THREE.MeshStandardMaterial({ color: 0xff6a43, roughness: 0.48, side: THREE.DoubleSide });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x163f38, roughness: 0.62, side: THREE.DoubleSide });

  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(span * 0.055, length * 0.78, 6, 18), fuselageMaterial);
  fuselage.rotation.z = Math.PI / 2;
  group.add(fuselage);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(chord, span, span * 0.018), surfaceMaterial);
  wing.position.x = length * 0.05;
  group.add(wing);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(chord * 0.55, span * 0.36, span * 0.012), darkMaterial);
  tail.position.x = -length * 0.36;
  group.add(tail);

  const finGeometry = new THREE.BufferGeometry();
  finGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -length * 0.44, 0, 0,
    -length * 0.24, 0, 0,
    -length * 0.39, 0, span * 0.22,
  ], 3));
  finGeometry.computeVertexNormals();
  group.add(new THREE.Mesh(finGeometry, darkMaterial));

  const nose = new THREE.Mesh(new THREE.ConeGeometry(span * 0.058, length * 0.18, 18), surfaceMaterial);
  nose.rotation.z = -Math.PI / 2;
  nose.position.x = length * 0.48;
  group.add(nose);

  return { group, span, length };
}

export const INSTRUCTIONAL_OVERLAY_RENDER_ORDER = 1000;

export function keepInstructionalOverlayVisible(object) {
  object.traverse((child) => {
    child.renderOrder = INSTRUCTIONAL_OVERLAY_RENDER_ORDER;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      material.depthTest = false;
      material.depthWrite = false;
      material.toneMapped = false;
    });
  });
  return object;
}

export function overlayGroup(scene, scale) {
  const group = new THREE.Group();
  scene.overlays.forEach((overlay) => {
    const color = new THREE.Color(overlay.color || "#dce9ad");
    if (["point", "marker"].includes(overlay.type)) {
      const point = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.035, 16, 12), new THREE.MeshBasicMaterial({ color }));
      const position = bodyVectorToScene(overlay.position);
      point.position.set(position.x, position.y, position.z);
      group.add(point);
    } else if (overlay.type === "arrow") {
      const mappedOrigin = bodyVectorToScene(overlay.origin);
      const mappedVector = bodyVectorToScene(overlay.vector);
      const origin = new THREE.Vector3(mappedOrigin.x, mappedOrigin.y, mappedOrigin.z);
      const vector = new THREE.Vector3(mappedVector.x, mappedVector.y, mappedVector.z);
      const length = vector.length();
      if (length > 0) group.add(new THREE.ArrowHelper(vector.normalize(), origin, length, color, Math.min(length * 0.25, scale * 0.14), Math.min(length * 0.12, scale * 0.07)));
    } else {
      const start = bodyVectorToScene(overlay.start);
      const end = bodyVectorToScene(overlay.end);
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(start.x, start.y, start.z),
        new THREE.Vector3(end.x, end.y, end.z),
      ]);
      group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color })));
    }
  });
  return keepInstructionalOverlayVisible(group);
}

export default function AircraftViewport({ aircraft, scene, attitude }) {
  const hostRef = useRef(null);
  const attitudeRef = useRef(attitude);
  const applyCameraPresetRef = useRef(null);
  const selectedViewRef = useRef("iso");
  const [webglFailed, setWebglFailed] = useState(false);
  const [selectedViewId, setSelectedViewId] = useState("iso");
  const normalizedScene = normalizeScene(scene);

  useEffect(() => { attitudeRef.current = attitude; }, [attitude]);

  function chooseCameraPreset(presetId) {
    selectedViewRef.current = presetId;
    setSelectedViewId(presetId);
    applyCameraPresetRef.current?.(presetId);
  }

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      setWebglFailed(true);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x102f2a, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const threeScene = new THREE.Scene();
    threeScene.fog = new THREE.Fog(0x102f2a, 4, 11);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 50);
    const { group: fallbackAircraft, span } = airplaneGroup(aircraft);
    const aircraftRoot = new THREE.Group();
    aircraftRoot.add(fallbackAircraft);
    aircraftRoot.add(overlayGroup(normalizedScene, span));
    threeScene.add(aircraftRoot);
    let disposed = false;

    const loader = new GLTFLoader();
    loader.load(
      `${import.meta.env.BASE_URL}models/course-aircraft.glb`,
      (gltf) => {
        if (disposed) {
          disposeObject(gltf.scene);
          return;
        }
        const model = gltf.scene;
        model.name = "Course_Aircraft_Model";
        // Blender exports to glTF's Y-up frame; return it to the internal scene's +z-up frame.
        model.rotation.x = Math.PI / 2;
        const spanScale = Math.max(aircraft.wingSpanM || 1.6, 0.2) / 1.6;
        const chordScale = Math.max(aircraft.meanChordM || 0.32, 0.08) / 0.32;
        model.traverse((object) => {
          if (/^(Wing|Aileron)_/.test(object.name)) {
            object.scale.x *= chordScale;
            object.scale.y *= spanScale;
          }
        });
        aircraftRoot.remove(fallbackAircraft);
        disposeObject(fallbackAircraft);
        aircraftRoot.add(model);
      },
      undefined,
      () => {
        // The procedural aircraft remains visible when an asset cannot be loaded.
      },
    );
    threeScene.add(new THREE.HemisphereLight(0xe7fff6, 0x173832, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(3, -2, 5);
    threeScene.add(keyLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = span * 1.25;
    controls.maxDistance = span * 4.5;
    controls.target.set(0, 0, 0);
    const applyCameraPreset = (presetId) => {
      const preset = cameraPresetToScene(presetId, span * 2.25);
      camera.up.set(preset.up.x, preset.up.y, preset.up.z).normalize();
      camera.position.set(preset.position.x, preset.position.y, preset.position.z);
      controls.target.set(0, 0, 0);
      camera.lookAt(controls.target);
      controls.update();
    };
    const onOrbitStart = () => setSelectedViewId(null);
    controls.addEventListener("start", onOrbitStart);
    applyCameraPresetRef.current = applyCameraPreset;
    applyCameraPreset(selectedViewRef.current);

    let animationFrame;
    let visible = true;
    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const render = () => {
      if (visible) {
        const current = attitudeRef.current || {};
        const sceneAttitude = bodyAttitudeToScene(current);
        aircraftRoot.rotation.set(sceneAttitude.rollRad, sceneAttitude.pitchRad, sceneAttitude.yawRad);
        controls.update();
        renderer.render(threeScene, camera);
      }
      animationFrame = requestAnimationFrame(render);
    };
    const onVisibility = () => { visible = document.visibilityState !== "hidden"; };
    document.addEventListener("visibilitychange", onVisibility);
    render();

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      controls.removeEventListener("start", onOrbitStart);
      controls.dispose();
      if (applyCameraPresetRef.current === applyCameraPreset) applyCameraPresetRef.current = null;
      disposeObject(threeScene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [aircraft.wingSpanM, aircraft.meanChordM, JSON.stringify(normalizedScene)]);

  return (
    <section className="aircraft-viewport" aria-labelledby="aircraft-view-title">
      <div className="visual-card-heading viewport-heading">
        <div><p className="eyebrow">Persistent aircraft</p><h2 id="aircraft-view-title">Semester aircraft</h2></div>
        <div className="viewport-tools">
          <p>Drag to orbit · pinch or scroll to zoom</p>
          <div className="view-presets" aria-label="Aircraft camera presets">
            {aircraftCameraPresets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                aria-pressed={selectedViewId === preset.id}
                className={selectedViewId === preset.id ? "active" : ""}
                title={preset.directionLabel}
                onClick={() => chooseCameraPreset(preset.id)}
              >{preset.label}</button>
            ))}
          </div>
        </div>
      </div>
      {webglFailed ? (
        <div className="webgl-fallback"><strong>3D view unavailable</strong><span>The analysis and plots still work. Try a current Safari, Chrome, Edge, or Firefox browser.</span></div>
      ) : <div className="three-host" ref={hostRef} data-testid="aircraft-canvas" />}
      <p className="viewport-caption">{normalizedScene.caption}</p>
    </section>
  );
}
