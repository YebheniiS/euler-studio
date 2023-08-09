import { Tool } from '$lib/tools/Tool';
import { PointCursor } from '$lib/tools/PointCursor';
import * as Geometry from '$lib/studio/geometry';
import type { CursorTool } from '$lib/tools/Tool';
import * as THREE from 'three';
import type { LayeredScene } from '$lib/LayeredScene';
import { clientToSceneCoordinates, clientToNdcCoordinates } from '$lib/utils/canvasUtils';
import { PIXELS_TO_COORDS } from '$lib/studio/constants';

class ShapeFromCurvesTool extends Tool implements CursorTool {
	cursor: PointCursor;
	raycaster: THREE.Raycaster;
	normalizedDeviceCoordinates: THREE.Vector2;
	newHighlightPoint: Geometry.Point | null;
	newHighlightStroke: Geometry.Shape | null;
	highlightPoints: Array<Geometry.Point>;
	highlightStrokes: Array<Geometry.Shape>;
	adjacentCurves: Array<Array<THREE.Vector3>> | null;
	sceneCoordinates: THREE.Vector3;
	adjacentThreshold: number;

	constructor(scene: LayeredScene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
		super(scene, camera, renderer);
		this.cursor = new PointCursor(scene, camera, renderer);
		this.raycaster = new THREE.Raycaster();
		if (this.raycaster.params.Line !== undefined) {
			this.raycaster.params.Line.threshold = 0.2;
		}
		this.normalizedDeviceCoordinates = new THREE.Vector2();
		this.newHighlightPoint = null;
		this.newHighlightStroke = null;
		this.highlightPoints = [];
		this.highlightStrokes = [];
		this.adjacentCurves = null;
		this.sceneCoordinates = new THREE.Vector3();
		this.adjacentThreshold = 0.0001;
	}

	clearNewHighlights() {
		if (this.newHighlightPoint !== null) {
			this.scene.frontLayer.remove(this.newHighlightPoint);
			this.newHighlightPoint.dispose();
			this.newHighlightPoint = null;
		}
		if (this.newHighlightStroke !== null) {
			this.scene.frontLayer.remove(this.newHighlightStroke);
			this.newHighlightStroke.dispose();
			this.newHighlightStroke = null;
		}
	}

	clearData() {
		for (const point of this.highlightPoints) {
			this.scene.frontLayer.remove(point);
			point.dispose();
		}
		for (const stroke of this.highlightStrokes) {
			this.scene.frontLayer.remove(stroke);
			stroke.dispose();
		}
		this.highlightPoints = [];
		this.highlightStrokes = [];
		this.clearNewHighlights();
	}

	quit() {
		this.clearData();
	}

	extendCurve(
		curveData: [Array<THREE.Vector3>, Geometry.Shape, number, number],
		points: Array<THREE.Vector3>
	): number {
		const curve = curveData[0];
		const curveEnd = curve.at(-1);
		const shape = curveData[1];
		const curveIndex = curveData[2];
		const orientation = curveData[3];
		const closestToSegment = new THREE.Vector3();
		// Look for a curve whose endpoint matches the end of the curve.
		for (let i = 0; i < shape.numCurves; i++) {
			const shapeCurve = shape.curve(i);
			if (
				shapeCurve.at(-1).distanceTo(curveEnd) > this.adjacentThreshold &&
				shapeCurve.at(0).distanceTo(curveEnd) > this.adjacentThreshold
			) {
				continue;
			}

			if (
				curveIndex === i &&
				shapeCurve.at(0).distanceTo(shapeCurve.at(-1)) > this.adjacentThreshold
			) {
				// A highlight can only be extended by its own curve if it's a closed curve (e.g. a circle).
				continue;
			}

			if (orientation === -1) {
				shapeCurve.reverse();
			}

			// Extend the curve while looking for endpoints.
			let closestPointDistance = Infinity;
			let closestPoint = null;
			for (let j = 0; j < shapeCurve.length - 1; j++) {
				const segment = new THREE.Line3(shapeCurve[j], shapeCurve[j + 1]);
				for (const point of points) {
					segment.closestPointToPoint(point, true, closestToSegment);
					const distanceToLine = closestToSegment.distanceTo(point);
					if (distanceToLine < this.adjacentThreshold) {
						const pointDistance = curve.at(-1).distanceTo(point);
						if (pointDistance < closestPointDistance) {
							closestPointDistance = pointDistance;
							closestPoint = point.clone();
						}
					}
				}
				if (closestPoint !== null) {
					curve.push(closestPoint);
					return -1;
				}
				curve.push(shapeCurve[j + 1]);
			}
			return i;
		}
		return -1;
	}

