import * as THREE from 'three';
import { OrbitControls } from './js/OrbitControls.js';
import { GUI } from './js/lil-gui.module.min.js';
// RGBE加载器已移除 - 不再需要HDR环境贴图
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// 导入静态资源
import glbUrl from './assets/SINT_desktop.glb?url';

//创建场景
const scene = new THREE.Scene();
//创建相机
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 1000);
//创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 添加WASD控制说明
const instructions = document.createElement('div');
instructions.innerHTML = `
<div style="position: absolute; top: 10px; left: 10px; color: white; font-family: Arial, sans-serif; background: rgba(0,0,0,0.7); padding: 10px; border-radius: 5px; z-index: 1000;">
	<h3 style="margin: 0 0 10px 0;">🎮 控制说明</h3>
	<p style="margin: 5px 0;"><strong>W</strong> - 前进 + 走路动画</p>
	<p style="margin: 5px 0;"><strong>S</strong> - 后退 + 走路动画</p>
	<p style="margin: 5px 0;"><strong>A</strong> - 左移 + 走路动画</p>
	<p style="margin: 5px 0;"><strong>D</strong> - 右移 + 走路动画</p>
	<p style="margin: 5px 0; font-size: 12px; color: #ccc;">移动时播放走路动画，停止时播放待机动画</p>
	<p style="margin: 5px 0; font-size: 12px; color: #ccc;">可通过GUI控制动画开关和速度</p>
</div>
`;
document.body.appendChild(instructions);

// 立方体已移除





//设置相机位置
camera.position.z = 5;
camera.position.x = 2;
camera.position.y = 2;


// 坐标轴辅助线已移除

//改进光照系统（适合平台场景）
// 环境光 - 提供基础照明
const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
scene.add(ambientLight);

// 主方向光 - 模拟太阳光
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(10, 10, 5);
directionalLight.castShadow = true;

// 配置阴影
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;

scene.add(directionalLight);

// 补充光源 - 从另一个方向照亮
const fillLight = new THREE.DirectionalLight(0x87CEEB, 0.3);
fillLight.position.set(-10, 5, -5);
scene.add(fillLight);

// 启用渲染器阴影
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

//创建控制器
const controls = new OrbitControls(camera, renderer.domElement);
//设置控制器参数
controls.enableDamping = true;
//controls.update();

// //渲染
// renderer.render(scene, camera);

// ===================WASD控制系统===================
let model = null; // 存储加载的模型
let animationMixer = null; // 动画混合器
let walkAction = null; // 走路动画
let idleAction = null; // 待机动画
let isMoving = false; // 是否正在移动

const keys = {
	w: false,
	a: false,
	s: false,
	d: false
};

const movement = {
	speed: 0.05,
	rotationSpeed: 0.02,
	cameraFollow: true,
	enableWalkAnimation: true,
	walkAnimationSpeed: 1.0
};

// 键盘事件监听
document.addEventListener('keydown', (event) => {
	const key = event.key.toLowerCase();
	if (keys.hasOwnProperty(key)) {
		keys[key] = true;
	}
});

document.addEventListener('keyup', (event) => {
	const key = event.key.toLowerCase();
	if (keys.hasOwnProperty(key)) {
		keys[key] = false;
	}
});

// 动画控制函数
function playWalkAnimation() {
	if (!movement.enableWalkAnimation || !walkAction) return;
	
	if (idleAction && idleAction.isRunning()) {
		// 从待机动画过渡到走路动画
		idleAction.fadeOut(0.3);
	}
	
	if (!walkAction.isRunning()) {
		walkAction.reset().fadeIn(0.3).play();
	}
}

function playIdleAnimation() {
	if (!movement.enableWalkAnimation || !idleAction) return;
	
	if (walkAction && walkAction.isRunning()) {
		// 从走路动画过渡到待机动画
		walkAction.fadeOut(0.3);
	}
	
	if (!idleAction.isRunning()) {
		idleAction.reset().fadeIn(0.3).play();
	}
}

