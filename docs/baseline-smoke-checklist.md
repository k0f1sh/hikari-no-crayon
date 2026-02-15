# Baseline Smoke Checklist

This checklist defines current expected behavior before modernization.

## Test Environment
- Browser: latest Chrome on desktop
- Canvas fills the viewport with right-side menu visible by default

## Core Draw Behavior
1. Open app.
2. Drag on canvas with default settings.
3. Confirm additive glow drawing appears over black background.

## Pen Tools
1. Open the pen list.
2. Select each tool once:
   - normal_pen
   - blood_pen
   - fur_pen
   - snow_pen
   - collatz_pen
   - hoshi_pen
   - life_pen
   - hane_pen
   - nami_pen
   - spray_pen
   - bubble_pen
   - orbit_pen
   - degi_pen
   - yami_pen
3. Draw a stroke for each and confirm visually distinct output.

## Size / Color
1. Change pen size to small and large values and draw.
2. Change color and draw.
3. Confirm preview circle updates with current size/color.

## Modes
1. Enable rainbow mode and draw: color cycles over time.
2. Enable fade mode and wait: drawings gradually fade.
3. Enable auto mode: random points are drawn automatically.

## Utility Buttons
1. Draw then click clear: canvas resets to black.
2. Draw then click reverse: colors invert.
3. Draw then click blur: image is blurred.
4. Draw then click save: image opens in a new tab as data URL.

## Menu Interactions
1. Click hide/show toggle and confirm menu visibility toggles.
2. Click section headers and confirm each section expands/collapses.
