import * as THREE from 'three';
import {
	getNearestCoordinate,
	clientToSceneCoordinates,
	clientToNdcCoordinates
} from '$lib/utils/canvasUtils';
import * as Geometry from '$lib/studio/geometry';
import type { LayeredScene } from '$lib/LayeredScene';

const Circle = Geometry.Circle;
class PointCursor extends Circle {
	scene: LayeredScene;
	camera: THREE.Camera;
	renderer: THREE.WebGLRenderer;
	nearestCoordinate: THREE.Vector2;
	alignToGrid: boolean;
	distanceToPoint: THREE.Vector3;
	sceneCoordinates: THREE.Vector3;
	normalizedDeviceCoordinates: THREE.Vector2;
	raycaster: THREE.Raycaster;
	pointToCurve: THREE.Vector3;
	closestPointToCurve: THREE.Vector3;
	intersectionProximityThreshold: number;
	snapToPoints: boolean;
	snapToCurves: boolean;
	snapToIntersections: boolean;

	constructor(scene: LayeredScene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
		super(0.08, { fillColor: new THREE.Color('black'), fill: true });
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
		this.nearestCoordinate = new THREE.Vector2();
		this.alignToGrid = true;
		this.distanceToPoint = new THREE.Vector3();
		this.sceneCoordinates = new THREE.Vector3();
		this.normalizedDeviceCoordinates = new THREE.Vector2();
		this.raycaster = new THREE.Raycaster();
		if (this.raycaster.params.Line !== undefined) {
			this.raycaster.params.Line.threshold = 0.2;
		}
		this.pointToCurve = new THREE.Vector3();
		this.closestPointToCurve = new THREE.Vector3();
		this.intersectionProximityThreshold = 0.2;
		this.snapToPoints = true;
		this.snapToCurves = true;
		this.snapToIntersections = true;
	}

	trySnapToPoint() {
		for (const child of this.scene.mainLayer.children) {
			if (!(child instanceof Geometry.Point)) continue;

			this.distanceToPoint.set(
				child.position.x - this.sceneCoordinates.x,
				child.position.y - this.sceneCoordinates.y,
				0
			);

			if (this.distanceToPoint.length() < 0.2) {
				this.position.copy(child.position);
				return true;
			}
		}
		return false;
	}

	getClosestPointOnStroke(sceneCoordinates: THREE.Vector3, shape: Geometry.Shape) {
		const points = shape.stroke.geometry._points.map((p: THREE.Vector3) =>
			p.clone().applyMatrix4(shape.stroke.matrixWorld)
		);
		let shortestDistance = Infinity;
		const closestPoint = new THREE.Vector3();
		let closestCurveIndex = null;
		for (let i = 0; i < shape.curveEndIndices.length; i++) {
			const start = shape.curveEndIndices[i][0];
			const end = shape.curveEndIndices[i][1];
			for (let j = start; j < end; j++) {
				const line = new THREE.Line3(points[j], points[j + 1]);
				line.closestPointToPoint(sceneCoordinates, true, this.closestPointToCurve);
				this.pointToCurve.subVectors(this.closestPointToCurve, sceneCoordinates);
				const distance = this.pointToCurve.length();
				if (distance < shortestDistance) {
					shortestDistance = distance;
					closestPoint.copy(this.closestPointToCurve);
					closestCurveIndex = i;
				}
			}
		}
		return closestPoint;
	}

	trySnapToCurve() {
		this.raycaster.setFromCamera(this.normalizedDeviceCoordinates, this.camera);
		const intersects = this.raycaster.intersectObjects(this.scene.mainLayer.children);
		if (intersects.length === 0) {
			return false;
		}

		for (const intersect of intersects) {
			const object = intersect.object;
			const shape = object.parent as Geometry.Shape;
			if (object !== shape.stroke || shape instanceof Geometry.Point) {
				continue;
			}

			const closestPoint = this.getClosestPointOnStroke(this.sceneCoordinates, shape);
			this.position.copy(closestPoint);
			return true;
		}
		return false;
	}

	/*
	[ a b ]   [ xa ]   [ ba ]
	[ c d ] * [ xb ] = [ bb ]
	*/
	matrixSolve(ma: number, mb: number, mc: number, md: number, ba: number, bb: number) {
		const determinant = ma * md - mb * mc;
		if (determinant === 0) {
			return null;
		}
		return [(md * ba - mb * bb) / determinant, (ma * bb - mc * ba) / determinant];
	}

