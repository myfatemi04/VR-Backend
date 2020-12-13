declare namespace VRChats {
  // A Vector interface stores 3D direction, which can also be interpreted as a position
  interface VRVector3D {
    x: number;
    y: number;
    z: number;
  }

  // An Object interface stores the position and rotation of an object in the space
  interface VRObject {
    position: VRVector3D;
    velocity: VRVector3D;
    yaw: number;
    pitch: number;
  }

  // A Person interface stores the position and username of a person connected to the space.
  interface Person extends VRObject {
    username: string;
    flying: boolean;
    color: string;
    shape: string;
  }
}
