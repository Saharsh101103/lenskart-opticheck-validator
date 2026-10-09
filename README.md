# OptiCheck — Prescription Input Validator

A runnable Next.js 14 + TypeScript app for validating right/left eye SPH, CYL, and Axis values. Includes configurable limits and increments, field-specific errors, and a server-side API.

## Requirements

- Node.js 18.17+ (Node.js 20 LTS recommended)
- npm

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

## What it validates

- SPH and CYL are required numeric values.
- SPH/CYL must fall within the configured minimum and maximum.
- SPH/CYL must follow the configured step increment, measured from the configured minimum.
- Axis must be a whole number within the configured axis range if provided.
- Axis is required when CYL is non-zero; it can be blank when CYL is zero.
- The same rules run in the server-side API, not just in the browser.

## Default demo settings

- SPH: -20.00 D to +20.00 D, 0.25 D steps
- CYL: -10.00 D to +10.00 D, 0.25 D steps
- Axis: 1° to 180°, whole degrees

These broad values are illustrative defaults, not a universal prescription standard. Use the settings panel to configure the range and increment for your actual lab, product, or workflow.

## API

`POST /api/validate-prescription`

Example request:

```json
{
  "prescription": {
    "rightEye": { "sph": -2.5, "cyl": -0.75, "axis": 90 },
    "leftEye": { "sph": -1.25, "cyl": 0, "axis": "" }
  },
  "settings": {
    "sph": { "min": -20, "max": 20, "step": 0.25 },
    "cyl": { "min": -10, "max": 10, "step": 0.25 },
    "axis": { "min": 1, "max": 180 }
  }
}
```

Valid responses return HTTP `200`; invalid inputs return HTTP `400`. Both return JSON with `valid`, `errors`, and `values`. Error items include `field`, `code`, and a human-readable `message`.

## Notes

- The API is stateless and does not store prescription data.
- This is input validation only; it does not assess clinical suitability or replace professional review.
- For production use, consider fixing configuration server-side or requiring an authorized administrator to manage validation settings.
