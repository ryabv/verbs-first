declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
declare module '*.css';

/** Подставляется rspack (DefinePlugin): префикс адреса сайта, всегда со слешем в конце. */
declare const process: { env: { BASE_URL: string; NODE_ENV: string } };
