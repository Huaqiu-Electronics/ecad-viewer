// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import {
    AmbientLight,
    AnimationMixer,
    AxesHelper,
    Box3,
    Cache,
    Color,
    DirectionalLight,
    GridHelper,
    LoaderUtils,
    LoadingManager,
    PMREMGenerator,
    PerspectiveCamera,
    PointsMaterial,
    REVISION,
    Scene,
    SkeletonHelper,
    Vector3,
    WebGLRenderer,
    LinearToneMapping,
    AnimationClip,
    Object3D,
    type Object3DEventMap,
    BufferGeometry,
    Material,
    SkinnedMesh,
    type NormalBufferAttributes,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { TrackballControls } from "three/addons/controls/TrackballControls.js";

import { EXRLoader } from "three/addons/loaders/EXRLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { environments } from "./environments";

const DEFAULT_CAMERA = "[default]";

const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;
const DRACO_LOADER = new DRACOLoader(MANAGER).setDecoderPath(
    `${THREE_PATH}/examples/jsm/libs/draco/gltf/`,
);
const KTX2_LOADER = new KTX2Loader(MANAGER).setTranscoderPath(
    `${THREE_PATH}/examples/jsm/libs/basis/`,
);

Cache.enabled = true;

export class Viewer {
    el: HTMLElement;
    lights: never[];
    content;
    mixer: AnimationMixer | null;
    clips: never[];
    gui: null;
    state: {
        environment: any;
        background: boolean;
        playbackSpeed: number;
        actionStates: Record<string, never>;
        camera: string;
        wireframe: boolean;
        skeleton: boolean;
        grid: boolean;
        autoRotate: boolean;
        // Lights
        punctualLights: boolean;
        exposure: number;
        toneMapping: 1;
        ambientIntensity: number;
        ambientColor: string;
        directIntensity: number; // TODO(#116)
        directColor: string;
        bgColor: string;
        pointSize: number;
    };
    prevTime: number;
    backgroundColor: Color;
    scene: Scene;
    defaultCamera: PerspectiveCamera;
    activeCamera: any;
    renderer: WebGLRenderer;
    pmremGenerator: PMREMGenerator;
    neutralEnvironment: any;
    controls: TrackballControls;
    cameraCtrl: null;
    cameraFolder: null;
    animFolder: null;
    animCtrls: never[];
    morphFolder: null;
    morphCtrls: never[];
    skeletonHelpers: never[];
    gridHelper: Object3D<Object3DEventMap> | null;
    axesHelper: Object3D<Object3DEventMap> | null;
    axesCamera: any;
    axesScene: any;
    axesRenderer: any;
    axesDiv: any;
    axesCorner: any;
    public constructor(el: HTMLElement) {
        this.el = el;

        this.lights = [];
        this.content = null;
        this.mixer = null;
        this.clips = [];
        this.gui = null;

        this.state = {
            environment: environments[1]!.name,
            background: false,
            playbackSpeed: 1.0,
            actionStates: {},
            camera: DEFAULT_CAMERA,
            wireframe: false,
            skeleton: false,
            grid: false,
            autoRotate: false,

            // Lights
            punctualLights: true,
            exposure: 0.0,
            toneMapping: LinearToneMapping,
            ambientIntensity: 0.3,
            ambientColor: "#FFFFFF",
            directIntensity: 0.8 * Math.PI, // TODO(#116)
            directColor: "#FFFFFF",
            bgColor: "#F1F1F1",

            pointSize: 1.0,
        };

        this.prevTime = 0;

        this.backgroundColor = new Color(this.state.bgColor);

        this.scene = new Scene();
        this.scene.background = this.backgroundColor;

        const fov = 50;
        const aspect = el.clientWidth / el.clientHeight;
        this.defaultCamera = new PerspectiveCamera(fov, aspect, 0.1, 500);
        this.activeCamera = this.defaultCamera;
        this.scene.add(this.defaultCamera);

        this.renderer = new WebGLRenderer({
            antialias: true,
        });
        this.renderer.setClearColor(0xcccccc);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(el.clientWidth, el.clientHeight);

        this.pmremGenerator = new PMREMGenerator(this.renderer);
        this.pmremGenerator.compileEquirectangularShader();

        this.neutralEnvironment = this.pmremGenerator.fromScene(
            new RoomEnvironment(),
        ).texture;

        this.controls = new TrackballControls(
            this.defaultCamera,
            this.renderer.domElement,
        );

        this.el.appendChild(this.renderer.domElement);

        this.cameraCtrl = null;
        this.cameraFolder = null;
        this.animFolder = null;
        this.animCtrls = [];
        this.morphFolder = null;
        this.morphCtrls = [];
        this.skeletonHelpers = [];
        this.gridHelper = null;
        this.axesHelper = null;

        this.addAxesHelper();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
        window.addEventListener("resize", this.resize.bind(this), false);
    }

