// Ventaro AI - Advanced AR/VR Engine
// Comprehensive immersive experience and 3D content management

class VentaroARVREngine {
  constructor() {
    this.isARSupported = false;
    this.isVRSupported = false;
    this.currentSession = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.arSession = null;
    this.vrSession = null;
    this.models = new Map();
    this.animations = new Map();
    this.interactions = new Map();
    this.spatialAudio = null;
    this.handTracking = null;
    this.eyeTracking = null;
    
    this.initializeEngine();
  }

  async initializeEngine() {
    try {
      // Check for WebXR support
      if ('xr' in navigator) {
        this.isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
        this.isVRSupported = await navigator.xr.isSessionSupported('immersive-vr');
      }

      // Initialize Three.js scene
      this.initializeThreeJS();
      
      // Initialize AR.js for marker-based AR
      this.initializeARJS();
      
      // Initialize A-Frame for declarative VR
      this.initializeAFrame();
      
      // Initialize spatial audio
      this.initializeSpatialAudio();
      
      // Initialize hand tracking
      this.initializeHandTracking();
      
      // Initialize eye tracking
      this.initializeEyeTracking();
      
      console.log('AR/VR Engine initialized successfully');
      console.log(`AR Support: ${this.isARSupported}, VR Support: ${this.isVRSupported}`);
    } catch (error) {
      console.error('Error initializing AR/VR Engine:', error);
    }
  }

