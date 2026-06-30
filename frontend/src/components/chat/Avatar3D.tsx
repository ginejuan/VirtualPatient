import React, { Component } from 'react';
import type { ErrorInfo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';

class AvatarErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Avatar Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', color: '#ef4444', padding: '1rem', textAlign: 'center' }}>
          <span>No se pudo cargar el Avatar 3D.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

// URL to a generic female Ready Player Me model (can be changed later)
const MODEL_URL = 'https://models.readyplayer.me/64b5585b7e2e83162b7ebbb1.glb';

function Model({ isSpeaking }: { isSpeaking: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  
  // A simple animation loop to move the jaw if isSpeaking is true
  useFrame((state) => {
    // Traverse the scene to find the head mesh and its morph targets
    scene.traverse((child: any) => {
      if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        // Find the index for jawOpen or mouthOpen
        const jawOpenIdx = child.morphTargetDictionary['mouthOpen'] ?? child.morphTargetDictionary['jawOpen'];
        
        if (jawOpenIdx !== undefined) {
           // If speaking, oscillate the jaw based on time to simulate speaking
           if (isSpeaking) {
             const targetVal = (Math.sin(state.clock.elapsedTime * 15) + 1) / 2 * 0.4; // oscillate between 0 and 0.4
             // smooth transition
             child.morphTargetInfluences[jawOpenIdx] = THREE.MathUtils.lerp(child.morphTargetInfluences[jawOpenIdx], targetVal, 0.3);
           } else {
             // close mouth
             child.morphTargetInfluences[jawOpenIdx] = THREE.MathUtils.lerp(child.morphTargetInfluences[jawOpenIdx], 0, 0.2);
           }
        }
      }
    });
  });

  return <primitive object={scene} position={[0, -1.6, 0]} />;
}

export const Avatar3D = ({ isSpeaking }: { isSpeaking: boolean }) => {
  return (
    <div style={{ width: '100%', height: '350px', borderRadius: '12px', overflow: 'hidden', background: '#e5e7eb', marginBottom: '1rem', position: 'relative' }}>
      <AvatarErrorBoundary>
        <Canvas camera={{ position: [0, -0.2, 1.5], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 2, 2]} intensity={1.5} />
          <Environment preset="city" />
          <React.Suspense fallback={<primitive object={new THREE.Group()} />}>
            <Model isSpeaking={isSpeaking} />
          </React.Suspense>
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            minPolarAngle={Math.PI / 2.2} 
            maxPolarAngle={Math.PI / 1.8}
            minAzimuthAngle={-Math.PI / 8}
            maxAzimuthAngle={Math.PI / 8}
          />
        </Canvas>
      </AvatarErrorBoundary>
    </div>
  );
};
