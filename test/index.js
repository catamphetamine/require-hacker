import path from 'path'
import chai from 'chai'

import fs from 'fs'

import Require_hacker from '../source/index'

import Log from '../source/tools/log'

chai.should()

// logging
const log = new Log('testing', { debug: true })

describe('require hacker', function()
{
	beforeEach(function()
	{
	})

	after(function()
	{
	})

	it('should hook into js extension loading', function()
	{
		const require_hacker = new Require_hacker({ debug: false })

		// mount require() hook
		const hook = require_hacker.hook('js', (path, fallback) =>
		{
			return `module.exports = "${fs.readFileSync(path).toString()}"`
		})

		// unmount require() hook
		hook.unmount()
	})

	it('should hook into file extension loading', function()
	{
		const require_hacker = new Require_hacker({ debug: false })

		// mount require() hook
		const hook = require_hacker.hook('txt', (path, fallback) =>
		{
			return `module.exports = "${fs.readFileSync(path).toString()}"`
		})

		// mount overriding require() hook
		const overriding_hook = require_hacker.hook('txt', (path, fallback) =>
		{
			return `module.exports = "whatever"`
		})

		// unmount overriding require() hook
		overriding_hook.unmount()

		// will output text file contents
		require('./test.txt').should.equal('Hot threesome interracial with double penetration')

		// unmount require() hook
		hook.unmount()

		// will throw "SyntaxError: Unexpected token ILLEGAL"
		const would_fail = () => require('./another test.txt')
		would_fail.should.throw(SyntaxError)
	})

	it('should hook into arbitrary path loading', function()
	{
		const require_hacker = new Require_hacker({ debug: false })

		// mount require() hook
		const hook = require_hacker.global_hook('textual', (path, flush_cache) =>
		{
			if (path.indexOf('http://xhamster.com') >= 0)
			{
				return `module.exports = "Free porn"`
			}
		})

		// will output text file contents
		require('http://xhamster.com').should.equal('Free porn')

		// unmount require() hook
		hook.unmount()

		// will throw "Error: Cannot find module"
		const would_fail = () => require('http://xhamster.com')
		would_fail.should.throw('Cannot find module')
	})

	it('should hook into arbitrary path loading (preceding Node.js original loader)', function()
	{
		const require_hacker = new Require_hacker({ debug: false })

		// mount require() hook
		const hook = require_hacker.global_hook('javascript', (path, flush_cache) =>
		{
			if (path.indexOf('/dummy.js') >= 0)
			{
				return `module.exports = "Free porn"`
			}
		},
		{ precede_node_loader: true })

		// will output text file contents
		require('./dummy.js').should.equal('Free porn')

		// unmount require() hook
		hook.unmount()

		// usual Node.js loader takes precedence
		require('./dummy.js').should.equal('Hot lesbians making out')
		// clear require() cache (just in case)
		delete require.cache[path.resolve(__dirname, './dummy.js')]

		// mount require() hook
		const ignoring_hook = require_hacker.global_hook('javascript', (path, flush_cache) =>
		{
			return
		},
		{ precede_node_loader: true })

		// usual Node.js loader takes precedence
		require('./dummy.js').should.equal('Hot lesbians making out')
		// clear require() cache (just in case)
		delete require.cache[path.resolve(__dirname, './dummy.js')]
		
		// unmount require() hook
		ignoring_hook.unmount()
	})

	it('should validate options', function()
	{
		const require_hacker = new Require_hacker({ debug: false })

		// mount require() hook
		const hook = (id, resolve) => () => require_hacker.global_hook(id, resolve)

		hook().should.throw('You must specify global hook id')

		hook('.js').should.throw('Invalid global hook id')

		hook('js').should.throw('Resolve should be a function')

		hook('js', true).should.throw('Resolve should be a function')

		const hook_extension = (extension, handler) => () => require_hacker.hook(extension, handler)

		hook_extension('.js').should.throw('Invalid file extension')
	})

	it('should fall back', function()
	{
		const require_hacker = new Require_hacker({ debug: false })

		// mount require() hook
		const hook = require_hacker.hook('js', path =>
		{
			return
		})

		// will output text file contents
		require('./dummy.js').should.equal('Hot lesbians making out')

		// unmount require() hook
		hook.unmount()
	})

	it('should convert to javascript module source', function()
	{
		Require_hacker.to_javascript_module_source().should.equal('module.exports = undefined')
		Require_hacker.to_javascript_module_source('a').should.equal('module.exports = "a"')
		Require_hacker.to_javascript_module_source('module.exports = "a"').should.equal('module.exports = "a"')
		Require_hacker.to_javascript_module_source({ a: 1 }).should.equal('module.exports = {"a":1}')
	})
})