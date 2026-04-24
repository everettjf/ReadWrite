/// <reference types="vite/client" />

declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module '*?worker&inline' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}
