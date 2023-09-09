import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { createClient } from "@supabase/supabase-js";
import { endOfDay, startOfDay } from "date-fns";
import Filter from "bad-words";
import { pl } from "date-fns/locale";

// Supabase config
const supabaseUrl = import.meta.env.VITE_SUPERBASE_URL;
const superbaseKey = import.meta.env.VITE_SUPERBASE_KEY;
const supabase = createClient(supabaseUrl, superbaseKey);

// Variables
let score = 0;
let scoreMultiplier = 1;
let jumps = 0;

// Timer
const timer = setInterval(() => {
  // Check we have focus
  if (document.hasFocus()) {
    score = score + scoreMultiplier;
    document.querySelectorAll(".score").forEach((el) => (el.innerHTML = score));
  }
}, 1000);

// Scene setup
let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// Camera setup
camera.position.set(3, 6, 12);

// Lighting
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.y = 3;
light.position.z = 1;
light.castShadow = true;
scene.add(light);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// WebGL renderer
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
});

renderer.shadowMap.enabled = true;
renderer.setSize(window.innerWidth, window.innerHeight);
new OrbitControls(camera, renderer.domElement);
document.body.appendChild(renderer.domElement);

// Setup  textures
const textureLoader = new THREE.TextureLoader();
const modifierTexture = textureLoader.load("../textures/modifier.png");

// Reusable Box class
class Cube extends THREE.Mesh {
  constructor({
    width,
    height,
    depth,
    color = "#050439",
    velocity = { x: 0, y: 0, z: 0 },
    position = { x: 0, y: 0, z: 0 },
    zAcceleration = false,
    jumping = false,
    modifier = false,
  }) {
    super(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({
        color,
        map: modifier ? modifierTexture : false,
      })
    );

    this.width = width;
    this.height = height;
    this.depth = depth;

    this.position.set(position.x, position.y, position.z);
    this.top = this.position.y + this.height / 2;
    this.bottom = this.position.y - this.height / 2;
    this.right = this.position.x + this.width / 2;
    this.left = this.position.x - this.width / 2;
    this.front = this.position.z + this.depth / 2;
    this.back = this.position.z - this.depth / 2;

    this.velocity = velocity;
    this.gravity = -0.004;

    this.zAcceleration = zAcceleration;
    this.jumping = jumping;
  }

  updateSides() {
    this.top = this.position.y + this.height / 2;
    this.bottom = this.position.y - this.height / 2;
    this.right = this.position.x + this.width / 2;
    this.left = this.position.x - this.width / 2;
    this.front = this.position.z + this.depth / 2;
    this.back = this.position.z - this.depth / 2;
  }

  update(platform) {
    this.updateSides();

    if (this.zAcceleration) this.velocity.z += 0.0003;

    this.position.x += this.velocity.x;
    this.position.z += this.velocity.z;

    this.applyGravity(platform);
  }

  applyGravity(platform) {
    this.velocity.y += this.gravity;

    // This is where we hit the platform
    if (collision({ cube1: this, cube2: platform })) {
      this.jumping = false;
      const friction = 0.5;
      this.velocity.y *= friction;
      this.velocity.y = -this.velocity.y;
    } else this.position.y += this.velocity.y;
  }
}

// Detect collisions
function collision({ cube1, cube2 }) {
  const xCollision = cube1.right >= cube2.left && cube1.left <= cube2.right;
  const yCollision =
    cube1.bottom + cube1.velocity.y <= cube2.top && cube1.top >= cube2.bottom;
  const zCollision = cube1.front >= cube2.back && cube1.back <= cube2.front;
  return xCollision && yCollision && zCollision;
}

// Cubey Head
scene.add(
  new Cube({
    width: 5,
    height: 5,
    depth: 5,
    position: {
      x: 0,
      y: 7,
      z: -60,
    },
  })
);

// Cubey Body
scene.add(
  new Cube({
    width: 10,
    height: 10,
    depth: 10,
    position: {
      x: 0,
      y: 0,
      z: -60,
    },
  })
);

