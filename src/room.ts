/**
 * Used to accurately simulate gravity and velocities.
 */
export const TICK_LENGTH = 1 / 60;

/**
 * This is the y-value that no person should ever go under
 * If object.y < FLOOR_Y, object.y = FLOOR_Y.
 */
export const FLOOR_Y = 0;

export default class Room {
  // Map from userId to Person
  people = new Map<string, VRChats.Person>();

  // The gravity to act on all objects in the room, in m/s^2
  // Earth's gravity is 9.8 m/s^2
  gravity: number;

  // Stores the handle to control the physics loop.
  tickerHandle: NodeJS.Timeout;

  // Stores the internal server time.
  // Represents how many ticks have executed since startup.
  serverTime: number = 0;

  // Callbacks that should happen each tick
  tickCallbacks: ((room: Room) => any)[] = [];

  constructor(gravity: number = 9.8) {
    this.gravity = gravity;
  }

  start() {
    this.tickerHandle = setInterval(() => {
      this.tick();
    }, TICK_LENGTH * 1000);
  }

  stop() {
    clearInterval(this.tickerHandle);
  }

  /**
   * This function performs physical updates on all objects in the Room.
   * For now, this only includes gravity. This function is _in place_.
   * @param this The room to enact physics on
   */
  tick() {
    // Enact forces on all people
    for (let person of Array.from(this.people.values())) {
      if (!person.flying) {
        person.velocity.y -= this.gravity * TICK_LENGTH;
      }
    }

    // Enact velocities on all people
    for (let person of Array.from(this.people.values())) {
      person.position.x += person.velocity.x * TICK_LENGTH;
      person.position.y += person.velocity.y * TICK_LENGTH;
      person.position.z += person.velocity.z * TICK_LENGTH;

      // Check if they fell through the floor.
      // If they did, move them to ground level.
      if (person.position.y < FLOOR_Y) {
        person.velocity.y = 0;
        person.position.y = FLOOR_Y;
      }
    }

    // Update the internal room time
    this.serverTime += 1;

    this.tickCallbacks.forEach((fn) => {
      fn(this);
    });
  }

  onTick(callback: (room: Room) => any) {
    this.tickCallbacks.push(callback);
  }

  offTick(callback: () => any) {
    this.tickCallbacks = this.tickCallbacks.filter((callback_) => {
      return callback_ != callback;
    });
  }
}
