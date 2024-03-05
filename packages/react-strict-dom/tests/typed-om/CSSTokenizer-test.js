/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import CSSTokenizer from '../src/CSSTokenizer';

describe('CSSTokenizer', () => {
  test('tokenizes whitespace', () => {
    const tokenizer = new CSSTokenizer(' \n \n \n \n');
    expect(tokenizer.next()).toEqual({ type: 'whitespace' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes strings', () => {
    let tokenizer = new CSSTokenizer('"hello"');
    expect(tokenizer.next()).toEqual({ type: 'string', value: 'hello' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer("'world'");
    expect(tokenizer.next()).toEqual({ type: 'string', value: 'world' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes parenthesis', () => {
    let tokenizer = new CSSTokenizer('(');
    expect(tokenizer.next()).toEqual({ type: 'left-parenthesis' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer(')');
    expect(tokenizer.next()).toEqual({ type: 'right-parenthesis' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes plus sign', () => {
    let tokenizer = new CSSTokenizer('+');
    expect(tokenizer.next()).toEqual({ type: 'delim', value: 0x002b });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('+420');
    expect(tokenizer.next()).toEqual({ type: 'number', value: 420 });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('+420px');
    expect(tokenizer.next()).toEqual({
      type: 'dimension',
      value: 420,
      unit: 'px'
    });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('+420%');
    expect(tokenizer.next()).toEqual({ type: 'percentage', value: 420 });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes comma', () => {
    const tokenizer = new CSSTokenizer(',');
    expect(tokenizer.next()).toEqual({ type: 'comma' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes hyphen-minus', () => {
    let tokenizer = new CSSTokenizer('-');
    expect(tokenizer.next()).toEqual({ type: 'delim', value: 0x002d });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('-420');
    expect(tokenizer.next()).toEqual({ type: 'number', value: -420 });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('-420px');
    expect(tokenizer.next()).toEqual({
      type: 'dimension',
      value: -420,
      unit: 'px'
    });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('-420%');
    expect(tokenizer.next()).toEqual({ type: 'percentage', value: -420 });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('-webkit');
    expect(tokenizer.next()).toEqual({ type: 'ident', name: '-webkit' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('--custom-property');
    expect(tokenizer.next()).toEqual({
      type: 'ident',
      name: '--custom-property'
    });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('-webkit(');
    expect(tokenizer.next()).toEqual({ type: 'function', name: '-webkit' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes full stop', () => {
    let tokenizer = new CSSTokenizer('.');
    expect(tokenizer.next()).toEqual({ type: 'delim', value: 0x002e });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('.420');
    expect(tokenizer.next()).toEqual({ type: 'number', value: 0.42 });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('.420px');
    expect(tokenizer.next()).toEqual({
      type: 'dimension',
      value: 0.42,
      unit: 'px'
    });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('.420%');
    expect(tokenizer.next()).toEqual({ type: 'percentage', value: 0.42 });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes numbers', () => {
    let tokenizer = new CSSTokenizer('420');
    expect(tokenizer.next()).toEqual({ type: 'number', value: 420 });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('420px');
    expect(tokenizer.next()).toEqual({
      type: 'dimension',
      value: 420,
      unit: 'px'
    });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('73em');
    expect(tokenizer.next()).toEqual({
      type: 'dimension',
      value: 73,
      unit: 'em'
    });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('420%');
    expect(tokenizer.next()).toEqual({ type: 'percentage', value: 420 });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes identifiers', () => {
    let tokenizer = new CSSTokenizer('ident');
    expect(tokenizer.next()).toEqual({ type: 'ident', name: 'ident' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });

    tokenizer = new CSSTokenizer('function(');
    expect(tokenizer.next()).toEqual({ type: 'function', name: 'function' });
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  test('tokenizes EOF', () => {
    const tokenizer = new CSSTokenizer('');
    expect(tokenizer.next()).toEqual({ type: 'eof' });
  });

  describe('complex cases', () => {
    test('correctly tokenizes rgb color', () => {
      const tokenizer = new CSSTokenizer('rgb(64,128,255)');
      expect(tokenizer.next()).toEqual({ type: 'function', name: 'rgb' });
      expect(tokenizer.next()).toEqual({ type: 'number', value: 64 });
      expect(tokenizer.next()).toEqual({ type: 'comma' });
      expect(tokenizer.next()).toEqual({ type: 'number', value: 128 });
      expect(tokenizer.next()).toEqual({ type: 'comma' });
      expect(tokenizer.next()).toEqual({ type: 'number', value: 255 });
      expect(tokenizer.next()).toEqual({ type: 'right-parenthesis' });
      expect(tokenizer.next()).toEqual({ type: 'eof' });
    });

    test('tokenizes variable reference value containing spaces and embedded variables in the fallback', () => {
      const tokenizer = new CSSTokenizer(
        'var(--boxShadowVarNotFound, 0px 0px 0px var(--testVar2))'
      );
      expect(tokenizer.next()).toEqual({ type: 'function', name: 'var' });
      expect(tokenizer.next()).toEqual({
        type: 'ident',
        name: '--boxShadowVarNotFound'
      });
      expect(tokenizer.next()).toEqual({ type: 'comma' });
      expect(tokenizer.next()).toEqual({ type: 'whitespace' });
      expect(tokenizer.next()).toEqual({
        type: 'dimension',
        value: 0,
        unit: 'px'
      });
      expect(tokenizer.next()).toEqual({ type: 'whitespace' });
      expect(tokenizer.next()).toEqual({
        type: 'dimension',
        value: 0,
        unit: 'px'
      });
      expect(tokenizer.next()).toEqual({ type: 'whitespace' });
      expect(tokenizer.next()).toEqual({
        type: 'dimension',
        value: 0,
        unit: 'px'
      });
      expect(tokenizer.next()).toEqual({ type: 'whitespace' });
      expect(tokenizer.next()).toEqual({ type: 'function', name: 'var' });
      expect(tokenizer.next()).toEqual({
        type: 'ident',
        name: '--testVar2'
      });
      expect(tokenizer.next()).toEqual({ type: 'right-parenthesis' });
      expect(tokenizer.next()).toEqual({ type: 'right-parenthesis' });
      expect(tokenizer.next()).toEqual({ type: 'eof' });
    });
  });
});
