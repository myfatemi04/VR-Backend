"use strict";
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
exports.__esModule = true;
var cors = require("cors");
var http = require("http");
var SocketIO = require("socket.io");
var express = require("express");
var gravity_1 = require("./gravity");
var room_1 = require("./room");
var uuid_1 = require("uuid");
var twilio = require("twilio");
var dotenv = require("dotenv");
dotenv.config();
// 'VRChats' namespace is declared in 'index.d.ts'
// The main map with all the rooms
var rooms = new Map();
/**
 * Factory method for a person.
 * @param username Person's username. Default "Person".
 * @param position Person's position in the world. Default (0, 0, 0).
 * @param velocity Person's current velocity. Default (0, 0, 0).
 * @param yaw Person's horizontal rotation. Default 0.
 * @param pitch Person's vertical rotation. Default 0.
 */
function createPerson(username, position, velocity, yaw, pitch, flying, color, shape) {
    if (username === void 0) { username = "Person"; }
    if (position === void 0) { position = { x: 0, y: 0, z: 0 }; }
    if (velocity === void 0) { velocity = { x: 0, y: 0, z: 0 }; }
    if (yaw === void 0) { yaw = 0; }
    if (pitch === void 0) { pitch = 0; }
    if (flying === void 0) { flying = false; }
    if (color === void 0) { color = "#ff7700"; }
    if (shape === void 0) { shape = "cube"; }
    return {
        position: position,
        velocity: velocity,
        username: username,
        yaw: yaw,
        pitch: pitch,
        flying: flying,
        color: color,
        shape: shape
    };
}
var DEFAULT_GRAVITY = gravity_1.GRAVITY.EARTH;
/**
 * Adds a user with a given id (and optionally, information) to a room with a given id.
 * @param roomId The room to add the person to
 * @param userId The id of the user to add
 * @param person The info of the user to add
 */
function addToRoom(roomId, userId, person) {
    if (person === void 0) { person = createPerson(); }
    if (!rooms.has(roomId)) {
        throw new Error("Room does not exist: " + roomId);
    }
    rooms.get(roomId).people.set(userId, person);
}
/**
 * Cleans up all room physics, and removes from the room registry.
 * @param roomId The room to remove
 */
function removeRoom(roomId) {
    // Stop the physics in the room
    if (rooms.has(roomId)) {
        rooms.get(roomId).stop();
        // Remove the room from the registry
        rooms["delete"](roomId);
    }
}
/**
 * Removes a user with a given id from a room with a given id.
 * @param roomId The room to remove the user from
 * @param userId The id of the user to remove
 */
function removeFromRoom(roomId, userId) {
    if (rooms.has(roomId)) {
        rooms.get(roomId).people["delete"](userId);
        if (rooms.get(roomId).people.size === 0) {
            removeRoom(roomId);
        }
    }
}
var app = express();
app.use(cors({
    origin: "*"
}));
var httpServer = http.createServer(app);
// The main Socket.IO server, constructed using our httpServer.
var io = new SocketIO.Server(httpServer, {
    cors: {
        origin: "*"
    }
});
/**
 * Client connects:
 *  - Client receives 'userId' event with the second argument being their userId
 *
 * 'room' event:
 *  - Second argument is the roomId.
 *  - Joins the room:
 *    - Sets the room ID for this socket internally
 *    - Sends the user information about the other people in the room
 *      - 'person' event with second argument of type Person
 *        - {x, y, z, yaw, pitch, username}
 *    - Alerts the other users of the new connection
 *        - Event 'connected' with second argument (userId)
 *
 * Client emits event 'username':
 *  - Sets the username for the user
 *  - Alerts the other users in the room with the event 'username' and
 *    second argument (the username)
 *  - ** the username is not the userId **
 *
 * Client connects:
 *  - Server emits the event 'connected' with the second argument being the userId
 *
 * Client disconnects:
 *  - Server emits the event 'disconnected' with the second argument being the userId
 *
 * ---- VERTICAL MOVEMENT EVENTS ----
 *
 * 'jump' event:
 *  - Optional second argument for how fast to jump up (in m/s)
 *  - Sets your upward velocity
 *
 * 'fly' event:
 *  - Second argument describes how much to go up or down (in m)
 *    - If positive, you fly upwards. If negative, you fly downwards.
 *
 * 'set-flying' event:
 *  - Second argument sets whether you are affected by gravity or not
 *
 * ---- HORIZONTAL MOVEMENT EVENTS ----
 *
 * 'move-forwards-backwards' event:
 *  - Second argument describes how much to go forwards or backwards (in m)
 *    - If positive, you go forwards. If negative, you go backwards.
 *
 * 'move-right-left' event:
 *  - Second argument describes how much to go forwards or backwards (in m)
 *    - If positive, you go right. If negative, you go left.
 */