  initializeThreeJS() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    
    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.xr.enabled = true;
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // Initialize controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  initializeARJS() {
    // AR.js context for marker-based AR
    this.arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl: 'data/camera_para.dat',
      detectionMode: 'mono_and_matrix',
      matrixCodeType: '3x3',
      canvasWidth: 640,
      canvasHeight: 480
    });
    
    this.arToolkitSource = new THREEx.ArToolkitSource({
      sourceType: 'webcam'
    });
  }

  initializeAFrame() {
    // A-Frame scene for declarative VR
    if (!document.querySelector('a-scene')) {
      const aframeScene = document.createElement('a-scene');
      aframeScene.setAttribute('embedded', true);
      aframeScene.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false;');
      aframeScene.setAttribute('vr-mode-ui', 'enabled: true');
      aframeScene.setAttribute('device-orientation-permission-ui', 'enabled: true');
      
      // Add assets
      const assets = document.createElement('a-assets');
      aframeScene.appendChild(assets);
      
      // Add camera
      const camera = document.createElement('a-camera');
      camera.setAttribute('gps-camera', 'rotationUpdateEnabled: true');
      aframeScene.appendChild(camera);
      
      document.body.appendChild(aframeScene);
    }
  }

  initializeSpatialAudio() {
    try {
      // Web Audio API for spatial audio
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.spatialAudio = {
        context: this.audioContext,
        listener: this.audioContext.listener,
        sources: new Map(),
        reverb: null
      };
      
      // Create reverb effect
      this.createReverbEffect();
    } catch (error) {
      console.warn('Spatial audio not supported:', error);
    }
  }

  initializeHandTracking() {
    if ('XRHand' in window) {
      this.handTracking = {
        enabled: true,
        leftHand: null,
        rightHand: null,
        gestures: new Map(),
        callbacks: new Map()
      };
      
      // Define common gestures
      this.defineHandGestures();
    }
  }

  initializeEyeTracking() {
    if ('XREyeTracking' in window) {
      this.eyeTracking = {
        enabled: true,
        gazeDirection: new THREE.Vector3(),
        fixationPoint: new THREE.Vector3(),
        callbacks: new Map()
      };
    }
  }

  // AR Session Management
  async startARSession(mode = 'immersive-ar') {
    try {
      if (!this.isARSupported) {
        throw new Error('AR not supported on this device');
      }

      const sessionInit = {
        requiredFeatures: ['local'],
        optionalFeatures: [
          'dom-overlay',
          'hit-test',
          'anchors',
          'plane-detection',
          'hand-tracking',
          'eye-tracking'
        ]
      };

      if (mode === 'immersive-ar') {
        sessionInit.domOverlay = { root: document.body };
      }

      this.arSession = await navigator.xr.requestSession(mode, sessionInit);
      
      // Set up session event listeners
      this.arSession.addEventListener('end', () => {
        this.arSession = null;
        this.onARSessionEnd();
      });

      // Set up reference space
      const referenceSpace = await this.arSession.requestReferenceSpace('local');
      
      // Set up WebGL layer
      const glLayer = new XRWebGLLayer(this.arSession, this.renderer.getContext());
      await this.arSession.updateRenderState({ baseLayer: glLayer });
      
      // Start render loop
      this.renderer.xr.setSession(this.arSession);
      this.startARRenderLoop(referenceSpace);
      
      this.onARSessionStart();
      
      return this.arSession;
    } catch (error) {
      console.error('Failed to start AR session:', error);
      throw error;
    }
  }

  async startVRSession(mode = 'immersive-vr') {
    try {
      if (!this.isVRSupported) {
        throw new Error('VR not supported on this device');
      }

      const sessionInit = {
        requiredFeatures: ['local'],
        optionalFeatures: [
          'local-floor',
          'bounded-floor',
          'hand-tracking',
          'eye-tracking'
        ]
      };

      this.vrSession = await navigator.xr.requestSession(mode, sessionInit);
      
      // Set up session event listeners
      this.vrSession.addEventListener('end', () => {
        this.vrSession = null;
        this.onVRSessionEnd();
      });

      // Set up reference space
      const referenceSpace = await this.vrSession.requestReferenceSpace('local-floor');
      
      // Set up WebGL layer
      const glLayer = new XRWebGLLayer(this.vrSession, this.renderer.getContext());
      await this.vrSession.updateRenderState({ baseLayer: glLayer });
      
      // Start render loop
      this.renderer.xr.setSession(this.vrSession);
      this.startVRRenderLoop(referenceSpace);
      
      this.onVRSessionStart();
      
      return this.vrSession;
    } catch (error) {
      console.error('Failed to start VR session:', error);
      throw error;
    }
  }

  // 3D Model Management
  async loadModel(url, name, options = {}) {
    try {
      const loader = this.getModelLoader(url);
      const model = await this.loadModelWithLoader(loader, url, options);
      
      // Process model
      this.processModel(model, options);
      
      // Store model
      this.models.set(name, model);
      
      // Add to scene if specified
      if (options.addToScene !== false) {
        this.scene.add(model);
      }
      
      return model;
    } catch (error) {
      console.error(`Failed to load model ${name}:`, error);
      throw error;
    }
  }

  getModelLoader(url) {
    const extension = url.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'gltf':
      case 'glb':
        return new THREE.GLTFLoader();
      case 'fbx':
        return new THREE.FBXLoader();
      case 'obj':
        return new THREE.OBJLoader();
      case 'dae':
        return new THREE.ColladaLoader();
      case 'ply':
        return new THREE.PLYLoader();
      case 'stl':
        return new THREE.STLLoader();
      default:
        throw new Error(`Unsupported model format: ${extension}`);
    }
  }

  loadModelWithLoader(loader, url, options) {
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (result) => {
          // Handle different loader result formats
          let model;
          if (result.scene) {
            model = result.scene; // GLTF
          } else if (result.object) {
            model = result.object; // Collada
          } else {
            model = result; // OBJ, FBX, etc.
          }
          
          // Store animations if available
          if (result.animations && result.animations.length > 0) {
            this.animations.set(options.name || 'default', result.animations);
          }
          
          resolve(model);
        },
        (progress) => {
          if (options.onProgress) {
            options.onProgress(progress);
          }
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  processModel(model, options) {
    // Apply transformations
    if (options.position) {
      model.position.set(...options.position);
    }
    if (options.rotation) {
      model.rotation.set(...options.rotation);
    }
    if (options.scale) {
      if (typeof options.scale === 'number') {
        model.scale.setScalar(options.scale);
      } else {
        model.scale.set(...options.scale);
      }
    }
    
    // Enable shadows
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = options.castShadow !== false;
        child.receiveShadow = options.receiveShadow !== false;
        
        // Optimize materials
        if (child.material) {
          child.material.needsUpdate = true;
        }
      }
    });
  }

  // Animation System
  createAnimation(modelName, animationName, options = {}) {
    const model = this.models.get(modelName);
    const animations = this.animations.get(modelName);
    
    if (!model || !animations) {
      throw new Error(`Model or animations not found: ${modelName}`);
    }
    
    const mixer = new THREE.AnimationMixer(model);
    const animation = animations.find(anim => anim.name === animationName);
    
    if (!animation) {
      throw new Error(`Animation not found: ${animationName}`);
    }
    
    const action = mixer.clipAction(animation);
    
    // Configure animation
    if (options.loop !== undefined) {
      action.setLoop(options.loop);
    }
    if (options.duration) {
      action.setDuration(options.duration);
    }
    if (options.weight !== undefined) {
      action.setEffectiveWeight(options.weight);
    }
    
    return { mixer, action };
  }

  // Interaction System
  addInteraction(objectName, type, callback) {
    if (!this.interactions.has(objectName)) {
      this.interactions.set(objectName, new Map());
    }
    
    this.interactions.get(objectName).set(type, callback);
  }

  handleInteraction(objectName, type, event) {
    const objectInteractions = this.interactions.get(objectName);
    if (objectInteractions && objectInteractions.has(type)) {
      objectInteractions.get(type)(event);
    }
  }

  // Spatial Audio
  createReverbEffect() {
    const convolver = this.audioContext.createConvolver();
    const impulseLength = this.audioContext.sampleRate * 2;
    const impulse = this.audioContext.createBuffer(2, impulseLength, this.audioContext.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < impulseLength; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / impulseLength, 2);
      }
    }
    
    convolver.buffer = impulse;
    this.spatialAudio.reverb = convolver;
  }

  createSpatialAudioSource(url, position = [0, 0, 0]) {
    return new Promise((resolve, reject) => {
      fetch(url)
        .then(response => response.arrayBuffer())
        .then(data => this.audioContext.decodeAudioData(data))
        .then(buffer => {
          const source = this.audioContext.createBufferSource();
          const panner = this.audioContext.createPanner();
          const gainNode = this.audioContext.createGain();
          
          source.buffer = buffer;
          
          // Configure 3D audio
          panner.panningModel = 'HRTF';
          panner.distanceModel = 'inverse';
          panner.refDistance = 1;
          panner.maxDistance = 10000;
          panner.rolloffFactor = 1;
          panner.coneInnerAngle = 360;
          panner.coneOuterAngle = 0;
          panner.coneOuterGain = 0;
          
          // Set position
          panner.positionX.setValueAtTime(position[0], this.audioContext.currentTime);
          panner.positionY.setValueAtTime(position[1], this.audioContext.currentTime);
          panner.positionZ.setValueAtTime(position[2], this.audioContext.currentTime);
          
          // Connect audio graph
          source.connect(gainNode);
          gainNode.connect(panner);
          panner.connect(this.spatialAudio.reverb);
          this.spatialAudio.reverb.connect(this.audioContext.destination);
          
          const audioSource = {
            source,
            panner,
            gainNode,
            buffer,
            position: position,
            isPlaying: false
          };
          
          resolve(audioSource);
        })
        .catch(reject);
    });
  }

  // Hand Tracking
  defineHandGestures() {
    // Define common hand gestures
    this.handTracking.gestures.set('point', {
      name: 'point',
      description: 'Index finger pointing',
      detector: (hand) => this.detectPointingGesture(hand)
    });
    
    this.handTracking.gestures.set('grab', {
      name: 'grab',
      description: 'Closed fist',
      detector: (hand) => this.detectGrabGesture(hand)
    });
    
    this.handTracking.gestures.set('peace', {
      name: 'peace',
      description: 'Peace sign',
      detector: (hand) => this.detectPeaceGesture(hand)
    });
  }

  detectPointingGesture(hand) {
    // Simplified gesture detection logic
    // In a real implementation, this would use machine learning
    const indexTip = hand.joints['index-finger-tip'];
    const indexPip = hand.joints['index-finger-pip'];
    const middleTip = hand.joints['middle-finger-tip'];
    const middlePip = hand.joints['middle-finger-pip'];
    
    // Check if index finger is extended and others are curled
    const indexExtended = indexTip.position.distanceTo(indexPip.position) > 0.03;
    const middleCurled = middleTip.position.distanceTo(middlePip.position) < 0.02;
    
    return indexExtended && middleCurled;
  }

  detectGrabGesture(hand) {
    // Check if all fingers are curled
    const fingerTips = ['thumb-tip', 'index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip'];
    const palm = hand.joints['wrist'];
    
    return fingerTips.every(tip => {
      const joint = hand.joints[tip];
      return joint && joint.position.distanceTo(palm.position) < 0.08;
    });
  }

  detectPeaceGesture(hand) {
    // Check if index and middle fingers are extended, others curled
    const indexTip = hand.joints['index-finger-tip'];
    const middleTip = hand.joints['middle-finger-tip'];
    const ringTip = hand.joints['ring-finger-tip'];
    const palm = hand.joints['wrist'];
    
    const indexExtended = indexTip.position.distanceTo(palm.position) > 0.06;
    const middleExtended = middleTip.position.distanceTo(palm.position) > 0.06;
    const ringCurled = ringTip.position.distanceTo(palm.position) < 0.04;
    
    return indexExtended && middleExtended && ringCurled;
  }

  // Render Loops
  startARRenderLoop(referenceSpace) {
    const render = (time, frame) => {
      if (frame) {
        const pose = frame.getViewerPose(referenceSpace);
        
        if (pose) {
          // Update camera
          this.camera.matrix.fromArray(pose.views[0].transform.matrix);
          this.camera.projectionMatrix.fromArray(pose.views[0].projectionMatrix);
          this.camera.updateMatrixWorld(true);
          
          // Handle hit testing
          this.handleHitTesting(frame, referenceSpace);
          
          // Handle hand tracking
          this.handleHandTracking(frame, referenceSpace);
          
          // Handle eye tracking
          this.handleEyeTracking(frame, referenceSpace);
          
          // Update spatial audio
          this.updateSpatialAudio();
          
          // Render scene
          this.renderer.render(this.scene, this.camera);
        }
      }
      
      if (this.arSession) {
        this.arSession.requestAnimationFrame(render);
      }
    };
    
    this.arSession.requestAnimationFrame(render);
  }

  startVRRenderLoop(referenceSpace) {
    const render = (time, frame) => {
      if (frame) {
        const pose = frame.getViewerPose(referenceSpace);
        
        if (pose) {
          // Handle hand tracking
          this.handleHandTracking(frame, referenceSpace);
          
          // Handle eye tracking
          this.handleEyeTracking(frame, referenceSpace);
          
          // Update spatial audio
          this.updateSpatialAudio();
          
          // Render for each eye
          for (const view of pose.views) {
            const viewport = this.arSession.renderState.baseLayer.getViewport(view);
            this.renderer.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
            
            this.camera.matrix.fromArray(view.transform.matrix);
            this.camera.projectionMatrix.fromArray(view.projectionMatrix);
            this.camera.updateMatrixWorld(true);
            
            this.renderer.render(this.scene, this.camera);
          }
        }
      }
      
      if (this.vrSession) {
        this.vrSession.requestAnimationFrame(render);
      }
    };
    
    this.vrSession.requestAnimationFrame(render);
  }

  // Event Handlers
  handleHitTesting(frame, referenceSpace) {
    // Implement hit testing for AR object placement
    if (frame.session.requestHitTestSource) {
      // Hit testing implementation
    }
  }

  handleHandTracking(frame, referenceSpace) {
    if (this.handTracking.enabled && frame.session.inputSources) {
      for (const inputSource of frame.session.inputSources) {
        if (inputSource.hand) {
          const hand = inputSource.hand;
          
          // Detect gestures
          for (const [gestureName, gesture] of this.handTracking.gestures) {
            if (gesture.detector(hand)) {
              this.onGestureDetected(gestureName, hand, inputSource.handedness);
            }
          }
        }
      }
    }
  }

  handleEyeTracking(frame, referenceSpace) {
    if (this.eyeTracking.enabled && frame.session.requestReferenceSpace) {
      // Eye tracking implementation
      // This would require specific eye tracking APIs
    }
  }

  updateSpatialAudio() {
    if (this.spatialAudio && this.camera) {
      // Update listener position and orientation
      const position = this.camera.position;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      
      if (this.spatialAudio.listener.positionX) {
        this.spatialAudio.listener.positionX.setValueAtTime(position.x, this.audioContext.currentTime);
        this.spatialAudio.listener.positionY.setValueAtTime(position.y, this.audioContext.currentTime);
        this.spatialAudio.listener.positionZ.setValueAtTime(position.z, this.audioContext.currentTime);
        
        this.spatialAudio.listener.forwardX.setValueAtTime(forward.x, this.audioContext.currentTime);
        this.spatialAudio.listener.forwardY.setValueAtTime(forward.y, this.audioContext.currentTime);
        this.spatialAudio.listener.forwardZ.setValueAtTime(forward.z, this.audioContext.currentTime);
        
        this.spatialAudio.listener.upX.setValueAtTime(up.x, this.audioContext.currentTime);
        this.spatialAudio.listener.upY.setValueAtTime(up.y, this.audioContext.currentTime);
        this.spatialAudio.listener.upZ.setValueAtTime(up.z, this.audioContext.currentTime);
      }
    }
  }

  // Event Callbacks
  onARSessionStart() {
    console.log('AR session started');
    this.dispatchEvent('ar-session-start');
  }

  onARSessionEnd() {
    console.log('AR session ended');
    this.dispatchEvent('ar-session-end');
  }

  onVRSessionStart() {
    console.log('VR session started');
    this.dispatchEvent('vr-session-start');
  }

  onVRSessionEnd() {
    console.log('VR session ended');
    this.dispatchEvent('vr-session-end');
  }

  onGestureDetected(gestureName, hand, handedness) {
    console.log(`Gesture detected: ${gestureName} (${handedness})`);
    this.dispatchEvent('gesture-detected', { gestureName, hand, handedness });
  }

  // Utility Methods
  dispatchEvent(eventName, data = {}) {
    const event = new CustomEvent(eventName, { detail: data });
    document.dispatchEvent(event);
  }

  // Public API
  getModel(name) {
    return this.models.get(name);
  }

  removeModel(name) {
    const model = this.models.get(name);
    if (model) {
      this.scene.remove(model);
      this.models.delete(name);
    }
  }

  isSessionActive() {
    return !!(this.arSession || this.vrSession);
  }

  getCurrentSession() {
    return this.arSession || this.vrSession;
  }

  async endSession() {
    if (this.arSession) {
      await this.arSession.end();
    }
    if (this.vrSession) {
      await this.vrSession.end();
    }
  }

  // Cleanup
  dispose() {
    this.endSession();
    
    if (this.renderer) {
      this.renderer.dispose();
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.models.clear();
    this.animations.clear();
    this.interactions.clear();
  }
}

// Export for use
window.VentaroARVREngine = VentaroARVREngine;

// Auto-initialize if in browser environment
if (typeof window !== 'undefined') {
  window.ventaroARVR = new VentaroARVREngine();
}