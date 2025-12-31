# Testing the Example App

This guide helps you test the Authorizer React components in the example app.

## Prerequisites

1. Build the library first:
   ```bash
   npm run build
   ```

2. Make sure the CSS file exists:
   ```bash
   ls dist/styles.css
   ```

## Running the Example App

1. Navigate to the example directory:
   ```bash
   cd example
   ```

2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```

3. Start the dev server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:5173` (or the port shown in terminal)

## What to Test

### 1. Visual Styling
- ✅ Check that all components render with proper styling
- ✅ Verify buttons have correct colors and hover states
- ✅ Check form inputs have proper borders and focus states
- ✅ Verify error messages display correctly
- ✅ Check that CSS variables are applied

### 2. Component Functionality
- ✅ Test login flow
- ✅ Test signup flow
- ✅ Test forgot password flow
- ✅ Test OTP verification
- ✅ Test social login buttons (if enabled)

### 3. CSS Customization
You can test CSS variable customization by adding this to `example/src/index.css`:

```css
:root {
  --authorizer-primary-color: #your-custom-color;
  --authorizer-text-color: #your-custom-text-color;
}
```

### 4. Responsive Design
- ✅ Test on different screen sizes
- ✅ Verify mobile responsiveness

## Troubleshooting

### Styles not loading?
- Make sure `dist/styles.css` exists after building
- Check browser console for CSS import errors
- Verify the import path in `example/src/index.tsx`

### Components not rendering?
- Check that the build completed successfully
- Verify `dist/index.mjs` exists
- Check browser console for JavaScript errors

### Hot reload not working?
- Make sure the library is built in watch mode: `npm start` (in root)
- Then run the example app: `cd example && npm start`

