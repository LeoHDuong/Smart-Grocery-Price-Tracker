import { useRef, useMemo, type FC } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform vec3 uColors[8];
  uniform int uColorCount;
  uniform float uSpeed;
  uniform float uFrequency;
  uniform float uWarpStrength;
  uniform float uIntensity;
  uniform float uBandWidth;
  uniform float uScale;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv * uScale;
    float time = uTime * uSpeed;
    
    // Warp logic
    for(float i = 1.0; i < 4.0; i++) {
      uv.x += 0.3 / i * sin(i * 3.0 * uv.y + time);
      uv.y += 0.3 / i * cos(i * 3.0 * uv.x + time);
    }

    float pattern = sin(uv.x * uFrequency + uv.y * uFrequency);
    float band = floor(pattern * uBandWidth) / uBandWidth;
    
    // Map to colors
    int colorIdx = int(mod(band * float(uColorCount), float(uColorCount)));
    vec3 baseColor = uColors[0];
    
    // Simple color selection based on band
    if (colorIdx == 1) baseColor = uColors[1];
    if (colorIdx == 2) baseColor = uColors[2];
    if (colorIdx == 3) baseColor = uColors[3];
    
    gl_FragColor = vec4(baseColor * uIntensity, 1.0);
  }
`;

interface ColorBendsProps {
  colors?: string[];
  speed?: number;
  intensity?: number;
  className?: string;
}

const ShaderPlane = ({ colors, speed, intensity }: any) => {
  const meshRef = useRef<any>();
  const threeColors = useMemo(() => 
    colors.map((c: string) => new THREE.Color(c)), [colors]
  );

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColors: { value: threeColors },
    uColorCount: { value: threeColors.length },
    uSpeed: { value: speed },
    uFrequency: { value: 2.0 },
    uWarpStrength: { value: 1.5 },
    uIntensity: { value: intensity },
    uBandWidth: { value: 6.0 },
    uScale: { value: 1.2 },
  }), [threeColors, speed, intensity]);

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[5, 5]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

export const ColorBends: FC<ColorBendsProps> = ({ 
  colors = ['#064e3b', '#065f46', '#0f172a', '#1e293b'], // Emerald + Slate Mix
  speed = 0.15, 
  intensity = 1.0,
  className = "" 
}) => {
  return (
    <div className={`fixed inset-0 w-screen h-screen -z-20 pointer-events-none ${className}`}>
      <Canvas camera={{ position: [0, 0, 1] }}>
        <ShaderPlane colors={colors} speed={speed} intensity={intensity} />
      </Canvas>
    </div>
  );
};