	extendAdjacentCurves(curves: Array<[Array<THREE.Vector3>, Geometry.Shape, number, number]>) {
		const points = [];
		for (const shape of this.scene.mainLayer.children) {
			if (shape instanceof Geometry.Point) {
				points.push(shape.position);
			}
		}

		const extendedCurves = [];
		for (const curveData of curves) {
			let newCurveIndex = this.extendCurve(curveData, points);
			while (newCurveIndex !== -1) {
				curveData[2] = newCurveIndex;
				newCurveIndex = this.extendCurve(curveData, points);
			}
			extendedCurves.push(curveData[0]);
		}
		return extendedCurves;
	}

	curvesAdjacentToLastPoint(position: THREE.Vector3) {
		const points = [];
		for (const shape of this.scene.mainLayer.children) {
			if (shape instanceof Geometry.Point) {
				points.push(shape.position);
			}
		}

		const adjacentCurves: Array<[Array<THREE.Vector3>, Geometry.Shape, number, number]> = [];
		const pointToLine = new THREE.Vector3();
		const closestToSegment = new THREE.Vector3();
		for (const shape of this.scene.mainLayer.children) {
			if (!(shape instanceof Geometry.Shape)) {
				continue;
			}
			for (let i = 0; i < shape.numCurves; i++) {
				const curve = shape.curve(i);
				let curveSegment: Array<THREE.Vector3> = [];
				let encounteredEndPoint = false;
				let encounteredPosition = false;
				for (let j = 0; j < curve.length - 1; j++) {
					curveSegment.push(curve[j].clone());
					const segment = new THREE.Line3(curve[j], curve[j + 1]);

					// See if the segment intersects the position.
					segment.closestPointToPoint(position, true, closestToSegment);
					const distanceToLine = pointToLine.subVectors(closestToSegment, position).length();
					if (distanceToLine < this.adjacentThreshold) {
						encounteredPosition = true;

						// Look for other points on this segment.
						let prevPoint = null;
						let lastToPrevPointDistance = -Infinity;
						let nextPoint = null;
						let lastToNextPointDistance = Infinity;
						const lastToPositionDistance = curveSegment.at(-1).distanceTo(position);
						for (const point of points) {
							if (point.distanceTo(position) < this.adjacentThreshold) {
								continue;
							}
							segment.closestPointToPoint(point, true, closestToSegment);
							const distanceToLine = pointToLine.subVectors(closestToSegment, point).length();
							if (distanceToLine < this.adjacentThreshold) {
								const lastToPointDistance = curveSegment.at(-1).distanceTo(point);
								if (
									lastToPrevPointDistance < lastToPointDistance &&
									lastToPointDistance < lastToPositionDistance
								) {
									prevPoint = point.clone();
									lastToPrevPointDistance = lastToPointDistance;
								} else if (
									lastToPositionDistance < lastToPointDistance &&
									lastToPointDistance < lastToNextPointDistance
								) {
									nextPoint = point.clone();
									lastToNextPointDistance = lastToPointDistance;
								}
							}
						}

						if (prevPoint !== null && nextPoint !== null) {
							adjacentCurves.push([[position.clone(), prevPoint.clone()], shape, i, -1]);
							adjacentCurves.push([[position.clone(), nextPoint.clone()], shape, i, +1]);
							encounteredEndPoint = true;
							break;
						} else if (prevPoint !== null) {
							adjacentCurves.push([[position.clone(), prevPoint.clone()], shape, i, -1]);
							curveSegment = [position.clone()];
							adjacentCurves.push([curveSegment, shape, i, +1]);
							continue;
						} else if (nextPoint !== null) {
							curveSegment.push(position.clone());
							curveSegment.reverse();
							adjacentCurves.push([curveSegment, shape, i, -1]);
							adjacentCurves.push([[position.clone(), nextPoint.clone()], shape, i, +1]);
							encounteredEndPoint = true;
							break;
						} else {
							curveSegment.push(position.clone());
							curveSegment.reverse();
							adjacentCurves.push([curveSegment, shape, i, -1]);
							curveSegment = [position.clone()];
							adjacentCurves.push([curveSegment, shape, i, +1]);
							continue;
						}
					}

					// This segment doesn't contain the position, but may contain a start/end point.
					let minDistance = Infinity;
					let currentPoint = null;
					for (const point of points) {
						segment.closestPointToPoint(point, true, closestToSegment);
						const distanceToLine = closestToSegment.distanceTo(point);
						if (distanceToLine < this.adjacentThreshold) {
							const measureEndpoint = encounteredPosition ? curve[j] : curve[j + 1];
							const distance = measureEndpoint.distanceTo(point);
							if (distance < minDistance) {
								minDistance = distance;
								currentPoint = point.clone();
							}
						}
					}
					if (currentPoint !== null) {
						if (encounteredPosition) {
							encounteredEndPoint = true;
							curveSegment.push(currentPoint.clone());
							break;
						} else {
							curveSegment = [currentPoint.clone()];
							continue;
						}
					}
				}
				if (!encounteredEndPoint) {
					curveSegment.push(curve.at(-1));
				}
			}
		}
		return this.extendAdjacentCurves(adjacentCurves);
	}

