<script lang="ts">
	import * as THREE from 'three';
	import { onMount, createEventDispatcher } from 'svelte';
	import { getFrame, getGrid } from '$lib/utils/canvasUtils';
	import { PIXELS_TO_COORDS } from '$lib/studio/constants';
	import type { LayeredScene } from '$lib/LayeredScene';
	import { Tool } from '$lib/utils/enum';
	import { SelectTool } from '$lib/tools/SelectTool';
	import { PointTool } from '$lib/tools/PointTool';
	import { LineTool } from '$lib/tools/LineTool';
	import { PolygonTool } from '$lib/tools/PolygonTool';
	import * as Geometry from '$lib/studio/geometry';
	import { PointOnCurveTool } from '$lib/tools/PointOnCurveTool';
	import { ShapeFromCurvesTool } from '$lib/tools/ShapeFromCurvesTool';
	import { RotateAboutPointTool } from '$lib/tools/RotateAboutPoint';

	export let scene: LayeredScene;
	let canvas, camera: THREE.Camera, renderer: THREE.WebGLRenderer;
	const dispatch = createEventDispatcher();

	export let widthDelta;
	let initialCanvasWidth, initialCanvasHeight;
	$: {
		if (renderer) {
			const pixelWidth = initialCanvasWidth + widthDelta;
			const pixelHeight = initialCanvasHeight;
			renderer.setSize(pixelWidth, pixelHeight);
			renderer.getSize(Geometry.GeometryResolution);

			const coordinateWidth = PIXELS_TO_COORDS * pixelWidth;
			const coordinateHeight = PIXELS_TO_COORDS * pixelHeight;
			camera.left = -coordinateWidth / 2;
			camera.right = coordinateWidth / 2;
			camera.top = coordinateHeight / 2;
			camera.bottom = -coordinateHeight / 2;
			camera.updateProjectionMatrix();
		}
	}

	export let selectedTool: Tool;

	let selectTool: SelectTool;
	export let selectedObject: Geometry.Shape | null;
	$: if (selectTool && selectedTool === Tool.Select) {
		selectTool.setSelectedObject(selectedObject);
	}
	$: if (selectTool && selectedTool !== Tool.Select) {
		selectTool.quit();
	}
	export const updateSelectCursor = () => {
		selectTool.setSelectedObject(selectedObject);
	};

	let pointOnCurveTool: PointOnCurveTool;
	let pointOnCurveToolTooltip: Element;
	let pointOnCurveSceneCoords: THREE.Vector3 | null = null;
	let pointOnCurveTooltipCoords: THREE.Vector2 | null = null;
	let pointOnCurveDistanceAlongCurve: number | null = null;
	let pointOnCurveTotalDistance: number | null = null;
	$: dispatch('updatePointOnCurvePanel', {
		distance: pointOnCurveDistanceAlongCurve,
		totalDistance: pointOnCurveTotalDistance
	});
	export const updatePointOnCurve = (distance: number) => {
		[pointOnCurveSceneCoords, pointOnCurveDistanceAlongCurve, pointOnCurveTotalDistance] =
			pointOnCurveTool.updatePoint(distance);
		if (pointOnCurveSceneCoords !== null) {
			let pointOnCurveNdc = pointOnCurveSceneCoords.project(camera);
			pointOnCurveTooltipCoords = new THREE.Vector2(
				0.5 * renderer.domElement.scrollWidth * (1 + pointOnCurveNdc.x),
				0.5 * renderer.domElement.scrollHeight * (1 - pointOnCurveNdc.y) - 10
			);
		}
	};
	export const confirmPointOnCurve = () => {
		pointOnCurveTool.confirmPoint();
		pointOnCurveSceneCoords = null;
		pointOnCurveDistanceAlongCurve = null;
		pointOnCurveTotalDistance = null;
		pointOnCurveTooltipCoords = null;
	};

	let pointTool: PointTool;
	let lineTool: LineTool;
	let polygonTool: PolygonTool;
	$: if (polygonTool && selectedTool !== Tool.Polygon) {
		polygonTool.quit();
	}

	let shapeFromCurvesTool: ShapeFromCurvesTool;
	$: if (shapeFromCurvesTool && selectedTool !== Tool.ShapeFromCurves) {
		shapeFromCurvesTool.quit();
	}

	let rotateAboutPointTool: RotateAboutPointTool;
	$: if (rotateAboutPointTool && selectedTool === Tool.RotateAboutPoint) {
		rotateAboutPointTool.setSelectedObject(selectedObject);
	}
	$: if (rotateAboutPointTool && selectedTool !== Tool.RotateAboutPoint) {
		rotateAboutPointTool.quit();
	}

	const clientCoordinates = new THREE.Vector2();
	let handleMouseMove = (event) => {
		clientCoordinates.set(event.offsetX, event.offsetY);
		if (selectedTool === Tool.Select) {
			const transform = selectTool.mouseMove(clientCoordinates);
			dispatch('updateTransform', transform);
		} else if (selectedTool === Tool.Point) {
			pointTool.mouseMove(clientCoordinates);
		} else if (selectedTool === Tool.PointOnCurve) {
			[pointOnCurveSceneCoords, pointOnCurveDistanceAlongCurve, pointOnCurveTotalDistance] =
				pointOnCurveTool.mouseMove(clientCoordinates);
			if (pointOnCurveSceneCoords !== null) {
				let pointOnCurveNdc = pointOnCurveSceneCoords.project(camera);
				pointOnCurveTooltipCoords = new THREE.Vector2(
					0.5 * renderer.domElement.scrollWidth * (1 + pointOnCurveNdc.x),
					0.5 * renderer.domElement.scrollHeight * (1 - pointOnCurveNdc.y) - 10
				);
			} else {
				pointOnCurveTooltipCoords = null;
			}
		} else if (selectedTool === Tool.Line) {
			lineTool.mouseMove(clientCoordinates);
		} else if (selectedTool === Tool.Polygon) {
			polygonTool.mouseMove(clientCoordinates);
		} else if (selectedTool === Tool.ShapeFromCurves) {
			shapeFromCurvesTool.mouseMove(clientCoordinates);
		} else if (selectedTool === Tool.RotateAboutPoint) {
			rotateAboutPointTool.mouseMove(clientCoordinates);
		}
	};

	let handleMouseDown = () => {
		if (selectedTool === Tool.Select) {
			const newlySelected = selectTool.mouseDown(clientCoordinates);
			dispatch('objectSelect', { object: newlySelected });
		} else if (selectedTool === Tool.Point) {
			pointTool.mouseDown();
		} else if (selectedTool === Tool.PointOnCurve) {
			let data = pointOnCurveTool.mouseDown(clientCoordinates);
			[pointOnCurveSceneCoords, pointOnCurveDistanceAlongCurve, pointOnCurveTotalDistance] = data;
			if (pointOnCurveSceneCoords !== null) {
				let pointOnCurveNdc = pointOnCurveSceneCoords.project(camera);
				pointOnCurveTooltipCoords = new THREE.Vector2(
					0.5 * renderer.domElement.scrollWidth * (1 + pointOnCurveNdc.x),
					0.5 * renderer.domElement.scrollHeight * (1 - pointOnCurveNdc.y) - 10
				);
			} else {
				pointOnCurveTooltipCoords = null;
			}
		} else if (selectedTool === Tool.Line) {
			lineTool.mouseDown();
		} else if (selectedTool === Tool.Polygon) {
			polygonTool.mouseDown();
		} else if (selectedTool === Tool.ShapeFromCurves) {
			shapeFromCurvesTool.mouseDown();
		} else if (selectedTool === Tool.RotateAboutPoint) {
			const quitTool = rotateAboutPointTool.mouseDown(clientCoordinates);
			if (quitTool) {
				dispatch('setSelectedTool', Tool.Select);
			}
		}
	};

	let handleMouseUp = () => {
		if (selectedTool === Tool.Select) {
			selectTool.mouseUp();
		} else if (selectedTool === Tool.RotateAboutPoint) {
			rotateAboutPointTool.mouseUp(clientCoordinates);
		}
	};

	let handleMouseEnter = () => {
		if (selectedTool === Tool.Point) {
			pointTool.mouseEnter();
		} else if (selectedTool === Tool.Line) {
			lineTool.mouseEnter();
		} else if (selectedTool === Tool.Polygon) {
			polygonTool.mouseEnter();
		}
	};

	let handleMouseLeave = () => {
		if (selectedTool === Tool.Point) {
			pointTool.mouseLeave();
		} else if (selectedTool === Tool.Line) {
			lineTool.mouseLeave();
		} else if (selectedTool === Tool.Polygon) {
			polygonTool.mouseLeave();
		}
	};

	let handleKeyDown = (event: KeyboardEvent) => {
		if (selectedTool === Tool.Select) {
			const backspace = selectTool.keyDown(event);
			if (backspace) {
				dispatch('deleteSelectedObject');
			}
		} else if (selectedTool === Tool.Point) {
			pointTool.keyDown(event);
		} else if (selectedTool === Tool.Line) {
			lineTool.keyDown(event);
		} else if (selectedTool === Tool.Polygon) {
			polygonTool.keyDown(event);
		}
	};

	let handleKeyUp = (event: KeyboardEvent) => {
		if (selectedTool === Tool.Point) {
			pointTool.keyUp(event);
		} else if (selectedTool === Tool.Line) {
			lineTool.keyUp(event);
		} else if (selectedTool === Tool.Polygon) {
			polygonTool.keyUp(event);
		}
	};

	onMount(() => {
		initialCanvasWidth = canvas.scrollWidth;
		initialCanvasHeight = canvas.scrollHeight;

		renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
		renderer.setPixelRatio(window.devicePixelRatio);
		renderer.setClearColor(new THREE.Color(0xfffaf0));
		renderer.getSize(Geometry.GeometryResolution);

		camera = new THREE.OrthographicCamera();
		camera.position.z = 6;

		scene.backLayer.add(getGrid(canvas.scrollWidth, canvas.scrollHeight));
		scene.backLayer.add(getFrame());

		renderer.setAnimationLoop(() => {
			for (let i = 0; i < scene.mainLayer.children.length; i++) {
				const shape = scene.mainLayer.children[i];
				if (shape.fillVisible) {
					shape.fill.material.polygonOffsetUnits = -2 * i;
				}
				if (shape.strokeVisible) {
					shape.stroke.material.polygonOffsetUnits = -2 * i - 1;
				}
			}

			renderer.render(scene, camera);
		});

		selectTool = new SelectTool(scene, camera, renderer);
		pointTool = new PointTool(scene, camera, renderer);
		pointOnCurveTool = new PointOnCurveTool(scene, camera, renderer);
		lineTool = new LineTool(scene, camera, renderer);
		polygonTool = new PolygonTool(scene, camera, renderer);
		shapeFromCurvesTool = new ShapeFromCurvesTool(scene, camera, renderer);
		rotateAboutPointTool = new RotateAboutPointTool(scene, camera, renderer);
	});

	export const setSnapConfig = (config: { snap: string; value: boolean }) => {
		let currentTool;
		switch (selectedTool) {
			case Tool.Polygon:
				currentTool = polygonTool;
				break;
			case Tool.Line:
				currentTool = lineTool;
				break;
			case Tool.Point:
				currentTool = pointTool;
				break;
			case Tool.PointOnCurve:
				currentTool = pointOnCurveTool;
				break;
			default:
				throw Error(`Can't update snap config while selectedTool = ${selectedTool}`);
		}

		if (config.snap === 'points') {
			currentTool.cursor.snapToPoints = config.value;
		} else if (config.snap === 'curves') {
			currentTool.cursor.snapToCurves = config.value;
		} else if (config.snap === 'intersections') {
			currentTool.cursor.snapToIntersections = config.value;
		}
	};
</script>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

<div class="flex grow relative">
	<div
		bind:this={pointOnCurveToolTooltip}
		class="tooltip tooltip-open"
		class:hidden={pointOnCurveTooltipCoords === null}
		style="left: {pointOnCurveTooltipCoords?.x}px; top: {pointOnCurveTooltipCoords?.y}px;"
		data-tip="{pointOnCurveDistanceAlongCurve !== null
			? Math.round(pointOnCurveDistanceAlongCurve * 100) / 100
			: null} / {Math.round((pointOnCurveDistanceAlongCurve / pointOnCurveTotalDistance) * 100)}%"
	/>
	<canvas
		bind:this={canvas}
		on:mousemove={handleMouseMove}
		on:mousedown={handleMouseDown}
		on:mouseup={handleMouseUp}
		on:mouseenter={handleMouseEnter}
		on:mouseleave={handleMouseLeave}
		class="grow"
		style="width: 0"
	/>
</div>
