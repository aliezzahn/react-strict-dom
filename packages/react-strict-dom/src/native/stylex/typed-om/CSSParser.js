/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type { CSSToken } from './CSSToken';

import { stringifyCSSToken } from './CSSToken';
import { CSSTokenizer } from './CSSTokenizer';

// https://drafts.csswg.org/css-syntax-3/#component-value
export type CSSComponentValue =
  | CSSPreservedToken
  | CSSFunction
  | CSSSimpleBlock;

type CSSParserInput = CSSTokenStream | CSSToken[] | string;

function getMirroredToken(token: CSSToken): CSSToken {
  switch (token.type) {
    case 'left-parenthesis':
      return { type: 'right-parenthesis' };
    default:
      throw new Error('Invalid token type for mirroring');
  }
}

export function splitComponentValueListByComma(
  input: CSSComponentValue[]
): CSSComponentValue[][] {
  const output = [];

  let current = [];
  for (const value of input) {
    if (value instanceof CSSPreservedToken && value.token.type === 'comma') {
      output.push(current);
      current = [];
    } else {
      current.push(value);
    }
  }

  if (current.length > 0) {
    output.push(current);
  }

  return output;
}

// https://drafts.csswg.org/css-syntax-3/#preserved-tokens
export class CSSPreservedToken {
  #token: CSSToken;

  constructor(token: CSSToken) {
    // TODO: handle [ and { tokens
    if (token.type === 'function' || token.type === 'left-parenthesis') {
      throw new Error('Invalid token type for preserved token');
    }
    this.#token = token;
  }

  get token(): CSSToken {
    return this.#token;
  }

  toString(): string {
    return stringifyCSSToken(this.#token);
  }
}

// https://drafts.csswg.org/css-syntax-3/#simple-block
export class CSSSimpleBlock {
  #associatedToken: CSSToken;
  #values: CSSComponentValue[];

  constructor(associatedToken: CSSToken, values: CSSComponentValue[]) {
    this.#associatedToken = associatedToken;
    this.#values = values;
  }

  get associatedToken(): CSSToken {
    return this.#associatedToken;
  }

  get values(): CSSComponentValue[] {
    return this.#values;
  }

  toString(): string {
    const startingToken = this.#associatedToken;
    const endingToken = getMirroredToken(startingToken);
    const contentStrings = this.#values.map((value) => value.toString());
    return [
      stringifyCSSToken(startingToken),
      ...contentStrings,
      stringifyCSSToken(endingToken)
    ].join('');
  }
}

// https://drafts.csswg.org/css-syntax-3/#simple-block
export class CSSFunction {
  #name: string;
  #value: CSSComponentValue[];

  constructor(name: string, value: CSSComponentValue[]) {
    this.#name = name;
    this.#value = value;
  }

  get name(): string {
    return this.#name;
  }

  get value(): CSSComponentValue[] {
    return this.#value;
  }

  toString(): string {
    const argsString = this.#value.map((value) => value.toString()).join('');
    return `${this.#name}(${argsString})`;
  }
}

// https://drafts.csswg.org/css-syntax-3/#parser-definitions
class CSSTokenStream {
  #tokens: CSSToken[];
  #index: number = 0;
  #markedIndexes: number[] = [];

  constructor(tokens: CSSToken[]) {
    this.#tokens = tokens;
  }

  nextToken(): CSSToken {
    return this.#tokens[this.#index];
  }

  empty(): boolean {
    return this.nextToken().type === 'eof';
  }

  consumeToken(): CSSToken {
    const token = this.nextToken();
    this.#index += 1;
    return token;
  }

  discardToken(): void {
    if (!this.empty()) {
      this.#index += 1;
    }
  }

  mark(): void {
    this.#markedIndexes.push(this.#index);
  }

  restoreMark(): void {
    const markedIndex = this.#markedIndexes.pop();
    if (markedIndex !== undefined) {
      this.#index = markedIndex;
    }
  }

  discardMark(): void {
    this.#markedIndexes.pop();
  }

