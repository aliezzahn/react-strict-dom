/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  CSSToken,
  DimensionToken,
  FunctionToken,
  IdentToken,
  NumberToken,
  PercentageToken,
  StringToken,
  WhitespaceToken
} from './CSSToken';

export class CSSTokenizer {
  #remainingCharacters: string;
  #position: number = 0;

  constructor(characters: string) {
    this.#remainingCharacters = characters;
  }

  // https://www.w3.org/TR/css-syntax-3/#consume-token
  next(): CSSToken {
    const nextChar: number = this.#peek();

    // Whitespace
    if (CSSTokenizer.#isWhitespace(nextChar)) {
      return this.#consumeWhitespace();
    }

    // Quotation Mark (")
    if (nextChar === 0x0022) {
      this.#consumeCurrentCodePoint();
      return this.#consumeString(0x0022);
    }

    // Apostrophe (')
    if (nextChar === 0x0027) {
      this.#consumeCurrentCodePoint();
      return this.#consumeString(0x0027);
    }

    // Left Parenthesis (()
    if (nextChar === 0x0028) {
      this.#consumeCurrentCodePoint();
      return { type: 'left-parenthesis' };
    }

    // Right Parenthesis ())
    if (nextChar === 0x0029) {
      this.#consumeCurrentCodePoint();
      return { type: 'right-parenthesis' };
    }

    // Plus Sign (+)
    if (nextChar === 0x002b) {
      if (CSSTokenizer.#isDigit(this.#peek(1))) {
        return this.#consumeNumeric();
      }
      return { type: 'delim', value: this.#consumeCurrentCodePoint() };
    }

    // Comma (,)
    if (nextChar === 0x002c) {
      this.#consumeCurrentCodePoint();
      return { type: 'comma' };
    }

    // Hyphen-Minus (-)
    if (nextChar === 0x002d) {
      if (this.#next3CodePointsStartNumber()) {
        return this.#consumeNumeric();
      }
      if (this.#next3CodePointsStartIdentSeq()) {
        return this.#consumeIdentLike();
      }
      return { type: 'delim', value: this.#consumeCurrentCodePoint() };
    }

    // Full Stop (.)
    if (nextChar === 0x002e) {
      if (this.#next3CodePointsStartNumber()) {
        return this.#consumeNumeric();
      }
      return { type: 'delim', value: this.#consumeCurrentCodePoint() };
    }

    // digit
    if (CSSTokenizer.#isDigit(nextChar)) {
      return this.#consumeNumeric();
    }

    // ident-start code point
    if (CSSTokenizer.#isIdentStart(nextChar)) {
      return this.#consumeIdentLike();
    }

    // EOF
    if (nextChar === 0x0000) {
      return { type: 'eof' };
    }

    // Anything else
    return { type: 'delim', value: this.#consumeCurrentCodePoint() };
  }

  #peek(forward: number = 0): number {
    const index = this.#position + forward;
    return index >= this.#remainingCharacters.length
      ? 0x0000
      : this.#remainingCharacters.codePointAt(index);
  }

  #peekString(forward: number = 0): string {
    return String.fromCodePoint(this.#peek(forward));
  }

  #advance(amount: number = 1): void {
    if (this.#position >= this.#remainingCharacters.length) {
      throw new Error('[CSSTokenizer] Attempted to advance out of bounds');
    }
    this.#position += amount;
  }

  // https://www.w3.org/TR/css-syntax-3/#consume-numeric-token
  #consumeNumeric(): DimensionToken | PercentageToken | NumberToken {
    const { value } = this.#consumeNumber();
    if (this.#next3CodePointsStartIdentSeq()) {
      const unit = this.#consumeIdentSeq();
      return { type: 'dimension', value, unit };
    }

    if (this.#peek() === 0x0025) {
      this.#advance();
      return { type: 'percentage', value };
    }

    return { type: 'number', value };
  }

  // https://www.w3.org/TR/css-syntax-3/#consume-ident-like-token
  #consumeIdentLike(): FunctionToken | IdentToken {
    const value = this.#consumeIdentSeq();
    if (this.#peek() === 0x0028) {
      this.#consumeCurrentCodePoint();
      return { type: 'function', name: value };
    }
    return { type: 'ident', name: value };
  }

