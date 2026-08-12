/* R3F intrinsic scene props are Three.js properties, not React DOM props. */
/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';

import type {
  TreeBranch,
  TreeCollectible,
  TreeGrowthStage,
} from '@features/collection/treePresentation';

type CameraController = {
  orbitBy: (horizontal: number, vertical: number) => void;
  zoomBy: (scaleDelta: number) => void;
  reset: () => void;
};

export type ExplorerTreasureTreeSceneProps = {
  branches: TreeBranch[];
  growthStage: TreeGrowthStage;
  selectedCollectible: TreeCollectible | null;
  onSelectCollectible: (collectible: TreeCollectible) => void;
  onSelectBranch: (branch: TreeBranch) => void;
  reducedMotion: boolean | null;
  onReady: () => void;
  resetToken: number;
};

const defaultCamera = { azimuth: 0.62, polar: 1.08, distance: 10.4, target: [0, 2.8, 0] as const };

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Native R3F camera rig. It owns navigation camera state only; the Collection
 * screen remains the source of truth for selected artifacts and progress. */
function TreeCameraRig({
  selectedCollectible,
  onController,
}: Pick<ExplorerTreasureTreeSceneProps, 'selectedCollectible'> & {
  onController: (controller: CameraController | null) => void;
}) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;
  const goal = useRef({
    azimuth: defaultCamera.azimuth,
    polar: defaultCamera.polar,
    distance: defaultCamera.distance,
    target: new THREE.Vector3(...defaultCamera.target),
  });
  const beforeFocus = useRef<typeof goal.current | null>(null);
  const [controller] = useState<CameraController>(() => ({
    orbitBy(horizontal, vertical) {
      goal.current.azimuth += horizontal * 0.008;
      goal.current.polar = clamp(goal.current.polar + vertical * 0.006, 0.58, 1.38);
    },
    zoomBy(scaleDelta) {
      goal.current.distance = clamp(goal.current.distance / scaleDelta, 5.1, 13.2);
    },
    reset() {
      beforeFocus.current = null;
      goal.current = {
        azimuth: defaultCamera.azimuth,
        polar: defaultCamera.polar,
        distance: defaultCamera.distance,
        target: new THREE.Vector3(...defaultCamera.target),
      };
    },
  }));

  useEffect(() => {
    onController(controller);
    return () => onController(null);
  }, [controller, onController]);

  useEffect(() => {
    if (selectedCollectible) {
      if (!beforeFocus.current) {
        beforeFocus.current = {
          azimuth: goal.current.azimuth,
          polar: goal.current.polar,
          distance: goal.current.distance,
          target: goal.current.target.clone(),
        };
      }
      const [x, y, z] = selectedCollectible.position ?? defaultCamera.target;
      goal.current.target.set(x, y, z);
      goal.current.distance = 5.3;
      goal.current.polar = 1.04;
      goal.current.azimuth = Math.atan2(x, z) + 0.42;
      return;
    }
    if (beforeFocus.current) {
      goal.current = beforeFocus.current;
      beforeFocus.current = null;
    }
  }, [selectedCollectible]);

  useFrame((_, delta) => {
    const damping = 1 - Math.exp(-5.6 * delta);
    const { azimuth, polar, distance, target } = goal.current;
    const desiredPosition = new THREE.Vector3(
      target.x + Math.sin(polar) * Math.sin(azimuth) * distance,
      target.y + Math.cos(polar) * distance,
      target.z + Math.sin(polar) * Math.cos(azimuth) * distance,
    );
    camera.position.lerp(desiredPosition, damping);
    camera.lookAt(target);
  });

  return null;
}

type PositionedCollectible = TreeCollectible & {
  position: [number, number, number];
  color: string;
};

function collectiblePosition(
  branch: TreeBranch,
  collectible: TreeCollectible,
  index: number,
): PositionedCollectible {
  const offset = index * 0.52;
  return {
    ...collectible,
    position: [
      branch.anchor[0] + Math.sin(offset + 0.7) * 0.47,
      branch.anchor[1] + (index % 2) * 0.42 - 0.2,
      branch.anchor[2] + Math.cos(offset + 0.7) * 0.38,
    ],
    color: branch.accent,
  };
}