// Player
const player = new Cube({
  width: 1,
  height: 1,
  depth: 1,
  position: {
    x: 0,
    y: 2,
    z: 9,
  },
  velocity: {
    x: 0,
    y: -0.01,
    z: 0,
  },
});
player.castShadow = true;
scene.add(player);

// Platform
const platform = new Cube({
  width: 10,
  height: 0.01,
  depth: 50,
  color: "#CCC",
  position: {
    x: 0,
    y: 0,
    z: -15,
  },
});
platform.receiveShadow = true;
scene.add(platform);

// Player controls
const keys = {
  a: { pressed: false },
  d: { pressed: false },
  s: { pressed: false },
  w: { pressed: false },
};

// Key pressed
window.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "ArrowLeft":
      keys.a.pressed = true;
      break;
    case "ArrowRight":
      keys.d.pressed = true;
      break;
    case "ArrowDown":
      keys.s.pressed = true;
      break;
    case "ArrowUp":
      keys.w.pressed = true;
      break;
    case "Space":
      if (!player.jumping) {
        player.jumping = true;
        player.velocity.y = 0.15;
        // score = score - 10;
        jumps++;
      }
      break;
  }
});

// Key released
window.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "ArrowLeft":
      keys.a.pressed = false;
      player.velocity.x = -0.01;
      break;
    case "ArrowRight":
      keys.d.pressed = false;
      player.velocity.x = 0.01;
      break;
    case "ArrowDown":
      keys.s.pressed = false;
      break;
    case "ArrowUp":
      keys.w.pressed = false;
      break;
  }
});

// Game elements
const enemies = [];
const modifiers = [];

// Consistent Frames Per Second (FPS)
let frames = 0;
const canvas = document.querySelector("canvas");
canvas.getContext("2d");
let msPrev = window.performance.now();
const fps = 60;
const msPerFrame = 1000 / fps;

// Submit a new score
const submitScore = async (name, score) => {
  // Post new score
  const { data: newScore } = await supabase
    .from("scores")
    .insert([{ name, score }])
    .select();

  // Fetch top five scores today
  const { data: todayScores } = await supabase
    .from("scores")
    .select("*")
    .gte("created_at", startOfDay(new Date()).toISOString())
    .lte("created_at", endOfDay(new Date()).toISOString())
    .order("score", { ascending: false })
    .limit(5);

  // Fetch top five scores of all time
  const { data: allTimeScores } = await supabase
    .from("scores")
    .select("*")
    .order("score", { ascending: false })
    .limit(5);

  return {
    newScore,
    todayScores,
    allTimeScores,
  };
};

// Return a random number
function getRandomNumber(min = 1, max = 5) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Return a random colour from an array
function getRandomColour() {
  const colours = ["#ff5b00", "#05c6c2", "#4b31a0"];
  const colour = colours[Math.floor(Math.random() * colours.length)];
  return colour;
}

// Display game over UI
function gameOver() {
  const gameOverContainer = document.querySelector("#gameOver.container");

  gameOverContainer.style.display = "flex";
  setTimeout(() => {
    gameOverContainer.style.opacity = "1";
  }, "250");

  const nameInput = document.querySelector("input[id='name']");
  const name = document.querySelector("input[id='name']").value;
  const submitButton = document.querySelector("button#submit");

  // Use a previously given name, if available
  if (localStorage.getItem("cubey-name"))
    nameInput.value = localStorage.getItem("cubey-name");

  // Fire when the user submits their score
  submitButton.addEventListener("click", async () => endGame());
  nameInput.addEventListener("keyup", async () => {
    if (event.key === "Enter") {
      endGame();
    }
  });
}

