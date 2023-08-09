const DEFAULT_TEXT = `
import * as THREE from 'three';
import { Scene as StudioScene, Geometry, Animation } from 'studio';

export default class Example extends StudioScene {
  circle: Geometry.Circle;
  square: Geometry.Square;

  constructor(
    public scene: THREE.Scene,
    public camera: THREE.Camera,
    public renderer: THREE.WebGLRenderer,
  ) {
    super(scene, camera, renderer);

    this.circle = new Geometry.Circle(2);
    scene.add(this.circle);
    
    this.square = new Geometry.Square(2);
    scene.add(this.square);
    
    this.animations = [
      Animation.Shift(this.square, new THREE.Vector3(0, 2, 0)),
      Animation.Shift(this.square, new THREE.Vector3(0, -2, 0)),
    ];
  }
  
  render(time: number, deltaTime: number) {
    this.circle.position.x = 3 + Math.cos(time / 500);
    this.circle.position.y = Math.sin(time / 500);
    this.square.rotation.z += deltaTime / 500;
  };
}
`.slice(1);

const EXAMPLE_1 = `
import * as THREE from 'three';
import { Scene as StudioScene, Geometry, Animation } from 'studio';

export default class Example extends StudioScene {
  circle: Geometry.Circle;
  square: Geometry.Square;

  constructor(
    public scene: THREE.Scene,
    public camera: THREE.Camera,
    public renderer: THREE.WebGLRenderer,
  ) {
    super(scene, camera, renderer);

    this.circle = new Geometry.Circle(0.3);
    scene.add(this.circle);
    
    this.square = new Geometry.Square(2);
    scene.add(this.square);
    
    this.animations = [
      Animation.Shift(this.square, new THREE.Vector3(0, 2, 0)),
      Animation.Shift(this.square, new THREE.Vector3(0, -2, 0)),
    ];
  }
  
  render(time: number, deltaTime: number) {
    this.circle.position.x = 3 + Math.cos(time / 500);
    this.circle.position.y = Math.sin(time / 500);
    
    this.square.rotation.z += deltaTime / 500;
  };
}`.slice(1);

const EXAMPLE_2 = `
import * as THREE from 'three';
import { Scene as StudioScene, Geometry, Animation } from 'studio';

export default class Example extends StudioScene {
  circle: Geometry.Circle;
  square: Geometry.Square;

  constructor(
    public scene: THREE.Scene,
    public camera: THREE.Camera,
    public renderer: THREE.WebGLRenderer,
  ) {
    super(scene, camera, renderer);

    this.circle = new Geometry.Circle(1);
    scene.add(this.circle);
    
    this.square = new Geometry.Square(1);
    scene.add(this.square);
    
    this.animations = [
      Animation.Shift(this.square, new THREE.Vector3(0, 2, 0)),
      Animation.Shift(this.square, new THREE.Vector3(0, -2, 0)),
    ];
  }
  
  render(time: number, deltaTime: number) {
    this.circle.position.x = 3 + Math.cos(time / 500);
    this.circle.position.y = Math.sin(time / 500);
    
    this.square.rotation.z += deltaTime / 500;
  };
}
`.slice(1);
const SOURCE = [
  {
    desc :  'Sample 1',
    key  : 4,
    data : DEFAULT_TEXT
  },
  {
    desc :  'Sample 2',
    key  : 2,
    data : EXAMPLE_1
  },
  {
    desc :  'Sample 3',
    key  : 3,
    data : EXAMPLE_2
  }
]
export { DEFAULT_TEXT, EXAMPLE_1, EXAMPLE_2, SOURCE };
