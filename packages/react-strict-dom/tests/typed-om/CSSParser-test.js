/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import CSSParser, { CSSFunction, CSSPreservedToken } from '../src/CSSParser';

describe('CSSParser', () => {
  test('successfully parses a variable that is missing a trailing parenthesis', () => {
    const actual1 = CSSParser.parseList('var(--testUnfinished');
    expect(actual1.length).toBe(1);

    const actual1Function = actual1[0];
    expect(actual1Function).toBeInstanceOf(CSSFunction);
    expect(actual1Function.name).toBe('var');
    expect(actual1Function.value.length).toBe(1);

    const actual1FunctionValue = actual1Function.value[0];
    expect(actual1FunctionValue).toBeInstanceOf(CSSPreservedToken);
    expect(actual1FunctionValue.token.type).toBe('ident');
    expect(actual1FunctionValue.token.name).toBe('--testUnfinished');
  });

  test('correctly parses a var with a complex fallback which itself contains a var', () => {
    const actual = CSSParser.parseList(
      'var(--colorNotFound, rgb(255,255,var(--test))'
    );
    expect(actual.length).toBe(1);

    const topLevelFunction = actual[0];
    expect(topLevelFunction).toBeInstanceOf(CSSFunction);
    expect(topLevelFunction.name).toBe('var');
    expect(topLevelFunction.value.length).toBe(4);

    let token = topLevelFunction.value[0];
    expect(token).toBeInstanceOf(CSSPreservedToken);
    expect(token.token.type).toBe('ident');
    expect(token.token.name).toBe('--colorNotFound');

    token = topLevelFunction.value[1];
    expect(token).toBeInstanceOf(CSSPreservedToken);
    expect(token.token.type).toBe('comma');

    token = topLevelFunction.value[2];
    expect(token).toBeInstanceOf(CSSPreservedToken);
    expect(token.token.type).toBe('whitespace');

    const rgbFallbackFunction = topLevelFunction.value[3];
    expect(rgbFallbackFunction).toBeInstanceOf(CSSFunction);
    expect(rgbFallbackFunction.name).toBe('rgb');
    expect(rgbFallbackFunction.value.length).toBe(5);

    token = rgbFallbackFunction.value[0];
    expect(token).toBeInstanceOf(CSSPreservedToken);
    expect(token.token.type).toBe('number');
    expect(token.token.value).toBe(255);

    token = rgbFallbackFunction.value[1];
    expect(token).toBeInstanceOf(CSSPreservedToken);
    expect(token.token.type).toBe('comma');

    token = rgbFallbackFunction.value[2];
    expect(token).toBeInstanceOf(CSSPreservedToken);
    expect(token.token.type).toBe('number');
    expect(token.token.value).toBe(255);

    token = rgbFallbackFunction.value[3];
    expect(token).toBeInstanceOf(CSSPreservedToken);
    expect(token.token.type).toBe('comma');

    const innerVarFunction = rgbFallbackFunction.value[4];
    expect(innerVarFunction).toBeInstanceOf(CSSFunction);
    expect(innerVarFunction.name).toBe('var');
    expect(innerVarFunction.value.length).toBe(1);

    token = innerVarFunction.value[0];
    expect(token).toBeInstanceOf(CSSPreservedToken);
    expect(token.token.type).toBe('ident');
    expect(token.token.name).toBe('--test');
  });
});