// 移动函数
function updateMovement() {
	if (!model) return;
	
	let moveX = 0;
	let moveZ = 0;
	
	// WASD移动
	if (keys.w) moveZ -= movement.speed; // 前进
	if (keys.s) moveZ += movement.speed; // 后退
	if (keys.a) moveX -= movement.speed; // 左移
	if (keys.d) moveX += movement.speed; // 右移
	
	// 检查是否在移动
	const currentlyMoving = moveX !== 0 || moveZ !== 0;
	
	// 应用移动
	if (currentlyMoving) {
		// 计算新位置
		const newX = model.position.x + moveX;
		const newZ = model.position.z + moveZ;
		
		// 限制移动范围在平台内（半径7.5，留一点边距）
		const platformRadius = 7.5;
		const distance = Math.sqrt(newX * newX + newZ * newZ);
		
		if (distance <= platformRadius) {
			model.position.x = newX;
			model.position.z = newZ;
		} else {
			// 如果超出边界，将位置限制在边界上
			const angle = Math.atan2(newZ, newX);
			model.position.x = Math.cos(angle) * platformRadius;
			model.position.z = Math.sin(angle) * platformRadius;
		}
		
		// 让模型面向移动方向
		const angle = Math.atan2(moveX, moveZ);
		model.rotation.y = angle;
		
		// 播放走路动画
		if (!isMoving) {
			playWalkAnimation();
			isMoving = true;
		}
		
		// 相机跟随
		if (movement.cameraFollow) {
			// 计算相机应该在的位置（在模型后方和上方）
			const offset = new THREE.Vector3(0, 3, 5);
			const idealPosition = model.position.clone().add(offset);
			
			// 平滑移动相机
			camera.position.lerp(idealPosition, 0.05);
			
			// 让相机看向模型
			const lookAtPosition = model.position.clone();
			lookAtPosition.y += 1; // 看向模型的中心高度
			camera.lookAt(lookAtPosition);
		}
	} else {
		// 停止移动时播放待机动画
		if (isMoving) {
			playIdleAnimation();
			isMoving = false;
		}
	}
	
	// 更新动画混合器
	if (animationMixer) {
		animationMixer.update(0.016);
	}
}

function animate() {
	requestAnimationFrame( animate );
	
	// 更新移动
	updateMovement();
	
	// required if controls.enableDamping or controls.autoRotate are set to true
	if (!movement.cameraFollow) {
		controls.update();
	}
	
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

// 平台场景控制
const sceneControls = {
	backgroundColor: 0x87CEEB,
	platformColor: 0x444444,
	showGrid: true,
	showPillars: true,
	showDecorations: true
}

const gui = new GUI()

// 基础控制
const basicFolder = gui.addFolder('基础控制')
basicFolder.add(eventObj, 'fullScreen').name('全屏')
basicFolder.add(eventObj, 'exitFullScreen').name('退出全屏')

// 场景控制
const sceneFolder = gui.addFolder('🏗️ 平台场景控制')
sceneFolder.addColor(sceneControls, 'backgroundColor').name('背景颜色').onChange(v => {
	scene.background.setHex(v)
})
sceneFolder.addColor(sceneControls, 'platformColor').name('平台颜色').onChange(v => {
	// 这里会在平台创建后再添加具体的控制逻辑
})
sceneFolder.add(sceneControls, 'showGrid').name('显示网格').onChange(v => {
	const grid = scene.getObjectByName('gridHelper')
	if (grid) grid.visible = v
})

sceneFolder.open()	

// 立方体控制面板已移除

//设置纹理贴图
// const textureLoader = new THREE.TextureLoader()
// const texture = textureLoader.load('./textures/door/color.jpg')

//创建平台场景
function createPlatformScene() {
	// 设置场景背景色
	scene.background = new THREE.Color(0x87CEEB) // 天空蓝
	
	// 创建主平台
	const platformGeometry = new THREE.CylinderGeometry(8, 8, 0.5, 32)
	const platformMaterial = new THREE.MeshLambertMaterial({ 
		color: 0x444444,
		transparent: true,
		opacity: 0.9
	})
	const platform = new THREE.Mesh(platformGeometry, platformMaterial)
	platform.position.y = -0.25
	platform.receiveShadow = true
	scene.add(platform)
	
	// 创建平台边缘装饰
	const edgeGeometry = new THREE.TorusGeometry(8, 0.1, 8, 32)
	const edgeMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 })
	const edge = new THREE.Mesh(edgeGeometry, edgeMaterial)
	edge.position.y = 0
	edge.rotation.x = Math.PI / 2
	scene.add(edge)
	
	// 创建小装饰台子
	for (let i = 0; i < 6; i++) {
		const angle = (i / 6) * Math.PI * 2
		const x = Math.cos(angle) * 6
		const z = Math.sin(angle) * 6
		
		const smallPlatformGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 8)
		const smallPlatformMaterial = new THREE.MeshLambertMaterial({ 
			color: 0x666666 
		})
		const smallPlatform = new THREE.Mesh(smallPlatformGeometry, smallPlatformMaterial)
		smallPlatform.position.set(x, -0.15, z)
		smallPlatform.receiveShadow = true
		scene.add(smallPlatform)
	}
	
	// 创建背景装饰柱子
	for (let i = 0; i < 4; i++) {
		const angle = (i / 4) * Math.PI * 2
		const x = Math.cos(angle) * 12
		const z = Math.sin(angle) * 12
		
		const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.5, 6, 8)
		const pillarMaterial = new THREE.MeshLambertMaterial({ 
			color: 0x555555 
		})
		const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial)
		pillar.position.set(x, 3, z)
		pillar.castShadow = true
		pillar.receiveShadow = true
		scene.add(pillar)
	}
	
	// 添加网格地面（可选，用于参考）
	const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444)
	gridHelper.position.y = -0.5
	gridHelper.name = 'gridHelper' // 添加名称以便GUI控制
	scene.add(gridHelper)
	
	console.log('平台场景已创建')
}

