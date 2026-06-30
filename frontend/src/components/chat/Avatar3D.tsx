import React, { Component } from 'react';
import type { ErrorInfo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Html } from '@react-three/drei';
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
const MODEL_URL = '/avatar.glb';

function Model({ isSpeaking }: { isSpeaking: boolean }) {
  const { scene } = useGLTF(MODEL_URL);
  
  // A simple animation loop to move the jaw if isSpeaking is true
  useFrame((state) => {
    // Traverse the scene to find the head mesh and its morph targets
    scene.traverse((child: any) => {
      if (child.isMesh && child.morphTargetDictionary && child.morphTargetInfluences) {
        // Find the index for any mouth/jaw open blendshape
        const dict = child.morphTargetDictionary;
        const keys = Object.keys(dict);
        const targetKey = keys.find(k => {
          const l = k.toLowerCase();
          return l.includes('jawopen') || l.includes('mouthopen') || l.includes('viseme_aa') || l.includes('v_aa') || l === 'a';
        });

        const jawOpenIdx = targetKey ? dict[targetKey] : undefined;
        
        if (jawOpenIdx !== undefined) {
           // If speaking, generate pseudo-random syllables
           if (isSpeaking) {
             const currentFrame = Math.floor(state.clock.elapsedTime * 8); // Change shape 8 times per second
             const pseudoRandom = Math.abs(Math.sin(currentFrame * 435.23)) * 0.2 + 0.05; // Random width 0.05 to 0.25 (very subtle)
             child.morphTargetInfluences[jawOpenIdx] = THREE.MathUtils.lerp(child.morphTargetInfluences[jawOpenIdx], pseudoRandom, 0.4);
           } else {
             // close mouth
             child.morphTargetInfluences[jawOpenIdx] = THREE.MathUtils.lerp(child.morphTargetInfluences[jawOpenIdx], 0, 0.2);
           }
        }
      }
    });
  });

  return <primitive object={scene} />;
}

export const Avatar3D = ({ isSpeaking }: { isSpeaking: boolean }) => {
  return (
    <div style={{ width: '100%', height: '350px', borderRadius: '12px', overflow: 'hidden', background: '#e5e7eb', marginBottom: '1rem', position: 'relative' }}>
      <AvatarErrorBoundary>
        <Canvas camera={{ position: [0, 1.55, 0.55], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 2, 2]} intensity={1.5} />
          <Environment preset="city" />
          <React.Suspense fallback={<Html center><div style={{ color: '#4b5563', fontWeight: 'bold', textAlign: 'center', width: '200px' }}>Cargando modelo 3D...<br/><small>(Puede tardar un poco si es pesado)</small></div></Html>}>
            <Model isSpeaking={isSpeaking} />
          </React.Suspense>
          <OrbitControls 
            makeDefault
            enableZoom={true} 
            target={[0, 1.55, 0]}
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
