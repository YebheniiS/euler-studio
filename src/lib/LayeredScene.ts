import * as THREE from 'three';

class LayeredScene extends THREE.Scene {
	backLayer: THREE.Group;
	mainLayer: THREE.Group;
	frontLayer: THREE.Group;

	constructor() {
		super();

		this.backLayer = new THREE.Group();
		this.mainLayer = new THREE.Group();
		this.frontLayer = new THREE.Group();

		this.backLayer.position.z = -0.1;
		this.frontLayer.position.z = 0.1;

		this.add(this.backLayer, this.mainLayer, this.frontLayer);
	}
}

export { LayeredScene };
