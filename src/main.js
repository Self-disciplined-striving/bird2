import * as THREE from 'three';
import { OrbitControls } from './js/OrbitControls.js';
import { GUI } from './js/lil-gui.module.min.js';
//RGBELOADER
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

//创建场景
const scene = new THREE.Scene();
//创建相机
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
//创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 立方体已移除





//设置相机位置
camera.position.z = 5;
camera.position.x = 2;
camera.position.y = 2;


// 坐标轴辅助线已移除

//添加光源（GLB模型需要光照）
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

//创建控制器
const controls = new OrbitControls(camera, renderer.domElement);
//设置控制器参数
controls.enableDamping = true;
//controls.update();

// //渲染
// renderer.render(scene, camera);

function animate() {

	requestAnimationFrame( animate );

	// required if controls.enableDamping or controls.autoRotate are set to true
	controls.update();
	renderer.render( scene, camera );

}
animate()

//监听窗口大小变化
window.addEventListener('resize', () => {
	// 更新相机比例
	camera.aspect = window.innerWidth / window.innerHeight;
	// 更新相机投影矩阵
	camera.updateProjectionMatrix();
	// 更新渲染器大小
	renderer.setSize(window.innerWidth, window.innerHeight);
});


// //添加控制全屏的按钮
// const fullScreenButton = document.createElement('button');
// fullScreenButton.innerHTML = '全屏';
// fullScreenButton.style.position = 'absolute';
// fullScreenButton.style.top = '10px';
// fullScreenButton.style.left = '10px';
// fullScreenButton.style.zIndex = '1000';
// fullScreenButton.style.backgroundColor = 'rgba(255,255,255)';
// fullScreenButton.style.color = 'black';
// fullScreenButton.style.border = 'none';
// fullScreenButton.style.padding = '5px 10px';

// document.body.appendChild(fullScreenButton);

// fullScreenButton.addEventListener('click', () => {
// 	document.body.requestFullscreen();
// });

// //添加控制退出全屏的按钮
// const exitFullScreenButton = document.createElement('button');
// exitFullScreenButton.innerHTML = '退出全屏';
// exitFullScreenButton.style.position = 'absolute';
// exitFullScreenButton.style.top = '10px';
// exitFullScreenButton.style.left = '200px';
// exitFullScreenButton.style.zIndex = '1000';
// exitFullScreenButton.style.backgroundColor = 'rgba(255,255,255)';
// exitFullScreenButton.style.color = 'black';
// exitFullScreenButton.style.border = 'none';
// exitFullScreenButton.style.padding = '5px 10px';
// document.body.appendChild(exitFullScreenButton);

// exitFullScreenButton.addEventListener('click', () => {
// 	document.exitFullscreen();
// });

let eventObj = {
	fullScreen(){
		document.body.requestFullscreen();
	},
	exitFullScreen(){
		document.exitFullscreen();
	},

}



const gui = new GUI()
gui.add(eventObj, 'fullScreen')
gui.add(eventObj, 'exitFullScreen')

// 立方体控制面板已移除

//设置纹理贴图
// const textureLoader = new THREE.TextureLoader()
// const texture = textureLoader.load('./textures/door/color.jpg')

//设置环境贴图
const rgbeLoader = new RGBELoader()

rgbeLoader.load('/sea.hdr', (texture) => {
	//设置球形映射
	texture.mapping = THREE.EquirectangularReflectionMapping
	//设置背景
	scene.background = texture
	//设置环境
	scene.environment = texture
})


//加载Glb
const loader = new GLTFLoader()

// 设置DRACO解码器（用于解压缩的GLB文件）
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
loader.setDRACOLoader(dracoLoader)


loader.load('/robin_bird.glb', (gltf) => {
	console.log('GLB模型加载成功:', gltf)
	
	// 获取模型的边界盒以了解模型大小
	const box = new THREE.Box3().setFromObject(gltf.scene)
	const size = box.getSize(new THREE.Vector3())
	const center = box.getCenter(new THREE.Vector3())
	
	console.log('模型尺寸:', size)
	console.log('模型中心:', center)
	
	// 调整模型位置到原点
	gltf.scene.position.copy(center).multiplyScalar(-1)
	
	// 根据模型大小调整缩放
	const maxSize = Math.max(size.x, size.y, size.z)
	const scale = 2 / maxSize // 让模型大小大约为2个单位
	gltf.scene.scale.setScalar(scale)
	
	// 将模型定位在原点
	gltf.scene.position.set(0, 0, 0)
	
	// 绕Z轴旋转180度
	gltf.scene.rotation.z = Math.PI
	gltf.scene.rotation.y = Math.PI
	
	scene.add(gltf.scene)
	console.log('模型已添加到场景，位置在原点，绕Z轴旋转180度')
})


// 	loader.load('/ct.glb', (gltf) => {
// 	console.log('GLB模型加载成功:', gltf)
	
// 	// 获取模型的边界盒以了解模型大小
// 	const box = new THREE.Box3().setFromObject(gltf.scene)
// 	const size = box.getSize(new THREE.Vector3())
// 	const center = box.getCenter(new THREE.Vector3())
	
// 	console.log('模型尺寸:', size)
// 	console.log('模型中心:', center)
	
// 	// 调整模型位置到原点 
// 	gltf.scene.position.copy(center).multiplyScalar(-1)
	
// 	// 根据模型大小调整缩放
// 	const maxSize = Math.max(size.x, size.y, size.z)
// 	const scale = 20 / maxSize // 让模型大小大约为2个单位
// 	gltf.scene.scale.setScalar(scale)
	
// 	// 将模型定位在原点
// 	gltf.scene.position.set(-1, 0, 0)
	
// 	// // 绕Z轴旋转180度
// 	// gltf.scene.rotation.z = Math.PI
// 	// gltf.scene.rotation.y = Math.PI
	
// 	scene.add(gltf.scene)
// 	console.log('模型已添加到场景，位置在原点，绕Z轴旋转180度')
// })




// loader.load(
// 	'/robin_bird.glb',
// 	(gltf) => {
// 		console.log('GLB模型加载成功:', gltf)
		
// 		// 获取模型的边界盒以了解模型大小
// 		const box = new THREE.Box3().setFromObject(gltf.scene)
// 		const size = box.getSize(new THREE.Vector3())
// 		const center = box.getCenter(new THREE.Vector3())
		
// 		console.log('模型尺寸:', size)
// 		console.log('模型中心:', center)
		
// 		// 调整模型位置到原点
// 		gltf.scene.position.copy(center).multiplyScalar(-1)
		
// 		// 根据模型大小调整缩放
// 		const maxSize = Math.max(size.x, size.y, size.z)
// 		const scale = 2 / maxSize // 让模型大小大约为2个单位
// 		gltf.scene.scale.setScalar(scale)
		
// 		// 将模型稍微向左移动，避免与立方体重叠
// 		gltf.scene.position.x = -3
		
// 		scene.add(gltf.scene)
// 		console.log('模型已添加到场景')
// 	},
// 	(progress) => {
// 		console.log('加载进度:', (progress.loaded / progress.total * 100) + '%')
// 	},
// 	(error) => {
// 		console.error('GLB模型加载失败:', error)
// 		console.error('请检查文件路径是否正确，文件是否存在于 public/ 目录下')
// 	}
// )