	getIntersection(p1: THREE.Vector3, p2: THREE.Vector3, q1: THREE.Vector3, q2: THREE.Vector3) {
		const p2MinusP1 = new THREE.Vector3().subVectors(p2, p1);
		const q1MinusQ2 = new THREE.Vector3().subVectors(q1, q2);
		const q1MinusP1 = new THREE.Vector3().subVectors(q1, p1);
		const solution = this.matrixSolve(
			p2MinusP1.x,
			q1MinusQ2.x,
			p2MinusP1.y,
			q1MinusQ2.y,
			q1MinusP1.x,
			q1MinusP1.y
		);
		if (solution === null) {
			// TODO: Handle parallel lines.
			return null;
		}

		const [s, t] = solution;
		if (s < 0 || 1 < s || t < 0 || 1 < t) {
			return null;
		}

		return new THREE.Vector3((1 - s) * p1.x + s * p2.x, (1 - s) * p1.y + s * p2.y, 0);
	}

	trySnapToIntersection() {
		this.raycaster.setFromCamera(this.normalizedDeviceCoordinates, this.camera);
		const intersects = this.raycaster.intersectObjects(this.scene.mainLayer.children);
		if (intersects.length < 2) {
			return false;
		}

		const curvesNearMouse = [];
		const shapeContainingCurves = [];
		for (const intersect of intersects) {
			const object = intersect.object;
			const shape = object.parent as Geometry.Shape;
			if (object !== shape.stroke) {
				continue;
			}

			const points = shape.stroke.geometry._points.map((p) =>
				p.clone().applyMatrix4(shape.stroke.matrixWorld)
			);
			for (let i = 0; i < shape.curveEndIndices.length; i++) {
				const start = shape.curveEndIndices[i][0];
				const end = shape.curveEndIndices[i][1];
				const curve = [];
				for (let j = start; j < end; j++) {
					const line = new THREE.Line3(points[j], points[j + 1]);
					line.closestPointToPoint(this.sceneCoordinates, true, this.closestPointToCurve);
					this.pointToCurve.subVectors(this.closestPointToCurve, this.sceneCoordinates);
					const distance = this.pointToCurve.length();
					if (distance < this.intersectionProximityThreshold) {
						curve.push(line);
					}
				}
				if (curve.length > 0) {
					shapeContainingCurves.push(shape);
					curvesNearMouse.push(curve);
				}
			}
		}

		for (let i = 0; i < curvesNearMouse.length; i++) {
			for (let j = i + 1; j < curvesNearMouse.length; j++) {
				if (shapeContainingCurves[i] === shapeContainingCurves[j]) continue;
				const curve1 = curvesNearMouse[i];
				const curve2 = curvesNearMouse[j];
				for (let k = 0; k < curve1.length; k++) {
					for (let l = 0; l < curve2.length; l++) {
						const line1 = curve1[k];
						const line2 = curve2[l];
						const maybeIntersection = this.getIntersection(
							line1.start,
							line1.end,
							line2.start,
							line2.end
						);
						if (maybeIntersection !== null) {
							this.position.copy(maybeIntersection);
							return true;
						}
					}
				}
			}
		}

		return false;
	}

	mouseMove(clientCoordinates: THREE.Vector2) {
		clientToSceneCoordinates(clientCoordinates, this.renderer, this.camera, this.sceneCoordinates);
		clientToNdcCoordinates(clientCoordinates, this.renderer, this.normalizedDeviceCoordinates);

		if (this.alignToGrid) {
			getNearestCoordinate(this.sceneCoordinates, this.nearestCoordinate);
			this.position.set(this.nearestCoordinate.x, this.nearestCoordinate.y, 0);
		} else {
			if (
				(this.snapToPoints && this.trySnapToPoint()) ||
				(this.snapToIntersections && this.trySnapToIntersection()) ||
				(this.snapToCurves && this.trySnapToCurve())
			) {
				return;
			}
			this.position.set(this.sceneCoordinates.x, this.sceneCoordinates.y, 0);
		}
	}

	keyDown(event: KeyboardEvent) {
		if (event.key === 'Shift') {
			this.alignToGrid = false;
		}
	}

	keyUp(event: KeyboardEvent) {
		if (event.key === 'Shift') {
			this.alignToGrid = true;
		}
	}
}

export { PointCursor };
