/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type { CSSComponentValue } from './CSSParser';

import { CSSStyleValue } from './CSSStyleValue';
import { CSSVariableReferenceValue } from './CSSVariableReferenceValue';
import { CSSParser } from './CSSParser';
import {
  CSSFunction,
  CSSPreservedToken,
  splitComponentValueListByComma
} from './CSSParser';

type CSSUnparsedSegment = string | CSSVariableReferenceValue;

// https://drafts.css-houdini.org/css-typed-om-1/#cssunparsedvalue
export class CSSUnparsedValue extends CSSStyleValue {
  static #resolveVariableName(input: CSSComponentValue[]): string {
    const cleanedInput = input.filter(
      (i) => i instanceof CSSPreservedToken && i.token.type === 'ident'
    );
    if (cleanedInput.length !== 1) {
      throw new Error('Invalid variable name');
    }
    return cleanedInput[0].toString();
  }

  static #resolveUnparsedValue(input: CSSComponentValue[]): CSSUnparsedValue {
    const tokens: CSSUnparsedSegment[] = [];

    const appendString = (str: string) => {
      if (tokens.length > 0) {
        const lastToken = tokens.at(-1);
        if (typeof lastToken === 'string') {
          tokens[tokens.length - 1] = lastToken + str;
          return;
        }
      }
      tokens.push(str);
    };

    for (const currentValue of input) {
      if (currentValue instanceof CSSFunction) {
        if (currentValue.name === 'var') {
          const args = splitComponentValueListByComma(currentValue.value);

          const variableName = CSSUnparsedValue.#resolveVariableName(args[0]);
          const fallbackValue =
            args[1] != null
              ? CSSUnparsedValue.#resolveUnparsedValue(args[1])
              : undefined;

          tokens.push(
            new CSSVariableReferenceValue(variableName, fallbackValue)
          );
        } else {
          // stringify the function manually but still attempt to resolve the args
          appendString(`${currentValue.name}(`);

          const functionArgs = CSSUnparsedValue.#resolveUnparsedValue(
            currentValue.value
          );
          for (const arg of functionArgs.values()) {
            if (typeof arg === 'string') {
              appendString(arg);
            } else {
              tokens.push(arg);
            }
          }

          appendString(')');
        }
      } else {
        appendString(currentValue.toString());
      }
    }
    return new CSSUnparsedValue(tokens);
  }

  // TODO: in the full spec this should take into account the property name
  // to determine what the value should be parsed to but as we currently are only taking
  // unparsed & variable references we can ignore it for now
  static parse(_property: string, input: string): CSSUnparsedValue {
    const componentValueList = CSSParser.parseList(input);
    return CSSUnparsedValue.#resolveUnparsedValue(componentValueList);
  }

  #tokens: CSSUnparsedSegment[];

  constructor(members: CSSUnparsedSegment[]) {
    super();
    this.#tokens = members;
  }

  get(index: number): CSSUnparsedSegment {
    return this.#tokens[index];
  }

  set(index: number, value: CSSUnparsedSegment): void {
    this.#tokens[index] = value;
  }

  get size(): number {
    return this.#tokens.length;
  }

  values(): Iterator<CSSUnparsedSegment> {
    return this.#tokens.values();
  }

  toString(): string {
    return this.#tokens
      .map((t) => t.toString())
      .join('')
      .trim();
  }
}