// 创建平台场景
createPlatformScene()


//加载Glb
const loader = new GLTFLoader()

// 设置DRACO解码器（用于解压缩的GLB文件）
const dracoLoader = new DRACOLoader()
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/')
loader.setDRACOLoader(dracoLoader)


loader.load(glbUrl, (gltf) => {
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
	
	// // 绕Z轴旋转180度
	// gltf.scene.rotation.z = Math.PI
	// gltf.scene.rotation.y = Math.PI
	
	scene.add(gltf.scene)
	model = gltf.scene // 将模型赋值给全局变量，用于WASD控制
	console.log('模型已添加到场景，位置在原点，绕Z轴旋转180度')
	
	// ===================GUI控制面板===================
	
	// 收集所有网格和骨骼
	const meshes = {}
	const bones = {}
	let mixer = null
	
	gltf.scene.traverse((child) => {
		if (child.isMesh) {
			meshes[child.name] = child
			// 启用阴影
			child.castShadow = true
			child.receiveShadow = true
		}
		if (child.isBone) {
			bones[child.name] = child
		}
	})
	
	// 处理动画
	if (gltf.animations && gltf.animations.length > 0) {
		mixer = new THREE.AnimationMixer(gltf.scene)
		animationMixer = mixer; // 赋值给全局变量用于WASD控制
		
		console.log('发现动画数量:', gltf.animations.length)
		gltf.animations.forEach((clip, index) => {
			console.log(`动画 ${index}: ${clip.name}, 时长: ${clip.duration.toFixed(2)}秒`)
		})
		
		// 尝试找到走路和待机动画
		gltf.animations.forEach((clip) => {
			const name = clip.name.toLowerCase()
			
			// 寻找走路相关的动画
			if (name.includes('walk') || name.includes('run') || name.includes('move') || 
				name.includes('walking') || name.includes('running')) {
				walkAction = mixer.clipAction(clip)
				walkAction.setEffectiveTimeScale(movement.walkAnimationSpeed)
				console.log('找到走路动画:', clip.name)
			}
			
			// 寻找待机相关的动画
			if (name.includes('idle') || name.includes('stand') || name.includes('breath') ||
				name.includes('waiting') || name.includes('rest')) {
				idleAction = mixer.clipAction(clip)
				console.log('找到待机动画:', clip.name)
			}
		})
		
		// 如果没有找到特定动画，使用第一个作为默认
		if (!walkAction && gltf.animations.length > 0) {
			walkAction = mixer.clipAction(gltf.animations[0])
			walkAction.setEffectiveTimeScale(movement.walkAnimationSpeed)
			console.log('使用第一个动画作为走路动画:', gltf.animations[0].name)
		}
		
		if (!idleAction && gltf.animations.length > 1) {
			idleAction = mixer.clipAction(gltf.animations[1])
			console.log('使用第二个动画作为待机动画:', gltf.animations[1].name)
		}
		
		// 如果只有一个动画，同时用作走路和待机
		if (!idleAction && walkAction) {
			idleAction = walkAction
			console.log('使用同一个动画作为走路和待机动画')
		}
		
		// 开始播放待机动画
		if (idleAction) {
			idleAction.play()
		}
	}
	
	// 整体模型控制
	const modelControls = {
		// 整体变换
		positionX: 0,
		positionY: 0,
		positionZ: 0,
		rotationX: 0,
		rotationY: 0,
		rotationZ: 0,
		scaleX: 1,
		scaleY: 1,
		scaleZ: 1,
		
		// 整体材质
		metalness: 0,
		roughness: 1,
		
		// 动画控制
		playAnimation: false,
		animationSpeed: 1
	}
	
	// 网格可见性控制
	const meshVisibility = {}
	Object.keys(meshes).forEach(name => {
		meshVisibility[name] = true
	})
	
	// 网格颜色控制
	const meshColors = {}
	Object.keys(meshes).forEach(name => {
		meshColors[name] = '#ffffff'
	})
	
	// 骨骼旋转控制（主要骨骼）
	const boneRotations = {}
	const mainBones = ['mixamorigHips', 'mixamorigSpine', 'mixamorigLeftArm', 'mixamorigRightArm', 'mixamorigLeftLeg', 'mixamorigRightLeg']
	mainBones.forEach(boneName => {
		if (bones[boneName]) {
			boneRotations[boneName + '_X'] = 0
			boneRotations[boneName + '_Y'] = 0
			boneRotations[boneName + '_Z'] = 0
		}
	})
	
	// 创建GUI文件夹
	const movementFolder = gui.addFolder('🎮 WASD移动控制')
	const modelFolder = gui.addFolder('模型整体控制')
	const transformFolder = modelFolder.addFolder('变换')
	const materialFolder = modelFolder.addFolder('材质')
	const animationFolder = modelFolder.addFolder('动画')
	
	const meshFolder = gui.addFolder('网格控制')
	const visibilityFolder = meshFolder.addFolder('可见性')
	const colorFolder = meshFolder.addFolder('颜色')
	
	const boneFolder = gui.addFolder('骨骼控制')
	
	// WASD移动控制
	movementFolder.add(movement, 'speed', 0.01, 0.2, 0.01).name('移动速度')
	movementFolder.add(movement, 'rotationSpeed', 0.01, 0.1, 0.01).name('旋转速度')
	movementFolder.add(movement, 'cameraFollow').name('相机跟随').onChange(v => {
		if (!v) {
			// 如果关闭相机跟随，重置相机位置
			camera.position.set(2, 2, 5)
			controls.target.set(0, 0, 0)
			controls.update()
		}
	})
	
	// 动画控制
	movementFolder.add(movement, 'enableWalkAnimation').name('启用移动动画')
	movementFolder.add(movement, 'walkAnimationSpeed', 0.1, 3, 0.1).name('动画速度').onChange(v => {
		if (walkAction) {
			walkAction.setEffectiveTimeScale(v)
		}
	})
	
	// 添加重置按钮
	const movementControls = {
		resetPosition() {
			if (model) {
				model.position.set(0, 0, 0)
				model.rotation.set(0, 0, 0)
			}
		},
		resetCamera() {
			camera.position.set(2, 2, 5)
			controls.target.set(0, 0, 0)
			controls.update()
		}
	}
	
	movementFolder.add(movementControls, 'resetPosition').name('重置模型位置')
	movementFolder.add(movementControls, 'resetCamera').name('重置相机位置')
	
	// 整体变换控制
	transformFolder.add(modelControls, 'positionX', -10, 10, 0.1).onChange(v => gltf.scene.position.x = v)
	transformFolder.add(modelControls, 'positionY', -10, 10, 0.1).onChange(v => gltf.scene.position.y = v)
	transformFolder.add(modelControls, 'positionZ', -10, 10, 0.1).onChange(v => gltf.scene.position.z = v)
	transformFolder.add(modelControls, 'rotationX', -Math.PI, Math.PI, 0.1).onChange(v => gltf.scene.rotation.x = v)
	transformFolder.add(modelControls, 'rotationY', -Math.PI, Math.PI, 0.1).onChange(v => gltf.scene.rotation.y = v)
	transformFolder.add(modelControls, 'rotationZ', -Math.PI, Math.PI, 0.1).onChange(v => gltf.scene.rotation.z = v)
	transformFolder.add(modelControls, 'scaleX', 0.1, 3, 0.1).onChange(v => gltf.scene.scale.x = v)
	transformFolder.add(modelControls, 'scaleY', 0.1, 3, 0.1).onChange(v => gltf.scene.scale.y = v)
	transformFolder.add(modelControls, 'scaleZ', 0.1, 3, 0.1).onChange(v => gltf.scene.scale.z = v)
	
	// 整体材质控制
	materialFolder.add(modelControls, 'metalness', 0, 1, 0.1).onChange(v => {
		Object.values(meshes).forEach(mesh => {
			if (mesh.material) mesh.material.metalness = v
		})
	})
	materialFolder.add(modelControls, 'roughness', 0, 1, 0.1).onChange(v => {
		Object.values(meshes).forEach(mesh => {
			if (mesh.material) mesh.material.roughness = v
		})
	})
	
	// 手动动画控制（独立于WASD动画）
	if (gltf.animations && gltf.animations.length > 0) {
		const manualActions = []
		
		// 为每个动画创建手动控制
		gltf.animations.forEach((clip, index) => {
			const action = mixer.clipAction(clip)
			manualActions.push(action)
			
			// 为每个动画添加单独的控制
			const animName = clip.name || `动画${index + 1}`
			const animControls = {}
			animControls[`play_${animName}`] = false
			
			animationFolder.add(animControls, `play_${animName}`).name(`播放 ${animName}`).onChange(v => {
				if (v) {
					// 停止WASD动画系统
					movement.enableWalkAnimation = false
					if (walkAction && walkAction.isRunning()) walkAction.stop()
					if (idleAction && idleAction.isRunning()) idleAction.stop()
					
					// 播放选中的动画
					action.reset().play()
				} else {
					action.stop()
					// 重新启用WASD动画系统
					movement.enableWalkAnimation = true
					if (idleAction && !isMoving) {
						idleAction.reset().play()
					}
				}
			})
		})
		
		// 全局动画速度控制
		animationFolder.add(modelControls, 'animationSpeed', 0, 3, 0.1).name('全局动画速度').onChange(v => {
			manualActions.forEach(action => action.setEffectiveTimeScale(v))
			if (walkAction) walkAction.setEffectiveTimeScale(v * movement.walkAnimationSpeed)
			if (idleAction) idleAction.setEffectiveTimeScale(v)
		})
		
		// 停止所有手动动画的按钮
		const stopAllAnimations = {
			stopAll() {
				manualActions.forEach(action => action.stop())
				movement.enableWalkAnimation = true
				if (idleAction && !isMoving) {
					idleAction.reset().play()
				}
			}
		}
		animationFolder.add(stopAllAnimations, 'stopAll').name('停止所有手动动画')
	}
	
	// 网格可见性控制
	Object.keys(meshes).forEach(name => {
		visibilityFolder.add(meshVisibility, name).onChange(v => {
			meshes[name].visible = v
		})
	})
	
	// 网格颜色控制
	Object.keys(meshes).forEach(name => {
		colorFolder.addColor(meshColors, name).onChange(v => {
			const mesh = meshes[name]
			if (mesh.material) {
				mesh.material.color.setHex(v.replace('#', '0x'))
			}
		})
	})
	
	// 骨骼旋转控制
	Object.keys(boneRotations).forEach(key => {
		const [boneName, axis] = key.split('_')
		if (bones[boneName]) {
			boneFolder.add(boneRotations, key, -Math.PI, Math.PI, 0.1).onChange(v => {
				bones[boneName].rotation[axis.toLowerCase()] = v
			})
		}
	})
	
	// 展开主要文件夹
	movementFolder.open()
	modelFolder.open()
	meshFolder.open()
	
	console.log('GUI控制面板已创建')
	console.log('网格数量:', Object.keys(meshes).length)
	console.log('骨骼数量:', Object.keys(bones).length)
	console.log('动画数量:', gltf.animations ? gltf.animations.length : 0)
})







