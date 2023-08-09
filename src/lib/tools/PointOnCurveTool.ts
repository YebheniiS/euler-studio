import * as THREE from 'three';
import { Tool } from '$lib/tools/Tool';
import { PointCursor } from '$lib/tools/PointCursor';
import * as Geometry from '$lib/studio/geometry';
import type { CursorTool } from '$lib/tools/Tool';
import type { LayeredScene } from '$lib/LayeredScene';
import { clientToSceneCoordinates, clientToNdcCoordinates } from '$lib/utils/canvasUtils';
import { PIXELS_TO_COORDS } from '$lib/studio/constants';

enum Mode {
	SelectCurve,
	PositionPoint
}

class PointOnCurveTool extends Tool implements CursorTool {
	cursor: PointCursor;
	raycaster: THREE.Raycaster;
	normalizedDeviceCoordinates: THREE.Vector2;
	sceneCoordinates: THREE.Vector3;
	pointToCurve: THREE.Vector3;
	closestPointToCurve: THREE.Vector3;
	highlightStroke: Geometry.Shape | null;
	// TODO: These two should be a tuple.
	currentShape: Geometry.Shape | null;
	currentStrokeIndex: number | null;
	currentStrokeLength: number | null;
	mode: Mode;

	constructor(scene: LayeredScene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
		super(scene, camera, renderer);
		this.cursor = new PointCursor(scene, camera, renderer);
		this.raycaster = new THREE.Raycaster();
		if (this.raycaster.params.Line !== undefined) {
			this.raycaster.params.Line.threshold = 0.2;
		}
		this.normalizedDeviceCoordinates = new THREE.Vector2();
		this.sceneCoordinates = new THREE.Vector3();
		this.pointToCurve = new THREE.Vector3();
		this.closestPointToCurve = new THREE.Vector3();
		this.highlightStroke = null;
		this.currentShape = null;
		this.currentStrokeIndex = null;
		this.currentStrokeLength = null;
		this.mode = Mode.SelectCurve;
	}

	updatePoint(targetDistance: number) {
		if (this.mode !== Mode.PositionPoint) {
			throw Error('Called this.updatePoint while this.mode === Mode.PositionPoint');
		}
		if (this.highlightStroke === null) {
			throw Error('Called this.updatePoint while this.highlightStroke === null');
		}
		let currentDistance = 0;
		let currentPoint = this.highlightStroke.points[0];
		let newDistance = 0;
		let newPoint = null;
		for (let i = 1; i < this.highlightStroke.points.length; i++) {
			newPoint = this.highlightStroke.points.at(i);
			newDistance = this.pointToCurve.subVectors(newPoint, currentPoint).length();
			if (currentDistance + newDistance > targetDistance) {
				break;
			}
			currentDistance += newDistance;
			currentPoint = newPoint;
		}
		const remainingDistance = targetDistance - currentDistance;
		const targetPoint = currentPoint.clone();
		if (remainingDistance > 0) {
			const percentAlongLine = remainingDistance / newDistance;
			targetPoint.lerp(newPoint, percentAlongLine);
		}
		this.cursor.position.copy(targetPoint);
		return [targetPoint, targetDistance, this.currentStrokeLength];
	}

	confirmPoint() {
		this.scene.mainLayer.add(new Geometry.Point(this.cursor.position));
		this.scene.frontLayer.remove(this.cursor);
		this.mode = Mode.SelectCurve;
	}

	// TODO: Share this with PointCursor.
	getClosestPointOnStroke(
		sceneCoordinates: THREE.Vector3,
		shape: Geometry.Shape
	): [THREE.Vector3, number, number] {
		const points = shape.stroke.geometry._points.map((p: THREE.Vector3) =>
			p.clone().applyMatrix4(shape.stroke.matrixWorld)
		);
		let shortestDistance = Infinity;
		const closestPoint = new THREE.Vector3();
		let closestCurveIndex = null;
		let closestPointDistanceAlongCurve = 0;
		for (let i = 0; i < shape.curveEndIndices.length; i++) {
			const start = shape.curveEndIndices[i][0];
			const end = shape.curveEndIndices[i][1];
			let pointDistanceAlongCurve = 0;
			for (let j = start; j < end; j++) {
				const line = new THREE.Line3(points[j], points[j + 1]);
				const parameter = line.closestPointToPointParameter(sceneCoordinates, true);
				line.at(parameter, this.closestPointToCurve);

				this.pointToCurve.subVectors(this.closestPointToCurve, sceneCoordinates);
				const distance = this.pointToCurve.length();
				if (distance < shortestDistance) {
					shortestDistance = distance;
					closestPoint.copy(this.closestPointToCurve);
					closestCurveIndex = i;
					closestPointDistanceAlongCurve = pointDistanceAlongCurve + line.distance() * parameter;
				}
				pointDistanceAlongCurve += line.distance();
			}
		}
		return [closestPoint, closestCurveIndex, closestPointDistanceAlongCurve];
	}