// Post new score and display high score tables
async function endGame() {
  const form = document.querySelector("#form");
  const scores = document.querySelector("#scores");
  const nameInput = document.querySelector("input[id='name']");
  const submitButton = document.querySelector("button#submit");

  // Check the name is valid
  if (nameInput.value === "") {
    nameInput.style.borderColor = "red";
    return;
  }

  // Filter name for profanity
  let filter = new Filter();
  let nameFiltered = filter.clean(nameInput.value);

  localStorage.setItem("cubey-name", nameFiltered);
  nameInput.disabled = true;
  submitButton.disabled = true;
  const highScores = await submitScore(nameFiltered, score);

  form.style.opacity = "0";
  setTimeout(() => {
    form.style.display = "none";
    scores.style.display = "flex";
    setTimeout(() => {
      scores.style.opacity = "1";
    }, "250");
  }, "500");

  const latestScore = highScores.newScore[0].id;

  // Build high scores for today
  let table = "<thead><tr><th>Rank</th><th>Score</th><th>Name</th></thead>";
  table += "<tbody>";
  highScores.todayScores.forEach((score, index) => {
    table += latestScore === score.id ? `<tr class="highlight">` : `<tr>`;
    table += `<td>${index + 1}</td>`;
    table += `<td>${score.score}</td>`;
    table += `<td>${score.name}</td>`;
    table += `</tr>`;
  });
  table += `</tbody>`;
  document.querySelector("#scores table#today").innerHTML = table;

  // Build high scores for all time
  table = "<thead><tr><th>Rank</th><th>Score</th><th>Name</th></thead>";
  table += "<tbody>";
  highScores.allTimeScores.forEach((score, index) => {
    table += latestScore === score.id ? `<tr class="highlight">` : `<tr>`;
    table += `<td>${index + 1}</td>`;
    table += `<td>${score.score}</td>`;
    table += `<td>${score.name}</td>`;
    table += `</tr>`;
  });
  table += `</tbody>`;
  document.querySelector("#scores table#allTime").innerHTML = table;
}

// Animation loop
let enemySpawnRate = 200;
let modifierSpawnRate = 500;

