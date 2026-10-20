declare module '*.svg' {
  const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
  export default content;
}

// Side-effect stylesheet imports, e.g. `import './globals.css'`.
declare module '*.css';

// CSS Modules, e.g. `import styles from './Button.module.css'`.
declare module '*.module.css' {
  const classes: { readonly [className: string]: string };
  export default classes;
}