function CollectibleMesh({
  collectible,
  selected,
  reducedMotion,
  onPress,
}: {
  collectible: PositionedCollectible;
  selected: boolean;
  reducedMotion: boolean | null;
  onPress: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const phase =
    collectible.id.split('').reduce((total, character) => total + character.charCodeAt(0), 0) *
    0.07;

  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return;
    const time = clock.getElapsedTime() + phase;
    group.current.rotation.y = Math.sin(time * 0.58) * 0.12;
    group.current.rotation.z = collectible.motion === 'hanging' ? Math.sin(time * 0.9) * 0.055 : 0;
    group.current.position.y = collectible.position[1] + Math.sin(time * 0.72) * 0.035;
  });

  return (
    <group ref={group} position={collectible.position} scale={selected ? 1.26 : 1}>
      {collectible.motion === 'hanging' ? (
        <mesh position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.55, 6]} />
          <meshStandardMaterial color="#C89552" roughness={0.8} />
        </mesh>
      ) : null}
      <mesh castShadow onClick={onPress}>
        <icosahedronGeometry args={[0.18, 2]} />
        <meshStandardMaterial
          color={collectible.color}
          emissive={selected ? collectible.color : '#000000'}
          emissiveIntensity={selected ? 0.22 : 0}
          roughness={collectible.motion === 'leaf' ? 0.86 : 0.48}
          metalness={collectible.category === 'space' ? 0.35 : 0.06}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} onClick={onPress}>
        <torusGeometry args={[0.1, 0.021, 6, 14]} />
        <meshStandardMaterial color="#FFF0B5" emissive="#EAC65F" emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

function BranchLimb({
  branch,
  visible,
  onPress,
}: {
  branch: TreeBranch;
  visible: boolean;
  onPress: () => void;
}) {
  const length = Math.sqrt(branch.anchor[0] ** 2 + branch.anchor[2] ** 2) * 0.76;
  const angle = Math.atan2(branch.anchor[0], branch.anchor[2]);
  return (
    <group rotation={[0, angle, Math.PI / 2 - 0.36]} scale={visible ? 1 : 0.01}>
      <mesh position={[length / 2, 0, 0]} castShadow onClick={onPress}>
        <cylinderGeometry args={[0.13, 0.24, length, 9]} />
        <meshStandardMaterial color="#69432C" roughness={0.92} />
      </mesh>
      <mesh position={[length * 0.72, 0.1, 0]} castShadow onClick={onPress}>
        <sphereGeometry args={[0.44, 10, 8]} />
        <meshStandardMaterial color={branch.color} roughness={0.92} />
      </mesh>
    </group>
  );
}

