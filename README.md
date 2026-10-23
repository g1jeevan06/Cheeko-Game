# Cheeko-Game

Cheeko's Wild Run is a 3D browser endless runner starring the supplied Cheeko FOX model. The forest-prop FBX forms a repeating tree line around the trail.

## Run locally

Serve this folder over HTTP, then open the local address in a browser. The page loads Three.js from jsDelivr.

```powershell
python -m http.server 8000
```

## Controls

- Left / Right arrows or A / D: change lanes
- Space or Up: jump
- Down: slide
- P: pause

The supplied forest reference and Blender render are in `assets/`. The runner loads the Cheeko FOX FBX and its texture maps from `assets/cheeko-fox/`, plus the forest-prop FBX and texture atlas from `assets/forest-props/`.

Enter a runner name on the start screen. Arrow keys or A/D change lanes, Up or Space jumps, Down slides, and P/Escape pauses. On touch screens, swipe to move and use the on-screen buttons. Best distance and coin bank are saved locally.
