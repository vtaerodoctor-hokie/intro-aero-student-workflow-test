import { describe, expect, it } from "vitest";
import {
  INSTRUCTIONAL_OVERLAY_RENDER_ORDER,
  keepInstructionalOverlayVisible,
  overlayGroup,
} from "../../src/core/visualization/AircraftViewport.jsx";

describe("instructional aircraft overlays", () => {
  it("draws every overlay component above aircraft surfaces", () => {
    const group = overlayGroup({
      overlays: [
        { type: "marker", position: { x: 0.1, y: 0, z: 0 } },
        { type: "arrow", origin: { x: 0.2, y: 0, z: 0 }, vector: { x: 0, y: 0, z: -0.2 } },
        { type: "line", start: { x: 0.1, y: 0, z: 0 }, end: { x: 0.2, y: 0, z: 0 } },
      ],
    }, 1.6);

    let materialCount = 0;
    group.traverse((object) => {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach((material) => {
        materialCount += 1;
        expect(material.depthTest).toBe(false);
        expect(material.depthWrite).toBe(false);
        expect(material.toneMapped).toBe(false);
        expect(object.renderOrder).toBe(INSTRUCTIONAL_OVERLAY_RENDER_ORDER);
      });
    });
    expect(materialCount).toBeGreaterThanOrEqual(4);
  });

  it("configures nested helper meshes as well as the parent object", () => {
    const material = { depthTest: true, depthWrite: true, toneMapped: true };
    const child = { material, renderOrder: 0 };
    const parent = {
      renderOrder: 0,
      traverse(callback) { callback(this); callback(child); },
    };

    expect(keepInstructionalOverlayVisible(parent)).toBe(parent);
    expect(child).toMatchObject({ renderOrder: INSTRUCTIONAL_OVERLAY_RENDER_ORDER });
    expect(material).toMatchObject({ depthTest: false, depthWrite: false, toneMapped: false });
  });
});