	mouseMove(clientCoordinates: THREE.Vector2) {
		clientToNdcCoordinates(clientCoordinates, this.renderer, this.normalizedDeviceCoordinates);
		this.raycaster.setFromCamera(this.normalizedDeviceCoordinates, this.camera);
		const frontIntersects = this.raycaster.intersectObjects(this.scene.frontLayer.children);

		// Return early if mousing over the current highlight.
		for (const intersect of frontIntersects) {
			const intersectObject = intersect.object;
			const intersectShape = intersectObject.parent as Geometry.Shape;
			if (intersectShape === this.newHighlightStroke || intersectShape === this.newHighlightPoint) {
				return;
			}
		}
		this.clearNewHighlights();

		const intersects = this.raycaster.intersectObjects(this.scene.mainLayer.children);
		if (this.highlightPoints.length === 0) {
			// If mousing over the first point, highlight it.
			for (const intersect of intersects) {
				const intersectObject = intersect.object;
				const intersectShape = intersectObject.parent as Geometry.Shape;
				if (intersectShape instanceof Geometry.Point) {
					const highlightPoint = new Geometry.Point(intersectShape.position);
					highlightPoint.scale.set(1.3, 1.3, 1.3);
					this.scene.frontLayer.add(highlightPoint);
					this.newHighlightPoint = highlightPoint;
					break;
				}
			}
			return;
		}

		if (this.adjacentCurves === null) {
			throw Error('Added a highlightPoint without setting adjacentCurves');
		}
		// Find the curve that was moused over if any.
		clientToSceneCoordinates(clientCoordinates, this.renderer, this.camera, this.sceneCoordinates);
		const closestOnSegment = new THREE.Vector3();
		let intersectedCurve = null;
		let currentMinDistance = Infinity;
		let mousePoint = null;
		for (const curve of this.adjacentCurves) {
			for (let i = 0; i < curve.length - 1; i++) {
				const segment = new THREE.Line3(curve[i], curve[i + 1]);
				segment.closestPointToPoint(this.sceneCoordinates, true, closestOnSegment);
				const distanceToLine = closestOnSegment.distanceTo(this.sceneCoordinates);
				if (distanceToLine < currentMinDistance) {
					currentMinDistance = distanceToLine;
					intersectedCurve = curve;
					mousePoint = closestOnSegment.clone();
				}
			}
		}
		if (currentMinDistance > 0.2) {
			// The mouse isn't close enough to any adjacent curve
			// to consider it moused over.
			return;
		}

		if (intersectedCurve === null || mousePoint === null) {
			return;
		}

		this.newHighlightStroke = new Geometry.Polygon(intersectedCurve, {
			strokeWidth: 6 * PIXELS_TO_COORDS
		});
		this.newHighlightPoint = new Geometry.Point(intersectedCurve.at(-1));
		this.newHighlightPoint.scale.set(1.3, 1.3, 1.3);
		this.scene.frontLayer.add(this.newHighlightStroke, this.newHighlightPoint);
	}

	mouseDown() {
		if (
			this.newHighlightPoint !== null &&
			this.newHighlightStroke !== null &&
			this.highlightPoints.length > 0 &&
			this.newHighlightPoint.position.distanceTo(this.highlightPoints[0].position) <
				this.adjacentThreshold
		) {
			// Add new polygon.
			const newPoints = [...this.highlightStrokes, this.newHighlightStroke]
				.map((stroke) => {
					stroke.points.map((point) => point.applyMatrix4(stroke.matrixWorld));
					return stroke.points;
				})
				.reduce((points, pointArray) => (points = [...points, ...pointArray.slice(1)]));
			this.scene.mainLayer.add(new Geometry.Polygon(newPoints, { fill: true }));

			// Clear data.
			this.clearData();
		} else {
			if (this.newHighlightPoint !== null) {
				this.adjacentCurves = this.curvesAdjacentToLastPoint(this.newHighlightPoint.position);
				this.highlightPoints.push(this.newHighlightPoint);
				this.newHighlightPoint = null;
			}
			if (this.newHighlightStroke !== null) {
				this.highlightStrokes.push(this.newHighlightStroke);
				this.newHighlightStroke = null;
			}
		}
	}

	mouseEnter() {
		this.scene.frontLayer.add(this.cursor);
	}

	mouseLeave() {
		this.scene.frontLayer.remove(this.cursor);
	}

	keyDown(event: KeyboardEvent) {
		this.cursor.keyDown(event);
	}

	keyUp(event: KeyboardEvent) {
		this.cursor.keyUp(event);
	}
}

export { ShapeFromCurvesTool };