  discardWhitespace(): void {
    while (this.nextToken().type === 'whitespace') {
      this.discardToken();
    }
  }
}

export class CSSParser {
  static areTokensEqual(a: CSSToken, b: CSSToken): boolean {
    if (a.type === b.type) {
      switch (a.type) {
        case 'ident':
        case 'function':
          return a.name === b.name;
        case 'hash':
        case 'string':
        case 'number':
        case 'percentage':
        case 'delim':
          return a.value === b.value;
        case 'dimension':
          return a.value === b.value && a.unit === b.unit;
        default:
          return true;
      }
    }
    return false;
  }

  // https://drafts.csswg.org/css-syntax-3/#consume-function
  static consumeFunction(tokenStream: CSSTokenStream): CSSFunction {
    const functionToken = tokenStream.nextToken();
    if (functionToken.type !== 'function') {
      throw new Error('Invalid token type for function');
    }
    tokenStream.discardToken();

    const values = CSSParser.consumeListofComponentValues(tokenStream, {
      stopToken: { type: 'right-parenthesis' }
    });

    return new CSSFunction(functionToken.name, values);
  }

  // https://drafts.csswg.org/css-syntax-3/#consume-a-simple-block
  static consumeSimpleBlock(tokenStream: CSSTokenStream): CSSSimpleBlock {
    const startToken = tokenStream.nextToken();
    // TODO: Handle { and [ tokens
    if (startToken.type !== 'left-parenthesis') {
      throw new Error('Invalid start token for simple block');
    }
    tokenStream.discardToken();

    // We can make this assumption since we currently onlly support parenthesis so
    // this will have to be modified once we add support for [ and { tokens
    const stopToken = { type: 'right-parenthesis' };

    const blockValue = CSSParser.consumeListofComponentValues(tokenStream, {
      stopToken
    });

    return new CSSSimpleBlock(startToken, blockValue);
  }

  // https://drafts.csswg.org/css-syntax-3/#consume-component-value
  static consumeComponentValue(tokenStream: CSSTokenStream): CSSComponentValue {
    const token = tokenStream.nextToken();
    switch (token.type) {
      // TODO: 'left-bracket'
      // TODO: 'left-brace'
      case 'left-parenthesis':
        return CSSParser.consumeSimpleBlock(tokenStream);
      case 'function':
        return CSSParser.consumeFunction(tokenStream);
      default:
        tokenStream.discardToken();
        return new CSSPreservedToken(token);
    }
  }

  // https://drafts.csswg.org/css-syntax-3/#consume-a-list-of-component-values
  static consumeListofComponentValues(
    tokenStream: CSSTokenStream,
    options?: { stopToken?: CSSToken }
  ): CSSComponentValue[] {
    const { stopToken } = options ?? {};

    const values = [];
    while (!tokenStream.empty()) {
      const token = tokenStream.nextToken();
      if (
        stopToken !== undefined &&
        CSSParser.areTokensEqual(token, stopToken)
      ) {
        tokenStream.discardToken();
        return values;
      }
      values.push(CSSParser.consumeComponentValue(tokenStream));
    }
    return values;
  }

  static flushTokenizer(tokenizer: CSSTokenizer): CSSTokenStream {
    const tokens: CSSToken[] = [];
    let token = tokenizer.next();
    while (token.type !== 'eof') {
      tokens.push(token);
      token = tokenizer.next();
    }
    tokens.push(token);
    return new CSSTokenStream(tokens);
  }

  // https://drafts.csswg.org/css-syntax-3/#normalize-into-a-token-stream
  static normalizeToTokenStream(input: CSSParserInput): CSSTokenStream {
    if (input instanceof CSSTokenStream) {
      return input;
    }
    if (Array.isArray(input)) {
      return new CSSTokenStream(input);
    }
    if (typeof input === 'string') {
      return CSSParser.flushTokenizer(new CSSTokenizer(input));
    }
    throw new Error('Invalid input type for token stream normalization');
  }

  // https://drafts.csswg.org/css-syntax-3/#parse-list-of-component-values
  static parseList(input: CSSParserInput): CSSComponentValue[] {
    const tokenStream = CSSParser.normalizeToTokenStream(input);
    return CSSParser.consumeListofComponentValues(tokenStream);
  }
}
