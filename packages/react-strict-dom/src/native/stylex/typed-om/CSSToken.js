/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export type WhitespaceToken = { type: 'whitespace' };
export type IdentToken = { type: 'ident', name: string };
export type FunctionToken = { type: 'function', name: string };
export type HashToken = { type: 'hash', value: string };
export type StringToken = { type: 'string', value: string };
export type NumberToken = { type: 'number', value: number };
export type DimensionToken = { type: 'dimension', value: number, unit: string };
export type PercentageToken = { type: 'percentage', value: number };
export type DelimToken = { type: 'delim', value: number };
export type LeftParenthesisToken = { type: 'left-parenthesis' };
export type RightParenthesisToken = { type: 'right-parenthesis' };
export type CommaToken = { type: 'comma' };
export type EOFToken = { type: 'eof' };

export type CSSToken =
  | WhitespaceToken
  | IdentToken
  | FunctionToken
  | HashToken
  | StringToken
  | NumberToken
  | DimensionToken
  | PercentageToken
  | DelimToken
  | LeftParenthesisToken
  | RightParenthesisToken
  | CommaToken
  | EOFToken;

export function stringifyCSSToken(token: CSSToken): string {
  switch (token.type) {
    case 'whitespace':
      return ' ';
    case 'ident':
      return token.name;
    case 'function':
      return `${token.name}(`;
    case 'hash':
      return `#${token.value}`;
    case 'string':
      return token.value;
    case 'number':
      return `${token.value}`;
    case 'dimension':
      return `${token.value}${token.unit}`;
    case 'percentage':
      return `${token.value}%`;
    case 'delim':
      return String.fromCharCode(token.value);
    case 'left-parenthesis':
      return '(';
    case 'right-parenthesis':
      return ')';
    case 'comma':
      return ',';
    case 'eof':
      return '';
    default:
      throw new Error(`Unknown token type: ${token.type}`);
  }
}