	mouseMove(clientCoordinates: THREE.Vector2) {
		if (this.mode === Mode.SelectCurve) {
			clientToNdcCoordinates(clientCoordinates, this.renderer, this.normalizedDeviceCoordinates);
			this.raycaster.setFromCamera(this.normalizedDeviceCoordinates, this.camera);
			const intersects = this.raycaster.intersectObjects(this.scene.mainLayer.children);

			let shape: Geometry.Shape | null = null;
			for (const intersect of intersects) {
				const intersectObject = intersect.object;
				const intersectShape = intersectObject.parent as Geometry.Shape;
				if (intersectObject !== intersectShape.stroke || intersectShape instanceof Geometry.Point) {
					continue;
				}
				shape = intersectShape;
				break;
			}

			if (shape !== this.currentShape) {
				this.currentShape = null;
				if (this.highlightStroke !== null) {
					this.scene.frontLayer.remove(this.highlightStroke);
					this.highlightStroke.dispose();
					this.highlightStroke = null;
				}
				this.currentStrokeIndex = null;
				this.currentStrokeLength = null;
			}
			if (shape === null) {
				return [null, null, null];
			}
			this.currentShape = shape;

			clientToSceneCoordinates(
				clientCoordinates,
				this.renderer,
				this.camera,
				this.sceneCoordinates
			);
			const [, strokeIndex] = this.getClosestPointOnStroke(this.sceneCoordinates, shape);
			if (strokeIndex === this.currentStrokeIndex) {
				return [null, null, null];
			}

			this.currentStrokeIndex = strokeIndex;
			if (this.highlightStroke !== null) {
				this.scene.frontLayer.remove(this.highlightStroke);
				this.highlightStroke.dispose();
				this.highlightStroke = null;
			}

			const [newLineStartIndex, newLineEndIndex] = shape.curveEndIndices[this.currentStrokeIndex];
			const matrixWorld = shape.stroke.matrixWorld;
			const newLinePoints = shape.points
				.slice(newLineStartIndex, newLineEndIndex + 1)
				.map((p: THREE.Vector3) => p.clone().applyMatrix4(matrixWorld));

			this.currentStrokeLength = 0;
			for (let i = 1; i < newLinePoints.length; i++) {
				const curPoint = newLinePoints[i];
				const prevPoint = newLinePoints[i - 1];
				this.currentStrokeLength +=
					((curPoint.x - prevPoint.x) ** 2 +
						(curPoint.y - prevPoint.y) ** 2 +
						(curPoint.z - prevPoint.z) ** 2) **
					0.5;
			}

			const { strokeColor, strokeWidth } = shape.getStyle();
			this.highlightStroke = new Geometry.Shape(newLinePoints, {
				strokeColor,
				strokeWidth: strokeWidth + 1.5 * PIXELS_TO_COORDS
			});
			const highlightIndices = [shape.curveEndIndices[this.currentStrokeIndex]];
			highlightIndices[0] = highlightIndices[0].map((index) => index - highlightIndices[0][0]);
			this.highlightStroke.curveEndIndices = highlightIndices;
			this.scene.frontLayer.add(this.highlightStroke);
		} else if (this.mode === Mode.PositionPoint) {
			clientToSceneCoordinates(
				clientCoordinates,
				this.renderer,
				this.camera,
				this.sceneCoordinates
			);
			if (this.highlightStroke === null) {
				throw Error('this.mode === Mode.PositionPoint && this.highlightStroke === null');
			}

			const [closestPoint, , closestPointDistanceAlongCurve] = this.getClosestPointOnStroke(
				this.sceneCoordinates,
				this.highlightStroke
			);
			this.pointToCurve.subVectors(closestPoint, this.sceneCoordinates);
			this.cursor.position.copy(closestPoint);
			return [closestPoint, closestPointDistanceAlongCurve, this.currentStrokeLength];
		} else {
			throw Error(`Unknown mode ${this.mode}`);
		}
		return [null, null, null];
	}

	mouseDown(clientCoordinates: THREE.Vector2) {
		if (this.mode === Mode.SelectCurve) {
			if (this.currentShape === null) {
				return [null, null, null];
			}
			this.mode = Mode.PositionPoint;
			if (this.highlightStroke !== null) {
				this.scene.frontLayer.remove(this.highlightStroke);
			}
			this.scene.frontLayer.add(this.cursor);
			return this.mouseMove(clientCoordinates);
		} else {
			this.mode = Mode.SelectCurve;
			this.scene.mainLayer.add(new Geometry.Point(this.cursor.position));
			this.scene.frontLayer.remove(this.cursor);
		}
		return [null, null, null];
	}
}

export { PointOnCurveTool };
