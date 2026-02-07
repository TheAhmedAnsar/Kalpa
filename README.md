# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Using Redux

The application now includes a Redux store built with **Redux Toolkit**. The main store is defined in `src/store/index.js` and the theme slice lives in `src/store/theme`.

Wrap your components with `useSelector` to read from the store and `useDispatch` to dispatch actions. For example, to toggle the theme:

```jsx
import { useDispatch } from 'react-redux';
import { toggleTheme } from './store';

const ThemeButton = () => {
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(toggleTheme())}>Toggle Theme</button>;
};
```

Add new slices by creating files similar to `src/store/theme` and adding their reducers to `configureStore` inside `src/store/index.js`.