function DiscoveryTree({
  branches,
  stage,
  selectedCollectible,
  onSelectCollectible,
  onSelectBranch,
  reducedMotion,
}: Omit<ExplorerTreasureTreeSceneProps, 'growthStage' | 'onReady' | 'resetToken'> & {
  stage: TreeGrowthStage;
}) {
  const tree = useRef<THREE.Group>(null);
  const stageScale = { sapling: 0.73, young: 0.84, growing: 0.94, mature: 1, grand: 1.08 }[stage];
  const branchLimit = { sapling: 0, young: 2, growing: 3, mature: 4, grand: 5 }[stage];

  useFrame(({ clock }) => {
    if (!tree.current || reducedMotion) return;
    tree.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.19) * 0.006;
  });

  return (
    <group ref={tree} scale={stageScale}>
      {/* Temporary art direction mesh. It is deliberately isolated so a low-poly,
          mobile-budget GLB can replace this group without changing anchors/camera. */}
      <mesh position={[0, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.68, 3.5, 12]} />
        <meshStandardMaterial color="#765039" roughness={0.96} />
      </mesh>
      <mesh position={[0, 3.34, 0]} castShadow>
        <sphereGeometry args={[0.68, 13, 10]} />
        <meshStandardMaterial color="#8AA06A" roughness={0.9} />
      </mesh>
      <mesh position={[-0.42, 0.2, 0.26]} rotation={[0, 0.4, -0.3]} castShadow>
        <coneGeometry args={[0.35, 1.3, 9]} />
        <meshStandardMaterial color="#68442F" roughness={0.98} />
      </mesh>
      <mesh position={[0.46, 0.18, -0.22]} rotation={[0, -0.3, 0.28]} castShadow>
        <coneGeometry args={[0.3, 1.15, 9]} />
        <meshStandardMaterial color="#68442F" roughness={0.98} />
      </mesh>
      {branches.map((branch, index) => (
        <group key={branch.id} position={[0, branch.anchor[1] * 0.38, 0]}>
          <BranchLimb
            branch={branch}
            visible={index < branchLimit}
            onPress={() => onSelectBranch(branch)}
          />
          {index < branchLimit
            ? branch.collectibles.map((collectible, collectibleIndex) => {
                const positioned = collectiblePosition(branch, collectible, collectibleIndex);
                return (
                  <CollectibleMesh
                    key={collectible.id}
                    collectible={positioned}
                    selected={selectedCollectible?.id === collectible.id}
                    reducedMotion={reducedMotion}
                    onPress={() => onSelectCollectible(positioned)}
                  />
                );
              })
            : null}
        </group>
      ))}
      {[
        [-0.9, 4.8, 0.3],
        [0.9, 4.65, -0.1],
        [0, 5.5, 0],
        [-0.18, 4.4, -0.9],
      ].map((position, index) => (
        <mesh key={`canopy-${index}`} position={position as [number, number, number]} castShadow>
          <dodecahedronGeometry args={[index === 2 ? 1.12 : 0.92, 1]} />
          <meshStandardMaterial color={index % 2 ? '#86A968' : '#9CBA75'} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function TreeEnvironment() {
  const motes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => [
        Math.sin(index * 7.1) * 5.5,
        0.6 + ((index * 1.9) % 5.2),
        Math.cos(index * 3.3) * 4.4,
      ]) as [number, number, number][],
    [],
  );
  return (
    <>
      <color attach="background" args={['#E7E0CB']} />
      <fog attach="fog" args={['#E7E0CB', 11, 22]} />
      <hemisphereLight args={['#FFF7DD', '#728C87', 2.2]} />
      <directionalLight position={[-5, 8, 6]} intensity={2.8} color="#FFE3A0" castShadow />
      <directionalLight position={[5, 3, -5]} intensity={1.1} color="#9DC6D1" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5.7, 48]} />
        <meshStandardMaterial color="#B79C75" roughness={1} />
      </mesh>
      <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[3.1, 48]} />
        <meshStandardMaterial color="#6E5A3E" roughness={1} />
      </mesh>
      {motes.map((position, index) => (
        <mesh key={`mote-${index}`} position={position}>
          <sphereGeometry args={[0.025, 5, 5]} />
          <meshBasicMaterial color="#FFF7C7" transparent opacity={0.62} />
        </mesh>
      ))}
    </>
  );
}

function TreeScene({
  branches,
  growthStage,
  selectedCollectible,
  onSelectCollectible,
  onSelectBranch,
  reducedMotion,
  onCameraController,
}: Omit<ExplorerTreasureTreeSceneProps, 'onReady' | 'resetToken'> & {
  onCameraController: (controller: CameraController | null) => void;
}) {
  return (
    <>
      <TreeCameraRig selectedCollectible={selectedCollectible} onController={onCameraController} />
      <TreeEnvironment />
      <DiscoveryTree
        branches={branches}
        stage={growthStage}
        selectedCollectible={selectedCollectible}
        onSelectCollectible={onSelectCollectible}
        onSelectBranch={onSelectBranch}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

export function ExplorerTreasureTreeScene({
  onReady,
  resetToken,
  ...props
}: ExplorerTreasureTreeSceneProps) {
  const [camera, setCamera] = useState<CameraController | null>(null);
  const pinchScale = useSharedValue(1);
  useEffect(() => {
    camera?.reset();
  }, [camera, resetToken]);
  const resetPinch = () => {
    pinchScale.value = 1;
  };
  const zoomTree = (scale: number) => {
    const ratio = scale / pinchScale.value;
    pinchScale.value = scale;
    camera?.zoomBy(ratio);
  };
  const pan = Gesture.Pan()
    .minDistance(5)
    .maxPointers(1)
    .runOnJS(true)
    .onChange((event) => camera?.orbitBy(event.changeX, event.changeY));
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(resetPinch)
    .onChange((event) => zoomTree(event.scale));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pan, pinch)}>
      <View style={styles.canvas} accessible={false}>
        <Canvas
          shadows
          camera={{ fov: 38, near: 0.1, far: 50, position: [5.4, 7.2, 7.6] }}
          onCreated={() => onReady()}
          gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        >
          <TreeScene {...props} onCameraController={setCamera} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ canvas: { flex: 1, overflow: 'hidden' } });
