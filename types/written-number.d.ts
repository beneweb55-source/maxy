declare module 'written-number' {
  interface WrittenNumberOptions {
    noAnd?: boolean;
    lang?: string;
  }

  interface WrittenNumber {
    (n: number, options?: WrittenNumberOptions): string;
    defaults: {
      lang: string;
    };
  }

  const writtenNumber: WrittenNumber;
  export default writtenNumber;
}