    get renderer_element() {
        return this.renderer.domElement;
    }

    animate(time: number) {
        requestAnimationFrame(this.animate);

        const dt = (time - this.prevTime) / 1000;

        this.controls.update();
        this.mixer && this.mixer.update(dt);
        this.render();

        this.prevTime = time;
    }

    render() {
        this.renderer.render(this.scene, this.activeCamera);
        if (this.state.grid) {
            this.axesCamera.position.copy(this.defaultCamera.position);
            this.axesCamera.lookAt(this.axesScene.position);
            this.axesRenderer.render(this.axesScene, this.axesCamera);
        }
    }

    resize() {
        const { clientHeight, clientWidth } = this.el;

        console.log("resize", clientWidth, clientHeight);

        this.defaultCamera.aspect = clientWidth / clientHeight;
        this.defaultCamera.updateProjectionMatrix();
        this.renderer.setSize(clientWidth, clientHeight);

        this.axesCamera.aspect =
            this.axesDiv.clientWidth / this.axesDiv.clientHeight;
        this.axesCamera.updateProjectionMatrix();
        this.axesRenderer.setSize(
            this.axesDiv.clientWidth,
            this.axesDiv.clientHeight,
        );
        this.controls.handleResize();
    }

    load(
        url: string,
        assetMap: { has: (arg0: string) => any; get: (arg0: string) => any },
    ) {
        const baseURL = LoaderUtils.extractUrlBase(url);

        // Load.
        return new Promise((resolve, reject) => {
            // Intercept and override relative URLs.
            MANAGER.setURLModifier((url: string) => {
                // URIs in a glTF file may be escaped, or not. Assume that assetMap is
                // from an un-escaped source, and decode all URIs before lookups.
                // See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
                const normalizedURL = decodeURI(url)
                    .replace(baseURL, "")
                    .replace(/^(\.?\/)/, "");

                if (assetMap.has(normalizedURL)) {
                    const blob = assetMap.get(normalizedURL);
                    const blobURL = URL.createObjectURL(blob);
                    blobURLs.push(blobURL);
                    return blobURL;
                }

                return url;
            });

            const loader = new GLTFLoader(MANAGER)
                .setCrossOrigin("anonymous")
                .setDRACOLoader(DRACO_LOADER)
                .setKTX2Loader(KTX2_LOADER.detectSupport(this.renderer))
                .setMeshoptDecoder(MeshoptDecoder);

            const blobURLs: string[] = [];

            loader.load(
                url,
                (gltf) => {
                    // window.VIEWER.json = gltf;

                    const scene = gltf.scene || gltf.scenes[0];
                    const clips = gltf.animations || [];

                    if (!scene) {
                        // Valid, but not supported by this viewer.
                        throw new Error(
                            "This model contains no scene, and cannot be viewed here. However," +
                                " it may contain individual 3D resources.",
                        );
                    }

                    this.setContent(scene, clips);

                    blobURLs.forEach(URL.revokeObjectURL);

                    // See: https://github.com/google/draco/issues/349
                    // DRACOLoader.releaseDecoderModule();

                    resolve(gltf);
                },
                undefined,
                reject,
            );
        });
    }

