# Example App - Testing Guide

This example app demonstrates how to use `@authorizerdev/authorizer-react` and test the styling changes.

## Quick Start

### 1. Build the Library

First, build the library from the root directory:

```bash
# From project root
npm run build
```

This will:
- Build the library to `dist/`
- Copy `styles.css` to `dist/styles.css`
- Generate TypeScript definitions

### 2. Start the Example App

```bash
# From example directory
cd example
npm install  # Only needed first time
npm start
```

The app will start at `http://localhost:5173` (or another port if 5173 is busy).

## Testing the Styling

### Visual Checks

1. **Open the app** in your browser
2. **Verify components render correctly:**
   - Buttons should have proper styling
   - Form inputs should have borders and focus states
   - Error messages should display in red
   - Links should be blue/primary color

### Test CSS Variables

You can test CSS variable customization by adding this to `example/src/index.css`:

```css
:root {
  --authorizer-primary-color: #8b5cf6; /* Purple */
  --authorizer-text-color: #1f2937;   /* Dark gray */
  --authorizer-danger-color: #ef4444;  /* Red */
}
```

Refresh the page and verify the colors change.

### Test Static HTML

For a quick visual test without React, open `test-styles.html` in your browser:

```bash
# From example directory
open test-styles.html
# or
python3 -m http.server 8000
# Then visit http://localhost:8000/test-styles.html
```

## What to Verify

✅ **Styles Load Correctly**
- No console errors about missing CSS
- Components have proper styling
- CSS variables are applied

✅ **Component Functionality**
- Login form works
- Signup form works
- Error states display correctly
- Buttons are clickable and styled

✅ **Customization Works**
- CSS variables can be overridden
- Styles are scoped correctly
- No style conflicts

## Troubleshooting

### Styles not loading?

1. Check that `dist/styles.css` exists:
   ```bash
   ls ../dist/styles.css
   ```

2. Verify the import in `src/index.tsx`:
   ```tsx
   import '../../dist/styles.css';
   ```

3. Check browser console for import errors

### Components not styled?

1. Make sure the CSS import is before component imports
2. Check browser DevTools to see if CSS is loaded
3. Verify CSS variables are defined in the stylesheet

### Hot reload not working?

1. Make sure library is built: `npm run build` (from root)
2. For watch mode, run `npm start` in root directory
3. Then run `npm start` in example directory

## Development Workflow

For active development with hot reload:

**Terminal 1** (Library watch mode):
```bash
npm start  # From project root
```

**Terminal 2** (Example app):
```bash
cd example
npm start
```

Changes to library source will rebuild, and the example app will hot reload.

