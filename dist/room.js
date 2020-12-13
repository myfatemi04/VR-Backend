"use strict";
exports.__esModule = true;
exports.FLOOR_Y = exports.TICK_LENGTH = void 0;
/**
 * Used to accurately simulate gravity and velocities.
 */
exports.TICK_LENGTH = 1 / 60;
/**
 * This is the y-value that no person should ever go under
 * If object.y < FLOOR_Y, object.y = FLOOR_Y.
 */
exports.FLOOR_Y = 0;
var Room = /** @class */ (function () {
    function Room(gravity) {
        if (gravity === void 0) { gravity = 9.8; }
        // Map from userId to Person
        this.people = new Map();
        // Stores the internal server time.
        // Represents how many ticks have executed since startup.
        this.serverTime = 0;
        // Callbacks that should happen each tick
        this.tickCallbacks = [];
        this.gravity = gravity;
    }
    Room.prototype.start = function () {
        var _this = this;
        this.tickerHandle = setInterval(function () {
            _this.tick();
        }, exports.TICK_LENGTH * 1000);
    };
    Room.prototype.stop = function () {
        clearInterval(this.tickerHandle);
    };
    /**
     * This function performs physical updates on all objects in the Room.
     * For now, this only includes gravity. This function is _in place_.
     * @param this The room to enact physics on
     */
    Room.prototype.tick = function () {
        var _this = this;
        // Enact forces on all people
        for (var _i = 0, _a = Array.from(this.people.values()); _i < _a.length; _i++) {
            var person = _a[_i];
            if (!person.flying) {
                person.velocity.y -= this.gravity * exports.TICK_LENGTH;
            }
        }
        // Enact velocities on all people
        for (var _b = 0, _c = Array.from(this.people.values()); _b < _c.length; _b++) {
            var person = _c[_b];
            person.position.x += person.velocity.x * exports.TICK_LENGTH;
            person.position.y += person.velocity.y * exports.TICK_LENGTH;
            person.position.z += person.velocity.z * exports.TICK_LENGTH;
            // Check if they fell through the floor.
            // If they did, move them to ground level.
            if (person.position.y < exports.FLOOR_Y) {
                person.velocity.y = 0;
                person.position.y = exports.FLOOR_Y;
            }
        }
        // Update the internal room time
        this.serverTime += 1;
        this.tickCallbacks.forEach(function (fn) {
            fn(_this);
        });
    };
    Room.prototype.onTick = function (callback) {
        this.tickCallbacks.push(callback);
    };
    Room.prototype.offTick = function (callback) {
        this.tickCallbacks = this.tickCallbacks.filter(function (callback_) {
            return callback_ != callback;
        });
    };
    return Room;
}());
exports["default"] = Room;