    /**
     * @param {THREE.Object3D} object
     * @param {Array<THREE.AnimationClip} clips
     */
    setContent(object: Object3D<Object3DEventMap>, clips: AnimationClip[]) {
        this.clear();

        object.updateMatrixWorld(); // donmccurdy/three-gltf-viewer#330

        const box = new Box3().setFromObject(object);
        const size = box.getSize(new Vector3()).length();
        const center = box.getCenter(new Vector3());

        this.controls.reset();
        this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.8;

        object.position.x -= center.x;
        object.position.y -= center.y;
        object.position.z -= center.z;

        this.controls.maxDistance = size * 10;

        this.defaultCamera.near = size / 100;
        this.defaultCamera.far = size * 100;
        this.defaultCamera.updateProjectionMatrix();

        this.defaultCamera.position.copy(center);
        this.defaultCamera.position.x = 0;
        this.defaultCamera.position.y = size;
        this.defaultCamera.position.z = size / 2.0;
        this.defaultCamera.lookAt(center);

        this.setCamera(DEFAULT_CAMERA);

        this.axesCamera.position.copy(this.defaultCamera.position);
        this.axesCamera.lookAt(this.axesScene.position);
        this.axesCamera.near = size / 100;
        this.axesCamera.far = size * 100;
        this.axesCamera.updateProjectionMatrix();
        this.axesCorner.scale.set(size, size, size);

        this.controls.update();

        this.scene.add(object);
        this.content = object;

        this.state.punctualLights = true;

        this.content.traverse((node: { isLight: any }) => {
            if (node.isLight) {
                this.state.punctualLights = false;
            }
        });

        this.setClips(clips);

        this.updateLights();
        this.updateEnvironment();
        this.updateDisplay();

        // window.VIEWER.scene = this.content;
    }

    /**
     * @param {Array<THREE.AnimationClip} clips
     */
    setClips(clips: string | any[]) {
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer.uncacheRoot(this.mixer.getRoot());
            this.mixer = null;
        }

        this.clips = clips;
        if (!clips.length) return;