function log() {
    var s = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        s[_i] = arguments[_i];
    }
    console.log.apply(console, __spreadArrays([new Date().toISOString()], s));
}
var AccessToken = twilio.jwt.AccessToken;
var VideoGrant = AccessToken.VideoGrant;
var _a = process.env, TWILIO_ACCOUNT_SID = _a.TWILIO_ACCOUNT_SID, TWILIO_API_SID = _a.TWILIO_API_SID, TWILIO_API_SECRET = _a.TWILIO_API_SECRET;
io.on("connection", function (socket) {
    var userID = uuid_1.v4();
    var roomID = "";
    var person = createPerson(userID);
    socket.on("room", function (roomID_) {
        log(userID, "joined room", roomID_);
        if (TWILIO_ACCOUNT_SID && TWILIO_API_SID && TWILIO_API_SECRET) {
            // create a VideoGrant so they can join the room with Twilio
            var accessToken = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_SID, TWILIO_API_SECRET, { identity: userID });
            accessToken.addGrant(new VideoGrant({ room: roomID_ }));
            socket.emit("joined-room", { userID: userID, accessToken: accessToken.toJwt() });
        }
        else {
            console.error("WARNING: No Twilio credentials found!");
        }
        // Leave the old room, if they were in one
        if (roomID) {
            removeFromRoom(roomID, userID);
            socket.broadcast.emit("disconnected", userID);
            socket.leave(roomID);
        }
        // Set the roomId
        roomID = roomID_;
        // Join the new room
        socket.join(roomID);
        socket.broadcast.emit("connected", userID);
        // If the room doesn't exist yet, create it
        if (!rooms.has(roomID)) {
            var room = new room_1["default"](DEFAULT_GRAVITY);
            // Send the clients room information every two ticks
            room.onTick(function (room) {
                // Don't overload the clients
                if (room.serverTime % 2 === 0) {
                    // Send the person info about the other people in the room
                    for (var _i = 0, _a = Array.from(rooms.get(roomID).people.entries()); _i < _a.length; _i++) {
                        var _b = _a[_i], userId = _b[0], user = _b[1];
                        io["in"](roomID).emit("person-update", userId, user);
                    }
                }
            });
            room.start();
            // Add the room
            rooms.set(roomID, room);
        }
        addToRoom(roomID, userID, person);
    });
    // Client disconnected
    socket.on("disconnect", function () {
        socket.broadcast.emit("disconnected", userID);
        removeFromRoom(roomID, userID);
        log(userID, "disconnected");
        socket.disconnect(true);
    });
    socket.on("set-flying", function (flying) {
        person.flying = flying;
    });
    // Process a "jump" event
    // The default speed at which you jump is 2 m/s.
    socket.on("jump", function (speed) {
        if (speed === void 0) { speed = 2; }
        log(userID, "jumped");
        person.velocity.y = speed;
    });
    // Process a request to fly up or down
    socket.on("fly", function (magnitude) {
        person.position.y += magnitude;
    });
    // Set your color!
    socket.on("color", function (color) {
        person.color = color;
    });
    // Set your shape!
    socket.on("shape", function (shape) {
        person.shape = shape;
    });
    // Magnitude: 1 = Forwards, -1 = Backwards.
    socket.on("move-forwards-backwards", function (magnitude) {
        // moves "forwards" or "backwards" according to your Yaw value.
        // Yaw = 0: Forwards in the Z direction (Forwards).
        // Yaw = pi/4 [rotated 45 deg cclockwise]: Forwards a little in the Z direction, backwards a little in the X direction
        // Yaw = pi/2 [rotated 90 deg cclockwise]: Backwards in the X direction (Left).
        // dZ = cos(Yaw), dX = -sin(Yaw)
        person.position.z += magnitude * Math.cos(person.yaw);
        person.position.x -= magnitude * Math.sin(person.yaw);
    });
    // Magnitude: 1 = Right, -1 = Left.
    socket.on("move-right-left", function (magnitude) {
        // moves "left" or "right" according to your Yaw value.
        // Yaw = 0: Forwards in the X direction (Right).
        // Yaw = pi/4 [rotated 45 deg cclockwise]: Forwards a little in both directions
        // Yaw = pi/2 [rotated 90 deg cclockwise]: Forwards in the Z direction (Forwards).
        // dZ = sin(Yaw), dX = cos(Yaw)
        person.position.z += magnitude * Math.sin(person.yaw);
        person.position.x += magnitude * Math.cos(person.yaw);
    });
    socket.on("rotate-counterclockwise", function (radians) {
        person.yaw += radians;
        if (person.yaw > Math.PI * 2) {
            person.yaw = (person.yaw % Math.PI) * 2;
        }
    });
    socket.on("set-yaw", function (yaw) {
        person.yaw = yaw;
        socket.broadcast.emit("person-yaw", userID, yaw);
    });
    socket.on("set-pitch", function (pitch) {
        person.pitch = pitch;
        socket.broadcast.emit("person-pitch", userID, pitch);
    });
    socket.on("username", function (username) {
        if (roomID) {
            rooms[roomID].people.get(userID).username = username;
        }
        socket.broadcast.emit("username", userID, username);
    });
});
// Load from process.env in case we're on Heroku
var port = process.env.PORT || 5000;
// Start the server
httpServer.listen(port, function () {
    console.log("go to http://localhost:" + port);
});