  // https://www.w3.org/TR/css-syntax-3/#consume-name
  #consumeIdentSeq(): string {
    while (CSSTokenizer.#isIdent(this.#peek())) {
      this.#advance();
    }
    return this.#consumeRunningValue();
  }

  // https://www.w3.org/TR/css-syntax-3/#consume-number
  #consumeNumber(): { type: 'integer' | 'number', value: number } {
    let type: 'integer' | 'number' = 'integer';

    if (this.#peek() === 0x002b || this.#peek() === 0x002d) {
      this.#advance();
    }

    while (CSSTokenizer.#isDigit(this.#peek())) {
      this.#advance();
    }

    if (this.#peek() === 0x002e && CSSTokenizer.#isDigit(this.#peek(1))) {
      type = 'number';
      this.#advance(2);
      while (CSSTokenizer.#isDigit(this.#peek())) {
        this.#advance();
      }
    }

    const restorePosition = this.#position;
    if (this.#peek() === 0x0045 || this.#peek() === 0x0065) {
      this.#advance();
      if (this.#peek() === 0x002b || this.#peek() === 0x002d) {
        this.#advance();
      }
      if (!CSSTokenizer.#isDigit(this.#peek())) {
        this.#position = restorePosition;
      } else {
        while (CSSTokenizer.#isDigit(this.#peek())) {
          this.#advance();
        }
        type = 'number';
      }
    }

    return { type, value: Number(this.#consumeRunningValue()) };
  }

  // https://www.w3.org/TR/css-syntax-3/#ref-for-whitespace①
  #consumeWhitespace(): WhitespaceToken {
    while (CSSTokenizer.#isWhitespace(this.#peek())) {
      this.#advance();
    }
    this.#consumeRunningValue();
    return { type: 'whitespace' };
  }

  // https://www.w3.org/TR/css-syntax-3/#consume-string-token
  #consumeString(
    startingCodePoint: number,
    endingCodePoint?: number
  ): StringToken {
    const endPoint = endingCodePoint ?? startingCodePoint;

    let currentCodePoint = this.#peek();
    while (currentCodePoint !== endPoint) {
      if (currentCodePoint === 0x0000) {
        break;
      }
      if (CSSTokenizer.#isNewline(currentCodePoint)) {
        this.#position -= 1;
        break;
      }
      this.#advance();
      currentCodePoint = this.#peek();
    }

    const value = this.#consumeRunningValue();

    // consume the ending code point (closing quote)
    this.#consumeCurrentCodePoint();

    return { type: 'string', value };
  }

  #consumeCurrentCodePoint(): number {
    if (this.#position !== 0) {
      throw new Error(
        '[CSSTokenizer] Attempted to consume the current code point while already advanced'
      );
    }

    this.#advance();
    const currentStr = this.#consumeRunningValue();
    return currentStr.codePointAt(0);
  }

  #consumeRunningValue(): string {
    if (this.#position === 0) return '';

    const next = this.#remainingCharacters.substring(0, this.#position);
    this.#remainingCharacters = this.#remainingCharacters.substring(
      next.length
    );
    this.#position = 0;

    return next;
  }

  // https://www.w3.org/TR/css-syntax-3/#check-if-three-code-points-would-start-an-ident-sequence
  // Note: for simplification purposes this doesn't currently check for escape sequences
  #next3CodePointsStartIdentSeq(): boolean {
    if (this.#peek() === 0x002d) {
      return (
        CSSTokenizer.#isIdentStart(this.#peek(1)) || this.#peek(1) === 0x002d
      );
    }
    return CSSTokenizer.#isIdentStart(this.#peek());
  }

  // https://www.w3.org/TR/css-syntax-3/#starts-with-a-number
  #next3CodePointsStartNumber(): boolean {
    if (this.#peek() === 0x002b || this.#peek() === 0x002d) {
      if (CSSTokenizer.#isDigit(this.#peek(1))) {
        return true;
      }
      if (this.#peek(1) === 0x002e && CSSTokenizer.#isDigit(this.#peek(2))) {
        return true;
      }
      return false;
    }

    if (this.#peek() === 0x002e) {
      return CSSTokenizer.#isDigit(this.#peek(1));
    }

    return CSSTokenizer.#isDigit(this.#peek());
  }

  // https://www.w3.org/TR/css-syntax-3/#digit
  static #isDigit(c: number): boolean {
    return c >= 0x0030 && c <= 0x0039;
  }

  // https://www.w3.org/TR/css-syntax-3/#hex-digit
  static #isHexDigit(c: number): boolean {
    const isLowercaseHexChar = c >= 0x0041 && c <= 0x0046;
    const isUppercaseHexChar = c >= 0x0061 && c <= 0x0066;
    return isLowercaseHexChar || isUppercaseHexChar || CSSTokenizer.#isDigit(c);
  }

  // https://www.w3.org/TR/css-syntax-3/#uppercase-letter
  static #isUppercaseLetter(c: number): boolean {
    return c >= 0x0041 && c <= 0x005a;
  }

  // https://www.w3.org/TR/css-syntax-3/#lowercase-letter
  static #isLowercaseLetter(c: number): boolean {
    return c >= 0x0061 && c <= 0x007a;
  }

  // https://www.w3.org/TR/css-syntax-3/#letter
  static #isLetter(c: number): boolean {
    return (
      CSSTokenizer.#isLowercaseLetter(c) || CSSTokenizer.#isUppercaseLetter(c)
    );
  }

  // https://www.w3.org/TR/css-syntax-3/#non-ascii-code-point
  static #isNonASCII(c: number): boolean {
    return c >= 0x0080;
  }

  // https://www.w3.org/TR/css-syntax-3/#ident-start-code-point
  static #isIdentStart(c: number): boolean {
    return (
      CSSTokenizer.#isLetter(c) || CSSTokenizer.#isNonASCII(c) || c === 0x005f
    );
  }

  // https://www.w3.org/TR/css-syntax-3/#ident-code-point
  static #isIdent(c: number): boolean {
    return (
      CSSTokenizer.#isIdentStart(c) || CSSTokenizer.#isDigit(c) || c === 0x002d
    );
  }

  // https://www.w3.org/TR/css-syntax-3/#newline
  static #isNewline(c: number): boolean {
    return c === 0x000a;
  }

  // https://www.w3.org/TR/css-syntax-3/#whitespace
  static #isWhitespace(c: number): boolean {
    return CSSTokenizer.#isNewline(c) || c === 0x0009 || c === 0x0020;
  }
}