// Show/Hide the pause screen
function togglePause(display = false) {
  const pauseContainer = document.querySelector("#paused.container");
  pauseContainer.style.display = display ? "flex" : "none";
  setTimeout(() => {
    pauseContainer.style.opacity = display ? "1" : "0";
  }, "250");
}
function animate() {
  const animationId = requestAnimationFrame(animate);
  renderer.render(scene, camera);

  // Check we have focus {
  if (!document.hasFocus()) {
    // Pause the game
    togglePause(true);

    // Freeze on screen elements
    enemies.forEach((enemy) => (enemy.velocity.z = 0));
    modifiers.forEach((modifier) => (modifier.velocity.z = 0));
  } else {
    // Resume the game
    togglePause();
  }

  // Player movement
  player.velocity.x = 0;
  player.velocity.z = 0;

  if (player.bottom > platform.top) {
    if (keys.a.pressed) player.velocity.x = -0.08;
    else if (keys.d.pressed) player.velocity.x = 0.08;
    if (keys.s.pressed) player.velocity.z = 0.08;
    else if (keys.w.pressed) player.velocity.z = -0.08;
  }

  // Update the player every frame
  player.update(platform);

  // Enemies
  enemies.forEach((enemy, index) => {
    // Update the enemy every frame
    enemy.update(platform);

    // Game over when there's a collision of the player leaves the platform
    if (player.position.y < -50 || collision({ cube1: player, cube2: enemy })) {
      // Freeze the animation loop
      cancelAnimationFrame(animationId);

      // Stop the timer
      clearInterval(timer);

      gameOver();

      // renderer.clear();
    }

    if (enemy.front > platform.front && enemy.position.y < -50) {
      scene.remove(enemy);
    }
  });

  // Spawn enemies
  if (document.hasFocus() && frames % enemySpawnRate === 0) {
    if (enemySpawnRate > 20) enemySpawnRate -= 1;
    const enemy = new Cube({
      width: 1,
      height: 1,
      depth: 1,
      position: {
        x: (Math.random() - 0.5) * 10,
        y: 5,
        z: -42,
      },
      velocity: {
        x: 0,
        y: 0,
        z: 0.05,
      },
      color: getRandomColour(),
      zAcceleration: true,
    });
    enemy.castShadow = true;
    scene.add(enemy);
    enemies.push(enemy);
  }

  // Modifiers
  modifiers.forEach((modifier, index) => {
    // Update the enemy every frame
    modifier.update(platform);

    // Modify the game when the player colliers with a modifier cube
    if (collision({ cube1: player, cube2: modifier })) {
      scene.remove(modifier);

      setTimeout(() => {
        // Show modifier in the UI
        const modifierText = document.querySelector("#ui span.modifier");

        // Select a random modifier
        const modifierType = getRandomNumber(1, score > 200 ? 8 : 7);
        switch (modifierType) {
          case 1:
            // 2x width
            modifierText.innerHTML = "2x width";
            enemies.forEach((enemy) => {
              enemy.width = 2;
              enemy.scale.x = 2;
            });
            break;
          case 2:
            // 4x height
            modifierText.innerHTML = "4x height";
            enemies.forEach((enemy) => {
              enemy.height = 4;
              enemy.position.y = 2;
              enemy.scale.y = 4;
            });
            break;
          case 3:
            // -0.5x scale
            modifierText.innerHTML = "-0.5x scale";
            enemies.forEach((enemy) => {
              enemy.width = 0.5;
              enemy.height = 0.5;
              enemy.depth = 0.5;
              enemy.position.y = 0.25;
              enemy.scale.x = 0.5;
              enemy.scale.y = 0.5;
              enemy.scale.z = 0.5;
            });
            break;
          case 4:
            // 5x width
            modifierText.innerHTML = "5x width";
            enemies.forEach((enemy) => {
              enemy.width = 5;
              enemy.scale.x = 5;
            });
            break;
          case 5:
            // 5x width & height
            modifierText.innerHTML = "5x width & height";
            enemies.forEach((enemy) => {
              enemy.width = 5;
              enemy.height = 5;
              enemy.position.y = 2.5;
              enemy.scale.x = 5;
              enemy.scale.y = 5;
            });
            break;
          case 6:
            // Earthquake
            modifierText.innerHTML = "Earthquake";
            enemies.forEach((enemy) => {
              enemy.velocity.y = -0.5;
              enemy.velocity.x = Math.random() - 0.5;
            });
            break;
          case 7:
            // Score multiplier
            modifierText.innerHTML = "Score multiplier";
            scoreMultiplier++;
            break;
          case 8:
            // Lights out
            modifierText.innerHTML = "Lights out";
            light.position.y = -10;
            light.position.z = -10;
            scene.remove(ambientLight);
            // Reset the lighting
            setTimeout(() => {
              light.position.y = 3;
              light.position.z = 1;
              scene.add(ambientLight);
            }, "3000");
            break;
        }

        setTimeout(() => {
          modifierText.innerHTML = "None";
        }, "3000");
      }, "500");
    }

    if (modifier.front > platform.front && modifier.position.y < -50) {
      scene.remove(modifier);
    }
  });

  // Spawn modifiers
  if (document.hasFocus() && score > 5 && frames % modifierSpawnRate === 0) {
    const modifier = new Cube({
      width: 1,
      height: 1,
      depth: 1,
      position: {
        x: (Math.random() - 0.5) * 10,
        y: 5,
        z: -42,
      },
      velocity: {
        x: 0,
        y: 0,
        z: 0.05,
      },
      color: "gold",
      zAcceleration: true,
      modifier: true,
    });
    modifier.castShadow = true;
    scene.add(modifier);
    modifiers.push(modifier);
  }

  // FPS
  const msNow = window.performance.now();
  const msPassed = msNow - msPrev;
  if (msPassed < msPerFrame) return;
  const excessTime = msPassed % msPerFrame;
  msPrev = msNow - excessTime;

  frames++;
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Game