        this.mixer = new AnimationMixer(this.content);
    }

    playAllClips() {
        this.clips.forEach((clip) => {
            this.mixer.clipAction(clip).reset().play();
            this.state.actionStates[clip.name] = true;
        });
    }

    /**
     * @param {string} name
     */
    setCamera(name: string) {
        if (name === DEFAULT_CAMERA) {
            this.controls.enabled = true;
            this.activeCamera = this.defaultCamera;
        } else {
            this.controls.enabled = false;
            this.content.traverse((node: { isCamera: any; name: any }) => {
                if (node.isCamera && node.name === name) {
                    this.activeCamera = node;
                }
            });
        }
    }

    updateLights() {
        const state = this.state;
        const lights = this.lights;

        if (state.punctualLights && !lights.length) {
            this.addLights();
        } else if (!state.punctualLights && lights.length) {
            this.removeLights();
        }

        this.renderer.toneMapping = Number(state.toneMapping);
        this.renderer.toneMappingExposure = Math.pow(2, state.exposure);

        if (lights.length === 2) {
            lights[0].intensity = state.ambientIntensity;
            lights[0].color.set(state.ambientColor);
            lights[1].intensity = state.directIntensity;
            lights[1].color.set(state.directColor);
        }
    }

    addLights() {
        const state = this.state;

        const light1 = new AmbientLight(
            state.ambientColor,
            state.ambientIntensity,
        );
        light1.name = "ambient_light";
        this.defaultCamera.add(light1);

        const light2 = new DirectionalLight(
            state.directColor,
            state.directIntensity,
        );
        light2.position.set(0.5, 0, 0.866); // ~60º
        light2.name = "main_light";
        this.defaultCamera.add(light2);

        this.lights.push(light1, light2);
    }

    removeLights() {
        this.lights.forEach((light) => light.parent.remove(light));
        this.lights.length = 0;
    }

    updateEnvironment() {
        const environment = environments.filter(
            (entry: { name: any }) => entry.name === this.state.environment,
        )[0];

        this.getCubeMapTexture(environment).then(({ envMap }) => {
            this.scene.environment = envMap;
            this.scene.background = this.state.background
                ? envMap
                : this.backgroundColor;
        });
    }

    getCubeMapTexture(environment: { id: any; path: any }) {
        const { id, path } = environment;

        // neutral (THREE.RoomEnvironment)
        if (id === "neutral") {
            return Promise.resolve({ envMap: this.neutralEnvironment });
        }

        // none
        if (id === "") {
            return Promise.resolve({ envMap: null });
        }

        return new Promise((resolve, reject) => {
            new EXRLoader().load(
                path,
                (texture) => {
                    const envMap =
                        this.pmremGenerator.fromEquirectangular(
                            texture,
                        ).texture;
                    this.pmremGenerator.dispose();

                    resolve({ envMap });
                },
                undefined,
                reject,
            );
        });
    }

    updateDisplay() {
        if (this.skeletonHelpers.length) {
            this.skeletonHelpers.forEach((helper) => this.scene.remove(helper));
        }

        traverseMaterials(
            this.content,
            (material: { wireframe: boolean; size: number }) => {
                material.wireframe = this.state.wireframe;

                if (material instanceof PointsMaterial) {
                    material.size = this.state.pointSize;
                }
            },
        );

        this.content.traverse(
            (node: {
                geometry: any;
                skeleton: {
                    bones: {
                        parent:
                            | Object3D<Object3DEventMap>
                            | SkinnedMesh<
                                  BufferGeometry<NormalBufferAttributes>,
                                  Material | Material[]
                              >;
                    }[];
                };
            }) => {
                if (node.geometry && node.skeleton && this.state.skeleton) {
                    const helper = new SkeletonHelper(
                        node.skeleton.bones[0].parent,
                    );
                    helper.material.linewidth = 3;
                    this.scene.add(helper);
                    this.skeletonHelpers.push(helper);
                }
            },
        );

        if (this.state.grid !== Boolean(this.gridHelper)) {
            if (this.state.grid) {
                this.gridHelper = new GridHelper();
                this.axesHelper = new AxesHelper();
                this.axesHelper.renderOrder = 999;
                this.axesHelper.onBeforeRender = (renderer: {
                    clearDepth: () => any;
                }) => renderer.clearDepth();
                this.scene.add(this.gridHelper);
                this.scene.add(this.axesHelper);
            } else {
                this.scene.remove(this.gridHelper);
                this.scene.remove(this.axesHelper);
                this.gridHelper = null;
                this.axesHelper = null;
                this.axesRenderer.clear();
            }
        }
    }

    updateBackground() {
        this.backgroundColor.set(this.state.bgColor);
    }

    /**
     * Adds AxesHelper.
     *
     * See: https://stackoverflow.com/q/16226693/1314762
     */
    addAxesHelper() {
        this.axesDiv = document.createElement("div");
        this.el.appendChild(this.axesDiv);
        this.axesDiv.classList.add("axes");

        const { clientWidth, clientHeight } = this.axesDiv;

        this.axesScene = new Scene();
        this.axesCamera = new PerspectiveCamera(
            50,
            clientWidth / clientHeight,
            0.1,
            10,
        );
        this.axesScene.add(this.axesCamera);

        this.axesRenderer = new WebGLRenderer({ alpha: true });
        this.axesRenderer.setPixelRatio(window.devicePixelRatio);
        this.axesRenderer.setSize(
            this.axesDiv.clientWidth,
            this.axesDiv.clientHeight,
        );

        this.axesCamera.up = this.defaultCamera.up;

        this.axesCorner = new AxesHelper(5);
        this.axesScene.add(this.axesCorner);
        this.axesDiv.appendChild(this.axesRenderer.domElement);
    }

    clear() {
        if (!this.content) return;

        this.scene.remove(this.content);

        // dispose geometry
        this.content.traverse((node: { geometry: { dispose: () => void } }) => {
            if (!node.geometry) return;

            node.geometry.dispose();
        });

        // dispose textures
        traverseMaterials(
            this.content,
            (material: { [x: string]: { dispose: () => void } }) => {
                for (const key in material) {
                    if (
                        key !== "envMap" &&
                        material[key] &&
                        material[key].isTexture
                    ) {
                        material[key].dispose();
                    }
                }
            },
        );
    }
}

function traverseMaterials(
    object: Object3D<Object3DEventMap>,
    callback: { (material: any): void; (material: any): void },
) {
    object.traverse((node: Object3D) => {
        if (!node.geometry) return;
        const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
        materials.forEach(callback);
    });
}
