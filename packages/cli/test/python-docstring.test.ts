import { describe, it, expect } from 'vitest';
import { detectStyle, parseDocstring } from '../src/extractors/python-docstring.js';

describe('detectStyle', () => {
	it('detects Google style', () => {
		expect(detectStyle('Summary.\n\nArgs:\n    x: value')).toBe('google');
		expect(detectStyle('Summary.\n\nReturns:\n    value')).toBe('google');
		expect(detectStyle('Summary.\n\nRaises:\n    ValueError')).toBe('google');
	});

	it('detects NumPy style', () => {
		expect(detectStyle('Summary.\n\nParameters\n----------\nx : int\n    value')).toBe('numpy');
		expect(detectStyle('Summary.\n\nReturns\n-------\nint\n    value')).toBe('numpy');
	});

	it('detects Sphinx style', () => {
		expect(detectStyle('Summary.\n\n:param x: value')).toBe('sphinx');
		expect(detectStyle('Summary.\n\n:returns: value')).toBe('sphinx');
		expect(detectStyle('Summary.\n\n:rtype: int')).toBe('sphinx');
	});

	it('returns plain for unstructured text', () => {
		expect(detectStyle('Just a plain description.')).toBe('plain');
		expect(detectStyle('')).toBe('plain');
	});

	it('prefers NumPy over Google when both match', () => {
		// NumPy is checked first
		expect(detectStyle('Summary.\n\nParameters\n----------\nx : int\n    value\n\nArgs:\n    x: value')).toBe('numpy');
	});
});

describe('parseDocstring — Google style', () => {
	it('parses description and args', () => {
		const info = parseDocstring(
			'Generate a greeting.\n\nArgs:\n    name (str): The person name.\n    greeting (str): The word to use.'
		);
		expect(info.description).toBe('Generate a greeting.');
		expect(info.params.size).toBe(2);
		expect(info.params.get('name')).toEqual({ type: 'str', description: 'The person name.' });
		expect(info.params.get('greeting')).toEqual({ type: 'str', description: 'The word to use.' });
	});

	it('parses args without type annotation', () => {
		const info = parseDocstring('Summary.\n\nArgs:\n    x: The value.');
		expect(info.params.get('x')).toEqual({ type: 'Any', description: 'The value.' });
	});

	it('parses returns section', () => {
		const info = parseDocstring('Summary.\n\nReturns:\n    str: The result.');
		expect(info.returns).toEqual({ type: 'str', description: 'The result.' });
	});

	it('parses raises section', () => {
		const info = parseDocstring(
			'Summary.\n\nRaises:\n    ValueError: If input is bad.\n    TypeError: If type is wrong.'
		);
		expect(info.raises).toHaveLength(2);
		expect(info.raises[0]).toEqual({ type: 'ValueError', description: 'If input is bad.' });
		expect(info.raises[1]).toEqual({ type: 'TypeError', description: 'If type is wrong.' });
	});

	it('handles multi-line descriptions in args', () => {
		const info = parseDocstring(
			'Summary.\n\nArgs:\n    x (int): First line\n        continuation of description.'
		);
		expect(info.params.get('x')?.description).toBe('First line continuation of description.');
	});

	it('handles *args and **kwargs', () => {
		const info = parseDocstring(
			'Summary.\n\nArgs:\n    **kwargs: Extra arguments.'
		);
		expect(info.params.get('**kwargs')).toEqual({ type: 'Any', description: 'Extra arguments.' });
	});
});

describe('parseDocstring — NumPy style', () => {
	it('parses parameters and returns', () => {
		const raw = [
			'Compute the mean.',
			'',
			'Parameters',
			'----------',
			'data : List[float]',
			'    The input data.',
			'axis : int, optional',
			'    The axis to compute along.',
			'',
			'Returns',
			'-------',
			'float',
			'    The mean value.',
		].join('\n');

		const info = parseDocstring(raw);
		expect(info.description).toBe('Compute the mean.');
		expect(info.params.size).toBe(2);
		expect(info.params.get('data')).toEqual({ type: 'List[float]', description: 'The input data.' });
		expect(info.params.get('axis')).toEqual({ type: 'int', description: 'The axis to compute along.' });
		expect(info.returns).toEqual({ type: 'float', description: 'The mean value.' });
	});

	it('strips "optional" from type', () => {
		const raw = 'Summary.\n\nParameters\n----------\nx : int, optional\n    A value.';
		const info = parseDocstring(raw);
		expect(info.params.get('x')?.type).toBe('int');
	});

	it('parses raises section', () => {
		const raw = 'Summary.\n\nRaises\n------\nValueError\n    If bad input.';
		const info = parseDocstring(raw);
		expect(info.raises).toHaveLength(1);
		expect(info.raises[0]).toEqual({ type: 'ValueError', description: 'If bad input.' });
	});
});

describe('parseDocstring — Sphinx style', () => {
	it('parses :param and :type directives', () => {
		const raw = [
			'Read a file.',
			'',
			':param path: The file path.',
			':type path: str',
			':param mode: The open mode.',
			':type mode: str',
		].join('\n');

		const info = parseDocstring(raw);
		expect(info.description).toBe('Read a file.');
		expect(info.params.size).toBe(2);
		expect(info.params.get('path')).toEqual({ type: 'str', description: 'The file path.' });
		expect(info.params.get('mode')).toEqual({ type: 'str', description: 'The open mode.' });
	});

	it('parses :returns and :rtype', () => {
		const raw = ':returns: The content.\n:rtype: str';
		const info = parseDocstring(raw);
		expect(info.returns).toEqual({ type: 'str', description: 'The content.' });
	});

	it('parses :raises', () => {
		const raw = ':raises FileNotFoundError: If not found.\n:raises PermissionError: If denied.';
		const info = parseDocstring(raw);
		expect(info.raises).toHaveLength(2);
		expect(info.raises[0]).toEqual({ type: 'FileNotFoundError', description: 'If not found.' });
		expect(info.raises[1]).toEqual({ type: 'PermissionError', description: 'If denied.' });
	});

	it('merges :type into :param', () => {
		const raw = ':type x: int\n:param x: A value.';
		const info = parseDocstring(raw);
		expect(info.params.get('x')).toEqual({ type: 'int', description: 'A value.' });
	});
});

describe('parseDocstring — RST directives', () => {
	it('extracts versionadded from any style', () => {
		const info = parseDocstring('Summary.\n\n.. versionadded:: 2.1');
		expect(info.since).toBe('2.1');
	});

	it('extracts deprecated from any style', () => {
		const info = parseDocstring('Summary.\n\n.. deprecated:: 3.0\n    Use something else.');
		expect(info.deprecated).toBe('3.0');
	});

	it('extracts both from Google style', () => {
		const raw = 'Summary.\n\nArgs:\n    x (int): Value.\n\n.. versionadded:: 1.0\n.. deprecated:: 2.0';
		const info = parseDocstring(raw);
		expect(info.since).toBe('1.0');
		expect(info.deprecated).toBe('2.0');
		expect(info.params.get('x')?.type).toBe('int');
	});
});

describe('parseDocstring — plain', () => {
	it('returns full text as description', () => {
		const info = parseDocstring('Just a simple description.');
		expect(info.description).toBe('Just a simple description.');
		expect(info.params.size).toBe(0);
		expect(info.raises).toHaveLength(0);
	});
});
