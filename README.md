# Moonlit Mess

A quiet emotional space between sky and sea.
Write what you carry. Release it into the water.
Find a light someone left for you.

## Deploy to GitHub Pages

1. Create a repo named `moonlit-mess`
2. Push all files to `main` branch
3. Settings → Pages → Source: main / root
4. Live at `https://yourusername.github.io/moonlit-mess`

## Files

```
moonlit-mess/
├── index.html   — structure and all screens
├── style.css    — layout, CSS-only animations
├── scene.js     — static star field + rare CSS shooting stars (no rAF)
├── sound.js     — ambient ocean soundscape
├── app.js       — flow logic, API calls, message pool
└── bg.jpg       — moonlit sea background image
```

## Performance

No canvas. No physics. No continuous animation loops.
Stars: 55 static DOM elements with CSS twinkle.
Waves: CSS keyframe breathing overlay.
Shooting stars: rare DOM elements created and removed via setTimeout.
One requestAnimationFrame call only during the message release animation.
